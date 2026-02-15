/**
 * Глобальная система управления картой мира
 * Обеспечивает связность всех комнат между чанками
 */
class WorldMap {
    constructor() {
        this.rooms = new Map(); // Глобальный список комнат "worldX,worldY" -> room
        this.corridors = []; // Список всех коридоров мира
        this.chunkRooms = new Map(); // Комнаты в каждом чанке "chunkX,chunkY" -> [rooms]
        this.seed = Math.random() * 10000; // Seed для генерации
        
        // Параметры генерации мира
        this.roomDensity = 0.015; // Плотность комнат на тайл
        this.minRoomSize = 5;
        this.maxRoomSize = 10;
        this.corridorWidth = 2;
        
        // Кэш сгенерированных чанков для связи
        this.generatedChunks = new Set();
    }

    /**
     * Установка seed для воспроизводимой генерации
     */
    setSeed(seed) {
        this.seed = seed;
    }

    /**
     * Получение псевдослучайного числа на основе позиции
     */
    randomWithPosition(x, y) {
        const hash = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453;
        return hash - Math.floor(hash);
    }

    /**
     * Генерация комнат для указанной области мира
     * @param {number} centerChunkX - центр по X
     * @param {number} centerChunkY - центр по Y
     * @param {number} radius - радиус в чанках
     */
    generateRoomsInArea(centerChunkX, centerChunkY, radius) {
        // Генерируем комнаты для всех чанков в радиусе
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const chunkX = centerChunkX + dx;
                const chunkY = centerChunkY + dy;
                this.generateRoomsForChunk(chunkX, chunkY);
            }
        }
    }

    /**
     * Генерация комнат для конкретного чанка
     */
    generateRoomsForChunk(chunkX, chunkY) {
        const chunkKey = `${chunkX},${chunkY}`;
        
        // Если комнаты уже сгенерированы, пропускаем
        if (this.chunkRooms.has(chunkKey)) {
            return;
        }

        const roomsInChunk = [];
        const chunkWorldStartX = chunkX * 16;
        const chunkWorldStartY = chunkY * 16;
        
        // Используем псевдослучайную генерацию на основе позиции чанка
        const chunkRand = this.randomWithPosition(chunkX, chunkY);
        
        // Количество комнат в чанке (0-3 в зависимости от случайности)
        const roomCount = Math.floor(chunkRand * 3) + (chunkRand > 0.6 ? 1 : 0);
        
        for (let i = 0; i < roomCount; i++) {
            // Позиция комнаты зависит от хеша
            const roomRandX = this.randomWithPosition(chunkX * 100 + i, chunkY);
            const roomRandY = this.randomWithPosition(chunkX, chunkY * 100 + i);
            
            const width = Math.floor(this.randomWithPosition(i, chunkX * chunkY) * 
                (this.maxRoomSize - this.minRoomSize)) + this.minRoomSize;
            const height = Math.floor(this.randomWithPosition(chunkX * chunkY, i) * 
                (this.maxRoomSize - this.minRoomSize)) + this.minRoomSize;
            
            // Позиция комнаты в мировых координатах (смещение от начала чанка)
            const offsetX = Math.floor(roomRandX * (16 - width - 2)) + 1;
            const offsetY = Math.floor(roomRandY * (16 - height - 2)) + 1;
            
            const room = {
                id: `room_${chunkWorldStartX + offsetX}_${chunkWorldStartY + offsetY}`,
                worldX: chunkWorldStartX + offsetX,
                worldY: chunkWorldStartY + offsetY,
                width: width,
                height: height,
                chunkX: chunkX,
                chunkY: chunkY,
                connected: false, // Связана ли комната
                connections: [], // Список ID связанных комнат
                center: {
                    x: Math.floor(offsetX + width / 2),
                    y: Math.floor(offsetY + height / 2)
                }
            };
            
            roomsInChunk.push(room);
            this.rooms.set(room.id, room);
        }
        
        this.chunkRooms.set(chunkKey, roomsInChunk);
    }

    /**
     * Создание связей между комнатами
     * @param {number} centerChunkX - центр по X
     * @param {number} centerChunkY - центр по Y
     * @param {number} radius - радиус в чанках
     */
    createConnections(centerChunkX, centerChunkY, radius) {
        // Собираем все комнаты в области, которые еще не имеют связей
        const roomsToConnect = [];
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const chunkX = centerChunkX + dx;
                const chunkY = centerChunkY + dy;
                const chunkKey = `${chunkX},${chunkY}`;
                
                const rooms = this.chunkRooms.get(chunkKey);
                if (rooms) {
                    for (const room of rooms) {
                        // Добавляем комнату, если у нее еще нет связей
                        if (!room.connected && room.connections.length === 0) {
                            roomsToConnect.push(room);
                        }
                    }
                }
            }
        }
        
        // Создаем связи между несвязанными комнатами
        if (roomsToConnect.length > 0) {
            this.buildRoomConnections(roomsToConnect);
        }
    }

    /**
     * Построение связей между комнатами с использованием MST
     */
    buildRoomConnections(rooms) {
        if (rooms.length <= 1) return;
        
        // Проверяем, есть ли уже связанные комнаты
        const alreadyConnected = rooms.filter(r => r.connected);
        const unconnected = rooms.filter(r => !r.connected);
        
        // Алгоритм Прима для создания минимального остовного дерева
        let connected;
        let unconnectedSet;
        
        if (alreadyConnected.length > 0) {
            // Начинаем с уже связанных комнат
            connected = new Set(alreadyConnected.map(r => r.id));
            unconnectedSet = new Set(unconnected.map(r => r.id));
        } else {
            // Начинаем с первой комнаты
            connected = new Set([rooms[0].id]);
            rooms[0].connected = true;
            unconnectedSet = new Set(rooms.slice(1).map(r => r.id));
        }
        
        while (unconnectedSet.size > 0) {
            let minDist = Infinity;
            let bestConnection = null;
            
            // Ищем ближайшую пару комнат
            for (const connectedId of connected) {
                const roomA = this.rooms.get(connectedId);
                
                for (const unconnectedId of unconnectedSet) {
                    const roomB = this.rooms.get(unconnectedId);
                    
                    const dist = this.getRoomDistance(roomA, roomB);
                    if (dist < minDist) {
                        minDist = dist;
                        bestConnection = { from: roomA, to: roomB };
                    }
                }
            }
            
            if (bestConnection) {
                // Проверяем, не добавлен ли уже этот коридор
                const corridorKey = `${bestConnection.from.id}-${bestConnection.to.id}`;
                const reverseKey = `${bestConnection.to.id}-${bestConnection.from.id}`;
                
                const exists = this.corridors.some(c => 
                    (c.from.id === bestConnection.from.id && c.to.id === bestConnection.to.id) ||
                    (c.from.id === bestConnection.to.id && c.to.id === bestConnection.from.id)
                );
                
                if (!exists) {
                    // Добавляем связь
                    bestConnection.from.connections.push(bestConnection.to.id);
                    bestConnection.to.connections.push(bestConnection.from.id);
                    bestConnection.from.connected = true;
                    bestConnection.to.connected = true;
                    
                    // Добавляем коридор
                    this.corridors.push({
                        from: bestConnection.from,
                        to: bestConnection.to
                    });
                }
                
                connected.add(bestConnection.to.id);
                unconnectedSet.delete(bestConnection.to.id);
            } else {
                break;
            }
        }
        
        // Добавляем дополнительные связи для лучшей связности (30%)
        const extraConnections = Math.floor(rooms.length * 0.3);
        for (let i = 0; i < extraConnections; i++) {
            const roomA = rooms[Math.floor(this.randomWithPosition(i, 123) * rooms.length)];
            const roomB = rooms[Math.floor(this.randomWithPosition(i, 456) * rooms.length)];
            
            if (roomA && roomB && roomA.id !== roomB.id && 
                !roomA.connections.includes(roomB.id)) {
                // Проверяем, не добавлен ли уже этот коридор
                const exists = this.corridors.some(c => 
                    (c.from.id === roomA.id && c.to.id === roomB.id) ||
                    (c.from.id === roomB.id && c.to.id === roomA.id)
                );
                
                if (!exists) {
                    roomA.connections.push(roomB.id);
                    roomB.connections.push(roomA.id);
                    this.corridors.push({ from: roomA, to: roomB });
                }
            }
        }
    }

    /**
     * Получение расстояния между комнатами
     */
    getRoomDistance(roomA, roomB) {
        const dx = (roomA.worldX + roomA.width/2) - (roomB.worldX + roomB.width/2);
        const dy = (roomA.worldY + roomA.height/2) - (roomB.worldY + roomB.height/2);
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Получение всех комнат в радиусе от позиции
     */
    getRoomsNear(x, y, radius) {
        const nearbyRooms = [];
        
        for (const [id, room] of this.rooms) {
            const centerX = room.worldX + room.width / 2;
            const centerY = room.worldY + room.height / 2;
            const dist = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));
            
            if (dist <= radius) {
                nearbyRooms.push(room);
            }
        }
        
        return nearbyRooms;
    }

    /**
     * Проверка, находится ли точка в комнате
     */
    isPointInRoom(x, y) {
        for (const [id, room] of this.rooms) {
            if (x >= room.worldX && x < room.worldX + room.width &&
                y >= room.worldY && y < room.worldY + room.height) {
                return room;
            }
        }
        return null;
    }

    /**
     * Проверка, находится ли точка в коридоре
     */
    isPointInCorridor(x, y) {
        for (const corridor of this.corridors) {
            if (this.isPointOnCorridor(x, y, corridor.from, corridor.to)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Проверка, находится ли точка на коридоре между двумя комнатами
     */
    isPointOnCorridor(x, y, roomA, roomB) {
        const padding = 2; // Ширина коридора
        
        const ax = roomA.worldX + roomA.width / 2;
        const ay = roomA.worldY + roomA.height / 2;
        const bx = roomB.worldX + roomB.width / 2;
        const by = roomB.worldY + roomB.height / 2;
        
        // Z-образный коридор
        // Горизонтальная часть
        const minX = Math.min(ax, bx);
        const maxX = Math.max(ax, bx);
        const minY = Math.min(ay, by);
        const maxY = Math.max(ay, by);
        
        // Проверяем горизонтальную часть (от ax к bx, на уровне ay)
        if (Math.abs(y - ay) <= padding && x >= minX - padding && x <= maxX + padding) {
            return true;
        }
        
        // Проверяем вертикальную часть (от ay к by, на уровне bx)
        if (Math.abs(x - bx) <= padding && y >= minY - padding && y <= maxY + padding) {
            return true;
        }
        
        return false;
    }

    /**
     * Проверка, является ли тайл проходимым
     */
    isTilePassable(x, y) {
        // Проверяем комнаты
        const room = this.isPointInRoom(x, y);
        if (room) return true;
        
        // Проверяем коридоры
        if (this.isPointInCorridor(x, y)) return true;
        
        return false;
    }
}

/**
 * Улучшенная система чанков со связной генерацией карты
 */
class ConnectedChunkSystem {
    constructor(chunkSize = 16) {
        this.chunkSize = chunkSize;
        this.chunks = new Map();
        this.activeChunks = new Set();
        this.worldMap = new WorldMap();
        
        // Радиусы загрузки
        this.loadRadius = 6;
        this.unloadRadius = 10;
        
        // Текущая область генерации
        this.currentCenterX = 0;
        this.currentCenterY = 0;
    }

    getChunkKey(chunkX, chunkY) {
        return `${chunkX},${chunkY}`;
    }

    /**
     * Получение чанка
     */
    getChunk(chunkX, chunkY) {
        const key = this.getChunkKey(chunkX, chunkY);
        if (!this.chunks.has(key)) {
            const chunk = new ConnectedChunk(chunkX, chunkY, this.chunkSize, this.worldMap);
            this.chunks.set(key, chunk);
        }
        return this.chunks.get(key);
    }

    /**
     * Получение тайла
     */
    getTile(x, y) {
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        
        const localX = x - chunkX * this.chunkSize;
        const localY = y - chunkY * this.chunkSize;
        
        const chunk = this.getChunk(chunkX, chunkY);
        
        if (!chunk.generated) {
            chunk.generate();
        }
        
        return chunk.tiles[localY][localX];
    }

    /**
     * Проверка проходимости
     */
    isPassable(x, y) {
        try {
            const tileType = this.getTile(x, y);
            return tileType === 0 || tileType === 6 || tileType === 7;
        } catch (e) {
            return false;
        }
    }

    /**
     * Загрузка чанков вокруг позиции
     */
    loadChunksAround(x, y, loadRadius = null, unloadRadius = null) {
        const centerX = Math.floor(x / this.chunkSize);
        const centerY = Math.floor(y / this.chunkSize);
        
        const effectiveLoadRadius = loadRadius !== null ? loadRadius : this.loadRadius;
        const effectiveUnloadRadius = unloadRadius !== null ? unloadRadius : this.unloadRadius;

        // Обновляем текущий центр
        this.currentCenterX = centerX;
        this.currentCenterY = centerY;

        // Сначала генерируем комнаты для всей области
        this.worldMap.generateRoomsInArea(centerX, centerY, effectiveLoadRadius);
        
        // Затем создаем связи между комнатами
        this.worldMap.createConnections(centerX, centerY, effectiveLoadRadius);

        // Загружаем чанки
        for (let dy = -effectiveLoadRadius; dy <= effectiveLoadRadius; dy++) {
            for (let dx = -effectiveLoadRadius; dx <= effectiveLoadRadius; dx++) {
                const chunkX = centerX + dx;
                const chunkY = centerY + dy;

                const chunk = this.getChunk(chunkX, chunkY);

                if (!chunk.generated) {
                    chunk.generate();
                }

                this.activeChunks.add(this.getChunkKey(chunkX, chunkY));
            }
        }

        // Выгружаем дальние чанки
        this.unloadChunksOutsideRadius(centerX, centerY, effectiveUnloadRadius);
    }

    /**
     * Выгрузка чанков за пределами радиуса
     */
    unloadChunksOutsideRadius(centerX, centerY, radius) {
        const chunksToDelete = [];

        for (const chunkKey of this.activeChunks) {
            const [chunkX, chunkY] = chunkKey.split(',').map(Number);
            const distance = Math.max(Math.abs(chunkX - centerX), Math.abs(chunkY - centerY));

            if (distance > radius) {
                chunksToDelete.push(chunkKey);
            }
        }

        for (const chunkKey of chunksToDelete) {
            this.activeChunks.delete(chunkKey);
        }
    }

    /**
     * Получение чанков для рендеринга
     */
    getChunksToRender(cameraX, cameraY, screenWidth, screenHeight, tileSize = 64) {
        const centerWorldX = cameraX + screenWidth / 2;
        const centerWorldY = cameraY + screenHeight / 2;
        
        const isoCoords = coordToIso(centerWorldX, centerWorldY);
        const centerChunkX = Math.floor(isoCoords.isoX / this.chunkSize);
        const centerChunkY = Math.floor(isoCoords.isoY / this.chunkSize);
        
        const tilesOnScreenX = Math.ceil(screenWidth / (tileSize / 2));
        const tilesOnScreenY = Math.ceil(screenHeight / (tileSize / 4));
        const renderRadius = Math.max(3, Math.ceil(Math.max(tilesOnScreenX, tilesOnScreenY) / this.chunkSize)) + 2;
        
        const chunksToRender = [];
        
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

/**
 * Чанк со связной генерацией
 */
class ConnectedChunk {
    constructor(chunkX, chunkY, size, worldMap) {
        this.chunkX = chunkX;
        this.chunkY = chunkY;
        this.size = size;
        this.worldMap = worldMap;
        this.tiles = null;
        this.generated = false;
        this.entities = [];
    }

    /**
     * Генерация чанка на основе глобальной карты мира
     */
    generate() {
        // Инициализируем карту стенами
        this.tiles = [];
        for (let y = 0; y < this.size; y++) {
            this.tiles[y] = [];
            for (let x = 0; x < this.size; x++) {
                this.tiles[y][x] = 1; // Стена
            }
        }
        
        const worldStartX = this.chunkX * this.size;
        const worldStartY = this.chunkY * this.size;
        
        // Вырезаем комнаты
        const chunkKey = this.worldMap.chunkRooms.get(`${this.chunkX},${this.chunkY}`);
        if (chunkKey) {
            for (const room of chunkKey) {
                this.carveRoom(room.worldX - worldStartX, room.worldY - worldStartY, 
                              room.width, room.height);
            }
        }
        
        // Вырезаем коридоры
        this.carveCorridors();
        
        // Добавляем биомы
        this.applyBiomes();
        
        this.generated = true;
    }

    /**
     * Вырезание комнаты
     */
    carveRoom(localX, localY, width, height) {
        for (let y = Math.max(0, localY); y < Math.min(this.size, localY + height); y++) {
            for (let x = Math.max(0, localX); x < Math.min(this.size, localX + width); x++) {
                this.tiles[y][x] = 0;
            }
        }
    }

    /**
     * Вырезание коридоров в чанке
     */
    carveCorridors() {
        const worldStartX = this.chunkX * this.size;
        const worldStartY = this.chunkY * this.size;
        
        // Проходим по всем коридорам мира и вырезаем те, что пересекают этот чанк
        for (const corridor of this.worldMap.corridors) {
            const roomA = corridor.from;
            const roomB = corridor.to;
            
            // Проверяем, пересекает ли коридор этот чанк
            this.carveCorridorInChunk(roomA, roomB, worldStartX, worldStartY);
        }
    }

    /**
     * Вырезание конкретного коридора в чанке
     */
    carveCorridorInChunk(roomA, roomB, worldStartX, worldStartY) {
        const ax = roomA.worldX + roomA.width / 2;
        const ay = roomA.worldY + roomA.height / 2;
        const bx = roomB.worldX + roomB.width / 2;
        const by = roomB.worldY + roomB.height / 2;
        
        const width = 2; // Ширина коридора
        
        // Z-образный путь: сначала горизонтально, затем вертикально
        
        // Горизонтальная часть (от ax к bx на уровне ay)
        const minX = Math.floor(Math.min(ax, bx));
        const maxX = Math.ceil(Math.max(ax, bx));
        const y = Math.floor(ay);
        
        for (let cx = minX; cx <= maxX; cx++) {
            for (let dy = -width; dy <= width; dy++) {
                const localX = cx - worldStartX;
                const localY = y + dy - worldStartY;
                
                if (localX >= 0 && localX < this.size && localY >= 0 && localY < this.size) {
                    this.tiles[localY][localX] = 0;
                }
            }
        }
        
        // Вертикальная часть (от ay к by на уровне bx)
        const minY = Math.floor(Math.min(ay, by));
        const maxY = Math.ceil(Math.max(ay, by));
        const x = Math.floor(bx);
        
        for (let cy = minY; cy <= maxY; cy++) {
            for (let dx = -width; dx <= width; dx++) {
                const localX = x + dx - worldStartX;
                const localY = cy - worldStartY;
                
                if (localX >= 0 && localX < this.size && localY >= 0 && localY < this.size) {
                    this.tiles[localY][localX] = 0;
                }
            }
        }
    }

    /**
     * Применение биомов к чанку
     */
    applyBiomes() {
        // Используем позицию чанка для определения биома
        const biomeRand = this.worldMap.randomWithPosition(this.chunkX, this.chunkY);
        const biomeType = this.getBiomeType(biomeRand);
        
        // Применяем биом к полу
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.tiles[y][x] === 0) { // Пол
                    const tileRand = this.worldMap.randomWithPosition(
                        this.chunkX * this.size + x, 
                        this.chunkY * this.size + y
                    );
                    
                    this.applyBiomeToTile(x, y, biomeType, tileRand);
                }
            }
        }
    }

    /**
     * Получение типа биома на основе случайного значения
     */
    getBiomeType(rand) {
        if (rand < 0.2) return 'forest';
        if (rand < 0.4) return 'desert';
        if (rand < 0.6) return 'mountain';
        if (rand < 0.8) return 'swamp';
        return 'ice';
    }

    /**
     * Применение биома к тайлу
     */
    applyBiomeToTile(x, y, biomeType, rand) {
        switch (biomeType) {
            case 'ice':
                // 10% шанс льда
                if (rand < 0.1) {
                    this.tiles[y][x] = 6;
                }
                break;
                
            case 'forest':
                // 12% шанс дерева (проверяем, чтобы не заблокировать проход)
                if (rand < 0.12 && !this.wouldBlockPassage(x, y, 3)) {
                    this.tiles[y][x] = 3;
                }
                break;
                
            case 'desert':
                // 8% шанс скалы
                if (rand < 0.08 && !this.wouldBlockPassage(x, y, 4)) {
                    this.tiles[y][x] = 4;
                }
                break;
                
            case 'mountain':
                // 25% шанс скалы
                if (rand < 0.25 && !this.wouldBlockPassage(x, y, 4)) {
                    this.tiles[y][x] = 4;
                }
                break;
                
            case 'swamp':
                // 15% шанс воды
                if (rand < 0.15 && !this.wouldBlockPassage(x, y, 5)) {
                    this.tiles[y][x] = 5;
                }
                break;
        }
    }

    /**
     * Проверка, заблокирует ли препятствие проход
     */
    wouldBlockPassage(x, y, obstacleType) {
        const original = this.tiles[y][x];
        this.tiles[y][x] = obstacleType;
        
        // Проверяем связность (упрощенно - только соседние клетки)
        let hasPassableNeighbor = false;
        const dirs = [[0,1], [0,-1], [1,0], [-1,0]];
        
        for (const [dx, dy] of dirs) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                if (this.tiles[ny][nx] === 0 || this.tiles[ny][nx] === 6 || this.tiles[ny][nx] === 7) {
                    hasPassableNeighbor = true;
                    break;
                }
            }
        }
        
        this.tiles[y][x] = original;
        return !hasPassableNeighbor;
    }

    isWithinBounds(x, y) {
        const chunkXStart = this.chunkX * this.size;
        const chunkXEnd = chunkXStart + this.size;
        const chunkYStart = this.chunkY * this.size;
        const chunkYEnd = chunkYStart + this.size;
        
        return x >= chunkXStart && x < chunkXEnd && y >= chunkYStart && y < chunkYEnd;
    }
}
