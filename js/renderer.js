class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Alpha false for performance
        this.camera = {
            x: 0,
            y: 0,
            zoom: GAME_CONFIG.CAMERA.DEFAULT_ZOOM, // Увеличенный зум для отображения меньшего количества объектов и улучшения производительности
            minZoom: GAME_CONFIG.CAMERA.MIN_ZOOM,
            maxZoom: GAME_CONFIG.CAMERA.MAX_ZOOM,
            targetZoom: GAME_CONFIG.CAMERA.DEFAULT_ZOOM // Для плавного зуммирования
        };
        
        // Размер тайла (базовый)
        this.baseTileSize = GAME_CONFIG.TILE.BASE_SIZE;

        // Цвета для рендеринга
        this.colors = {
            player: GAME_CONFIG.RENDERER.COLORS.PLAYER,
            playerHighlight: GAME_CONFIG.RENDERER.COLORS.PLAYER_HIGHLIGHT,
            playerShadow: GAME_CONFIG.RENDERER.COLORS.PLAYER_SHADOW,
            enemy: GAME_CONFIG.RENDERER.COLORS.ENEMY,
            enemyWeak: GAME_CONFIG.RENDERER.COLORS.ENEMY_WEAK,
            enemyStrong: GAME_CONFIG.RENDERER.COLORS.ENEMY_STRONG,
            enemyFast: GAME_CONFIG.RENDERER.COLORS.ENEMY_FAST,
            enemyTank: GAME_CONFIG.RENDERER.COLORS.ENEMY_TANK,
            wall: GAME_CONFIG.RENDERER.COLORS.WALL,
            wallDark: GAME_CONFIG.RENDERER.COLORS.WALL_DARK,
            floor: GAME_CONFIG.RENDERER.COLORS.FLOOR,
            floorLight: GAME_CONFIG.RENDERER.COLORS.FLOOR_LIGHT,
            grid: GAME_CONFIG.RENDERER.COLORS.GRID,
            treeTrunk: GAME_CONFIG.RENDERER.COLORS.TREE_TRUNK,
            treeLeaves: GAME_CONFIG.RENDERER.COLORS.TREE_LEAVES,
            rock: GAME_CONFIG.RENDERER.COLORS.ROCK,
            water: GAME_CONFIG.RENDERER.COLORS.WATER,
            ice: GAME_CONFIG.RENDERER.COLORS.ICE,
            decoration: GAME_CONFIG.RENDERER.COLORS.DECORATION
        };
    }
    
    
    /**
     * Установка позиции камеры
     * @param {number} x - X координата камеры
     * @param {number} y - Y координата камеры
     */
    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;
    }
    
    /**
     * Установка уровня зума
     * @param {number} zoom - новый уровень зума
     */
    setZoom(zoom) {
        // Ограничиваем зум в пределах допустимого диапазона
        this.camera.zoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, zoom));
        this.camera.targetZoom = this.camera.zoom;
    }
    
    /**
     * Плавное обновление зума (вызывается каждый кадр)
     */
    updateZoom() {
        // Плавная интерполяция зума
        if (Math.abs(this.camera.zoom - this.camera.targetZoom) > 0.01) {
            this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * GAME_CONFIG.CAMERA.ZOOM_SPEED;
        } else {
            this.camera.zoom = this.camera.targetZoom;
        }
    }
    
    /**
     * Получение текущего размера тайла с учетом зума
     * @returns {number} - размер тайла
     */
    getTileSize() {
        return this.baseTileSize / this.camera.zoom;
    }
    
    /**
     * Центрирование камеры на персонаже
     * @param {Character} character - персонаж, за которым следит камера
     */
    centerCameraOnCharacter(character) {
        // Просто устанавливаем позицию камеры равной позиции персонажа
        // Формула screenX = centerX + (pos.x - camera.x) * zoom автоматически
        // поместит персонажа в центр экрана
        this.setCameraPosition(
            character.x,
            character.y
        );
    }
    
    /**
     * Рендеринг тайлов (пол, стены, декорации, препятствия)
     * @param {Array<Array<number>>} map - карта тайлов (0 - пол, 1 - стена, 2 - колонна, 3 - дерево, 4 - скала, 5 - вода, 6 - лед, 7 - декорация)
     * @param {ChunkSystem} chunkSystem - система чанков (опционально)
     */
    renderTiles(map, chunkSystem = null) {
        // Получаем размер тайла с учетом зума (умножаем, чтобы при увеличении зума объекты становились больше)
        const tileSize = this.baseTileSize * this.camera.zoom;
        
        // буфер для проверки видимости - используем базовый размер для корректного определения видимости
        const buffer = this.baseTileSize * 2;

        if (chunkSystem) {
            // Рендерим только видимые чанки - используем базовый размер тайла
            const chunksToRender = chunkSystem.getChunksToRender(
                this.camera.x, 
                this.camera.y, 
                this.canvas.width, 
                this.canvas.height, 
                this.baseTileSize
            );

            for (const chunk of chunksToRender) {
                if (chunk && chunk.tiles) {
                    for (let y = 0; y < chunk.tiles.length; y++) {
                        for (let x = 0; x < chunk.tiles[y].length; x++) {
                            const tileType = chunk.tiles[y][x];
                            
                            // Преобразуем глобальные координаты тайла в 2D координаты
                            const globalX = chunk.chunkX * chunk.size + x;
                            const globalY = chunk.chunkY * chunk.size + y;
                            const pos = isoTo2D(globalX, globalY);

                            // Корректируем позицию с учетом камеры и зума
                            // Центр экрана
                            const centerX = this.canvas.width / 2;
                            const centerY = this.canvas.height / 2;
                            
                            // Позиция объекта относительно центра экрана, умноженная на зум
                            const screenX = centerX + (pos.x - this.camera.x) * this.camera.zoom;
                            const screenY = centerY + (pos.y - this.camera.y) * this.camera.zoom;

                            // Проверяем, находится ли тайл в пределах экрана
                            if (screenX > -buffer && screenX < this.canvas.width + buffer &&
                                screenY > -buffer && screenY < this.canvas.height + buffer) {
                                
                                // Рисуем тайл в зависимости от типа
                                if (tileType === 0) { // Пол
                                    // Рисуем пол с текстурой
                                    this.drawTexturedFloor(screenX, screenY, tileSize);
                                } else if (tileType === 1) { // Стена
                                    this.drawWall(screenX, screenY, tileSize);
                                } else if (tileType === 2) { // Декорация (колонна)
                                    this.drawColumn(screenX, screenY, tileSize);
                                } else if (tileType === 3) { // Дерево (непроходимое)
                                    this.drawTree(screenX, screenY, tileSize);
                                } else if (tileType === 4) { // Скала (непроходимое)
                                    this.drawRock(screenX, screenY, tileSize);
                                } else if (tileType === 5) { // Вода (непроходимое)
                                    this.drawWater(screenX, screenY, tileSize);
                                } else if (tileType === 6) { // Лед (проходимое с эффектом)
                                    this.drawIce(screenX, screenY, tileSize);
                                } else if (tileType === 7) { // Декорация (проходимая)
                                    this.drawDecoration(screenX, screenY, tileSize);
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Старая логика для совместимости
            if (!map || map.length === 0) return;

            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    const tileType = map[y][x];

                    // Преобразуем координаты тайла в 2D координаты
                    const pos = isoTo2D(x, y);

                    // Центр экрана
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    
                    // Корректируем позицию с учетом камеры и зума
                    const screenX = centerX + (pos.x - this.camera.x - centerX) * this.camera.zoom;
                    const screenY = centerY + (pos.y - this.camera.y - centerY) * this.camera.zoom;

                    // Рисуем тайл в зависимости от типа
                    if (tileType === 0) { // Пол
                        // Рисуем пол с текстурой
                        this.drawTexturedFloor(screenX, screenY, tileSize);
                    } else if (tileType === 1) { // Стена
                        this.drawWall(screenX, screenY, tileSize);
                    } else if (tileType === 2) { // Декорация (колонна)
                        this.drawColumn(screenX, screenY, tileSize);
                    } else if (tileType === 3) { // Дерево (непроходимое)
                        this.drawTree(screenX, screenY, tileSize);
                    } else if (tileType === 4) { // Скала (непроходимое)
                        this.drawRock(screenX, screenY, tileSize);
                    } else if (tileType === 5) { // Вода (непроходимое)
                        this.drawWater(screenX, screenY, tileSize);
                    } else if (tileType === 6) { // Лед (проходимое с эффектом)
                        this.drawIce(screenX, screenY, tileSize);
                    } else if (tileType === 7) { // Декорация (проходимая)
                        this.drawDecoration(screenX, screenY, tileSize);
                    }
                }
            }
        }
    }
    
    /**
     * Рисование изометрического тайла
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} width - ширина
     * @param {number} height - высота
     */
    drawIsometricTile(x, y, width, height) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + width / 2, y + height / 2);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x - width / 2, y + height / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование текстурированного пола
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawTexturedFloor(x, y, tileSize) {
        // Основной пол
        this.ctx.fillStyle = this.colors.floor;
        this.drawIsometricTile(x, y, tileSize, tileSize / 2);

        // Добавляем текстуру пола
        this.ctx.fillStyle = this.colors.floorLight;
        
        // Рисуем узор на полу
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + tileSize / 4, y + tileSize / 8);
        this.ctx.lineTo(x, y + tileSize / 4);
        this.ctx.lineTo(x - tileSize / 4, y + tileSize / 8);
        this.ctx.closePath();
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование стены
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawWall(x, y, tileSize) {
        // Основная стена
        this.ctx.fillStyle = this.colors.wall;
        this.drawIsometricTile(x, y, tileSize, tileSize / 2);

        // Добавляем детали стены (кирпичная кладка)
        this.ctx.fillStyle = this.colors.wallDark;
        const brickWidth = tileSize / 4;
        const brickHeight = tileSize / 8;

        // Рисуем кирпичи
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                if ((row + col) % 2 === 0) { // Чередуем кирпичи
                    const brickX = x + (col * brickWidth) - (row * brickWidth / 2);
                    const brickY = y + (row * brickHeight);
                    
                    this.ctx.beginPath();
                    this.ctx.moveTo(brickX, brickY);
                    this.ctx.lineTo(brickX + brickWidth / 2, brickY + brickHeight / 2);
                    this.ctx.lineTo(brickX, brickY + brickHeight);
                    this.ctx.lineTo(brickX - brickWidth / 2, brickY + brickHeight / 2);
                    this.ctx.closePath();
                    this.ctx.fill();
                }
            }
        }

        // Обводка для контраста
        this.ctx.strokeStyle = '#4a3b2a';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование колонны
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawColumn(x, y, tileSize) {
        // Основание колонны
        this.ctx.fillStyle = this.colors.wallDark;
        this.drawIsometricTile(x, y, tileSize * 0.6, tileSize / 2 * 0.6);

        // Ствол колонны
        this.ctx.fillStyle = this.colors.wall;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - tileSize * 0.1);
        this.ctx.lineTo(x + tileSize * 0.2, y + tileSize * 0.05);
        this.ctx.lineTo(x, y + tileSize * 0.2);
        this.ctx.lineTo(x - tileSize * 0.2, y + tileSize * 0.05);
        this.ctx.closePath();
        this.ctx.fill();

        // Верхушка колонны
        this.ctx.fillStyle = this.colors.wallDark;
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - tileSize * 0.2);
        this.ctx.lineTo(x + tileSize * 0.25, y - tileSize * 0.05);
        this.ctx.lineTo(x, y + tileSize * 0.1);
        this.ctx.lineTo(x - tileSize * 0.25, y - tileSize * 0.05);
        this.ctx.closePath();
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = '#4a3b2a';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование дерева
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawTree(x, y, tileSize) {
        // Ствол дерева
        this.ctx.fillStyle = this.colors.treeTrunk;
        this.drawIsometricTile(x, y, tileSize * 0.4, tileSize / 2 * 0.4);

        // Тень от ствола
        this.ctx.fillStyle = '#4a2c22';
        this.ctx.beginPath();
        this.ctx.moveTo(x - tileSize * 0.1, y + tileSize * 0.1);
        this.ctx.lineTo(x + tileSize * 0.1, y + tileSize * 0.2);
        this.ctx.lineTo(x, y + tileSize * 0.3);
        this.ctx.lineTo(x - tileSize * 0.2, y + tileSize * 0.2);
        this.ctx.closePath();
        this.ctx.fill();

        // Крона дерева
        this.ctx.fillStyle = this.colors.treeLeaves;
        this.ctx.beginPath();
        this.ctx.arc(x, y - tileSize * 0.3, tileSize * 0.4, 0, Math.PI * 2);
        this.ctx.fill();

        // Более темные участки кроны для объема
        this.ctx.fillStyle = '#2e7a2f';
        this.ctx.beginPath();
        this.ctx.arc(x - tileSize * 0.1, y - tileSize * 0.4, tileSize * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x + tileSize * 0.15, y - tileSize * 0.25, tileSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = '#2a5a2a';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование скалы
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawRock(x, y, tileSize) {
        // Основная скала
        this.ctx.fillStyle = this.colors.rock;
        this.drawIsometricTile(x, y, tileSize * 0.7, tileSize / 2 * 0.7);

        // Добавляем текстуру скалы
        this.ctx.fillStyle = '#6d4c41';
        
        // Неровности скалы
        this.ctx.beginPath();
        this.ctx.moveTo(x, y - tileSize * 0.1);
        this.ctx.lineTo(x + tileSize * 0.15, y + tileSize * 0.05);
        this.ctx.lineTo(x, y + tileSize * 0.2);
        this.ctx.lineTo(x - tileSize * 0.15, y + tileSize * 0.05);
        this.ctx.closePath();
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.moveTo(x - tileSize * 0.2, y + tileSize * 0.1);
        this.ctx.lineTo(x - tileSize * 0.05, y + tileSize * 0.25);
        this.ctx.lineTo(x - tileSize * 0.15, y + tileSize * 0.35);
        this.ctx.lineTo(x - tileSize * 0.3, y + tileSize * 0.2);
        this.ctx.closePath();
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = '#5a3c2a';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование воды
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawWater(x, y, tileSize) {
        // Основная вода
        this.ctx.fillStyle = this.colors.water;
        this.drawIsometricTile(x, y, tileSize, tileSize / 2);

        // Анимация воды (волны)
        this.ctx.fillStyle = '#42a5f5';
        
        // Рисуем волны
        for (let i = 0; i < 3; i++) {
            const waveX = x + (i - 1) * tileSize * 0.2;
            const waveY = y + Math.sin(Date.now() / 500 + i) * tileSize * 0.05;
            
            this.ctx.beginPath();
            this.ctx.arc(waveX, waveY, tileSize * 0.08, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Блики на воде
        this.ctx.fillStyle = '#90caf9';
        this.ctx.beginPath();
        this.ctx.arc(x - tileSize * 0.2, y - tileSize * 0.1, tileSize * 0.05, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = '#0d47a1';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование льда
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawIce(x, y, tileSize) {
        // Основной лед
        this.ctx.fillStyle = this.colors.ice;
        this.drawIsometricTile(x, y, tileSize, tileSize / 2);

        // Эффект прозрачности и блеска
        this.ctx.fillStyle = '#e3f2fd';
        this.ctx.beginPath();
        this.ctx.arc(x - tileSize * 0.2, y - tileSize * 0.1, tileSize * 0.08, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x + tileSize * 0.15, y - tileSize * 0.15, tileSize * 0.05, 0, Math.PI * 2);
        this.ctx.fill();

        // Трещины на льду
        this.ctx.strokeStyle = '#90caf9';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(x - tileSize * 0.2, y);
        this.ctx.lineTo(x + tileSize * 0.1, y - tileSize * 0.1);
        this.ctx.lineTo(x + tileSize * 0.2, y + tileSize * 0.1);
        this.ctx.stroke();

        // Обводка для контраста
        this.ctx.strokeStyle = '#90caf9';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }

    /**
     * Рисование декорации
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     */
    drawDecoration(x, y, tileSize) {
        // Цветок или куст
        this.ctx.fillStyle = this.colors.decoration;
        this.ctx.beginPath();
        this.ctx.arc(x, y, tileSize * 0.15, 0, Math.PI * 2);
        this.ctx.fill();

        // Петельки цветка
        this.ctx.fillStyle = '#7cb342';
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            const petalX = x + Math.cos(angle) * tileSize * 0.1;
            const petalY = y + Math.sin(angle) * tileSize * 0.05;
            
            this.ctx.beginPath();
            this.ctx.arc(petalX, petalY, tileSize * 0.08, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Центр цветка
        this.ctx.fillStyle = '#ffff00';
        this.ctx.beginPath();
        this.ctx.arc(x, y, tileSize * 0.05, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка для контраста
        this.ctx.strokeStyle = '#689f38';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    }
    
    /**
     * Рендеринг персонажа
     * @param {Character} character - персонаж для рендеринга
     */
    renderCharacter(character) {
        // Центр экрана
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Преобразуем координаты персонажа в экранные с учетом камеры и зума
        const screenX = centerX + (character.x - this.camera.x) * this.camera.zoom;
        const screenY = centerY + (character.y - this.camera.y) * this.camera.zoom;
        
        // Размеры с учетом зума
        const scaledWidth = character.width * this.camera.zoom;
        const scaledHeight = character.height * this.camera.zoom;

        // Рисуем тело персонажа (изометрический ромб)
        this.ctx.fillStyle = this.colors.player;
        this.drawIsometricEntity(screenX, screenY, scaledWidth * 0.8, scaledHeight * 0.6);

        // Добавляем детали тела (доспехи)
        this.ctx.fillStyle = this.colors.playerHighlight;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 5 * this.camera.zoom, scaledWidth * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем голову
        this.ctx.fillStyle = '#f9d9aa'; // Телесный цвет
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 15 * this.camera.zoom, scaledWidth * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка головы
        this.ctx.strokeStyle = '#d6bba0';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Рисуем глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4 * this.camera.zoom, screenY - 16 * this.camera.zoom, 2 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4 * this.camera.zoom, screenY - 16 * this.camera.zoom, 2 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем оружие (меч)
        this.ctx.strokeStyle = '#c0c0c0'; // Серебристый
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + 10 * this.camera.zoom, screenY - 10 * this.camera.zoom);
        this.ctx.lineTo(screenX + 20 * this.camera.zoom, screenY - 20 * this.camera.zoom);
        this.ctx.stroke();

        // Рисуем рукоять меча
        this.ctx.fillStyle = '#8b4513'; // Коричневый
        this.ctx.fillRect(screenX + 8 * this.camera.zoom, screenY - 8 * this.camera.zoom, 5 * this.camera.zoom, 10 * this.camera.zoom);

        // Рисуем индикатор здоровья
        this.renderHealthBar(character, screenX, screenY - 25 * this.camera.zoom);
    }
    
    /**
     * Рендеринг индикатора здоровья
     * @param {Object} entity - объект с параметрами здоровья
     * @param {number} x - X координата экрана
     * @param {number} y - Y координата экрана
     */
    renderHealthBar(entity, x, y) {
        const barWidth = GAME_CONFIG.RENDERER.HEALTH_BAR.WIDTH;
        const barHeight = GAME_CONFIG.RENDERER.HEALTH_BAR.HEIGHT;
        const healthPercent = entity.health / entity.maxHealth;

        // Фон полосы здоровья
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x - barWidth / 2, y + GAME_CONFIG.RENDERER.HEALTH_BAR.OFFSET_Y, barWidth, barHeight);

        // Заполнение полосы здоровья
        this.ctx.fillStyle = healthPercent > GAME_CONFIG.RENDERER.HEALTH_BAR.HEALTH_COLOR_THRESHOLD_HIGH ? '#4CAF50' : 
                           healthPercent > GAME_CONFIG.RENDERER.HEALTH_BAR.HEALTH_COLOR_THRESHOLD_MEDIUM ? '#FFC107' : '#F44336';
        this.ctx.fillRect(x - barWidth / 2, y + GAME_CONFIG.RENDERER.HEALTH_BAR.OFFSET_Y, barWidth * healthPercent, barHeight);

        // Обводка полосы здоровья
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - barWidth / 2, y + GAME_CONFIG.RENDERER.HEALTH_BAR.OFFSET_Y, barWidth, barHeight);
    }
    
    /**
     * Рендеринг врага
     * @param {Object} enemy - объект врага
     */
    renderEnemy(enemy) {
        // Центр экрана
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Преобразуем координаты врага в экранные с учетом камеры и зума
        const screenX = centerX + (enemy.x - this.camera.x) * this.camera.zoom;
        const screenY = centerY + (enemy.y - this.camera.y) * this.camera.zoom;
        
        // Размеры с учетом зума
        const scaledWidth = enemy.width * this.camera.zoom;
        const scaledHeight = enemy.height * this.camera.zoom;

        // Рисуем врага в зависимости от типа
        switch(enemy.type) {
            case 'weak':
                this.drawWeakEnemy(screenX, screenY, scaledWidth, scaledHeight);
                break;
            case 'strong':
                this.drawStrongEnemy(screenX, screenY, scaledWidth, scaledHeight);
                break;
            case 'fast':
                this.drawFastEnemy(screenX, screenY, scaledWidth, scaledHeight);
                break;
            case 'tank':
                this.drawTankEnemy(screenX, screenY, scaledWidth, scaledHeight);
                break;
            default:
                this.drawBasicEnemy(screenX, screenY, scaledWidth, scaledHeight);
        }

        // Рисуем индикатор здоровья врага
        this.renderHealthBar(enemy, screenX, screenY - 25 * this.camera.zoom);
    }

    /**
     * Рендеринг базового врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {number} width - ширина с учетом зума
     * @param {number} height - высота с учетом зума
     */
    drawBasicEnemy(screenX, screenY, width, height) {
        // Тело врага
        this.ctx.fillStyle = this.colors.enemy;
        this.drawIsometricEntity(screenX, screenY, width * 0.8, height * 0.6);

        // Голова
        this.ctx.fillStyle = '#e03c3c';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 15 * this.camera.zoom, width * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 5 * this.camera.zoom, screenY - 17 * this.camera.zoom, 2 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 5 * this.camera.zoom, screenY - 17 * this.camera.zoom, 2 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 5 * this.camera.zoom, screenY - 17 * this.camera.zoom, 1 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 5 * this.camera.zoom, screenY - 17 * this.camera.zoom, 1 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Рендеринг слабого врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {number} width - ширина с учетом зума
     * @param {number} height - высота с учетом зума
     */
    drawWeakEnemy(screenX, screenY, width, height) {
        // Тело врага
        this.ctx.fillStyle = this.colors.enemyWeak;
        this.drawIsometricEntity(screenX, screenY, width * 0.7, height * 0.5);

        // Голова
        this.ctx.fillStyle = '#888888';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 12 * this.camera.zoom, width * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4 * this.camera.zoom, screenY - 14 * this.camera.zoom, 1.5 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4 * this.camera.zoom, screenY - 14 * this.camera.zoom, 1.5 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4 * this.camera.zoom, screenY - 14 * this.camera.zoom, 0.8 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4 * this.camera.zoom, screenY - 14 * this.camera.zoom, 0.8 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Рендеринг сильного врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {number} width - ширина с учетом зума
     * @param {number} height - высота с учетом зума
     */
    drawStrongEnemy(screenX, screenY, width, height) {
        // Тело врага
        this.ctx.fillStyle = this.colors.enemyStrong;
        this.drawIsometricEntity(screenX, screenY, width * 0.9, height * 0.7);

        // Доспехи
        this.ctx.fillStyle = '#cc5500';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 5 * this.camera.zoom, width * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        // Голова
        this.ctx.fillStyle = '#e65100';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 18 * this.camera.zoom, width * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 6 * this.camera.zoom, screenY - 20 * this.camera.zoom, 2.5 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 6 * this.camera.zoom, screenY - 20 * this.camera.zoom, 2.5 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 6 * this.camera.zoom, screenY - 20 * this.camera.zoom, 1.2 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 6 * this.camera.zoom, screenY - 20 * this.camera.zoom, 1.2 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Оружие
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 15 * this.camera.zoom, screenY);
        this.ctx.lineTo(screenX - 25 * this.camera.zoom, screenY - 10 * this.camera.zoom);
        this.ctx.stroke();
    }

    /**
     * Рендеринг быстрого врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {number} width - ширина с учетом зума
     * @param {number} height - высота с учетом зума
     */
    drawFastEnemy(screenX, screenY, width, height) {
        // Тело врага (более вытянутое для скорости)
        this.ctx.fillStyle = this.colors.enemyFast;
        this.drawIsometricEntity(screenX, screenY, width * 0.6, height * 0.5);

        // Голова
        this.ctx.fillStyle = '#e6c200';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 10 * this.camera.zoom, width * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4 * this.camera.zoom, screenY - 12 * this.camera.zoom, 1.8 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4 * this.camera.zoom, screenY - 12 * this.camera.zoom, 1.8 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4 * this.camera.zoom, screenY - 12 * this.camera.zoom, 0.9 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4 * this.camera.zoom, screenY - 12 * this.camera.zoom, 0.9 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Эффект скорости (линии)
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 15 * this.camera.zoom, screenY + 5 * this.camera.zoom);
        this.ctx.lineTo(screenX - 10 * this.camera.zoom, screenY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(screenX + 15 * this.camera.zoom, screenY + 5 * this.camera.zoom);
        this.ctx.lineTo(screenX + 10 * this.camera.zoom, screenY);
        this.ctx.stroke();
    }

    /**
     * Рендеринг танка
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {number} width - ширина с учетом зума
     * @param {number} height - высота с учетом зума
     */
    drawTankEnemy(screenX, screenY, width, height) {
        // Тело врага (широкое и массивное)
        this.ctx.fillStyle = this.colors.enemyTank;
        this.drawIsometricEntity(screenX, screenY, width * 1.1, height * 0.8);

        // Доспехи
        this.ctx.fillStyle = '#6d0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 8 * this.camera.zoom, width * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Голова
        this.ctx.fillStyle = '#700000';
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 22 * this.camera.zoom, width * 0.35, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 7 * this.camera.zoom, screenY - 24 * this.camera.zoom, 3 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 7 * this.camera.zoom, screenY - 24 * this.camera.zoom, 3 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 7 * this.camera.zoom, screenY - 24 * this.camera.zoom, 1.5 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 7 * this.camera.zoom, screenY - 24 * this.camera.zoom, 1.5 * this.camera.zoom, 0, Math.PI * 2);
        this.ctx.fill();

        // Щит
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(screenX + 15 * this.camera.zoom, screenY + 5 * this.camera.zoom, 12 * this.camera.zoom, 0, Math.PI, true);
        this.ctx.stroke();
    }
    
    /**
     * Рисование изометрического объекта (тело персонажа/врага)
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} width - ширина
     * @param {number} height - высота
     */
    drawIsometricEntity(x, y, width, height) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
        this.ctx.lineTo(x + width / 2, y + height / 2);
        this.ctx.lineTo(x, y + height);
        this.ctx.lineTo(x - width / 2, y + height / 2);
        this.ctx.closePath();
        this.ctx.fill();

        // Легкая тень для объема
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        this.ctx.beginPath();
        this.ctx.moveTo(x - width / 4, y + height / 4);
        this.ctx.lineTo(x, y + height / 2);
        this.ctx.lineTo(x - width / 4, y + height * 0.75);
        this.ctx.lineTo(x - width / 2, y + height / 2);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * Очистка холста
     */
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * Рассчет глубины (z-index) для объекта на основе его позиции
     * @param {number} x - X координата объекта
     * @param {number} y - Y координата объекта
     * @param {number} height - высота объекта (для более точного расчета глубины)
     * @returns {number} - значение глубины (чем больше, тем ближе к камере)
     */
    calculateDepth(x, y, height = 0) {
        // В изометрической проекции глубина зависит от Y координаты и высоты объекта
        // Объекты с большей Y координатой и большей высотой должны отображаться поверх объектов с меньшей Y координатой
        return y + height;
    }

    /**
     * Рендеринг всех объектов с учетом глубины (z-index)
     * @param {Array} objects - массив объектов для рендеринга
     * @param {Function} renderFunction - функция для рендеринга конкретного объекта
     */
    renderWithDepth(objects, renderFunction) {
        // Сортируем объекты по глубине (от меньшего к большему - сначала дальние, потом ближние)
        const sortedObjects = [...objects].sort((a, b) => {
            const depthA = this.calculateDepth(a.x, a.y, a.height || 0);
            const depthB = this.calculateDepth(b.x, b.y, b.height || 0);
            return depthA - depthB;
        });

        // Рендерим отсортированные объекты
        for (const obj of sortedObjects) {
            renderFunction(obj);
        }
    }

    /**
     * Рендеринг всех тайлов (фоновых элементов)
     * @param {Array<Array<number>>} map - карта тайлов
     * @param {ChunkSystem} chunkSystem - система чанков
     */
    renderBackgroundTiles(map, chunkSystem) {
        // Рендерим фоновые тайлы (пол, вода, лед и т.д.) без участия в глубинной сортировке
        this.renderTiles(map, chunkSystem);
    }

    /**
     * Получение всех объектов на карте для рендеринга с глубиной
     * @param {Array<Array<number>>} map - карта тайлов
     * @param {ChunkSystem} chunkSystem - система чанков
     * @param {Array} enemies - массив врагов
     * @param {Character} character - персонаж игрока
     * @returns {Array} - массив всех объектов для рендеринга с глубиной
     */
    getAllRenderablesWithDepth(map, chunkSystem, enemies, character) {
        const allRenderables = [];
        
        // Получаем размер тайла с учетом зума (умножаем, чтобы при увеличении зума объекты становились больше)
        const tileSize = this.baseTileSize * this.camera.zoom;
        
        // Буфер для проверки видимости - используем базовый размер
        const buffer = this.baseTileSize * 2;

        // Добавляем тайлы с 3D-объектами (деревья, скалы и т.д.) которые должны участвовать в глубинной сортировке
        if (chunkSystem) {
            const chunksToRender = chunkSystem.getChunksToRender(
                this.camera.x,
                this.camera.y,
                this.canvas.width,
                this.canvas.height,
                this.baseTileSize
            );

            for (const chunk of chunksToRender) {
                if (chunk && chunk.tiles) {
                    for (let y = 0; y < chunk.tiles.length; y++) {
                        for (let x = 0; x < chunk.tiles[y].length; x++) {
                            const tileType = chunk.tiles[y][x];

                            // Преобразуем глобальные координаты тайла в 2D координаты
                            const globalX = chunk.chunkX * chunk.size + x;
                            const globalY = chunk.chunkY * chunk.size + y;
                            const pos = isoTo2D(globalX, globalY);

                            // Корректируем позицию с учетом камеры и зума
                            // Центр экрана
                            const centerX = this.canvas.width / 2;
                            const centerY = this.canvas.height / 2;
                            
                            // Позиция объекта относительно центра экрана с учетом зума
                            const screenX = centerX + (pos.x - this.camera.x) * this.camera.zoom;
                            const screenY = centerY + (pos.y - this.camera.y) * this.camera.zoom;

                            // Проверяем, находится ли тайл в пределах экрана
                            if (screenX > -buffer && screenX < this.canvas.width + buffer &&
                                screenY > -buffer / 2 && screenY < this.canvas.height + buffer / 2) {

                                // Добавляем только тайлы с 3D-объектами (деревья, скалы, колонны и т.д.) которые должны участвовать в глубинной сортировке
                                if (tileType === 2 || tileType === 3 || tileType === 4) { // Декорация, дерево, скала
                                    allRenderables.push({
                                        x: pos.x,
                                        y: pos.y,
                                        height: tileType === 3 ? 60 : tileType === 4 ? 50 : 30, // Разная высота для разных объектов
                                        render: () => {
                                            // Рендерим основной тайл с учетом зума
                                            if (tileType === 2) { // Колонна
                                                this.drawColumn(screenX, screenY, tileSize);
                                            } else if (tileType === 3) { // Дерево
                                                this.drawTree(screenX, screenY, tileSize);
                                            } else if (tileType === 4) { // Скала
                                                this.drawRock(screenX, screenY, tileSize);
                                            }
                                        }
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Старая логика для совместимости
            if (!map || map.length === 0) return allRenderables;

            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    const tileType = map[y][x];

                    // Преобразуем координаты тайла в 2D координаты
                    const pos = isoTo2D(x, y);

                    // Центр экрана
                    const centerX = this.canvas.width / 2;
                    const centerY = this.canvas.height / 2;
                    
                    // Позиция объекта относительно центра экрана с учетом зума
                    const screenX = centerX + (pos.x - this.camera.x - centerX) * this.camera.zoom;
                    const screenY = centerY + (pos.y - this.camera.y - centerY) * this.camera.zoom;

                    // Проверяем, находится ли тайл в пределах экрана
                    if (screenX > -buffer && screenX < this.canvas.width + buffer &&
                        screenY > -buffer / 2 && screenY < this.canvas.height + buffer / 2) {

                        // Добавляем только тайлы с 3D-объектами (деревья, скалы, колонны и т.д.) которые должны участвовать в глубинной сортировке
                        if (tileType === 2 || tileType === 3 || tileType === 4) { // Декорация, дерево, скала
                            allRenderables.push({
                                x: pos.x,
                                y: pos.y,
                                height: tileType === 3 ? 60 : tileType === 4 ? 50 : 30, // Разная высота для разных объектов
                                render: () => {
                                    // Рендерим основной тайл с учетом зума
                                    if (tileType === 2) { // Колонна
                                        this.drawColumn(screenX, screenY, tileSize);
                                    } else if (tileType === 3) { // Дерево
                                        this.drawTree(screenX, screenY, tileSize);
                                    } else if (tileType === 4) { // Скала
                                        this.drawRock(screenX, screenY, tileSize);
                                    }
                                }
                            });
                        }
                    }
                }
            }
        }

        // Добавляем врагов
        for (const enemy of enemies) {
            allRenderables.push({
                x: enemy.x,
                y: enemy.y,
                height: enemy.height || 0,
                render: () => {
                    // Рендерим врага
                    this.renderEnemy(enemy);
                }
            });
        }

        // Добавляем персонажа
        allRenderables.push({
            x: character.x,
            y: character.y,
            height: character.height || 0,
            render: () => {
                // Рендерим персонажа
                this.renderCharacter(character);
            }
        });

        return allRenderables;
    }

    /**
     * Рендеринг сетки (для отладки)
     * @param {number} gridSize - размер сетки
     */
    renderGrid(gridSize = 64) {
        this.ctx.strokeStyle = this.colors.grid;
        this.ctx.lineWidth = 0.5;

        // Вертикальные линии
        for (let x = -this.camera.x % gridSize; x < this.canvas.width; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }

        // Горизонтальные линии
        for (let y = -this.camera.y % gridSize; y < this.canvas.height; y += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
    }
}