class Renderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d', { alpha: false }); // Alpha false for performance
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1.5, // Увеличенный зум для отображения меньшего количества объектов
            minZoom: 0.5,
            maxZoom: 3.0
        };

        // Цвета для рендеринга
        this.colors = {
            player: '#4a9eff',
            playerHighlight: '#8ecfff',
            playerShadow: '#2a5a8f',
            enemy: '#ff4a4a',
            enemyWeak: '#a0a0a0',
            enemyStrong: '#ff6600',
            enemyFast: '#ffff00',
            enemyTank: '#8b0000',
            wall: '#8b7355',
            wallDark: '#6b5b47',
            floor: '#3a2d1f',
            floorLight: '#5a4b3c',
            grid: '#5a4b3c',
            treeTrunk: '#5d4037',
            treeLeaves: '#388e3c',
            rock: '#795548',
            water: '#1976d2',
            ice: '#bbdefb',
            decoration: '#8bc34a'
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
     * Центрирование камеры на персонаже
     * @param {Character} character - персонаж, за которым следит камера
     */
    centerCameraOnCharacter(character) {
        this.setCameraPosition(
            character.x - this.canvas.width / 2,
            character.y - this.canvas.height / 2
        );
    }
    
    /**
     * Рендеринг тайлов (пол, стены, декорации, препятствия)
     * @param {Array<Array<number>>} map - карта тайлов (0 - пол, 1 - стена, 2 - колонна, 3 - дерево, 4 - скала, 5 - вода, 6 - лед, 7 - декорация)
     * @param {ChunkSystem} chunkSystem - система чанков (опционально)
     */
    renderTiles(map, chunkSystem = null) {
        const tileSize = 64;

        if (chunkSystem) {
            // Рендерим только видимые чанки
            const chunksToRender = chunkSystem.getChunksToRender(
                this.camera.x, 
                this.camera.y, 
                this.canvas.width, 
                this.canvas.height, 
                tileSize
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

                            // Корректируем позицию с учетом камеры
                            const screenX = pos.x - this.camera.x;
                            const screenY = pos.y - this.camera.y;

                            // Проверяем, находится ли тайл в пределах экрана
                            if (screenX > -tileSize && screenX < this.canvas.width + tileSize &&
                                screenY > -tileSize && screenY < this.canvas.height + tileSize) {
                                
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

                    // Корректируем позицию с учетом камеры
                    const screenX = pos.x - this.camera.x;
                    const screenY = pos.y - this.camera.y;

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
        // Преобразуем координаты персонажа в экранные с учетом камеры
        const screenX = character.x - this.camera.x;
        const screenY = character.y - this.camera.y;

        // Рисуем тело персонажа (изометрический ромб)
        this.ctx.fillStyle = this.colors.player;
        this.drawIsometricEntity(screenX, screenY, character.width * 0.8, character.height * 0.6);

        // Добавляем детали тела (доспехи)
        this.ctx.fillStyle = this.colors.playerHighlight;
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 5, character.width * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем голову
        this.ctx.fillStyle = '#f9d9aa'; // Телесный цвет
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 15, character.width * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        // Обводка головы
        this.ctx.strokeStyle = '#d6bba0';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Рисуем глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4, screenY - 16, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4, screenY - 16, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Рисуем оружие (меч)
        this.ctx.strokeStyle = '#c0c0c0'; // Серебристый
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(screenX + 10, screenY - 10);
        this.ctx.lineTo(screenX + 20, screenY - 20);
        this.ctx.stroke();

        // Рисуем рукоять меча
        this.ctx.fillStyle = '#8b4513'; // Коричневый
        this.ctx.fillRect(screenX + 8, screenY - 8, 5, 10);

        // Рисуем индикатор здоровья
        this.renderHealthBar(character, screenX, screenY - 25);
    }
    
    /**
     * Рендеринг индикатора здоровья
     * @param {Object} entity - объект с параметрами здоровья
     * @param {number} x - X координата экрана
     * @param {number} y - Y координата экрана
     */
    renderHealthBar(entity, x, y) {
        const barWidth = 40;
        const barHeight = 6;
        const healthPercent = entity.health / entity.maxHealth;

        // Фон полосы здоровья
        this.ctx.fillStyle = '#333';
        this.ctx.fillRect(x - barWidth / 2, y - 5, barWidth, barHeight);

        // Заполнение полосы здоровья
        this.ctx.fillStyle = healthPercent > 0.5 ? '#4CAF50' : healthPercent > 0.25 ? '#FFC107' : '#F44336';
        this.ctx.fillRect(x - barWidth / 2, y - 5, barWidth * healthPercent, barHeight);

        // Обводка полосы здоровья
        this.ctx.strokeStyle = '#000';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x - barWidth / 2, y - 5, barWidth, barHeight);
    }
    
    /**
     * Рендеринг врага
     * @param {Object} enemy - объект врага
     */
    renderEnemy(enemy) {
        // Преобразуем координаты врага в экранные с учетом камеры
        const screenX = enemy.x - this.camera.x;
        const screenY = enemy.y - this.camera.y;

        // Рисуем врага в зависимости от типа
        switch(enemy.type) {
            case 'weak':
                this.drawWeakEnemy(screenX, screenY, enemy);
                break;
            case 'strong':
                this.drawStrongEnemy(screenX, screenY, enemy);
                break;
            case 'fast':
                this.drawFastEnemy(screenX, screenY, enemy);
                break;
            case 'tank':
                this.drawTankEnemy(screenX, screenY, enemy);
                break;
            default:
                this.drawBasicEnemy(screenX, screenY, enemy);
        }

        // Рисуем индикатор здоровья врага
        this.renderHealthBar(enemy, screenX, screenY - 25);
    }

    /**
     * Рендеринг базового врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {Object} enemy - объект врага
     */
    drawBasicEnemy(screenX, screenY, enemy) {
        // Тело врага
        this.ctx.fillStyle = this.colors.enemy;
        this.drawIsometricEntity(screenX, screenY, enemy.width * 0.8, enemy.height * 0.6);

        // Голова
        this.ctx.fillStyle = '#e03c3c'; // Более темный красный
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 15, enemy.width * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 5, screenY - 17, 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 5, screenY - 17, 2, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 5, screenY - 17, 1, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 5, screenY - 17, 1, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Рендеринг слабого врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {Object} enemy - объект врага
     */
    drawWeakEnemy(screenX, screenY, enemy) {
        // Тело врага
        this.ctx.fillStyle = this.colors.enemyWeak;
        this.drawIsometricEntity(screenX, screenY, enemy.width * 0.7, enemy.height * 0.5);

        // Голова
        this.ctx.fillStyle = '#888888'; // Более темный серый
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 12, enemy.width * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4, screenY - 14, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4, screenY - 14, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4, screenY - 14, 0.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4, screenY - 14, 0.8, 0, Math.PI * 2);
        this.ctx.fill();
    }

    /**
     * Рендеринг сильного врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {Object} enemy - объект врага
     */
    drawStrongEnemy(screenX, screenY, enemy) {
        // Тело врага
        this.ctx.fillStyle = this.colors.enemyStrong;
        this.drawIsometricEntity(screenX, screenY, enemy.width * 0.9, enemy.height * 0.7);

        // Доспехи
        this.ctx.fillStyle = '#cc5500'; // Темнее оранжевый
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 5, enemy.width * 0.25, 0, Math.PI * 2);
        this.ctx.fill();

        // Голова
        this.ctx.fillStyle = '#e65100'; // Еще темнее оранжевый
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 18, enemy.width * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 6, screenY - 20, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 6, screenY - 20, 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 6, screenY - 20, 1.2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 6, screenY - 20, 1.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Оружие
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 15, screenY);
        this.ctx.lineTo(screenX - 25, screenY - 10);
        this.ctx.stroke();
    }

    /**
     * Рендеринг быстрого врага
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {Object} enemy - объект врага
     */
    drawFastEnemy(screenX, screenY, enemy) {
        // Тело врага (более вытянутое для скорости)
        this.ctx.fillStyle = this.colors.enemyFast;
        this.drawIsometricEntity(screenX, screenY, enemy.width * 0.6, enemy.height * 0.5);

        // Голова
        this.ctx.fillStyle = '#e6c200'; // Более темный желтый
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 10, enemy.width * 0.2, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4, screenY - 12, 1.8, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4, screenY - 12, 1.8, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 4, screenY - 12, 0.9, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 4, screenY - 12, 0.9, 0, Math.PI * 2);
        this.ctx.fill();

        // Эффект скорости (линии)
        this.ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(screenX - 15, screenY + 5);
        this.ctx.lineTo(screenX - 10, screenY);
        this.ctx.stroke();

        this.ctx.beginPath();
        this.ctx.moveTo(screenX + 15, screenY + 5);
        this.ctx.lineTo(screenX + 10, screenY);
        this.ctx.stroke();
    }

    /**
     * Рендеринг танка
     * @param {number} screenX - X координата на экране
     * @param {number} screenY - Y координата на экране
     * @param {Object} enemy - объект врага
     */
    drawTankEnemy(screenX, screenY, enemy) {
        // Тело врага (широкое и массивное)
        this.ctx.fillStyle = this.colors.enemyTank;
        this.drawIsometricEntity(screenX, screenY, enemy.width * 1.1, enemy.height * 0.8);

        // Доспехи
        this.ctx.fillStyle = '#6d0000'; // Темнее красный
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 8, enemy.width * 0.3, 0, Math.PI * 2);
        this.ctx.fill();

        // Голова
        this.ctx.fillStyle = '#700000'; // Еще темнее красный
        this.ctx.beginPath();
        this.ctx.arc(screenX, screenY - 22, enemy.width * 0.35, 0, Math.PI * 2);
        this.ctx.fill();

        // Глаза
        this.ctx.fillStyle = '#000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 7, screenY - 24, 3, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 7, screenY - 24, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Красные глаза
        this.ctx.fillStyle = '#ff0000';
        this.ctx.beginPath();
        this.ctx.arc(screenX - 7, screenY - 24, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.arc(screenX + 7, screenY - 24, 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Щит
        this.ctx.strokeStyle = '#555';
        this.ctx.lineWidth = 3;
        this.ctx.beginPath();
        this.ctx.arc(screenX + 15, screenY + 5, 12, 0, Math.PI, true);
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