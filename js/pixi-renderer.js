// Класс PIXIRenderer - новая система рендеринга на основе PIXI.js
class PIXIRenderer {
    constructor(canvasId) {
        // Инициализация PIXI Application
        this.app = new PIXI.Application({
            view: document.getElementById(canvasId),
            backgroundColor: 0x0a0a0a, // Соответствует #0a0a0a из CSS
            resizeTo: window,
            antialias: true,
            autoDensity: true,
            resolution: window.devicePixelRatio || 1,
            preserveDrawingBuffer: true
        });

        // Создаем основной контейнер для всех игровых объектов
        this.mainContainer = new PIXI.Container();
        this.app.stage.addChild(this.mainContainer);

        // Камера (для управления видом)
        this.camera = {
            x: 0,
            y: 0,
            zoom: GAME_CONFIG.CAMERA.DEFAULT_ZOOM,
            minZoom: GAME_CONFIG.CAMERA.MIN_ZOOM,
            maxZoom: GAME_CONFIG.CAMERA.MAX_ZOOM,
            targetZoom: GAME_CONFIG.CAMERA.DEFAULT_ZOOM
        };

        // НЕ смещаем mainContainer - координаты будут рассчитываться относительно центра экрана в методах рендеринга
        // this.mainContainer.x = this.app.screen.width / 2;
        // this.mainContainer.y = this.app.screen.height / 2;

        // Размер тайла (базовый)
        this.baseTileSize = GAME_CONFIG.TILE.BASE_SIZE;

        // Цвета для рендеринга (соответствуют старой системе)
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

        // Словарь для хранения спрайтов тайлов
        this.tileSprites = new Map();

        // Словарь для хранения спрайтов персонажей и врагов
        this.entitySprites = new Map();

        // Слой для тайлов (фон)
        this.tileLayer = new PIXI.Container();
        this.mainContainer.addChild(this.tileLayer);

        // Слой для объектов (персонажи, враги, предметы)
        this.objectLayer = new PIXI.Container();
        this.mainContainer.addChild(this.objectLayer);

        // Слой для UI элементов (здоровье, эффекты)
        this.uiLayer = new PIXI.Container();
        this.mainContainer.addChild(this.uiLayer);

        // Инициализация изометрической проекции
        this.isoAngle = Math.atan(0.5);
        this.tileWidth = 64;
        this.tileHeight = 32;

        // Создаем тайлсеты для различных типов тайлов
        this.tileTextures = new Map();
        this.generateTileTextures();

        // Кэш для чанков, чтобы избежать повторной генерации
        this.chunkCache = new Map();

        // Текстуры для персонажей и врагов
        this.entityTextures = new Map();
        this.generateEntityTextures();

        // Анимации для сущностей
        this.animations = new Map();
        this.animationFrame = 0;

        // Для сортировки по глубине
        this.objectLayer.sortableChildren = true;

        // Спрятанный канвас для создания спрайтшитов
        this.spriteSheetCanvas = document.createElement('canvas');
        this.spriteSheetCanvas.width = 1024;
        this.spriteSheetCanvas.height = 1024;
        this.spriteSheetCtx = this.spriteSheetCanvas.getContext('2d');

        // Текстуры спрайтшита
        this.spriteSheetTextures = new Map();

        // Для culling (отсечение невидимых объектов)
        this.viewBounds = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);

        // Слой для частиц
        this.particleLayer = new PIXI.ParticleContainer(10000, {
            scale: true,
            position: true,
            rotation: true,
            uvs: true,
            alpha: true
        });
        this.mainContainer.addChild(this.particleLayer);

        // Система частиц
        this.particles = [];

        // Оптимизация для большого количества объектов
        this.maxVisibleEntities = 200; // Максимальное количество видимых сущностей
        this.entityPool = []; // Пул для переиспользования спрайтов
    }

    /**
     * Генерация текстур для персонажей и врагов
     */
    generateEntityTextures() {
        // Создаем текстуры для различных типов сущностей
        const entitySize = { width: 32, height: 32 };

        // Текстура игрока
        const playerTexture = this.createPlayerTexture(entitySize);
        this.entityTextures.set('player', playerTexture);

        // Текстуры для различных типов врагов
        const basicEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemy);
        this.entityTextures.set('enemy_basic', basicEnemyTexture);

        const weakEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyWeak);
        this.entityTextures.set('enemy_weak', weakEnemyTexture);

        const strongEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyStrong);
        this.entityTextures.set('enemy_strong', strongEnemyTexture);

        const fastEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyFast);
        this.entityTextures.set('enemy_fast', fastEnemyTexture);

        const tankEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyTank);
        this.entityTextures.set('enemy_tank', tankEnemyTexture);
    }

    /**
     * Создание текстуры игрока
     * @param {Object} size - размеры {width, height}
     * @returns {PIXI.Texture} - текстура игрока
     */
    createPlayerTexture(size) {
        const graphics = new PIXI.Graphics();

        // Тело персонажа (изометрический ромб)
        graphics.beginFill(this.hexToDecimal(this.colors.player));
        this.drawIsometricEntity(graphics, 0, 0, size.width * 0.8, size.height * 0.6);
        graphics.endFill();

        // Добавляем детали тела (доспехи)
        graphics.beginFill(this.hexToDecimal(this.colors.playerHighlight));
        graphics.drawCircle(0, -5, size.width * 0.2);
        graphics.endFill();

        // Голова
        graphics.beginFill(0xf9d9aa); // Телесный цвет
        graphics.drawCircle(0, -15, size.width * 0.25);
        graphics.endFill();

        // Обводка головы
        graphics.lineStyle(2, 0xd6bba0);
        graphics.drawCircle(0, -15, size.width * 0.25);

        // Глаза
        graphics.beginFill(0x000000);
        graphics.drawCircle(-4, -16, 2);
        graphics.drawCircle(4, -16, 2);
        graphics.endFill();

        // Оружие (меч)
        graphics.lineStyle(3, 0xc0c0c0); // Серебристый
        graphics.moveTo(10, -10);
        graphics.lineTo(20, -20);

        // Рукоять меча
        graphics.beginFill(0x8b4513); // Коричневый
        graphics.drawRect(8, -8, 5, 10);
        graphics.endFill();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры врага
     * @param {Object} size - размеры {width, height}
     * @param {string} color - цвет врага
     * @returns {PIXI.Texture} - текстура врага
     */
    createEnemyTexture(size, color) {
        const graphics = new PIXI.Graphics();
        
        // Тело врага
        graphics.beginFill(this.hexToDecimal(color));
        this.drawIsometricEntity(graphics, 0, 0, size.width * 0.8, size.height * 0.6);
        graphics.endFill();

        // Голова
        graphics.beginFill(0xe03c3c);
        graphics.drawCircle(0, -15, size.width * 0.25);
        graphics.endFill();

        // Глаза
        graphics.beginFill(0x000000);
        graphics.drawCircle(-5, -17, 2);
        graphics.drawCircle(5, -17, 2);
        graphics.endFill();

        // Красные глаза
        graphics.beginFill(0xff0000);
        graphics.drawCircle(-5, -17, 1);
        graphics.drawCircle(5, -17, 1);
        graphics.endFill();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание тени для спрайта
     * @param {PIXI.Sprite} sprite - спрайт, для которого создается тень
     * @param {number} offsetX - смещение тени по X
     * @param {number} offsetY - смещение тени по Y
     * @param {number} blur - размытие тени
     * @param {number} alpha - прозрачность тени
     * @returns {PIXI.Sprite} - спрайт тени
     */
    createShadow(sprite, offsetX = 2, offsetY = 2, blur = 0, alpha = 0.3) {
        // Создаем тень как отдельный спрайт
        const shadow = new PIXI.Sprite(sprite.texture);
        shadow.tint = 0x000000; // Чёрный цвет для тени
        shadow.alpha = alpha;
        shadow.x = sprite.x + offsetX;
        shadow.y = sprite.y + offsetY;
        shadow.scale.x = sprite.scale.x;
        shadow.scale.y = sprite.scale.y;
        
        return shadow;
    }

    /**
     * Добавление тени к сущности
     * @param {Object} entity - сущность, для которой добавляется тень
     */
    addShadowToEntity(entity) {
        const sprite = this.entitySprites.get(entity);
        if (sprite) {
            // Создаем тень
            const shadow = this.createShadow(sprite);
            
            // Добавляем тень в слой объектов под спрайтом сущности
            const entityIndex = this.objectLayer.children.indexOf(sprite);
            if (entityIndex !== -1) {
                this.objectLayer.addChildAt(shadow, entityIndex);
            } else {
                this.objectLayer.addChild(shadow);
            }
            
            // Сохраняем ссылку на тень
            this.entitySprites.set(`${entity}_shadow`, shadow);
        }
    }

    /**
     * Создание спрайтшита из нескольких текстур
     * @param {Array<PIXI.Texture>} textures - массив текстур для объединения
     * @param {string} sheetName - имя спрайтшита
     */
    createSpriteSheet(textures, sheetName) {
        // Создаем временный контейнер для объединения текстур
        const container = new PIXI.Container();
        
        // Добавляем все текстуры в контейнер с размещением по сетке
        const gridSize = Math.ceil(Math.sqrt(textures.length));
        const textureSize = textures[0]?.width || 32; // Предполагаем, что все текстуры одного размера
        
        for (let i = 0; i < textures.length; i++) {
            const sprite = new PIXI.Sprite(textures[i]);
            sprite.x = (i % gridSize) * textureSize;
            sprite.y = Math.floor(i / gridSize) * textureSize;
            container.addChild(sprite);
        }
        
        // Генерируем текстуру спрайтшита
        const spriteSheetTexture = this.app.renderer.generateTexture(container);
        this.spriteSheetTextures.set(sheetName, spriteSheetTexture);
        
        return spriteSheetTexture;
    }

    /**
     * Создание анимированной текстуры для сущности
     * @param {Object} size - размеры {width, height}
     * @param {string} color - цвет сущности
     * @param {string} animationType - тип анимации ('walk', 'attack', 'hurt', 'die')
     * @returns {Array<PIXI.Texture>} - массив текстур для анимации
     */
    createAnimatedEntityTextures(size, color, animationType) {
        const textures = [];
        const frameCount = 4; // Количество кадров для анимации
        
        for (let i = 0; i < frameCount; i++) {
            const graphics = new PIXI.Graphics();
            
            // Рисуем базовую форму в зависимости от типа анимации
            switch(animationType) {
                case 'walk':
                    // Анимация ходьбы - слегка изменяем позицию ног/тела
                    graphics.beginFill(this.hexToDecimal(color));
                    // Смещаем тело в зависимости от кадра
                    const offset = Math.sin(i * Math.PI / 2) * 2;
                    this.drawIsometricEntity(graphics, 0, offset, size.width * 0.8, size.height * 0.6);
                    graphics.endFill();
                    break;
                    
                case 'attack':
                    // Анимация атаки - поворот тела или вытягивание оружия
                    graphics.beginFill(this.hexToDecimal(color));
                    this.drawIsometricEntity(graphics, 0, 0, size.width * 0.8, size.height * 0.6);
                    graphics.endFill();
                    
                    // Добавляем анимацию оружия
                    graphics.lineStyle(3, 0xc0c0c0); // Серебристый
                    if (i === 0) {
                        graphics.moveTo(10, -10);
                        graphics.lineTo(15, -15);
                    } else if (i === 1) {
                        graphics.moveTo(10, -10);
                        graphics.lineTo(20, -20);
                    } else if (i === 2) {
                        graphics.moveTo(10, -10);
                        graphics.lineTo(25, -25);
                    } else {
                        graphics.moveTo(10, -10);
                        graphics.lineTo(20, -20);
                    }
                    break;
                    
                case 'hurt':
                    // Анимация получения урона - мигание красным или отскок
                    const hurtColor = i % 2 === 0 ? this.hexToDecimal(color) : 0xFF0000;
                    graphics.beginFill(hurtColor);
                    this.drawIsometricEntity(graphics, 0, 0, size.width * 0.8, size.height * 0.6);
                    graphics.endFill();
                    break;
                    
                case 'die':
                    // Анимация смерти - постепенное падение
                    graphics.beginFill(this.hexToDecimal(color));
                    const deathOffset = i * 3; // Смещение вниз для имитации падения
                    this.drawIsometricEntity(graphics, 0, deathOffset, size.width * 0.8, size.height * 0.6);
                    graphics.endFill();
                    break;
                    
                default:
                    // Базовая текстура
                    graphics.beginFill(this.hexToDecimal(color));
                    this.drawIsometricEntity(graphics, 0, 0, size.width * 0.8, size.height * 0.6);
                    graphics.endFill();
            }
            
            // Добавляем постоянные элементы (голова, глаза и т.д.)
            graphics.beginFill(0xf9d9aa); // Телесный цвет головы
            graphics.drawCircle(0, -15, size.width * 0.25);
            graphics.endFill();
            
            // Обводка головы
            graphics.lineStyle(2, 0xd6bba0);
            graphics.drawCircle(0, -15, size.width * 0.25);

            // Глаза
            graphics.beginFill(0x000000);
            graphics.drawCircle(-4, -16, 2);
            graphics.drawCircle(4, -16, 2);
            graphics.endFill();
            
            textures.push(this.app.renderer.generateTexture(graphics));
        }
        
        return textures;
    }

    /**
     * Запуск анимации для сущности
     * @param {Object} entity - сущность
     * @param {string} animationType - тип анимации
     */
    playAnimation(entity, animationType) {
        // Определяем цвет в зависимости от типа сущности
        let color;
        if (entity.constructor.name === 'Character') {
            color = this.colors.player;
        } else if (entity.type) {
            switch(entity.type) {
                case 'weak': color = this.colors.enemyWeak; break;
                case 'strong': color = this.colors.enemyStrong; break;
                case 'fast': color = this.colors.enemyFast; break;
                case 'tank': color = this.colors.enemyTank; break;
                default: color = this.colors.enemy; break;
            }
        } else {
            color = this.colors.enemy;
        }
        
        // Проверяем, есть ли уже анимация для этой сущности
        const entityAnimations = this.animations.get(entity) || {};
        
        // Если анимация уже проигрывается, не запускаем снова
        if (entityAnimations.currentAnimation === animationType) {
            return;
        }
        
        // Создаем текстуры для анимации, если их еще нет
        const animationKey = `${entity.constructor.name || entity.type}_${animationType}`;
        if (!this.entityTextures.has(animationKey)) {
            const textures = this.createAnimatedEntityTextures(
                { width: 32, height: 32 }, 
                color, 
                animationType
            );
            this.entityTextures.set(animationKey, textures);
        }
        
        // Обновляем информацию об анимации для сущности
        entityAnimations.currentAnimation = animationType;
        entityAnimations.frameIndex = 0;
        entityAnimations.frameTime = 0;
        entityAnimations.totalFrames = this.entityTextures.get(animationKey).length;
        this.animations.set(entity, entityAnimations);
    }

    /**
     * Обновление анимаций (вызывать каждый кадр)
     * @param {number} deltaTime - время с последнего кадра
     */
    updateAnimations(deltaTime) {
        this.animationFrame++;
        
        // Обновляем каждую анимацию
        for (const [entity, animData] of this.animations.entries()) {
            if (animData.currentAnimation) {
                // Увеличиваем время кадра
                animData.frameTime += deltaTime;
                
                // Если прошло достаточно времени для смены кадра
                if (animData.frameTime > 0.2) { // 0.2 секунды на кадр
                    animData.frameIndex = (animData.frameIndex + 1) % animData.totalFrames;
                    animData.frameTime = 0;
                    
                    // Обновляем спрайт сущности
                    const sprite = this.entitySprites.get(entity);
                    if (sprite) {
                        const animationKey = `${entity.constructor.name || entity.type}_${animData.currentAnimation}`;
                        const textures = this.entityTextures.get(animationKey);
                        if (textures && textures[animData.frameIndex]) {
                            sprite.texture = textures[animData.frameIndex];
                            
                            // Если анимация закончилась, удаляем информацию об анимации
                            if (animData.currentAnimation === 'attack' || 
                                animData.currentAnimation === 'hurt' || 
                                animData.currentAnimation === 'die') {
                                if (animData.frameIndex === animData.totalFrames - 1) {
                                    // Для однократных анимаций удаляем информацию
                                    this.stopAnimation(entity);
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    /**
     * Остановка анимации для сущности
     * @param {Object} entity - сущность
     */
    stopAnimation(entity) {
        const animData = this.animations.get(entity);
        if (animData) {
            // Возвращаем к базовой текстуре
            const sprite = this.entitySprites.get(entity);
            if (sprite) {
                if (entity.constructor.name === 'Character') {
                    sprite.texture = this.entityTextures.get('player');
                } else {
                    let textureKey = 'enemy_basic';
                    switch(entity.type) {
                        case 'weak': textureKey = 'enemy_weak'; break;
                        case 'strong': textureKey = 'enemy_strong'; break;
                        case 'fast': textureKey = 'enemy_fast'; break;
                        case 'tank': textureKey = 'enemy_tank'; break;
                    }
                    sprite.texture = this.entityTextures.get(textureKey);
                }
            }
            
            this.animations.delete(entity);
        }
    }

    /**
     * Генерация текстур для тайлов
     */
    generateTileTextures() {
        // Создаем текстуры для различных типов тайлов
        const tileSize = this.baseTileSize;

        // Текстура пола
        const floorTexture = this.createFloorTexture(tileSize);
        this.tileTextures.set(0, floorTexture);

        // Текстура стены
        const wallTexture = this.createWallTexture(tileSize);
        this.tileTextures.set(1, wallTexture);

        // Текстура колонны
        const columnTexture = this.createColumnTexture(tileSize);
        this.tileTextures.set(2, columnTexture);

        // Текстура дерева
        const treeTexture = this.createTreeTexture(tileSize);
        this.tileTextures.set(3, treeTexture);

        // Текстура скалы
        const rockTexture = this.createRockTexture(tileSize);
        this.tileTextures.set(4, rockTexture);

        // Текстура воды
        const waterTexture = this.createWaterTexture(tileSize);
        this.tileTextures.set(5, waterTexture);

        // Текстура льда
        const iceTexture = this.createIceTexture(tileSize);
        this.tileTextures.set(6, iceTexture);

        // Текстура декорации
        const decorationTexture = this.createDecorationTexture(tileSize);
        this.tileTextures.set(7, decorationTexture);
    }

    /**
     * Создание текстуры пола
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура пола
     */
    createFloorTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Основной пол
        graphics.beginFill(this.hexToDecimal(this.colors.floor));
        this.drawIsometricTile(graphics, 0, 0, tileSize, tileSize / 2);
        graphics.endFill();

        // Добавляем текстуру пола
        graphics.beginFill(this.hexToDecimal(this.colors.floorLight));
        
        // Рисуем узор на полу
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 4, tileSize / 8);
        graphics.lineTo(0, tileSize / 4);
        graphics.lineTo(-tileSize / 4, tileSize / 8);
        graphics.closePath();
        
        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, this.hexToDecimal(this.colors.grid));
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 2, tileSize / 4);
        graphics.lineTo(0, tileSize / 2);
        graphics.lineTo(-tileSize / 2, tileSize / 4);
        graphics.closePath();

        // Создаем текстуру из графики
        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры стены
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура стены
     */
    createWallTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Основная стена
        graphics.beginFill(this.hexToDecimal(this.colors.wall));
        this.drawIsometricTile(graphics, 0, 0, tileSize, tileSize / 2);
        graphics.endFill();

        // Добавляем детали стены (кирпичная кладка)
        graphics.beginFill(this.hexToDecimal(this.colors.wallDark));
        const brickWidth = tileSize / 4;
        const brickHeight = tileSize / 8;

        // Рисуем кирпичи
        for (let row = 0; row < 2; row++) {
            for (let col = 0; col < 2; col++) {
                if ((row + col) % 2 === 0) { // Чередуем кирпичи
                    const brickX = (col * brickWidth) - (row * brickWidth / 2);
                    const brickY = (row * brickHeight);

                    graphics.moveTo(brickX, brickY);
                    graphics.lineTo(brickX + brickWidth / 2, brickY + brickHeight / 2);
                    graphics.lineTo(brickX, brickY + brickHeight);
                    graphics.lineTo(brickX - brickWidth / 2, brickY + brickHeight / 2);
                    graphics.closePath();
                }
            }
        }

        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, 0x4a3b2a);
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 2, tileSize / 4);
        graphics.lineTo(0, tileSize / 2);
        graphics.lineTo(-tileSize / 2, tileSize / 4);
        graphics.closePath();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры колонны
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура колонны
     */
    createColumnTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Основание колонны
        graphics.beginFill(this.hexToDecimal(this.colors.wallDark));
        this.drawIsometricTile(graphics, 0, 0, tileSize * 0.6, tileSize / 2 * 0.6);
        graphics.endFill();

        // Ствол колонны
        graphics.beginFill(this.hexToDecimal(this.colors.wall));
        graphics.moveTo(0, -tileSize * 0.1);
        graphics.lineTo(tileSize * 0.2, tileSize * 0.05);
        graphics.lineTo(0, tileSize * 0.2);
        graphics.lineTo(-tileSize * 0.2, tileSize * 0.05);
        graphics.closePath();
        graphics.endFill();

        // Верхушка колонны
        graphics.beginFill(this.hexToDecimal(this.colors.wallDark));
        graphics.moveTo(0, -tileSize * 0.2);
        graphics.lineTo(tileSize * 0.25, -tileSize * 0.05);
        graphics.lineTo(0, tileSize * 0.1);
        graphics.lineTo(-tileSize * 0.25, -tileSize * 0.05);
        graphics.closePath();
        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, 0x4a3b2a);
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 2, tileSize / 4);
        graphics.lineTo(0, tileSize / 2);
        graphics.lineTo(-tileSize / 2, tileSize / 4);
        graphics.closePath();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры дерева
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура дерева
     */
    createTreeTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Ствол дерева
        graphics.beginFill(this.hexToDecimal(this.colors.treeTrunk));
        this.drawIsometricTile(graphics, 0, 0, tileSize * 0.4, tileSize / 2 * 0.4);
        graphics.endFill();

        // Тень от ствола
        graphics.beginFill(0x4a2c22);
        graphics.moveTo(-tileSize * 0.1, tileSize * 0.1);
        graphics.lineTo(tileSize * 0.1, tileSize * 0.2);
        graphics.lineTo(0, tileSize * 0.3);
        graphics.lineTo(-tileSize * 0.2, tileSize * 0.2);
        graphics.closePath();
        graphics.endFill();

        // Крона дерева
        graphics.beginFill(this.hexToDecimal(this.colors.treeLeaves));
        graphics.drawCircle(0, -tileSize * 0.3, tileSize * 0.4);
        graphics.endFill();

        // Более темные участки кроны для объема
        graphics.beginFill(0x2e7a2f);
        graphics.drawCircle(-tileSize * 0.1, -tileSize * 0.4, tileSize * 0.2);
        graphics.endFill();

        graphics.beginFill(0x2e7a2f);
        graphics.drawCircle(tileSize * 0.15, -tileSize * 0.25, tileSize * 0.15);
        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, 0x2a5a2a);
        graphics.drawCircle(0, -tileSize * 0.3, tileSize * 0.4);

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры скалы
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура скалы
     */
    createRockTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Основная скала
        graphics.beginFill(this.hexToDecimal(this.colors.rock));
        this.drawIsometricTile(graphics, 0, 0, tileSize * 0.7, tileSize / 2 * 0.7);
        graphics.endFill();

        // Добавляем текстуру скалы
        graphics.beginFill(0x6d4c41);

        // Неровности скалы
        graphics.moveTo(0, -tileSize * 0.1);
        graphics.lineTo(tileSize * 0.15, tileSize * 0.05);
        graphics.lineTo(0, tileSize * 0.2);
        graphics.lineTo(-tileSize * 0.15, tileSize * 0.05);
        graphics.closePath();

        graphics.moveTo(-tileSize * 0.2, tileSize * 0.1);
        graphics.lineTo(-tileSize * 0.05, tileSize * 0.25);
        graphics.lineTo(-tileSize * 0.15, tileSize * 0.35);
        graphics.lineTo(-tileSize * 0.3, tileSize * 0.2);
        graphics.closePath();

        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, 0x5a3c2a);
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 2, tileSize / 4);
        graphics.lineTo(0, tileSize / 2);
        graphics.lineTo(-tileSize / 2, tileSize / 4);
        graphics.closePath();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры воды
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура воды
     */
    createWaterTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Основная вода
        graphics.beginFill(this.hexToDecimal(this.colors.water));
        this.drawIsometricTile(graphics, 0, 0, tileSize, tileSize / 2);
        graphics.endFill();

        // Анимация воды (волны)
        graphics.beginFill(0x42a5f5);

        // Рисуем волны
        for (let i = 0; i < 3; i++) {
            const waveX = (i - 1) * tileSize * 0.2;
            const waveY = Math.sin(Date.now() / 500 + i) * tileSize * 0.05;

            graphics.drawCircle(waveX, waveY, tileSize * 0.08);
        }

        graphics.endFill();

        // Блики на воде
        graphics.beginFill(0x90caf9);
        graphics.drawCircle(-tileSize * 0.2, -tileSize * 0.1, tileSize * 0.05);
        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, 0x0d47a1);
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 2, tileSize / 4);
        graphics.lineTo(0, tileSize / 2);
        graphics.lineTo(-tileSize / 2, tileSize / 4);
        graphics.closePath();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры льда
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура льда
     */
    createIceTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Основной лед
        graphics.beginFill(this.hexToDecimal(this.colors.ice));
        this.drawIsometricTile(graphics, 0, 0, tileSize, tileSize / 2);
        graphics.endFill();

        // Эффект прозрачности и блеска
        graphics.beginFill(0xe3f2fd);
        graphics.drawCircle(-tileSize * 0.2, -tileSize * 0.1, tileSize * 0.08);
        graphics.endFill();

        graphics.beginFill(0xe3f2fd);
        graphics.drawCircle(tileSize * 0.15, -tileSize * 0.15, tileSize * 0.05);
        graphics.endFill();

        // Трещины на льду
        graphics.lineStyle(1, 0x90caf9);
        graphics.moveTo(-tileSize * 0.2, 0);
        graphics.lineTo(tileSize * 0.1, -tileSize * 0.1);
        graphics.lineTo(tileSize * 0.2, tileSize * 0.1);

        // Обводка для контраста
        graphics.lineStyle(1, 0x90caf9);
        graphics.moveTo(0, 0);
        graphics.lineTo(tileSize / 2, tileSize / 4);
        graphics.lineTo(0, tileSize / 2);
        graphics.lineTo(-tileSize / 2, tileSize / 4);
        graphics.closePath();

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание текстуры декорации
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура декорации
     */
    createDecorationTexture(tileSize) {
        const graphics = new PIXI.Graphics();
        
        // Цветок или куст
        graphics.beginFill(this.hexToDecimal(this.colors.decoration));
        graphics.drawCircle(0, 0, tileSize * 0.15);
        graphics.endFill();

        // Петельки цветка
        graphics.beginFill(0x7cb342);
        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            const petalX = Math.cos(angle) * tileSize * 0.1;
            const petalY = Math.sin(angle) * tileSize * 0.05;

            graphics.drawCircle(petalX, petalY, tileSize * 0.08);
        }

        graphics.endFill();

        // Центр цветка
        graphics.beginFill(0xffff00);
        graphics.drawCircle(0, 0, tileSize * 0.05);
        graphics.endFill();

        // Обводка для контраста
        graphics.lineStyle(1, 0x689f38);
        graphics.drawCircle(0, 0, tileSize * 0.15);

        return this.app.renderer.generateTexture(graphics);
    }

    /**
     * Создание контейнера для чанка
     * @param {Object} chunk - объект чанка
     * @returns {PIXI.Container} - контейнер с тайлами чанка
     */
    createChunkContainer(chunk) {
        const chunkContainer = new PIXI.Container();
        
        for (let y = 0; y < chunk.tiles.length; y++) {
            for (let x = 0; x < chunk.tiles[y].length; x++) {
                const tileType = chunk.tiles[y][x];

                // Преобразуем локальные координаты тайла в 2D координаты
                const globalX = chunk.chunkX * chunk.size + x;
                const globalY = chunk.chunkY * chunk.size + y;
                const pos = this.isoTo2D(globalX, globalY);

                // Создаем спрайт тайла в зависимости от типа
                let tileSprite;
                switch (tileType) {
                    case 0: // Пол
                        tileSprite = this.createFloorTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 1: // Стена
                        tileSprite = this.createWallTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 2: // Декорация (колонна)
                        tileSprite = this.createColumnTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 3: // Дерево (непроходимое)
                        tileSprite = this.createTreeTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 4: // Скала (непроходимое)
                        tileSprite = this.createRockTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 5: // Вода (непроходимое)
                        tileSprite = this.createWaterTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 6: // Лед (проходимое с эффектом)
                        tileSprite = this.createIceTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    case 7: // Декорация (проходимая)
                        tileSprite = this.createDecorationTile(pos.x, pos.y, this.baseTileSize);
                        break;
                    default:
                        continue; // Пропускаем неизвестные типы тайлов
                }

                if (tileSprite) {
                    chunkContainer.addChild(tileSprite);
                }
            }
        }
        
        return chunkContainer;
    }

    /**
     * Получение закэшированного чанка или создание нового
     * @param {Object} chunk - объект чанка
     * @returns {PIXI.Container} - контейнер с тайлами чанка
     */
    getCachedChunk(chunk) {
        const chunkKey = `${chunk.chunkX},${chunk.chunkY}`;
        let chunkContainer = this.chunkCache.get(chunkKey);
        
        if (!chunkContainer) {
            chunkContainer = this.createChunkContainer(chunk);
            this.chunkCache.set(chunkKey, chunkContainer);
        }
        
        return chunkContainer;
    }

    /**
     * Очистка кэша чанков (например, при перемещении далеко от текущих чанков)
     */
    clearChunkCache() {
        // Удаляем старые чанки из кэша, чтобы освободить память
        // Оставляем только те чанки, которые находятся в пределах определенного радиуса от текущей позиции камеры
        const maxChunkDistance = 10; // Максимальное расстояние в чанках
        
        const currentChunkX = Math.floor(this.camera.x / (this.baseTileSize * 16)); // 16 - размер чанка по умолчанию
        const currentChunkY = Math.floor(this.camera.y / (this.baseTileSize * 16));
        
        for (const [key, chunkContainer] of this.chunkCache.entries()) {
            const [chunkX, chunkY] = key.split(',').map(Number);
            const distance = Math.abs(chunkX - currentChunkX) + Math.abs(chunkY - currentChunkY);
            
            if (distance > maxChunkDistance) {
                // Удаляем чанк из кэша и уничтожаем его спрайты
                chunkContainer.destroy({ children: true, texture: true, baseTexture: true });
                this.chunkCache.delete(key);
            }
        }
    }

    /**
     * Установка позиции камеры
     * @param {number} x - X координата камеры
     * @param {number} y - Y координата камеры
     */
    setCameraPosition(x, y) {
        this.camera.x = x;
        this.camera.y = y;

        // Обновляем позицию основного контейнера с учетом камеры и зума
        // Сдвигаем сцену так, чтобы камера была в центре экрана
        const centerX = this.app.screen.width / 2;
        const centerY = this.app.screen.height / 2;
        this.mainContainer.x = centerX - (this.camera.x * this.camera.zoom);
        this.mainContainer.y = centerY - (this.camera.y * this.camera.zoom);

        // Очищаем кэш чанков при перемещении камеры
        this.clearChunkCache();
    }

    /**
     * Плавное перемещение камеры к указанной позиции
     * @param {number} x - X координата назначения
     * @param {number} y - Y координата назначения
     * @param {number} duration - длительность в миллисекундах
     */
    moveCameraTo(x, y, duration = 1000) {
        const startX = this.camera.x;
        const startY = this.camera.y;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Используем easing функцию для плавного движения
            const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            const currentX = startX + (x - startX) * easeProgress;
            const currentY = startY + (y - startY) * easeProgress;

            this.setCameraPosition(currentX, currentY);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Плавное изменение зума
     * @param {number} targetZoom - целевой уровень зума
     * @param {number} duration - длительность в миллисекундах
     */
    zoomTo(targetZoom, duration = 500) {
        const startZoom = this.camera.zoom;
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Используем easing функцию для плавного изменения зума
            const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOutCubic

            const currentZoom = startZoom + (targetZoom - startZoom) * easeProgress;
            this.setZoom(currentZoom);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
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
            
            // Обновляем масштаб основного контейнера
            this.mainContainer.scale.set(this.camera.zoom);
        } else {
            this.camera.zoom = this.camera.targetZoom;
            this.mainContainer.scale.set(this.camera.zoom);
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
        this.setCameraPosition(
            character.x,
            character.y
        );
    }

    /**
     * Следование камеры за персонажем с плавностью
     * @param {Character} character - персонаж, за которым следует камера
     * @param {number} smoothness - степень плавности (0-1, где 1 - мгновенное следование)
     */
    followCharacter(character, smoothness = 0.1) {
        // Плавно перемещаем камеру к позиции персонажа
        this.camera.x += (character.x - this.camera.x) * smoothness;
        this.camera.y += (character.y - this.camera.y) * smoothness;

        // Обновляем позицию основного контейнера с учетом камеры
        this.mainContainer.x = (this.app.screen.width / 2) - (this.camera.x * this.camera.zoom);
        this.mainContainer.y = (this.app.screen.height / 2) - (this.camera.y * this.camera.zoom);
        
        // Очищаем кэш чанков при перемещении камеры
        this.clearChunkCache();
    }

    /**
     * Преобразование изометрических координат в 2D координаты
     * @param {number} isoX - X координата в изометрической системе
     * @param {number} isoY - Y координата в изометрической системе
     * @returns {{x: number, y: number}} - 2D координаты
     */
    isoTo2D(isoX, isoY) {
        const x = (isoX - isoY) * Math.cos(this.isoAngle) * this.tileWidth / 2;
        const y = (isoX + isoY) * Math.sin(this.isoAngle) * this.tileHeight / 2;
        return { x, y };
    }

    /**
     * Преобразование 2D координат в изометрические
     * @param {number} x - X координата в 2D системе
     * @param {number} y - Y координата в 2D системе
     * @returns {{isoX: number, isoY: number}} - Изометрические координаты
     */
    coordToIso(x, y) {
        const tempX = x / (Math.cos(this.isoAngle) * this.tileWidth / 2);
        const tempY = y / (Math.sin(this.isoAngle) * this.tileHeight / 2);

        const isoX = (tempX + tempY) / 2;
        const isoY = (tempY - tempX) / 2;

        return { isoX, isoY };
    }

    /**
     * Получение индекса тайла по 2D координатам
     * @param {number} x - X координата в 2D системе
     * @param {number} y - Y координата в 2D системе
     * @returns {{tileX: number, tileY: number}} - Индексы тайла
     */
    getTileIndex(x, y) {
        const isoCoords = this.coordToIso(x, y);
        const tileX = Math.floor(isoCoords.isoX);
        const tileY = Math.floor(isoCoords.isoY);
        return { tileX, tileY };
    }

    /**
     * Проверка, находится ли объект в пределах видимости камеры
     * @param {number} x - X координата объекта
     * @param {number} y - Y координата объекта
     * @param {number} width - ширина объекта
     * @param {number} height - высота объекта
     * @returns {boolean} - видим ли объект
     */
    isObjectVisible(x, y, width = 0, height = 0) {
        // Рассчитываем видимую область с учетом текущей камеры и зума
        const visibleLeft = this.camera.x - (this.app.screen.width / 2) / this.camera.zoom;
        const visibleRight = this.camera.x + (this.app.screen.width / 2) / this.camera.zoom;
        const visibleTop = this.camera.y - (this.app.screen.height / 2) / this.camera.zoom;
        const visibleBottom = this.camera.y + (this.app.screen.height / 2) / this.camera.zoom;

        // Добавляем небольшой буфер для плавности
        const buffer = 64; // Пикселей

        return x + width/2 > visibleLeft - buffer &&
               x - width/2 < visibleRight + buffer &&
               y + height/2 > visibleTop - buffer &&
               y - height/2 < visibleBottom + buffer;
    }

    /**
     * Рендеринг тайлов (пол, стены, декорации, препятствия)
     * @param {Array<Array<number>>} map - карта тайлов (0 - пол, 1 - стена, 2 - колонна, 3 - дерево, 4 - скала, 5 - вода, 6 - лед, 7 - декорация)
     * @param {ChunkSystem} chunkSystem - система чанков (опционально)
     */
    renderTiles(map, chunkSystem = null) {
        // Очищаем предыдущие тайлы
        this.tileLayer.removeChildren();

        if (chunkSystem) {
            // Рендерим только видимые чанки
            const chunksToRender = chunkSystem.getChunksToRender(
                this.camera.x,
                this.camera.y,
                this.app.screen.width,
                this.app.screen.height,
                this.baseTileSize
            );

            for (const chunk of chunksToRender) {
                if (chunk && chunk.tiles) {
                    // Получаем закэшированный чанк или создаем новый
                    const chunkContainer = this.getCachedChunk(chunk);
                    
                    // Добавляем контейнер чанка к слою тайлов
                    this.tileLayer.addChild(chunkContainer);
                }
            }
        } else {
            // Старая логика для совместимости
            if (!map || map.length === 0) return;

            // Для обратной совместимости используем оригинальный метод
            const tileSize = this.baseTileSize;
            const buffer = this.baseTileSize * 2;

            for (let y = 0; y < map.length; y++) {
                for (let x = 0; x < map[y].length; x++) {
                    const tileType = map[y][x];

                    // Преобразуем координаты тайла в 2D координаты
                    const pos = this.isoTo2D(x, y);

                    // Проверяем, видим ли тайл (преобразуем мировые координаты в экранные)
                    const centerX = this.app.screen.width / 2;
                    const centerY = this.app.screen.height / 2;
                    const screenX = centerX + (pos.x - this.camera.x) * this.camera.zoom;
                    const screenY = centerY + (pos.y - this.camera.y) * this.camera.zoom;

                    if (!this.isObjectVisible(pos.x, pos.y, tileSize, tileSize / 2)) {
                        continue; // Пропускаем невидимые тайлы
                    }

                    // Создаем спрайт тайла в зависимости от типа (используем мировые координаты)
                    let tileSprite;
                    switch (tileType) {
                        case 0: // Пол
                            tileSprite = this.createFloorTile(pos.x, pos.y, tileSize);
                            break;
                        case 1: // Стена
                            tileSprite = this.createWallTile(pos.x, pos.y, tileSize);
                            break;
                        case 2: // Декорация (колонна)
                            tileSprite = this.createColumnTile(pos.x, pos.y, tileSize);
                            break;
                        case 3: // Дерево (непроходимое)
                            tileSprite = this.createTreeTile(pos.x, pos.y, tileSize);
                            break;
                        case 4: // Скала (непроходимое)
                            tileSprite = this.createRockTile(pos.x, pos.y, tileSize);
                            break;
                        case 5: // Вода (непроходимое)
                            tileSprite = this.createWaterTile(pos.x, pos.y, tileSize);
                            break;
                        case 6: // Лед (проходимое с эффектом)
                            tileSprite = this.createIceTile(pos.x, pos.y, tileSize);
                            break;
                        case 7: // Декорация (проходимая)
                            tileSprite = this.createDecorationTile(pos.x, pos.y, tileSize);
                            break;
                        default:
                            continue; // Пропускаем неизвестные типы тайлов
                    }

                    if (tileSprite) {
                        this.tileLayer.addChild(tileSprite);
                    }
                }
            }
        }
    }

    /**
     * Создание спрайта пола
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт пола
     */
    createFloorTile(x, y, tileSize) {
        const texture = this.tileTextures.get(0);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта стены
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт стены
     */
    createWallTile(x, y, tileSize) {
        const texture = this.tileTextures.get(1);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта колонны
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт колонны
     */
    createColumnTile(x, y, tileSize) {
        const texture = this.tileTextures.get(2);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта дерева
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт дерева
     */
    createTreeTile(x, y, tileSize) {
        const texture = this.tileTextures.get(3);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта скалы
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт скалы
     */
    createRockTile(x, y, tileSize) {
        const texture = this.tileTextures.get(4);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта воды
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт воды
     */
    createWaterTile(x, y, tileSize) {
        const texture = this.tileTextures.get(5);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта льда
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт льда
     */
    createIceTile(x, y, tileSize) {
        const texture = this.tileTextures.get(6);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Создание спрайта декорации
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт декорации
     */
    createDecorationTile(x, y, tileSize) {
        const texture = this.tileTextures.get(7);
        const sprite = new PIXI.Sprite(texture);
        
        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / texture.width;
        const scaleY = (tileSize / 2) / texture.height;
        sprite.scale.set(scaleX, scaleY);
        
        // Устанавливаем позицию
        sprite.x = x;
        sprite.y = y;
        
        return sprite;
    }

    /**
     * Рисование изометрического тайла
     * @param {PIXI.Graphics} graphics - объект Graphics для рисования
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} width - ширина
     * @param {number} height - высота
     */
    drawIsometricTile(graphics, x, y, width, height) {
        graphics.moveTo(x, y);
        graphics.lineTo(x + width / 2, y + height / 2);
        graphics.lineTo(x, y + height);
        graphics.lineTo(x - width / 2, y + height / 2);
        graphics.closePath();
    }

    /**
     * Рендеринг персонажа
     * @param {Character} character - персонаж для рендеринга
     */
    renderCharacter(character) {
        // Создаем или обновляем спрайт персонажа
        let characterSprite = this.entitySprites.get(character);
        if (!characterSprite) {
            // Создаем спрайт с текстурой игрока
            const texture = this.entityTextures.get('player');
            characterSprite = new PIXI.Sprite(texture);
            this.entitySprites.set(character, characterSprite);
            this.objectLayer.addChild(characterSprite);
        } else if (!characterSprite.parent) {
            // Если спрайт есть в кэше, но не в дереве сцены, добавляем его
            this.objectLayer.addChild(characterSprite);
        }

        // Устанавливаем позицию спрайта
        // mainContainer уже перемещен и масштабирован на основе камеры, поэтому используем только мировые координаты
        characterSprite.x = character.x;
        characterSprite.y = character.y;

        // Рисуем индикатор здоровья
        this.renderHealthBar(character, characterSprite.x, characterSprite.y - 25);
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

        // Создаем или обновляем индикатор здоровья
        let healthBarContainer = this.entitySprites.get(`${entity}_healthbar`);
        if (!healthBarContainer) {
            healthBarContainer = new PIXI.Container();

            // Создаем спрайты для фона и заполнения
            const backgroundSprite = new PIXI.Graphics();
            backgroundSprite.beginFill(0x333333);
            backgroundSprite.drawRect(0, 0, barWidth, barHeight);
            backgroundSprite.endFill();
            healthBarContainer.addChild(backgroundSprite);

            const fillSprite = new PIXI.Graphics();
            fillSprite.beginFill(0x4CAF50); // Начальный цвет - зеленый
            fillSprite.drawRect(0, 0, barWidth * healthPercent, barHeight);
            fillSprite.endFill();
            healthBarContainer.addChild(fillSprite);

            // Добавляем контейнер к UI слою
            this.uiLayer.addChild(healthBarContainer);
            this.entitySprites.set(`${entity}_healthbar`, healthBarContainer);
        } else if (!healthBarContainer.parent) {
            // Если контейнер есть в кэше, но не в дереве сцены, добавляем его
            this.uiLayer.addChild(healthBarContainer);
        }

        // Обновляем позицию контейнера
        healthBarContainer.x = x - barWidth / 2;
        healthBarContainer.y = y + GAME_CONFIG.RENDERER.HEALTH_BAR.OFFSET_Y;

        // Обновляем заполнение полосы здоровья
        const fillSprite = healthBarContainer.children[1]; // Второй элемент - заполнение
        fillSprite.clear();

        // Определяем цвет в зависимости от уровня здоровья
        let healthColor;
        if (healthPercent > GAME_CONFIG.RENDERER.HEALTH_BAR.HEALTH_COLOR_THRESHOLD_HIGH) {
            healthColor = 0x4CAF50; // Зеленый
        } else if (healthPercent > GAME_CONFIG.RENDERER.HEALTH_BAR.HEALTH_COLOR_THRESHOLD_MEDIUM) {
            healthColor = 0xFFC107; // Желтый
        } else {
            healthColor = 0xF44336; // Красный
        }

        fillSprite.beginFill(healthColor);
        fillSprite.drawRect(0, 0, barWidth * healthPercent, barHeight);
        fillSprite.endFill();
    }

    /**
     * Рендеринг врага
     * @param {Object} enemy - объект врага
     */
    renderEnemy(enemy) {
        // Создаем или обновляем спрайт врага
        let enemySprite = this.entitySprites.get(enemy);
        if (!enemySprite) {
            // Определяем текстуру в зависимости от типа врага
            let textureKey = 'enemy_basic';
            switch(enemy.type) {
                case 'weak':
                    textureKey = 'enemy_weak';
                    break;
                case 'strong':
                    textureKey = 'enemy_strong';
                    break;
                case 'fast':
                    textureKey = 'enemy_fast';
                    break;
                case 'tank':
                    textureKey = 'enemy_tank';
                    break;
            }

            const texture = this.entityTextures.get(textureKey);
            enemySprite = new PIXI.Sprite(texture);
            this.entitySprites.set(enemy, enemySprite);
            this.objectLayer.addChild(enemySprite);
        } else if (!enemySprite.parent) {
            // Если спрайт есть в кэше, но не в дереве сцены, добавляем его
            this.objectLayer.addChild(enemySprite);
        }

        // Устанавливаем позицию спрайта
        // mainContainer уже перемещен и масштабирован на основе камеры, поэтому используем только мировые координаты
        enemySprite.x = enemy.x;
        enemySprite.y = enemy.y;

        // Рисуем индикатор здоровья врага
        this.renderHealthBar(enemy, enemySprite.x, enemySprite.y - 25);
    }


    /**
     * Рисование изометрического объекта (тело персонажа/врага)
     * @param {PIXI.Graphics} graphics - объект Graphics для рисования
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} width - ширина
     * @param {number} height - высота
     */
    drawIsometricEntity(graphics, x, y, width, height) {
        // Рисуем основную форму ромба
        graphics.moveTo(x, y);
        graphics.lineTo(x + width / 2, y + height / 2);
        graphics.lineTo(x, y + height);
        graphics.lineTo(x - width / 2, y + height / 2);
        graphics.closePath();

        // Легкая тень для объема
        graphics.beginFill(0x000000, 0.2);
        graphics.moveTo(x - width / 4, y + height / 4);
        graphics.lineTo(x, y + height / 2);
        graphics.lineTo(x - width / 4, y + height * 0.75);
        graphics.lineTo(x - width / 2, y + height / 2);
        graphics.closePath();
        graphics.endFill();
    }

    /**
     * Очистка сцены
     */
    clear() {
        // Очищаем слой тайлов
        this.tileLayer.removeChildren();
        
        // Очищаем слой UI
        this.uiLayer.removeChildren();
        
        // НЕ очищаем objectLayer полностью - сохраняем спрайты сущностей
        // Вместо этого очищаем только временные объекты (частицы, эффекты)
        // Спрайты персонажей и врагов остаются в слое и просто обновляются по позиции
    }

    /**
     * Создание частицы
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} color - цвет частицы
     * @param {number} size - размер частицы
     * @param {number} velocityX - скорость по X
     * @param {number} velocityY - скорость по Y
     * @param {number} lifetime - время жизни частицы в миллисекундах
     */
    createParticle(x, y, color, size, velocityX, velocityY, lifetime) {
        const particle = {
            x,
            y,
            startx: x,
            starty: y,
            color,
            size,
            velocityX,
            velocityY,
            lifetime,
            age: 0,
            alpha: 1,
            rotation: Math.random() * Math.PI * 2
        };
        
        this.particles.push(particle);
        return particle;
    }

    /**
     * Создание эффекта частиц урона
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} damage - величина урона для визуализации
     */
    createDamageEffect(x, y, damage) {
        // Создаем частицы для визуализации урона
        const particleCount = Math.min(20, Math.floor(damage / 10) + 5); // Больше частиц для большего урона
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const lifetime = 500 + Math.random() * 1000; // 0.5-1.5 секунд
            
            this.createParticle(
                x, y,
                0xFF0000, // Красный цвет для урона
                2 + Math.random() * 3, // Размер 2-5
                vx, vy,
                lifetime
            );
        }
    }

    /**
     * Создание эффекта частиц лечения
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} heal - величина лечения для визуализации
     */
    createHealEffect(x, y, heal) {
        // Создаем частицы для визуализации лечения
        const particleCount = Math.min(15, Math.floor(heal / 5) + 3); // Больше частиц для большего лечения
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 1.5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const lifetime = 800 + Math.random() * 1200; // 0.8-2 секунды
            const hue = 120 + Math.random() * 60; // Оттенки зеленого
            
            // Преобразуем HSV в RGB для получения зеленоватого цвета
            const rgb = this.hsvToRgb(hue / 360, 1, 1);
            const color = (rgb.r << 16) + (rgb.g << 8) + rgb.b;
            
            this.createParticle(
                x, y,
                color,
                2 + Math.random() * 2, // Размер 2-4
                vx, vy,
                lifetime
            );
        }
    }

    /**
     * Преобразование HSV в RGB
     * @param {number} h - оттенок (0-1)
     * @param {number} s - насыщенность (0-1)
     * @param {number} v - значение (0-1)
     * @returns {Object} - объект с r, g, b компонентами
     */
    hsvToRgb(h, s, v) {
        let r, g, b;

        const i = Math.floor(h * 6);
        const f = h * 6 - i;
        const p = v * (1 - s);
        const q = v * (1 - f * s);
        const t = v * (1 - (1 - f) * s);

        switch (i % 6) {
            case 0: r = v, g = t, b = p; break;
            case 1: r = q, g = v, b = p; break;
            case 2: r = p, g = v, b = t; break;
            case 3: r = p, g = q, b = v; break;
            case 4: r = t, g = p, b = v; break;
            case 5: r = v, g = p, b = q; break;
        }

        return {
            r: Math.round(r * 255),
            g: Math.round(g * 255),
            b: Math.round(b * 255)
        };
    }

    /**
     * Создание эффекта взрыва
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} size - размер взрыва
     * @param {number} color - цвет взрыва
     */
    createExplosionEffect(x, y, size = 5, color = 0xFFA500) {
        const particleCount = 30 + Math.floor(size * 2);
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 5;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const lifetime = 300 + Math.random() * 700; // 0.3-1 секунда
            
            this.createParticle(
                x, y,
                color,
                1 + Math.random() * size,
                vx, vy,
                lifetime
            );
        }
    }

    /**
     * Создание эффекта магической атаки
     * @param {number} startX - начальная X координата
     * @param {number} startY - начальная Y координата
     * @param {number} endX - конечная X координата
     * @param {number} endY - конечная Y координата
     * @param {number} color - цвет магии
     */
    createMagicAttackEffect(startX, startY, endX, endY, color = 0x4169E1) {
        const steps = 20;
        const dx = (endX - startX) / steps;
        const dy = (endY - startY) / steps;
        
        for (let i = 0; i < steps; i++) {
            const x = startX + dx * i;
            const y = startY + dy * i;
            
            // Создаем частицы вдоль траектории
            if (Math.random() > 0.7) { // Не на каждой точке
                this.createParticle(
                    x, y,
                    color,
                    1 + Math.random() * 2,
                    (Math.random() - 0.5) * 2, // Небольшое отклонение
                    (Math.random() - 0.5) * 2,
                    200 + Math.random() * 300 // 0.2-0.5 секунды
                );
            }
        }
    }

    /**
     * Создание эффекта получения урона
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} damage - величина урона
     * @param {boolean} isCritical - является ли критическим
     */
    createDamageTakenEffect(x, y, damage, isCritical = false) {
        // Основные частицы крови
        const particleCount = Math.min(25, 5 + Math.floor(damage / 5));
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 3;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const lifetime = 400 + Math.random() * 600; // 0.4-1 секунда
            
            this.createParticle(
                x, y,
                0x8B0000, // Темно-красный
                1 + Math.random() * 2,
                vx, vy,
                lifetime
            );
        }
        
        // Если урон критический, добавляем дополнительные эффекты
        if (isCritical) {
            this.createExplosionEffect(x, y, 3, 0xFF0000); // Красный взрыв для крита
        }
    }

    /**
     * Обновление частиц
     * @param {number} deltaTime - время, прошедшее с последнего обновления
     */
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Обновляем позицию
            particle.x += particle.velocityX;
            particle.y += particle.velocityY;
            
            // Применяем гравитацию
            particle.velocityY += 0.1;
            
            // Обновляем возраст
            particle.age += deltaTime;
            
            // Обновляем прозрачность
            const lifeRatio = particle.age / particle.lifetime;
            particle.alpha = 1 - lifeRatio;
            
            // Удаляем устаревшие частицы
            if (particle.age >= particle.lifetime) {
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * Получение спрайта из пула или создание нового
     * @param {PIXI.Texture} texture - текстура для спрайта
     * @returns {PIXI.Sprite} - спрайт
     */
    getSpriteFromPool(texture) {
        if (this.entityPool.length > 0) {
            const sprite = this.entityPool.pop();
            sprite.texture = texture;
            sprite.visible = true;
            return sprite;
        } else {
            return new PIXI.Sprite(texture);
        }
    }

    /**
     * Возврат спрайта в пул
     * @param {PIXI.Sprite} sprite - спрайт для возврата в пул
     */
    returnSpriteToPool(sprite) {
        sprite.visible = false;
        this.entityPool.push(sprite);
    }

    /**
     * Ограничение количества отображаемых сущностей
     * @param {Array} entities - массив сущностей для отображения
     * @returns {Array} - ограниченный массив сущностей
     */
    limitVisibleEntities(entities) {
        if (entities.length <= this.maxVisibleEntities) {
            return entities;
        }
        
        // Сортируем сущности по расстоянию до камеры и возвращаем ближайшие
        const sortedEntities = entities.slice().sort((a, b) => {
            const distA = Math.sqrt(Math.pow(a.x - this.camera.x, 2) + Math.pow(a.y - this.camera.y, 2));
            const distB = Math.sqrt(Math.pow(b.x - this.camera.x, 2) + Math.pow(b.y - this.camera.y, 2));
            return distA - distB;
        });
        
        return sortedEntities.slice(0, this.maxVisibleEntities);
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
     * Сортировка объектов по глубине
     */
    sortObjectsByDepth() {
        // Сортируем дочерние элементы слоя объектов по глубине
        this.objectLayer.children.sort((a, b) => {
            // Получаем позицию объектов в мировых координатах
            // Так как спрайты уже трансформированы камерой, нам нужно учитывать их позицию
            const depthA = this.calculateDepth(a.x, a.y, a.height || 0);
            const depthB = this.calculateDepth(b.x, b.y, b.height || 0);
            return depthA - depthB;
        });
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
                this.app.screen.width,
                this.app.screen.height,
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
                            const pos = this.isoTo2D(globalX, globalY);

                            // Проверяем, находится ли тайл в пределах экрана
                            // Преобразуем мировые координаты в экранные для проверки видимости
                            const centerX = this.app.screen.width / 2;
                            const centerY = this.app.screen.height / 2;
                            const screenX = centerX + (pos.x - this.camera.x) * this.camera.zoom;
                            const screenY = centerY + (pos.y - this.camera.y) * this.camera.zoom;

                            if (screenX > -buffer && screenX < this.app.screen.width + buffer &&
                                screenY > -buffer / 2 && screenY < this.app.screen.height + buffer / 2) {

                                // Добавляем только тайлы с 3D-объектами (деревья, скалы, колонны и т.д.) которые должны участвовать в глубинной сортировке
                                if (tileType === 2 || tileType === 3 || tileType === 4) { // Декорация, дерево, скала
                                    allRenderables.push({
                                        x: pos.x,
                                        y: pos.y,
                                        height: tileType === 3 ? 60 : tileType === 4 ? 50 : 30, // Разная высота для разных объектов
                                        render: () => {
                                            // Рендерим основной тайл с учетом зума (используем мировые координаты, масштабирование применяется через mainContainer.scale)
                                            if (tileType === 2) { // Колонна
                                                this.createColumnTile(pos.x, pos.y, this.baseTileSize);
                                            } else if (tileType === 3) { // Дерево
                                                this.createTreeTile(pos.x, pos.y, this.baseTileSize);
                                            } else if (tileType === 4) { // Скала
                                                this.createRockTile(pos.x, pos.y, this.baseTileSize);
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
                    const pos = this.isoTo2D(x, y);

                    // Проверяем, находится ли тайл в пределах экрана
                    // Преобразуем мировые координаты в экранные для проверки видимости
                    const centerX = this.app.screen.width / 2;
                    const centerY = this.app.screen.height / 2;
                    const screenX = centerX + (pos.x - this.camera.x) * this.camera.zoom;
                    const screenY = centerY + (pos.y - this.camera.y) * this.camera.zoom;

                    if (screenX > -buffer && screenX < this.app.screen.width + buffer &&
                        screenY > -buffer / 2 && screenY < this.app.screen.height + buffer / 2) {

                        // Добавляем только тайлы с 3D-объектами (деревья, скалы, колонны и т.д.) которые должны участвовать в глубинной сортировке
                        if (tileType === 2 || tileType === 3 || tileType === 4) { // Декорация, дерево, скала
                            allRenderables.push({
                                x: pos.x,
                                y: pos.y,
                                height: tileType === 3 ? 60 : tileType === 4 ? 50 : 30, // Разная высота для разных объектов
                                render: () => {
                                    // Рендерим основной тайл с учетом зума (используем мировые координаты, масштабирование применяется через mainContainer.scale)
                                    if (tileType === 2) { // Колонна
                                        this.createColumnTile(pos.x, pos.y, this.baseTileSize);
                                    } else if (tileType === 3) { // Дерево
                                        this.createTreeTile(pos.x, pos.y, this.baseTileSize);
                                    } else if (tileType === 4) { // Скала
                                        this.createRockTile(pos.x, pos.y, this.baseTileSize);
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
     * Преобразование HEX цвета в десятичное значение для PIXI
     * @param {string} hex - HEX цвет в формате #RRGGBB
     * @returns {number} - десятичное значение цвета
     */
    hexToDecimal(hex) {
        // Удаляем символ # если он есть
        if (hex.startsWith('#')) {
            hex = hex.substring(1);
        }
        // Преобразуем строку в число
        return parseInt(hex, 16);
    }

    /**
     * Рендеринг сетки (для отладки)
     * @param {number} gridSize - размер сетки
     */
    renderGrid(gridSize = 64) {
        // Очищаем предыдущую сетку
        const gridSprite = this.entitySprites.get('grid');
        if (gridSprite) {
            gridSprite.clear();
        } else {
            const newGridSprite = new PIXI.Graphics();
            this.entitySprites.set('grid', newGridSprite);
            this.uiLayer.addChild(newGridSprite);
        }

        const graphics = this.entitySprites.get('grid');
        graphics.lineStyle(0.5, this.hexToDecimal(this.colors.grid));

        // Вертикальные линии
        for (let x = -this.camera.x % gridSize; x < this.app.screen.width; x += gridSize) {
            graphics.moveTo(x, 0);
            graphics.lineTo(x, this.app.screen.height);
        }

        // Горизонтальные линии
        for (let y = -this.camera.y % gridSize; y < this.app.screen.height; y += gridSize) {
            graphics.moveTo(0, y);
            graphics.lineTo(this.app.screen.width, y);
        }

        
    }
}