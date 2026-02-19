/**
 * TileAtlasGenerator - генератор атласа текстур для тайлов
 * Создаёт единую текстуру с UV-координатами для эффективного batch rendering
 */
class TileAtlasGenerator {
    constructor() {
        // Размер атласа
        this.atlasSize = 512;
        
        // Размер одного тайла в атласе
        this.tileSize = 64;
        
        // Padding между тайлами (для предотвращения артефактов)
        this.padding = 2;
        
        // Сгенерированный атлас
        this.atlasCanvas = null;
        this.atlasTexture = null;
        
        // UV-координаты для каждого типа тайла
        this.tileUVs = new Map();
        
        // Вариации тайлов (количество вариантов для каждого типа)
        this.variations = {
            0: 4,  // Floor
            1: 4,  // Wall
            2: 3,  // Column
            3: 3,  // Tree
            4: 3,  // Rock
            5: 4,  // Water
            6: 3,  // Ice
            7: 4   // Decoration
        };
        
        // Цвета из конфига
        this.colors = null;
    }
    
    /**
     * Инициализация генератора
     * @param {Object} configColors - цвета из GAME_CONFIG.RENDERER.COLORS
     */
    init(configColors) {
        this.colors = configColors;
        this.generateAtlas();
    }
    
    /**
     * Генерация атласа текстур
     */
    generateAtlas() {
        // Создаём canvas для атласа
        this.atlasCanvas = document.createElement('canvas');
        this.atlasCanvas.width = this.atlasSize;
        this.atlasCanvas.height = this.atlasSize;
        
        const ctx = this.atlasCanvas.getContext('2d');
        
        // Очищаем фон (прозрачный)
        ctx.clearRect(0, 0, this.atlasSize, this.atlasSize);
        
        // Рисуем все тайлы в атлас
        let currentX = 0;
        let currentY = 0;
        const totalSize = this.tileSize + this.padding * 2;
        const tilesPerRow = Math.floor(this.atlasSize / totalSize);
        
        for (let tileType = 0; tileType <= 7; tileType++) {
            const variations = this.variations[tileType] || 1;
            const uvs = [];
            
            for (let v = 0; v < variations; v++) {
                // Вычисляем позицию в атласе
                const x = currentX + this.padding;
                const y = currentY + this.padding;
                
                // Рисуем тайл
                this.drawTile(ctx, x, y, this.tileSize, tileType, v);
                
                // Вычисляем UV-координаты (нормализованные 0-1)
                const u0 = x / this.atlasSize;
                const v0 = y / this.atlasSize;
                const u1 = (x + this.tileSize) / this.atlasSize;
                const v1 = (y + this.tileSize) / this.atlasSize;
                
                uvs.push({ u0, v0, u1, v1, variation: v });
                
                // Переходим к следующей позиции
                currentX += totalSize;
                if (currentX + totalSize > this.atlasSize) {
                    currentX = 0;
                    currentY += totalSize;
                }
            }
            
            this.tileUVs.set(tileType, uvs);
        }
        
        console.log('[TileAtlasGenerator] Атлас сгенерирован:', {
            size: this.atlasSize,
            tileSize: this.tileSize,
            totalTiles: Array.from(this.tileUVs.values()).reduce((sum, arr) => sum + arr.length, 0)
        });
    }
    
    /**
     * Рисование тайла на canvas
     */
    drawTile(ctx, x, y, size, tileType, variation) {
        const halfW = size / 2;
        const halfH = size / 4;
        
        switch (tileType) {
            case 0: this.drawFloorTile(ctx, x, y, size, variation); break;
            case 1: this.drawWallTile(ctx, x, y, size, variation); break;
            case 2: this.drawColumnTile(ctx, x, y, size, variation); break;
            case 3: this.drawTreeTile(ctx, x, y, size, variation); break;
            case 4: this.drawRockTile(ctx, x, y, size, variation); break;
            case 5: this.drawWaterTile(ctx, x, y, size, variation); break;
            case 6: this.drawIceTile(ctx, x, y, size, variation); break;
            case 7: this.drawDecorationTile(ctx, x, y, size, variation); break;
        }
    }
    
    /**
     * Преобразование HEX в RGBA
     */
    hexToRgba(hex, alpha = 1) {
        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        }
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }
    
    /**
     * Получение цвета с вариацией
     */
    getColorWithVariation(baseColor, variation, amount = 15) {
        if (baseColor.startsWith('#')) {
            baseColor = baseColor.substring(1);
        }
        let r = parseInt(baseColor.substring(0, 2), 16);
        let g = parseInt(baseColor.substring(2, 4), 16);
        let b = parseInt(baseColor.substring(4, 6), 16);
        
        // Добавляем вариацию
        const offset = (variation - 1) * amount - amount;
        r = Math.max(0, Math.min(255, r + offset));
        g = Math.max(0, Math.min(255, g + offset));
        b = Math.max(0, Math.min(255, b + offset));
        
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    /**
     * Рисование пола
     */
    drawFloorTile(ctx, x, y, size, variation) {
        const halfW = size / 2;
        const halfH = size / 4;
        const centerX = x + halfW;
        const centerY = y + halfH;
        
        // Основной цвет с вариацией
        const baseColor = this.getColorWithVariation(this.colors.FLOOR, variation, 10);
        
        // Рисуем изометрический ромб
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(x + size, centerY);
        ctx.lineTo(centerX, y + halfH * 2);
        ctx.lineTo(x, centerY);
        ctx.closePath();
        
        ctx.fillStyle = this.hexToRgba(baseColor);
        ctx.fill();
        
        // Затемнение к центру
        ctx.beginPath();
        ctx.moveTo(centerX, y + halfH * 0.4);
        ctx.lineTo(x + size * 0.7, centerY + halfH * 0.3);
        ctx.lineTo(centerX, y + halfH * 1.8);
        ctx.lineTo(x + size * 0.3, centerY + halfH * 0.3);
        ctx.closePath();
        ctx.fillStyle = 'rgba(10,8,6,0.25)';
        ctx.fill();
        
        // Текстура камня (случайные точки)
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        const seed = variation * 100;
        for (let i = 0; i < 8; i++) {
            const px = x + this.seededRandom(seed + i) * size;
            const py = y + this.seededRandom(seed + i + 50) * size * 0.5 + halfH * 0.5;
            ctx.beginPath();
            ctx.arc(px, py, 1 + this.seededRandom(seed + i + 100) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Рисование стены
     */
    drawWallTile(ctx, x, y, size, variation) {
        const halfW = size / 2;
        const halfH = size / 4;
        const centerX = x + halfW;
        const centerY = y + halfH;
        const depth = size * 0.3;
        
        const baseColor = this.getColorWithVariation(this.colors.WALL, variation, 8);
        const darkColor = this.colors.WALL_DARK || '#1a1512';
        
        // Правая грань (темнее)
        ctx.beginPath();
        ctx.moveTo(x + size, centerY);
        ctx.lineTo(x + size, centerY + depth);
        ctx.lineTo(centerX, y + halfH * 2 + depth);
        ctx.lineTo(centerX, y + halfH * 2);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(darkColor, 0.8);
        ctx.fill();
        
        // Левая грань (ещё темнее)
        ctx.beginPath();
        ctx.moveTo(x, centerY);
        ctx.lineTo(x, centerY + depth);
        ctx.lineTo(centerX, y + halfH * 2 + depth);
        ctx.lineTo(centerX, y + halfH * 2);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(darkColor, 0.6);
        ctx.fill();
        
        // Верхняя грань
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(x + size, centerY);
        ctx.lineTo(centerX, y + halfH * 2);
        ctx.lineTo(x, centerY);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(baseColor);
        ctx.fill();
        
        // Текстура камня
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        const seed = variation * 200;
        for (let i = 0; i < 5; i++) {
            const px = x + this.seededRandom(seed + i) * size;
            const py = y + halfH * 0.5 + this.seededRandom(seed + i + 50) * halfH;
            ctx.beginPath();
            ctx.arc(px, py, 2 + this.seededRandom(seed + i + 100) * 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    /**
     * Рисование колонны
     */
    drawColumnTile(ctx, x, y, size, variation) {
        const halfW = size * 0.15;
        const height = size * 0.6;
        const centerX = x + size / 2;
        const centerY = y + size / 4;
        
        const baseColor = this.getColorWithVariation(this.colors.WALL_DARK, variation, 5);
        
        // Тень
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + size * 0.15, size * 0.2, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,8,6,0.4)';
        ctx.fill();
        
        // Тело колонны
        ctx.beginPath();
        ctx.moveTo(centerX - halfW, centerY - height * 0.3);
        ctx.lineTo(centerX + halfW, centerY - height * 0.2);
        ctx.lineTo(centerX + halfW * 0.8, centerY + size * 0.1);
        ctx.lineTo(centerX - halfW * 0.8, centerY + size * 0.1);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(baseColor);
        ctx.fill();
        
        // Капитель
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - height * 0.35, halfW * 1.5, halfW * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(this.colors.WALL);
        ctx.fill();
    }
    
    /**
     * Рисование дерева
     */
    drawTreeTile(ctx, x, y, size, variation) {
        const centerX = x + size / 2;
        const centerY = y + size / 4;
        
        const leavesColor = this.getColorWithVariation(this.colors.TREE_LEAVES, variation, 12);
        const trunkColor = this.colors.TREE_TRUNK || '#4a3728';
        
        // Тень
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + size * 0.1, size * 0.2, size * 0.08, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,8,6,0.3)';
        ctx.fill();
        
        // Ствол
        ctx.fillStyle = this.hexToRgba(trunkColor);
        ctx.fillRect(centerX - size * 0.05, centerY - size * 0.15, size * 0.1, size * 0.25);
        
        // Крона (несколько кругов)
        ctx.fillStyle = this.hexToRgba(leavesColor, 0.9);
        ctx.beginPath();
        ctx.arc(centerX, centerY - size * 0.25, size * 0.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX - size * 0.12, centerY - size * 0.18, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(centerX + size * 0.12, centerY - size * 0.18, size * 0.15, 0, Math.PI * 2);
        ctx.fill();
    }
    
    /**
     * Рисование скалы
     */
    drawRockTile(ctx, x, y, size, variation) {
        const centerX = x + size / 2;
        const centerY = y + size / 4;
        
        const baseColor = this.getColorWithVariation(this.colors.ROCK, variation, 10);
        
        // Тень
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + size * 0.1, size * 0.25, size * 0.1, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,8,6,0.3)';
        ctx.fill();
        
        // Основная форма (неправильный многоугольник)
        ctx.beginPath();
        const seed = variation * 300;
        ctx.moveTo(centerX - size * 0.25, centerY + size * 0.05);
        ctx.lineTo(centerX - size * 0.15, centerY - size * 0.1);
        ctx.lineTo(centerX, centerY - size * 0.15);
        ctx.lineTo(centerX + size * 0.2, centerY - size * 0.05);
        ctx.lineTo(centerX + size * 0.25, centerY + size * 0.08);
        ctx.lineTo(centerX, centerY + size * 0.12);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(baseColor);
        ctx.fill();
        
        // Блики
        ctx.beginPath();
        ctx.arc(centerX - size * 0.08, centerY - size * 0.05, size * 0.05, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(61,48,40,0.5)';
        ctx.fill();
    }
    
    /**
     * Рисование воды
     */
    drawWaterTile(ctx, x, y, size, variation) {
        const halfW = size / 2;
        const halfH = size / 4;
        const centerX = x + halfW;
        const centerY = y + halfH;
        
        const baseColor = this.getColorWithVariation(this.colors.WATER, variation, 8);
        
        // Основная вода (изометрический ромб)
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(x + size, centerY);
        ctx.lineTo(centerX, y + halfH * 2);
        ctx.lineTo(x, centerY);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(baseColor);
        ctx.fill();
        
        // Волны/блики
        ctx.fillStyle = 'rgba(42,63,79,0.4)';
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, size * 0.15, size * 0.05, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Дополнительные блики в зависимости от вариации
        if (variation % 2 === 0) {
            ctx.beginPath();
            ctx.ellipse(centerX - size * 0.15, centerY - halfH * 0.3, size * 0.08, size * 0.03, 0.3, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(100,150,180,0.3)';
            ctx.fill();
        }
    }
    
    /**
     * Рисование льда
     */
    drawIceTile(ctx, x, y, size, variation) {
        const halfW = size / 2;
        const halfH = size / 4;
        const centerX = x + halfW;
        const centerY = y + halfH;
        
        const baseColor = this.getColorWithVariation(this.colors.ICE, variation, 6);
        
        // Основной лёд
        ctx.beginPath();
        ctx.moveTo(centerX, y);
        ctx.lineTo(x + size, centerY);
        ctx.lineTo(centerX, y + halfH * 2);
        ctx.lineTo(x, centerY);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(baseColor);
        ctx.fill();
        
        // Трещины
        ctx.strokeStyle = 'rgba(61,79,85,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(centerX - size * 0.15, centerY - halfH * 0.3);
        ctx.lineTo(centerX + size * 0.1, centerY + halfH * 0.2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - halfH * 0.4);
        ctx.lineTo(centerX + size * 0.1, centerY + halfH * 0.3);
        ctx.stroke();
    }
    
    /**
     * Рисование декорации
     */
    drawDecorationTile(ctx, x, y, size, variation) {
        const centerX = x + size / 2;
        const centerY = y + size / 4;
        
        const baseColor = this.getColorWithVariation(this.colors.DECORATION, variation, 10);
        
        // Тень
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + size * 0.08, size * 0.12, size * 0.05, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10,8,6,0.3)';
        ctx.fill();
        
        // Трава/куст (разные формы в зависимости от вариации)
        ctx.fillStyle = this.hexToRgba(baseColor, 0.8);
        
        const seed = variation * 400;
        for (let i = 0; i < 5; i++) {
            const gx = centerX + (this.seededRandom(seed + i) - 0.5) * size * 0.3;
            const gy = centerY + size * 0.05;
            const gh = size * (0.08 + this.seededRandom(seed + i + 50) * 0.06);
            
            ctx.beginPath();
            ctx.moveTo(gx, gy);
            ctx.quadraticCurveTo(gx + 2, gy - gh, gx + 4, gy);
            ctx.fill();
        }
    }
    
    /**
     * Детерминированный random для консистентности
     */
    seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }
    
    /**
     * Создание PIXI текстуры из canvas
     * @param {PIXI.Renderer} renderer - PIXI рендерер
     * @returns {PIXI.Texture}
     */
    createTexture(renderer) {
        if (!this.atlasCanvas) {
            console.error('[TileAtlasGenerator] Атлас не сгенерирован');
            return null;
        }
        
        // Создаём базовую текстуру из canvas
        const baseTexture = PIXI.BaseTexture.from(this.atlasCanvas);
        this.atlasTexture = new PIXI.Texture(baseTexture);
        
        console.log('[TileAtlasGenerator] Текстура создана');
        return this.atlasTexture;
    }
    
    /**
     * Получение UV-координат для типа тайла
     * @param {number} tileType - тип тайла (0-7)
     * @param {number} variation - вариация (0-based)
     * @returns {Object} UV координаты {u0, v0, u1, v1}
     */
    getTileUV(tileType, variation = 0) {
        const uvs = this.tileUVs.get(tileType);
        if (!uvs || uvs.length === 0) {
            console.warn(`[TileAtlasGenerator] Нет UV для типа ${tileType}`);
            return { u0: 0, v0: 0, u1: 1, v1: 1 };
        }
        
        const index = variation % uvs.length;
        return uvs[index];
    }
    
    /**
     * Получение случайной вариации для типа тайла
     * @param {number} tileType - тип тайла
     * @returns {number} индекс вариации
     */
    getRandomVariation(tileType) {
        const variations = this.variations[tileType] || 1;
        return Math.floor(Math.random() * variations);
    }
    
    /**
     * Получение информации об атласе
     */
    getInfo() {
        return {
            atlasSize: this.atlasSize,
            tileSize: this.tileSize,
            totalVariations: Array.from(this.tileUVs.values()).reduce((sum, arr) => sum + arr.length, 0),
            variations: Object.fromEntries(this.tileUVs)
        };
    }
    
    /**
     * Уничтожение ресурсов
     */
    destroy() {
        if (this.atlasTexture) {
            this.atlasTexture.destroy(true);
            this.atlasTexture = null;
        }
        this.tileUVs.clear();
    }
}