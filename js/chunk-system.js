class Chunk {
    constructor(chunkX, chunkY, size = 16) {
        this.chunkX = chunkX;
        this.chunkY = chunkY;
        this.size = size;
        this.tiles = null; // Будет заполнен при генерации
        this.generated = false;
        this.entities = []; // Враги, предметы и т.д. в этом чанке
    }

    generate(generator) {
        // Создаем карту для этого чанка
        // Создаем новый генератор с размерами этого чанка
        const chunkGenerator = new AdvancedDungeonGenerator(this.size, this.size);
        // Генерируем карту для чанка с уменьшенными параметрами
        const tempMap = chunkGenerator.generateDungeon(2, 2, 6, 2); // Меньше комнат, меньшие размеры для чанка
        
        // Сохраняем тайлы чанка
        this.tiles = [];
        for (let y = 0; y < this.size; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.size; x++) {
                if (y < tempMap.length && x < tempMap[0].length) {
                    this.tiles[y][x] = tempMap[y][x];
                } else {
                    // Если вышли за пределы сгенерированной карты, делаем стену
                    this.tiles[y][x] = 1;
                }
            }
        }
        
        this.generated = true;
    }

    isWithinBounds(x, y) {
        const chunkXStart = this.chunkX * this.size;
        const chunkXEnd = chunkXStart + this.size;
        const chunkYStart = this.chunkY * this.size;
        const chunkYEnd = chunkYStart + this.size;
        
        return x >= chunkXStart && x < chunkXEnd && y >= chunkYStart && y < chunkYEnd;
    }
}

class ChunkSystem {
    constructor(chunkSize = GAME_CONFIG.CHUNK_SYSTEM.DEFAULT_SIZE) {
        this.chunkSize = chunkSize;
        this.chunks = new Map(); // Хранит чанки в формате "x,y" -> Chunk
        this.activeChunks = new Set(); // Активные (загруженные) чанки
        this.generator = new AdvancedDungeonGenerator(chunkSize, chunkSize);

        // Радиусы для загрузки и выгрузки чанков (адаптированы под увеличенный зум камеры для производительности)
        this.loadRadius = GAME_CONFIG.CHUNK_SYSTEM.LOAD_RADIUS; // Загружаем чанки в радиусе 5 от игрока (уменьшено с 8 для улучшения производительности)
        this.unloadRadius = GAME_CONFIG.CHUNK_SYSTEM.UNLOAD_RADIUS; // Выгружаем чанки за пределами радиуса 7 (уменьшено с 12 для улучшения производительности)
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    getChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(chunkX, chunkY, this.chunkSize);
            this.chunks.set(key, chunk);
        }
        return this.chunks.get(key);
    }

    getTile(x, y) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        
        const localX = x - chunkX * this.chunkSize;
        const localY = y - chunkY * this.chunkSize;
        
        const chunk = this.getChunk(chunkX, chunkY);
        
        // Если чанк еще не сгенерирован, генерируем его
        if (!chunk.generated) {
            chunk.generate(this.generator);
        }
        
        return chunk.tiles[localY][localX];
    }

    isPassable(x, y) {
        try {
            const tileType = this.getTile(x, y);
            // Проходимые тайлы: 0 (пол), 6 (лед), 7 (декорация)
            return tileType === 0 || tileType === 6 || tileType === 7;
        } catch (e) {
            // Если тайл не существует (за пределами сгенерированной области), считаем непроходимым
            return false;
        }
    }

    loadChunksAround(x, y, loadRadius = null, unloadRadius = null) {
        const centerX = Math.floor(x / this.chunkSize);
        const centerY = Math.floor(y / this.chunkSize);
        
        // Используем переданные радиусы или значения по умолчанию
        const effectiveLoadRadius = loadRadius !== null ? loadRadius : this.loadRadius;
        const effectiveUnloadRadius = unloadRadius !== null ? unloadRadius : this.unloadRadius;

        // Загружаем чанки в радиусе загрузки
        for (let dy = -effectiveLoadRadius; dy <= effectiveLoadRadius; dy++) {
            for (let dx = -effectiveLoadRadius; dx <= effectiveLoadRadius; dx++) {
                const chunkX = centerX + dx;
                const chunkY = centerY + dy;

                const chunk = this.getChunk(chunkX, chunkY);

                // Если чанк еще не сгенерирован, генерируем его
                if (!chunk.generated) {
                    chunk.generate(this.generator);
                }

                // Добавляем в активные чанки
                this.activeChunks.add(this.getChunkKey(chunkX, chunkY));
            }
        }

        // Удаляем чанки, которые вне радиуса выгрузки
        this.unloadChunksOutsideRadius(centerX, centerY, effectiveUnloadRadius);
    }

    unloadChunksOutsideRadius(centerX, centerY, radius) {
        const chunksToDelete = [];

        for (const chunkKey of this.activeChunks) {
            const [chunkX, chunkY] = chunkKey.split(',').map(Number);

            // Используем манхэттенское расстояние для определения расстояния между чанками
            const distance = Math.max(Math.abs(chunkX - centerX), Math.abs(chunkY - centerY));

            if (distance > radius) {
                chunksToDelete.push(chunkKey);
            }
        }

        for (const chunkKey of chunksToDelete) {
            this.activeChunks.delete(chunkKey);
            // В реальной реализации можно освободить память, удалив данные чанка
            // this.chunks.delete(chunkKey);
        }
    }

    getChunksToRender(cameraX, cameraY, screenWidth, screenHeight, tileSize = 64) {
        // Определяем центр экрана в пиксельных координатах мира
        const centerWorldX = cameraX + screenWidth / 2;
        const centerWorldY = cameraY + screenHeight / 2;
        
        // Конвертируем пиксельные координаты центра экрана в тайловые координаты
        const isoCoords = coordToIso(centerWorldX, centerWorldY);
        const centerChunkX = Math.floor(isoCoords.isoX / this.chunkSize);
        const centerChunkY = Math.floor(isoCoords.isoY / this.chunkSize);
        
        // Рассчитываем радиус рендеринга с запасом, чтобы покрыть весь экран
        // Учитываем изометрическую проекцию — экран покрывает больше чанков по диагонали
        const tilesOnScreenX = Math.ceil(screenWidth / (tileSize / 2));
        const tilesOnScreenY = Math.ceil(screenHeight / (tileSize / 4));
        const renderRadius = Math.max(3, Math.ceil(Math.max(tilesOnScreenX, tilesOnScreenY) / this.chunkSize)) + 2;
        
        const chunksToRender = [];
        
        // Собираем чанки в радиусе от центрального чанка
        for (let chunkX = centerChunkX - renderRadius; chunkX <= centerChunkX + renderRadius; chunkX++) {
            for (let chunkY = centerChunkY - renderRadius; chunkY <= centerChunkY + renderRadius; chunkY++) {
                const chunkKey = this.getChunkKey(chunkX, chunkY);
                
                if (this.activeChunks.has(chunkKey)) {
                    chunksToRender.push(this.chunks.get(chunkKey));
                }
            }
        }
        
        return chunksToRender;
    }
}