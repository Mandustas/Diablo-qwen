/**
 * TileBatchRenderer - система пакетного рендеринга тайлов
 * Оптимизация: один PIXI.Mesh на чанк вместо 256 отдельных спрайтов
 * Использует атлас текстур с UV-координатами
 */
class TileBatchRenderer {
    constructor(renderer) {
        this.renderer = renderer;
        
        // Кэш батчей для чанков
        this.batchCache = new Map();
        
        // Генератор атласа текстур
        this.atlasGenerator = null;
        
        // Текстура атласа
        this.atlasTexture = null;
        
        // Размер тайла
        this.tileSize = GAME_CONFIG.TILE.BASE_SIZE;
        
        // Размер чанка
        this.chunkSize = GAME_CONFIG.INITIAL_CHUNK_SIZE;
        
        // Кэш цветов для типов тайлов
        this.tileColors = this.initTileColors();
        
        // Флаг использования атласа
        this.useAtlas = true;
        
        // Счётчик для отладки
        this.stats = {
            batchesRendered: 0,
            tilesRendered: 0,
            cacheHits: 0,
            cacheMisses: 0,
            drawCalls: 0
        };
    }
    
    /**
     * Инициализация цветов для типов тайлов
     */
    initTileColors() {
        const colors = GAME_CONFIG.RENDERER.COLORS;
        return {
            0: this.hexToNumber(colors.FLOOR),
            1: this.hexToNumber(colors.WALL),
            2: this.hexToNumber(colors.WALL_DARK),
            3: this.hexToNumber(colors.TREE_LEAVES),
            4: this.hexToNumber(colors.ROCK),
            5: this.hexToNumber(colors.WATER),
            6: this.hexToNumber(colors.ICE),
            7: this.hexToNumber(colors.DECORATION)
        };
    }
    
    /**
     * Преобразование HEX в число
     */
    hexToNumber(hex) {
        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        }
        return parseInt(hex, 16);
    }
    
    /**
     * Инициализация атласа текстур
     */
    initAtlas() {
        if (this.atlasGenerator) return;
        
        // Создаём генератор атласа
        this.atlasGenerator = new TileAtlasGenerator();
        this.atlasGenerator.init(GAME_CONFIG.RENDERER.COLORS);
        
        // Создаём PIXI текстуру
        this.atlasTexture = this.atlasGenerator.createTexture(this.renderer.app.renderer);
        
        console.log('[TileBatchRenderer] Атлас инициализирован:', this.atlasGenerator.getInfo());
    }
    
    /**
     * Создание геометрии для чанка с UV-координатами
     * @param {Object} chunk - объект чанка
     * @returns {PIXI.Mesh} - Mesh объект с отрисованным чанком
     */
    createChunkBatch(chunk) {
        const chunkKey = `${chunk.chunkX},${chunk.chunkY}`;
        
        // Проверяем кэш
        if (this.batchCache.has(chunkKey)) {
            this.stats.cacheHits++;
            return this.batchCache.get(chunkKey);
        }
        
        this.stats.cacheMisses++;
        
        // Создаём геометрию для чанка
        const geometry = this.createChunkGeometry(chunk);
        
        // Создаём материал (шейдер)
        const shader = PIXI.Shader.from(`
            attribute vec2 aVertexPosition;
            attribute vec2 aTextureCoord;
            attribute vec4 aColor;
            
            uniform mat3 projectionMatrix;
            uniform mat3 worldTransform;
            
            varying vec2 vTextureCoord;
            varying vec4 vColor;
            
            void main(void) {
                vec2 worldPos = (worldTransform * vec3(aVertexPosition, 1.0)).xy;
                gl_Position = vec4((projectionMatrix * vec3(worldPos, 1.0)).xy, 0.0, 1.0);
                vTextureCoord = aTextureCoord;
                vColor = aColor;
            }
        `, `
            varying vec2 vTextureCoord;
            varying vec4 vColor;
            
            uniform sampler2D uSampler;
            
            void main(void) {
                vec4 texColor = texture2D(uSampler, vTextureCoord);
                gl_FragColor = texColor * vColor;
            }
        `, {
            uSampler: this.atlasTexture
        });
        
        // Создаём Mesh
        const mesh = new PIXI.Mesh(geometry, shader);
        mesh.chunkKey = chunkKey;
        
        this.stats.tilesRendered += chunk.tiles.length * chunk.tiles[0].length;
        
        // Кэшируем батч
        this.batchCache.set(chunkKey, mesh);
        
        return mesh;
    }
    
    /**
     * Создание геометрии для чанка
     * @param {Object} chunk - объект чанка
     * @returns {PIXI.Geometry} - геометрия с вершинами, UV и цветами
     */
    createChunkGeometry(chunk) {
        const vertices = [];
        const uvs = [];
        const colors = [];
        const indices = [];
        
        let vertexIndex = 0;
        
        for (let localY = 0; localY < chunk.tiles.length; localY++) {
            for (let localX = 0; localX < chunk.tiles[localY].length; localX++) {
                const tileType = chunk.tiles[localY][localX];
                
                // Вычисляем мировые координаты тайла
                const globalX = chunk.chunkX * this.chunkSize + localX;
                const globalY = chunk.chunkY * this.chunkSize + localY;
                
                // Преобразуем в экранные координаты
                const pos = this.renderer.isoTo2D(globalX, globalY);
                
                // Получаем UV-координаты для тайла
                const variation = this.getTileVariation(globalX, globalY, tileType);
                const uv = this.atlasGenerator.getTileUV(tileType, variation);
                
                // Создаём 4 вершины для изометрического тайла (ромб)
                const halfW = this.tileSize / 2;
                const halfH = this.tileSize / 4;
                
                // Вершины ромба (по часовой стрелке с верхней точки)
                // Верхняя вершина
                vertices.push(pos.x, pos.y - halfH);
                // Правая вершина
                vertices.push(pos.x + halfW, pos.y);
                // Нижняя вершина
                vertices.push(pos.x, pos.y + halfH);
                // Левая вершина
                vertices.push(pos.x - halfW, pos.y);
                
                // UV-координаты для ромба
                // Центр верхней грани
                uvs.push((uv.u0 + uv.u1) / 2, uv.v0);
                // Правый край
                uvs.push(uv.u1, (uv.v0 + uv.v1) / 2);
                // Центр нижней грани
                uvs.push((uv.u0 + uv.u1) / 2, uv.v1);
                // Левый край
                uvs.push(uv.u0, (uv.v0 + uv.v1) / 2);
                
                // Цвет вершины (белый по умолчанию, будет модифицироваться освещением)
                const color = 0xFFFFFFFF; // RGBA как float
                for (let i = 0; i < 4; i++) {
                    colors.push(1, 1, 1, 1); // RGBA
                }
                
                // Индексы для двух треугольников
                indices.push(
                    vertexIndex, vertexIndex + 1, vertexIndex + 2,
                    vertexIndex, vertexIndex + 2, vertexIndex + 3
                );
                
                vertexIndex += 4;
            }
        }
        
        // Создаём геометрию
        const geometry = new PIXI.Geometry();
        geometry.addAttribute('aVertexPosition', new Float32Array(vertices), 2);
        geometry.addAttribute('aTextureCoord', new Float32Array(uvs), 2);
        geometry.addAttribute('aColor', new Float32Array(colors), 4);
        geometry.addIndex(new Uint16Array(indices));
        
        return geometry;
    }
    
    /**
     * Получение вариации тайла на основе позиции (детерминированно)
     */
    getTileVariation(x, y, tileType) {
        // Используем координаты для детерминированного выбора вариации
        const hash = (x * 374761393 + y * 668265263) >>> 0;
        const variations = this.atlasGenerator.variations[tileType] || 1;
        return hash % variations;
    }
    
    /**
     * Получение или создание батча для чанка
     */
    getChunkBatch(chunk) {
        return this.createChunkBatch(chunk);
    }
    
    /**
     * Обновление освещения для батча чанка через vertex colors
     * @param {PIXI.Mesh} batch - батч чанка
     * @param {LightingSystem} lightingSystem - система освещения
     * @param {number} playerX - X координата игрока
     * @param {number} playerY - Y координата игрока
     */
    updateBatchLighting(batch, lightingSystem, playerX, playerY) {
        if (!lightingSystem || !batch.chunkKey || !batch.geometry) return;
        
        const colorsAttribute = batch.geometry.getAttribute('aColor');
        if (!colorsAttribute) return;
        
        const colors = colorsAttribute.data;
        const chunkKey = batch.chunkKey;
        const [chunkX, chunkY] = chunkKey.split(',').map(Number);
        
        // Обновляем цвет для каждой вершины
        let colorIndex = 0;
        
        for (let localY = 0; localY < this.chunkSize; localY++) {
            for (let localX = 0; localX < this.chunkSize; localX++) {
                const globalX = chunkX * this.chunkSize + localX;
                const globalY = chunkY * this.chunkSize + localY;
                const pos = this.renderer.isoTo2D(globalX, globalY);
                
                // Получаем освещённость
                const intensity = lightingSystem.getLightingAtPosition(pos.x, pos.y);
                const brightness = Math.max(0.2, Math.min(1, intensity));
                
                // Применяем ко всем 4 вершинам тайла
                for (let v = 0; v < 4; v++) {
                    colors[colorIndex++] = brightness;     // R
                    colors[colorIndex++] = brightness;     // G
                    colors[colorIndex++] = brightness;     // B
                    colors[colorIndex++] = 1;              // A
                }
            }
        }
        
        // Обновляем буфер
        colorsAttribute.update();
    }
    
    /**
     * Удаление батча чанка из кэша
     */
    removeChunkBatch(chunkKey) {
        const batch = this.batchCache.get(chunkKey);
        if (batch) {
            batch.destroy();
            this.batchCache.delete(chunkKey);
        }
    }
    
    /**
     * Очистка кэша батчей, которые далеко от игрока
     */
    cleanupDistantBatches(playerChunkX, playerChunkY, maxDistance = 10) {
        for (const [key, batch] of this.batchCache.entries()) {
            const [cx, cy] = key.split(',').map(Number);
            const distance = Math.abs(cx - playerChunkX) + Math.abs(cy - playerChunkY);
            
            if (distance > maxDistance) {
                this.removeChunkBatch(key);
            }
        }
    }
    
    /**
     * Полная очистка кэша
     */
    clearCache() {
        for (const [key, batch] of this.batchCache.entries()) {
            batch.destroy();
        }
        this.batchCache.clear();
        this.stats = {
            batchesRendered: 0,
            tilesRendered: 0,
            cacheHits: 0,
            cacheMisses: 0,
            drawCalls: 0
        };
    }
    
    /**
     * Рендеринг чанков с использованием batch rendering
     * @param {Array} chunks - массив чанков для рендеринга
     * @param {PIXI.Container} container - контейнер для добавления батчей
     * @returns {number} - количество отрендеренных батчей
     */
    renderChunks(chunks, container) {
        // Очищаем контейнер
        container.removeChildren();
        
        let batchesRendered = 0;
        
        for (const chunk of chunks) {
            if (!chunk || !chunk.tiles) continue;
            
            const batch = this.getChunkBatch(chunk);
            
            // Добавляем в контейнер
            container.addChild(batch);
            batchesRendered++;
        }
        
        this.stats.batchesRendered = batchesRendered;
        this.stats.drawCalls = batchesRendered; // Один draw call на чанк
        
        return batchesRendered;
    }
    
    /**
     * Получение статистики рендеринга
     */
    getStats() {
        return {
            ...this.stats,
            cacheSize: this.batchCache.size,
            atlasInfo: this.atlasGenerator ? this.atlasGenerator.getInfo() : null
        };
    }
    
    /**
     * Уничтожение ресурсов
     */
    destroy() {
        this.clearCache();
        
        if (this.atlasGenerator) {
            this.atlasGenerator.destroy();
            this.atlasGenerator = null;
        }
        
        if (this.atlasTexture) {
            this.atlasTexture.destroy(true);
            this.atlasTexture = null;
        }
    }
}