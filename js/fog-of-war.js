/**
 * FogOfWarSystem - система тумана войны
 * Управляет видимостью тайлов, исследованной территорией и затемнением
 */
class FogOfWarSystem {
    /**
     * Конструктор системы тумана войны
     * @param {LightingSystem} lightingSystem - система освещения
     * @param {ChunkSystem} chunkSystem - система чанков
     */
    constructor(lightingSystem, chunkSystem) {
        this.lightingSystem = lightingSystem;
        this.chunkSystem = chunkSystem;
        
        // Глобальный массив исследованных тайлов
        // key: "tileX,tileY" -> true
        this.explored = new Map();
        
        // Текущая маска видимости (обновляется каждый кадр)
        // key: "tileX,tileY" -> true
        this.visibilityMask = new Map();
        
        // Кэш видимости позиций для оптимизации
        this.positionVisibilityCache = new Map();
        this.cacheDirty = true;
        
        // Последняя позиция игрока для оптимизации обновления
        this.lastPlayerX = 0;
        this.lastPlayerY = 0;
        
        // Тайлсайт для оптимизации (обновляем только видимые тайлы)
        this.updateThreshold = GAME_CONFIG.TILE.BASE_SIZE / 2;
    }
    
    /**
     * Обновление маски видимости на основе позиции игрока и источников света
     * @param {number} playerX - X координата игрока в мировых координатах
     * @param {number} playerY - Y координата игрока в мировых координатах
     */
    updateVisibility(playerX, playerY) {
        // Проверяем, нужно ли обновлять (оптимизация)
        const dx = playerX - this.lastPlayerX;
        const dy = playerY - this.lastPlayerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.updateThreshold && !this.cacheDirty) {
            return; // Пропускаем обновление если игрок не переместился значительно
        }
        
        this.lastPlayerX = playerX;
        this.lastPlayerY = playerY;
        this.cacheDirty = false;
        
        // Очищаем старую маску видимости
        this.visibilityMask.clear();
        this.positionVisibilityCache.clear();
        
        // Получаем все активные источники света
        const lightSources = this.lightingSystem.getAllLightSources();
        
        // Получаем радиус освещения игрока
        const playerLight = this.lightingSystem.playerLight;
        if (!playerLight) return;
        
        const playerRadiusPixels = playerLight.getEffectiveRadius() * GAME_CONFIG.TILE.BASE_SIZE;
        
        // Определяем тайлы в радиусе видимости игрока
        const playerTilePos = getTileIndex(playerX, playerY);
        const playerRadiusTiles = Math.ceil(playerRadiusPixels / GAME_CONFIG.TILE.BASE_SIZE);
        
        // Проходим по всем тайлам в радиусе видимости игрока
        for (let ty = -playerRadiusTiles - 2; ty <= playerRadiusTiles + 2; ty++) {
            for (let tx = -playerRadiusTiles - 2; tx <= playerRadiusTiles + 2; tx++) {
                const tileX = playerTilePos.tileX + tx;
                const tileY = playerTilePos.tileY + ty;
                
                // Получаем мировые координаты центра тайла
                const worldPos = isoTo2D(tileX + 0.5, tileY + 0.5);
                
                // Проверяем освещённость от игрока
                const playerLightIntensity = this.lightingSystem.calculateLightIntensityFromSource(
                    playerLight, worldPos.x, worldPos.y, 0
                );
                
                // Если тайл освещён игроком, проверяем другие источники
                if (playerLightIntensity > 0.01) {
                    // Тайл виден
                    const key = `${tileX},${tileY}`;
                    this.visibilityMask.set(key, true);
                    this.markAsExplored(tileX, tileY);
                } else {
                    // Проверяем, освещается ли тайл другим источником, 
                    // который пересекается со светом игрока
                    
                    // Вычисляем расстояние от игрока до тайла
                    const distToPlayer = Math.sqrt(
                        Math.pow(worldPos.x - playerX, 2) + 
                        Math.pow(worldPos.y - playerY, 2)
                    );
                    
                    // Если тайл в пределах расширенного радиуса (с учётом других источников)
                    for (const light of lightSources) {
                        if (light.id === 'player_light' || !light.active) continue;
                        
                        const lightRadiusPixels = light.getEffectiveRadius() * GAME_CONFIG.TILE.BASE_SIZE;
                        const lightDistToPlayer = Math.sqrt(
                            Math.pow(light.x - playerX, 2) + 
                            Math.pow(light.y - playerY, 2)
                        );
                        
                        // Проверяем, пересекаются ли источники света
                        // (расстояние между ними меньше суммы радиусов)
                        if (lightDistToPlayer <= playerRadiusPixels + lightRadiusPixels) {
                            // Источники пересекаются, проверяем освещённость тайла
                            const lightIntensity = this.lightingSystem.calculateLightIntensityFromSource(
                                light, worldPos.x, worldPos.y, 0
                            );
                            
                            if (lightIntensity > 0.01) {
                                // Тайл виден через пересекающийся источник
                                const key = `${tileX},${tileY}`;
                                this.visibilityMask.set(key, true);
                                this.markAsExplored(tileX, tileY);
                                break;
                            }
                        }
                    }
                }
            }
        }
    }
    
    /**
     * Проверка видимости тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @returns {boolean} - виден ли тайл в данный момент
     */
    isTileVisible(tileX, tileY) {
        return this.visibilityMask.has(`${tileX},${tileY}`);
    }
    
    /**
     * Проверка исследованности тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @returns {boolean} - был ли тайл исследован
     */
    isTileExplored(tileX, tileY) {
        return this.explored.has(`${tileX},${tileY}`);
    }
    
    /**
     * Отметить тайл как исследованный
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     */
    markAsExplored(tileX, tileY) {
        const key = `${tileX},${tileY}`;
        if (!this.explored.has(key)) {
            this.explored.set(key, true);
        }
    }
    
    /**
     * Проверка видимости позиции в мировых координатах
     * Используется для врагов и предметов
     * @param {number} worldX - X координата в мире
     * @param {number} worldY - Y координата в мире
     * @returns {boolean} - видна ли позиция
     */
    isPositionVisible(worldX, worldY) {
        // Проверяем кэш
        const cacheKey = `${Math.floor(worldX)},${Math.floor(worldY)}`;
        if (this.positionVisibilityCache.has(cacheKey)) {
            return this.positionVisibilityCache.get(cacheKey);
        }
        
        // Получаем тайл позиции
        const tilePos = getTileIndex(worldX, worldY);
        const isVisible = this.isTileVisible(tilePos.tileX, tilePos.tileY);
        
        // Кэшируем результат
        this.positionVisibilityCache.set(cacheKey, isVisible);
        
        return isVisible;
    }
    
    /**
     * Получение множителя затемнения для тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @returns {number} - множитель яркости (0-1)
     */
    getTileBrightness(tileX, tileY) {
        const config = GAME_CONFIG.FOG_OF_WAR;
        
        if (!config.ENABLED) {
            return 1.0;
        }
        
        // Если тайл виден сейчас - полная яркость
        if (this.isTileVisible(tileX, tileY)) {
            return 1.0;
        }
        
        // Если тайл исследован - частичная яркость
        if (this.isTileExplored(tileX, tileY)) {
            return config.EXPLORED_DARKNESS;
        }
        
        // Если тайл не исследован - минимальная яркость
        return config.UNEXPLORED_DARKNESS;
    }
    
    /**
     * Получение цвета затемнения для тайла (для PIXI tint)
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @returns {number} - цвет в формате 0xRRGGBB
     */
    getTileTint(tileX, tileY) {
        const brightness = this.getTileBrightness(tileX, tileY);
        const value = Math.round(255 * brightness);
        return (value << 16) + (value << 8) + value;
    }
    
    /**
     * Применение тумана войны к спрайту тайла
     * @param {PIXI.Sprite} sprite - спрайт тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @param {number} baseTint - базовый цвет освещения (от LightingSystem)
     */
    applyFogToSprite(sprite, tileX, tileY, baseTint = null) {
        const config = GAME_CONFIG.FOG_OF_WAR;
        
        if (!config.ENABLED) {
            return;
        }
        
        const brightness = this.getTileBrightness(tileX, tileY);
        
        if (brightness >= 1.0) {
            // Полная видимость - используем только освещение
            if (baseTint !== null) {
                sprite.tint = baseTint;
            }
            return;
        }
        
        // Затемняем спрайт
        if (baseTint !== null) {
            // Комбинируем освещение с туманом войны
            const baseR = (baseTint >> 16) & 0xFF;
            const baseG = (baseTint >> 8) & 0xFF;
            const baseB = baseTint & 0xFF;
            
            const r = Math.round(baseR * brightness);
            const g = Math.round(baseG * brightness);
            const b = Math.round(baseB * brightness);
            
            sprite.tint = (r << 16) + (g << 8) + b;
        } else {
            // Только туман войны
            const value = Math.round(255 * brightness);
            sprite.tint = (value << 16) + (value << 8) + value;
        }
    }
    
    /**
     * Сброс кэша (при загрузке новых чанков и т.д.)
     */
    invalidateCache() {
        this.cacheDirty = true;
    }
    
    /**
     * Очистка данных (для новой игры)
     */
    clear() {
        this.explored.clear();
        this.visibilityMask.clear();
        this.positionVisibilityCache.clear();
        this.cacheDirty = true;
    }
    
    /**
     * Получение данных для сохранения
     * @returns {Object} - данные для сериализации
     */
    getSaveData() {
        return {
            explored: Array.from(this.explored.keys())
        };
    }
    
    /**
     * Загрузка данных из сохранения
     * @param {Object} data - данные сохранения
     */
    loadSaveData(data) {
        if (data && data.explored) {
            this.explored.clear();
            for (const key of data.explored) {
                this.explored.set(key, true);
            }
        }
    }
    
    /**
     * Получение статистики для отладки
     * @returns {Object} - статистика системы
     */
    getStats() {
        return {
            exploredTiles: this.explored.size,
            visibleTiles: this.visibilityMask.size,
            cacheSize: this.positionVisibilityCache.size
        };
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FogOfWarSystem;
} else if (typeof window !== 'undefined') {
    window.FogOfWarSystem = FogOfWarSystem;
}