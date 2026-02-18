/**
 * Система освещения на основе карт нормалей
 * Создаёт реалистичное статичное освещение вокруг источника света
 */
class LightingSystem {
    /**
     * Конструктор системы освещения
     * @param {Object} config - конфигурация освещения из GAME_CONFIG.LIGHTING
     */
    constructor(config = GAME_CONFIG.LIGHTING) {
        this.config = config;
        
        // Позиция источника света (в мировых координатах)
        this.lightSourceX = 0;
        this.lightSourceY = 0;
        
        // Радиус освещения в тайлах
        this.radius = config.DEFAULT_RADIUS;
        
        // Кэш значений освещения для оптимизации
        this.lightingCache = new Map();
        
        // Кэш для цветов тайлов
        this.tileColorCache = new Map();
        
        // Инициализация нормалей для типов тайлов
        this.initNormals();
        
        // Инициализация базовых цветов для типов тайлов
        this.initBaseColors();
    }
    
    /**
     * Инициализация нормалей для каждого типа тайла
     */
    initNormals() {
        this.normals = new Map();
        
        // Типы тайлов: 0-пол, 1-стена, 2-колонна, 3-дерево, 4-скала, 5-вода, 6-лёд, 7-декорация
        const tileTypes = ['FLOOR', 'WALL', 'COLUMN', 'TREE', 'ROCK', 'WATER', 'ICE', 'DECORATION'];
        
        for (let i = 0; i < tileTypes.length; i++) {
            const normal = this.config.TILE_NORMALS[tileTypes[i]];
            this.normals.set(i, this.normalizeVector(normal));
        }
    }
    
    /**
     * Инициализация базовых цветов для типов тайлов
     */
    initBaseColors() {
        this.baseColors = new Map();
        
        // Цвета из конфигурации рендерера
        const colors = GAME_CONFIG.RENDERER.COLORS;
        
        // Преобразуем HEX цвета в RGB
        this.baseColors.set(0, this.hexToRgb(colors.FLOOR));       // Пол
        this.baseColors.set(1, this.hexToRgb(colors.WALL));        // Стена
        this.baseColors.set(2, this.hexToRgb(colors.WALL_DARK));   // Колонна
        this.baseColors.set(3, this.hexToRgb(colors.TREE_LEAVES)); // Дерево
        this.baseColors.set(4, this.hexToRgb(colors.ROCK));        // Скала
        this.baseColors.set(5, this.hexToRgb(colors.WATER));       // Вода
        this.baseColors.set(6, this.hexToRgb(colors.ICE));         // Лёд
        this.baseColors.set(7, this.hexToRgb(colors.DECORATION));  // Декорация
    }
    
    /**
     * Установка позиции источника света
     * @param {number} x - X координата в мировых координатах
     * @param {number} y - Y координата в мировых координатах
     */
    setLightSource(x, y) {
        this.lightSourceX = x;
        this.lightSourceY = y;
        
        // Очищаем кэш при изменении позиции источника
        this.clearCache();
    }
    
    /**
     * Установка радиуса освещения
     * @param {number} radius - новый радиус в тайлах
     */
    setRadius(radius) {
        this.radius = Math.max(
            this.config.MIN_RADIUS,
            Math.min(this.config.MAX_RADIUS, radius)
        );
        
        // Очищаем кэш при изменении радиуса
        this.clearCache();
    }
    
    /**
     * Очистка кэша освещения
     */
    clearCache() {
        this.lightingCache.clear();
        this.tileColorCache.clear();
    }
    
    /**
     * Нормализация вектора
     * @param {Object} v - вектор {x, y, z}
     * @returns {Object} - нормализованный вектор
     */
    normalizeVector(v) {
        const length = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
        if (length === 0) return { x: 0, y: 0, z: 1 };
        return {
            x: v.x / length,
            y: v.y / length,
            z: v.z / length
        };
    }
    
    /**
     * Вычисление расстояния от источника света до тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @returns {number} - расстояние в тайлах
     */
    getDistanceToLight(tileX, tileY) {
        // Преобразуем координаты тайла в мировые координаты
        const tileWorldX = tileX * GAME_CONFIG.TILE_DIMENSIONS.WIDTH;
        const tileWorldY = tileY * GAME_CONFIG.TILE_DIMENSIONS.HEIGHT;
        
        const dx = tileWorldX - this.lightSourceX;
        const dy = tileWorldY - this.lightSourceY;
        
        // Возвращаем расстояние в "тайлах"
        return Math.sqrt(dx * dx + dy * dy) / GAME_CONFIG.TILE.BASE_SIZE;
    }
    
    /**
     * Вычисление направления от тайла к источнику света
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @returns {Object} - нормализованный вектор направления
     */
    getLightDirection(tileX, tileY) {
        const tileWorldX = tileX * GAME_CONFIG.TILE_DIMENSIONS.WIDTH;
        const tileWorldY = tileY * GAME_CONFIG.TILE_DIMENSIONS.HEIGHT;
        
        const dx = this.lightSourceX - tileWorldX;
        const dy = this.lightSourceY - tileWorldY;
        
        // Добавляем компонент Z для 3D эффекта (свет идёт сверху)
        const dz = GAME_CONFIG.TILE.BASE_SIZE * 2; // Высота источника света
        
        const length = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (length === 0) return { x: 0, y: 0, z: 1 };
        
        return {
            x: dx / length,
            y: dy / length,
            z: dz / length
        };
    }
    
    /**
     * Вычисление скалярного произведения двух векторов
     * @param {Object} a - первый вектор {x, y, z}
     * @param {Object} b - второй вектор {x, y, z}
     * @returns {number} - скалярное произведение
     */
    dotProduct(a, b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    
    /**
     * Вычисление интенсивности освещения для тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @param {number} tileType - тип тайла
     * @returns {number} - интенсивность от 0 до 1
     */
    calculateLighting(tileX, tileY, tileType) {
        // Проверяем кэш
        const cacheKey = `${tileX},${tileY},${tileType}`;
        if (this.lightingCache.has(cacheKey)) {
            return this.lightingCache.get(cacheKey);
        }
        
        // Вычисляем расстояние до источника света
        const distance = this.getDistanceToLight(tileX, tileY);
        
        // Если за пределами радиуса, возвращаем только фоновое освещение
        if (distance > this.radius) {
            return this.config.AMBIENT_LIGHT;
        }
        
        // Базовая интенсивность на основе расстояния (inverse square falloff)
        const normalizedDistance = distance / this.radius;
        const distanceIntensity = Math.pow(1 - normalizedDistance, this.config.FALLOFF);
        
        // Получаем нормаль тайла
        const normal = this.normals.get(tileType) || { x: 0, y: 0, z: 1 };
        
        // Получаем направление к источнику света
        const lightDir = this.getLightDirection(tileX, tileY);
        
        // Вычисляем dot product для определения угла падения света
        let dot = this.dotProduct(normal, lightDir);
        
        // Нормализуем dot product от -1..1 к 0..1
        dot = (dot + 1) / 2;
        
        // Комбинируем расстояние и угол падения
        let intensity = distanceIntensity * dot;
        
        // Применяем множитель яркости для типа тайла
        const tileTypes = ['FLOOR', 'WALL', 'COLUMN', 'TREE', 'ROCK', 'WATER', 'ICE', 'DECORATION'];
        const brightnessMultiplier = this.config.TILE_BRIGHTNESS[tileTypes[tileType]] || 1.0;
        intensity *= brightnessMultiplier;
        
        // Добавляем фоновое освещение
        intensity = Math.max(this.config.AMBIENT_LIGHT, intensity);
        
        // Ограничиваем от 0 до 1
        intensity = Math.max(0, Math.min(1, intensity));
        
        // Кэшируем результат
        this.lightingCache.set(cacheKey, intensity);
        
        return intensity;
    }
    
    /**
     * Преобразование HEX цвета в RGB
     * @param {string} hex - HEX цвет (например, '#1a1512')
     * @returns {Object} - объект {r, g, b}
     */
    hexToRgb(hex) {
        // Удаляем # если есть
        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        }
        
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    }
    
    /**
     * Преобразование RGB в HEX
     * @param {number} r - красный (0-255)
     * @param {number} g - зелёный (0-255)
     * @param {number} b - синий (0-255)
     * @returns {string} - HEX цвет
     */
    rgbToHex(r, g, b) {
        const toHex = (c) => {
            const hex = Math.max(0, Math.min(255, Math.round(c))).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return '#' + toHex(r) + toHex(g) + toHex(b);
    }
    
    /**
     * Получение освещённого цвета для тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @param {number} tileType - тип тайла
     * @returns {number} - цвет в формате PIXI (0xRRGGBB) для tint
     */
    getLitColor(tileX, tileY, tileType) {
        // Проверяем кэш
        const cacheKey = `${tileX},${tileY},${tileType}`;
        if (this.tileColorCache.has(cacheKey)) {
            return this.tileColorCache.get(cacheKey);
        }
        
        // Получаем интенсивность освещения
        const intensity = this.calculateLighting(tileX, tileY, tileType);
        
        // Получаем цвет света (тёплый оттенок)
        const lightColor = this.config.LIGHT_COLOR;
        
        // Рассчитываем tint на основе интенсивности
        // tint = 0xFFFFFF означает полную яркость (белый)
        // tint = 0x000000 означает полную темноту (чёрный)
        // Мы модулируем яркость от ambient (минимум) до 1.0 (максимум)
        
        // Базовая яркость от интенсивности (от AMBIENT_LIGHT до 1.0)
        const minBrightness = this.config.AMBIENT_LIGHT;
        const brightness = minBrightness + (1.0 - minBrightness) * intensity;
        
        // Применяем цвет света для тёплого оттенка
        // Умножаем каждый канал на соответствующий компонент цвета света
        const r = Math.round(255 * brightness * lightColor.R);
        const g = Math.round(255 * brightness * lightColor.G);
        const b = Math.round(255 * brightness * lightColor.B);
        
        // Преобразуем в формат PIXI (0xRRGGBB)
        const color = (r << 16) + (g << 8) + b;
        
        // Кэшируем результат
        this.tileColorCache.set(cacheKey, color);
        
        return color;
    }
    
    /**
     * Применение освещения к спрайту тайла
     * @param {PIXI.Sprite} sprite - спрайт тайла
     * @param {number} tileX - X координата тайла
     * @param {number} tileY - Y координата тайла
     * @param {number} tileType - тип тайла
     */
    applyLightingToSprite(sprite, tileX, tileY, tileType) {
        const litColor = this.getLitColor(tileX, tileY, tileType);
        sprite.tint = litColor;
    }
    
    /**
     * Получение интенсивности освещения для позиции в мировых координатах
     * @param {number} worldX - X координата в мире
     * @param {number} worldY - Y координата в мире
     * @returns {number} - интенсивность от 0 до 1
     */
    getLightingAtPosition(worldX, worldY) {
        // Преобразуем мировые координаты в координаты тайла
        const tileX = Math.floor(worldX / GAME_CONFIG.TILE.BASE_SIZE);
        const tileY = Math.floor(worldY / GAME_CONFIG.TILE.BASE_SIZE);
        
        // Вычисляем расстояние
        const dx = worldX - this.lightSourceX;
        const dy = worldY - this.lightSourceY;
        const distance = Math.sqrt(dx * dx + dy * dy) / GAME_CONFIG.TILE.BASE_SIZE;
        
        if (distance > this.radius) {
            return this.config.AMBIENT_LIGHT;
        }
        
        const normalizedDistance = distance / this.radius;
        const intensity = Math.pow(1 - normalizedDistance, this.config.FALLOFF);
        
        return Math.max(this.config.AMBIENT_LIGHT, intensity);
    }
    
    /**
     * Получение цвета затемнения для UI элементов (например, полосок здоровья)
     * @param {number} worldX - X координата в мире
     * @param {number} worldY - Y координата в мире
     * @returns {number} - множитель яркости от 0 до 1
     */
    getBrightnessMultiplier(worldX, worldY) {
        return this.getLightingAtPosition(worldX, worldY);
    }
    
    /**
     * Отрисовка отладочной визуализации освещения
     * @param {PIXI.Graphics} graphics - объект Graphics для отрисовки
     * @param {PIXI.Container} container - контейнер для добавления графики
     */
    drawDebugVisualization(graphics, container) {
        graphics.clear();
        
        // Рисуем круг освещения
        const radiusPixels = this.radius * GAME_CONFIG.TILE.BASE_SIZE;
        
        // Центр источника света
        graphics.beginFill(0xFFFF00, 0.3);
        graphics.drawCircle(this.lightSourceX, this.lightSourceY, 10);
        graphics.endFill();
        
        // Граница освещения
        graphics.lineStyle(2, 0xFFFF00, 0.5);
        graphics.drawCircle(this.lightSourceX, this.lightSourceY, radiusPixels);
        
        // Радиусы затухания
        for (let i = 0.25; i <= 0.75; i += 0.25) {
            graphics.lineStyle(1, 0xFFFF00, 0.2);
            graphics.drawCircle(this.lightSourceX, this.lightSourceY, radiusPixels * i);
        }
        
        container.addChild(graphics);
    }
    
    /**
     * Получение информации о системе освещения для отладки
     * @returns {Object} - информация о системе
     */
    getDebugInfo() {
        return {
            lightSourceX: this.lightSourceX.toFixed(2),
            lightSourceY: this.lightSourceY.toFixed(2),
            radius: this.radius,
            cacheSize: this.lightingCache.size,
            colorCacheSize: this.tileColorCache.size
        };
    }
}