/**
 * UIMapWindow - большое окно карты мира
 * Изящный дарк фентези стиль, соответствует дизайну других окон
 * Изометрическая проекция как у миникарты
 */
class UIMapWindow extends UIComponent {
    constructor(game, config = {}) {
        super(config);

        this.game = game;

        // Размеры окна (большое окно)
        this.width = 900;
        this.height = 650;
        this.padding = 20;

        // Позиционирование по центру
        this.config.positionKey = 'map';

        // Параметры карты
        this.mapZoom = 1.0;
        this.minZoom = 0.3;
        this.maxZoom = 3.0;
        this.zoomStep = 0.1;
        this.tileScale = 4; // Размер тайла на карте

        // Панель карты
        this.mapPanelWidth = this.width - this.padding * 2;
        this.mapPanelHeight = this.height - 100;

        // Кеш данных карты
        this.mapData = new Map();
        this.lastPlayerTile = { x: 0, y: 0 };

        // Цвета тайлов для карты
        this.tileColors = {
            0: 0x4a5a4a,  // пол - светло-серый с зелёным оттенком
            1: 0x1a1a1a,  // стена - почти чёрный
            2: 0x2a2a2a,  // колонна - тёмно-серый
            3: 0x2d6a2d,  // дерево - зелёный
            4: 0x6a6a6a,  // скала - светло-серый
            5: 0x2a4a7a,  // вода - синий
            6: 0x7abada,  // лёд - голубой
            7: 0x4a4a4a   // декорация - серый
        };
    }

    /**
     * Хук инициализации
     */
    onInit() {
        // Создаем контейнер для карты
        this.mapContainer = new PIXI.Container();
        this.mapContainer.x = this.padding;
        this.mapContainer.y = 60;
        this.container.addChild(this.mapContainer);

        // Создаем маску для обрезки карты
        this.createMapMask();

        // Создаем контейнер для содержимого карты (с зумом)
        this.mapContent = new PIXI.Container();
        this.mapContainer.addChild(this.mapContent);

        // Графика для отрисовки карты
        this.mapGraphics = new PIXI.Graphics();
        this.mapContent.addChild(this.mapGraphics);

        // Маркер игрока
        this.playerMarker = this.createPlayerMarker();
        this.mapContent.addChild(this.playerMarker);

        // Контейнер для маркеров врагов
        this.enemyMarkers = new PIXI.Container();
        this.mapContent.addChild(this.enemyMarkers);

        // Текст с информацией
        this.infoText = new PIXI.Text('', {
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 12,
            fill: '#8a7a6a',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1
        });
        this.infoText.x = this.padding;
        this.infoText.y = this.height - 35;
        this.container.addChild(this.infoText);

        // Настройка событий
        this.setupEvents();
    }

    /**
     * Создание маски для карты
     */
    createMapMask() {
        this.mapMask = new PIXI.Graphics();
        this.mapMask.beginFill(0xffffff);
        this.mapMask.drawRect(0, 0, this.mapPanelWidth, this.mapPanelHeight);
        this.mapMask.endFill();
        this.mapContainer.addChild(this.mapMask);
        this.mapContainer.mask = this.mapMask;
    }

    /**
     * Создание маркера игрока
     */
    createPlayerMarker() {
        const marker = new PIXI.Container();

        // Внешний круг
        const outerCircle = new PIXI.Graphics();
        outerCircle.beginFill(0xFFD700, 0.3);
        outerCircle.drawCircle(0, 0, 12);
        outerCircle.endFill();
        marker.addChild(outerCircle);

        // Внутренний круг
        const innerCircle = new PIXI.Graphics();
        innerCircle.beginFill(0xFFD700);
        innerCircle.drawCircle(0, 0, 6);
        innerCircle.endFill();
        marker.addChild(innerCircle);

        // Направление взгляда
        const direction = new PIXI.Graphics();
        direction.lineStyle(2, 0xFFD700);
        direction.moveTo(0, 0);
        direction.lineTo(0, -15);
        marker.addChild(direction);

        marker.outerCircle = outerCircle;
        marker.direction = direction;

        return marker;
    }

    /**
     * Настройка событий
     */
    setupEvents() {
        // Интерактивность для зума
        this.container.eventMode = 'static';

        // Зум колесиком мыши с остановкой всплытия
        this.container.on('wheel', (e) => {
            // Останавливаем всплытие, чтобы зум игры не срабатывал
            e.stopPropagation();
            this.handleZoom(e);
        });

        // Перетаскивание карты
        this.setupDragging();
    }

    /**
     * Настройка перетаскивания карты
     */
    setupDragging() {
        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let mapStart = { x: 0, y: 0 };

        this.mapContainer.eventMode = 'static';
        this.mapContainer.cursor = 'grab';

        this.mapContainer.on('pointerdown', (e) => {
            isDragging = true;
            this.mapContainer.cursor = 'grabbing';
            dragStart = { x: e.global.x, y: e.global.y };
            mapStart = { x: this.mapContent.x, y: this.mapContent.y };
        });

        this.mapContainer.on('pointermove', (e) => {
            if (!isDragging) return;

            const dx = e.global.x - dragStart.x;
            const dy = e.global.y - dragStart.y;

            this.mapContent.x = mapStart.x + dx;
            this.mapContent.y = mapStart.y + dy;
        });

        this.mapContainer.on('pointerup', () => {
            isDragging = false;
            this.mapContainer.cursor = 'grab';
        });

        this.mapContainer.on('pointerupoutside', () => {
            isDragging = false;
            this.mapContainer.cursor = 'grab';
        });
    }

    /**
     * Обработка зума колесиком
     */
    handleZoom(e) {
        const delta = e.deltaY > 0 ? -this.zoomStep : this.zoomStep;
        const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.mapZoom + delta));

        if (newZoom !== this.mapZoom) {
            // Получаем позицию курсора относительно контейнера карты (в экранных координатах)
            const cursorX = e.global.x;
            const cursorY = e.global.y;
            
            // Вычисляем позицию курсора в локальных координатах mapContent до зума
            // Сначала переводим в координаты mapContainer
            const localX = cursorX - this.mapContainer.worldTransform.tx;
            const localY = cursorY - this.mapContainer.worldTransform.ty;
            
            // Затем учитываем текущие смещение и масштаб mapContent
            const pointBeforeX = (localX - this.mapContent.x) / this.mapZoom;
            const pointBeforeY = (localY - this.mapContent.y) / this.mapZoom;

            // Применяем новый зум
            this.mapZoom = newZoom;
            this.mapContent.scale.set(this.mapZoom);

            // Вычисляем новую позицию так, чтобы точка под курсором осталась на месте
            const pointAfterX = pointBeforeX * this.mapZoom;
            const pointAfterY = pointBeforeY * this.mapZoom;
            
            this.mapContent.x = localX - pointAfterX;
            this.mapContent.y = localY - pointAfterY;

            // Обновляем текст зума
            this.updateZoomText();
        }
    }

    /**
     * Обновление текста зума
     */
    updateZoomText() {
        if (this.zoomText) {
            this.zoomText.text = `Зум: ${Math.round(this.mapZoom * 100)}%`;
        }
    }

    /**
     * Хук при открытии
     */
    onOpen() {
        this.updateMap();
        this.centerOnPlayer();
    }

    /**
     * Центрирование карты на игроке
     */
    centerOnPlayer() {
        if (!this.game.character) return;

        const tilePos = getTileIndex(this.game.character.x, this.game.character.y);
        
        // Изометрические координаты игрока
        const playerIsoX = (tilePos.tileX - tilePos.tileY) * this.tileScale;
        const playerIsoY = (tilePos.tileX + tilePos.tileY) * this.tileScale * 0.5;

        this.mapContent.x = this.mapPanelWidth / 2 - playerIsoX * this.mapZoom;
        this.mapContent.y = this.mapPanelHeight / 2 - playerIsoY * this.mapZoom;
    }

    /**
     * Преобразование координат тайла в изометрические координаты карты
     */
    tileToMapIso(tileX, tileY) {
        const isoX = (tileX - tileY) * this.tileScale;
        const isoY = (tileX + tileY) * this.tileScale * 0.5;
        return { x: isoX, y: isoY };
    }

    /**
     * Обновление карты
     */
    updateMap() {
        if (!this.game.chunkSystem) return;

        // Очищаем графику
        this.mapGraphics.clear();

        // Собираем данные о тайлах
        this.collectMapData();

        // Рисуем карту
        this.renderMapTiles();

        // Обновляем маркер игрока
        this.updatePlayerMarker();

        // Обновляем маркеры врагов
        this.updateEnemyMarkers();

        // Обновляем информацию
        this.updateInfo();
    }

    /**
     * Сбор данных карты из чанков
     */
    collectMapData() {
        const chunkSystem = this.game.chunkSystem;

        // Проходим по всем активным чанкам
        for (const chunkKey of chunkSystem.activeChunks) {
            const chunk = chunkSystem.chunks.get(chunkKey);
            if (!chunk || !chunk.tiles || !chunk.generated) continue;

            const [chunkX, chunkY] = chunkKey.split(',').map(Number);
            const tilesPerChunk = chunkSystem.chunkSize;

            for (let y = 0; y < tilesPerChunk; y++) {
                for (let x = 0; x < tilesPerChunk; x++) {
                    const tileX = chunkX * tilesPerChunk + x;
                    const tileY = chunkY * tilesPerChunk + y;
                    const key = `${tileX},${tileY}`;

                    if (!this.mapData.has(key)) {
                        const tileType = chunk.tiles[y]?.[x] ?? 1;
                        this.mapData.set(key, tileType);
                    }
                }
            }
        }
    }

    /**
     * Отрисовка тайлов карты в изометрической проекции
     */
    renderMapTiles() {
        // Рисуем все известные тайлы
        for (const [key, tileType] of this.mapData) {
            const [tileX, tileY] = key.split(',').map(Number);
            const color = this.tileColors[tileType] || this.tileColors[0];

            // Преобразуем в изометрические координаты
            const pos = this.tileToMapIso(tileX, tileY);

            // Рисуем изометрический тайл
            this.mapGraphics.beginFill(color);
            this.drawIsoTile(this.mapGraphics, pos.x, pos.y, this.tileScale * 0.9);
            this.mapGraphics.endFill();
        }
    }

    /**
     * Рисование изометрического тайла (ромб)
     */
    drawIsoTile(ctx, x, y, size) {
        ctx.moveTo(x, y - size * 0.5);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size * 0.5);
        ctx.lineTo(x - size, y);
        ctx.closePath();
    }

    /**
     * Обновление маркера игрока
     */
    updatePlayerMarker() {
        if (!this.game.character) return;

        const tilePos = getTileIndex(this.game.character.x, this.game.character.y);
        const pos = this.tileToMapIso(tilePos.tileX, tilePos.tileY);

        this.playerMarker.x = pos.x;
        this.playerMarker.y = pos.y;

        // Сохраняем последнюю позицию
        this.lastPlayerTile = { x: tilePos.tileX, y: tilePos.tileY };
    }

    /**
     * Обновление маркеров врагов
     */
    updateEnemyMarkers() {
        // Очищаем старые маркеры
        this.enemyMarkers.removeChildren();

        if (!this.game.enemies) return;

        for (const enemy of this.game.enemies) {
            const tilePos = getTileIndex(enemy.x, enemy.y);
            const pos = this.tileToMapIso(tilePos.tileX, tilePos.tileY);

            const marker = new PIXI.Graphics();
            marker.beginFill(0xFF4444);
            marker.drawCircle(0, 0, 4);
            marker.endFill();
            marker.x = pos.x;
            marker.y = pos.y;

            this.enemyMarkers.addChild(marker);
        }
    }

    /**
     * Обновление информационного текста
     */
    updateInfo() {
        const exploredCount = this.mapData.size;
        const playerTile = this.lastPlayerTile;

        this.infoText.text = `Исследовано: ${exploredCount} тайлов | Позиция: (${playerTile.x}, ${playerTile.y}) | Колёсико мыши: зум | Перетаскивание: перемещение`;
    }

    /**
     * Отрисовка фона окна
     */
    renderBackground() {
        if (!this.graphics) return;

        // Основной градиентный фон
        for (let i = 0; i < this.height; i++) {
            const t = i / (this.height - 1);
            const r1 = 26, g1 = 20, b1 = 20;
            const r2 = 13, g2 = 10, b2 = 10;
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            const color = (r << 16) + (g << 8) + b;
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

        // Рамка вокруг области карты
        this.graphics.lineStyle(2, 0x3a2a1a);
        this.graphics.drawRect(this.padding - 2, 58, this.mapPanelWidth + 4, this.mapPanelHeight + 4);

        // Фон области карты (тёмный)
        this.graphics.beginFill(0x0a0808);
        this.graphics.drawRect(this.padding, 60, this.mapPanelWidth, this.mapPanelHeight);
        this.graphics.endFill();
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
     * Отрисовка содержимого
     */
    renderContent() {
        // Заголовок "КАРТА МИРА"
        const titleStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 22,
            fill: '#c9b896',
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowDistance: 2,
            dropShadowAngle: Math.PI / 4
        });

        const title = new PIXI.Text('КАРТА МИРА', titleStyle);
        title.anchor.set(0.5, 0);
        title.x = this.width / 2;
        title.y = this.padding;
        this.container.addChild(title);

        // Линия под заголовком
        const line = new PIXI.Graphics();
        line.lineStyle(1, 0x3a2a1a);
        line.moveTo(this.padding, 50);
        line.lineTo(this.width - this.padding, 50);
        this.container.addChild(line);

        // Текст зума
        this.zoomText = new PIXI.Text(`Зум: ${Math.round(this.mapZoom * 100)}%`, {
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 12,
            fill: '#8a7a6a',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1
        });
        this.zoomText.x = this.width - this.padding - 80;
        this.zoomText.y = this.height - 35;
        this.container.addChild(this.zoomText);

        // Легенда
        this.renderLegend();
    }

    /**
     * Отрисовка легенды
     */
    renderLegend() {
        const legendX = this.padding;
        const legendY = this.height - 55;

        const legendItems = [
            { color: 0xFFD700, text: 'Игрок' },
            { color: 0xFF4444, text: 'Враги' },
            { color: 0x4a5a4a, text: 'Пол' },
            { color: 0x1a1a1a, text: 'Стена' },
            { color: 0x2a4a7a, text: 'Вода' },
            { color: 0x2d6a2d, text: 'Дерево' }
        ];

        let offsetX = 0;
        for (const item of legendItems) {
            // Цветной квадратик
            const square = new PIXI.Graphics();
            square.beginFill(item.color);
            square.drawRect(legendX + offsetX, legendY, 10, 10);
            square.endFill();
            this.container.addChild(square);

            // Текст
            const text = new PIXI.Text(item.text, {
                fontFamily: "'MedievalSharp', Georgia, serif",
                fontSize: 10,
                fill: '#8a7a6a'
            });
            text.x = legendX + offsetX + 14;
            text.y = legendY;
            this.container.addChild(text);

            offsetX += text.width + 30;
        }
    }

    /**
     * Создание кнопки закрытия
     */
    createCloseButton() {
        const closeBtn = new UIButton({
            x: this.width - 80,
            y: 8,
            width: 70,
            height: 24,
            text: 'ЗАКРЫТЬ',
            fontSize: 11,
            onClick: () => this.close()
        });
        this.addChild(closeBtn);
    }

    /**
     * Хук инициализации - переопределен
     */
    onInit() {
        // Создаем контейнер для карты
        this.mapContainer = new PIXI.Container();
        this.mapContainer.x = this.padding;
        this.mapContainer.y = 60;
        this.container.addChild(this.mapContainer);

        // Создаем маску для обрезки карты
        this.createMapMask();

        // Создаем контейнер для содержимого карты (с зумом)
        this.mapContent = new PIXI.Container();
        this.mapContainer.addChild(this.mapContent);

        // Графика для отрисовки карты
        this.mapGraphics = new PIXI.Graphics();
        this.mapContent.addChild(this.mapGraphics);

        // Маркер игрока
        this.playerMarker = this.createPlayerMarker();
        this.mapContent.addChild(this.playerMarker);

        // Контейнер для маркеров врагов
        this.enemyMarkers = new PIXI.Container();
        this.mapContent.addChild(this.enemyMarkers);

        // Создаем заголовок и легенду
        this.renderContent();

        // Создаем кнопку закрытия
        this.createCloseButton();

        // Текст с информацией
        this.infoText = new PIXI.Text('', {
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 12,
            fill: '#8a7a6a',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1
        });
        this.infoText.x = this.padding;
        this.infoText.y = this.height - 35;
        this.container.addChild(this.infoText);

        // Настройка событий
        this.setupEvents();
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIMapWindow;
} else if (typeof window !== 'undefined') {
    window.UIMapWindow = UIMapWindow;
}