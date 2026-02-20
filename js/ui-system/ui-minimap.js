/**
 * UIMinimap - миникарта на новой системе UI
 * Изящный дарк фентези стиль
 */
class UIMinimap extends UIComponent {
    constructor(game, config = {}) {
        super(config);

        this.game = game;

        // Размеры
        this.mapSize = 200;
        this.padding = 15;
        this.width = this.mapSize + this.padding * 2;
        this.height = this.mapSize + this.padding * 2 + 35; // + заголовок

        // Параметры миникарты
        this.scale = GAME_CONFIG.UI.MINIMAP.SCALE;

        // Позиционирование
        this.config.positionKey = 'minimap';

        // Контейнер для рендеринга карты
        this.mapGraphics = null;
        
        // Отдельный контейнер для маркеров (обновляется каждый кадр)
        this.markerGraphics = null;

        // Кэш отрисовки тайлов (не обновляется каждый кадр)
        this.tilesCacheValid = false;

        // Цвета для миникарты
        this.colors = {
            background: '#1a1414',
            border: '#3a2a1a',
            floor: '#3a2d1f',
            wall: '#2a1a0a',
            player: '#4a9eff',
            enemy: '#ff4a4a',
            enemyStrong: '#ff6600',
            enemyFast: '#ffff00',
            enemyTank: '#8b0000',
            tree: '#1a3a1a',
            rock: '#3a3a3a',
            water: '#1a3a5a',
            ice: '#8ab4d4',
            decor: '#3a4a2a',
            // Цвета тумана войны
            unexplored: '#0a0808',
            explored: '#1a1414'
        };
    }

    /**
     * Хук инициализации
     */
    onInit() {
        // Создаем контейнер для рендеринга карты (тайлы - кэш)
        this.mapGraphics = new PIXI.Graphics();
        this.mapGraphics.x = this.padding;
        this.mapGraphics.y = this.padding + 25; // После заголовка
        this.container.addChild(this.mapGraphics);

        // Создаем отдельный контейнер для маркеров (обновляется каждый кадр)
        this.markerGraphics = new PIXI.Graphics();
        this.markerGraphics.x = this.padding;
        this.markerGraphics.y = this.padding + 25;
        this.container.addChild(this.markerGraphics);

        // Рамка карты
        this.mapBorder = new PIXI.Graphics();
        this.mapBorder.x = this.padding;
        this.mapBorder.y = this.padding + 25;
        this.container.addChild(this.mapBorder);
    }

    /**
     * Отрисовка фона окна - изящный дарк фентези стиль
     */
    renderBackground() {
        if (!this.graphics) return;

        // Основной градиентный фон
        for (let i = 0; i < this.height; i++) {
            const t = i / (this.height - 1);
            const r1 = 26, g1 = 20, b1 = 20;
            const r2 = 13, g2 = 10, b2 = 10;
            const r = Math.round(r1 + (r2 - r1) * t);
            const gr = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            const color = (r << 16) + (gr << 8) + b;
            this.graphics.beginFill(color);
            this.graphics.drawRect(0, i, this.width, 1);
            this.graphics.endFill();
        }

        // Внешняя рамка
        this.graphics.lineStyle(2, 0x3a2a1a);
        this.graphics.drawRect(0, 0, this.width, this.height);

        // Толстая внешняя тень
        this.graphics.lineStyle(4, 0x000000, 0.4);
        this.graphics.drawRect(-3, -3, this.width + 6, this.height + 6);

        // Внутренняя тень
        this.graphics.lineStyle(2, 0x4a3a2a, 0.2);
        this.graphics.drawRect(3, 3, this.width - 6, this.height - 6);

        // Декоративные уголки
        this.drawCornerDecorations();

        // Заголовок и линия
        this.drawTitleBackground();
    }

    /**
     * Отрисовка декоративных уголков
     */
    drawCornerDecorations() {
        const cornerSize = 8;

        // Верхний левый
        this.graphics.lineStyle(2, 0x6a5a4a);
        this.graphics.moveTo(5, 5 + cornerSize);
        this.graphics.lineTo(5, 5);
        this.graphics.lineTo(5 + cornerSize, 5);

        // Верхний правый
        this.graphics.moveTo(this.width - 5 - cornerSize, 5);
        this.graphics.lineTo(this.width - 5, 5);
        this.graphics.lineTo(this.width - 5, 5 + cornerSize);

        // Нижний левый
        this.graphics.moveTo(5, this.height - 5 - cornerSize);
        this.graphics.lineTo(5, this.height - 5);
        this.graphics.lineTo(5 + cornerSize, this.height - 5);

        // Нижний правый
        this.graphics.moveTo(this.width - 5 - cornerSize, this.height - 5);
        this.graphics.lineTo(this.width - 5, this.height - 5);
        this.graphics.lineTo(this.width - 5, this.height - 5 - cornerSize);
    }

    /**
     * Отрисовка фона заголовка
     */
    drawTitleBackground() {
        // Линия под заголовком
        this.graphics.lineStyle(1, 0x3a2a1a);
        this.graphics.moveTo(this.padding, this.padding + 22);
        this.graphics.lineTo(this.width - this.padding, this.padding + 22);

        // Декоративная линия
        this.graphics.lineStyle(1, 0x6a5a4a, 0.5);
        this.graphics.moveTo(this.padding + 5, this.padding + 24);
        this.graphics.lineTo(this.width - this.padding - 5, this.padding + 24);

        // Рамка карты
        this.mapBorder.clear();
        this.mapBorder.lineStyle(1, 0x2a1a0a);
        this.mapBorder.drawRect(0, 0, this.mapSize, this.mapSize);
    }

    /**
     * Отрисовка заголовка
     */
    renderContent() {
        // Заголовок "МИНИКАРТА"
        const titleStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 14,
            fill: '#c9b896',
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1,
            dropShadowAngle: Math.PI / 4
        });

        const title = new PIXI.Text('МИНИКАРТА', titleStyle);
        title.anchor.set(0.5, 0);
        title.x = this.width / 2;
        title.y = this.padding;
        this.container.addChild(title);
    }

    /**
     * Основная отрисовка миникарты
     */
    renderMinimap() {
        if (!this.mapGraphics || !this.game) return;

        // Получаем позицию игрока в тайлах
        const playerTilePos = getTileIndex(this.game.character.x, this.game.character.y);

        // Проверяем, нужно ли перерисовывать тайлы (изменилась позиция игрока)
        if (!this.tilesCacheValid || 
            Math.abs(playerTilePos.tileX - this.lastPlayerTileX) > 1 || 
            Math.abs(playerTilePos.tileY - this.lastPlayerTileY) > 1) {
            this.renderMapTiles(playerTilePos.tileX, playerTilePos.tileY);
            this.lastPlayerTileX = playerTilePos.tileX;
            this.lastPlayerTileY = playerTilePos.tileY;
            this.tilesCacheValid = true;
        }

        // Обновляем маркеры каждый кадр
        this.renderMarkers(playerTilePos.tileX, playerTilePos.tileY);
    }

    /**
     * Отрисовка тайлов миникарты (кэшируется)
     */
    renderMapTiles(playerTileX, playerTileY) {
        const ctx = this.mapGraphics;
        ctx.clear();

        // Фон карты
        ctx.beginFill(0x0d0a0a);
        ctx.drawRect(0, 0, this.mapSize, this.mapSize);
        ctx.endFill();

        // Рисуем активные чанки
        this.drawActiveChunks(ctx, playerTileX, playerTileY);
    }

    /**
     * Отрисовка маркеров (игрок и враги - обновляется каждый кадр)
     */
    renderMarkers(playerTileX, playerTileY) {
        const ctx = this.markerGraphics;
        ctx.clear();

        // Рисуем врагов
        this.drawEnemiesIso(ctx, playerTileX, playerTileY);

        // Рисуем игрока в центре
        ctx.beginFill(this.hexToDecimal(this.colors.player));
        ctx.lineStyle(1, 0xffffff);
        ctx.drawCircle(this.mapSize / 2, this.mapSize / 2, 4);
    }

    /**
     * Преобразование изометрических координат тайла в координаты миникарты
     */
    tileToMinimapIso(tileX, tileY, playerTileX, playerTileY) {
        // Изометрическое преобразование
        const isoX = (tileX - tileY) * this.scale;
        const isoY = (tileX + tileY) * this.scale * 0.5;

        // Смещение относительно игрока
        const playerIsoX = (playerTileX - playerTileY) * this.scale;
        const playerIsoY = (playerTileX + playerTileY) * this.scale * 0.5;

        // Позиция на миникарте
        const mapX = this.mapSize / 2 + (isoX - playerIsoX);
        const mapY = this.mapSize / 2 + (isoY - playerIsoY);

        return { x: mapX, y: mapY };
    }

    /**
     * Рисование активных чанков на миникарте
     */
    drawActiveChunks(ctx, playerTileX, playerTileY) {
        const chunkSystem = this.game.chunkSystem;
        const fogOfWar = this.game.fogOfWar;
        const fogEnabled = GAME_CONFIG.FOG_OF_WAR.ENABLED && fogOfWar;

        // Проходим по всем активным чанкам
        for (const chunkKey of chunkSystem.activeChunks) {
            const chunk = chunkSystem.chunks.get(chunkKey);
            if (!chunk || !chunk.tiles) continue;

            const chunkX = chunk.chunkX;
            const chunkY = chunk.chunkY;
            const chunkSize = chunk.size;

            // Рисуем каждый тайл чанка
            for (let y = 0; y < chunk.tiles.length; y++) {
                for (let x = 0; x < chunk.tiles[y].length; x++) {
                    const worldTileX = chunkX * chunkSize + x;
                    const worldTileY = chunkY * chunkSize + y;

                    // Получаем позицию на миникарте
                    const pos = this.tileToMinimapIso(worldTileX, worldTileY, playerTileX, playerTileY);

                    // Проверяем границы миникарты
                    if (pos.x < -10 || pos.x > this.mapSize + 10 || pos.y < -10 || pos.y > this.mapSize + 10) {
                        continue;
                    }

                    // Проверяем туман войны
                    let fogColor = null;
                    if (fogEnabled) {
                        if (!fogOfWar.isTileExplored(worldTileX, worldTileY)) {
                            // Неисследованный тайл - полностью тёмный
                            fogColor = this.colors.unexplored;
                        } else if (!fogOfWar.isTileVisible(worldTileX, worldTileY)) {
                            // Исследованный, но не видимый сейчас - затемнённый
                            fogColor = this.colors.explored;
                        }
                    }

                    const tileType = chunk.tiles[y][x];

                    // Определяем цвет тайла
                    let color = null;
                    if (tileType === 0) { // Пол
                        color = this.colors.floor;
                    } else if (tileType === 1) { // Стена
                        color = this.colors.wall;
                    } else if (tileType === 3) { // Дерево
                        color = this.colors.tree;
                    } else if (tileType === 4) { // Скала
                        color = this.colors.rock;
                    } else if (tileType === 5) { // Вода
                        color = this.colors.water;
                    } else if (tileType === 6) { // Лед
                        color = this.colors.ice;
                    } else if (tileType === 7) { // Декорация
                        color = this.colors.decor;
                    }

                    if (fogColor) {
                        // Рисуем затемнённый тайл (туман войны)
                        ctx.beginFill(this.hexToDecimal(fogColor));
                        this.drawIsoTile(ctx, pos.x, pos.y, this.scale * 0.9);
                        ctx.endFill();
                    } else if (color) {
                        ctx.beginFill(this.hexToDecimal(color));
                        this.drawIsoTile(ctx, pos.x, pos.y, this.scale * 0.9);
                        ctx.endFill();
                    }
                }
            }
        }
    }

    /**
     * Рисование изометрического тайла на миникарте
     */
    drawIsoTile(ctx, x, y, size) {
        ctx.moveTo(x, y - size * 0.5);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size * 0.5);
        ctx.lineTo(x - size, y);
        ctx.closePath();
    }

    /**
     * Рисование врагов на миникарте с изометрической проекцией
     */
    drawEnemiesIso(ctx, playerTileX, playerTileY) {
        const fogOfWar = this.game.fogOfWar;
        const fogEnabled = GAME_CONFIG.FOG_OF_WAR.ENABLED && fogOfWar;

        for (const enemy of this.game.enemies) {
            // Проверяем видимость врага через туман войны
            if (fogEnabled && !fogOfWar.isPositionVisible(enemy.x, enemy.y)) {
                continue; // Пропускаем врагов в тумане войны
            }

            const enemyTilePos = getTileIndex(enemy.x, enemy.y);

            // Получаем позицию на миникарте
            const pos = this.tileToMinimapIso(enemyTilePos.tileX, enemyTilePos.tileY, playerTileX, playerTileY);

            // Проверяем границы миникарты
            if (pos.x < 0 || pos.x > this.mapSize || pos.y < 0 || pos.y > this.mapSize) {
                continue;
            }

            // Определяем цвет врага
            let enemyColor = this.colors.enemy;
            if (enemy.type === 'strong') {
                enemyColor = this.colors.enemyStrong;
            } else if (enemy.type === 'fast') {
                enemyColor = this.colors.enemyFast;
            } else if (enemy.type === 'tank') {
                enemyColor = this.colors.enemyTank;
            }

            ctx.beginFill(this.hexToDecimal(enemyColor));
            ctx.drawCircle(pos.x, pos.y, 3);
            ctx.endFill();
        }
    }

    /**
     * Преобразование HEX цвета в decimal
     */
    hexToDecimal(hexColor) {
        if (typeof hexColor === 'number') return hexColor;
        return parseInt(hexColor.replace('#', '0x'));
    }

    /**
     * Обновление миникарты
     */
    update() {
        this.renderMinimap();
    }

    /**
     * Хук при открытии
     */
    onOpen() {
        this.tilesCacheValid = false; // Сбрасываем кэш при открытии
        this.renderMinimap();
    }

    /**
     * Обновление при изменении
     */
    onUpdate() {
        this.renderMinimap();
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIMinimap;
} else if (typeof window !== 'undefined') {
    window.UIMinimap = UIMinimap;
}
