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

        // Слой для объектов (персонажи, враги)
        this.objectLayer = new PIXI.Container();
        this.objectLayer.eventMode = 'none'; // Отключаем интерактивность для объектов
        this.mainContainer.addChild(this.objectLayer);

        // ✅ Слой для полосок здоровья (ПОСЛЕ objectLayer)
        this.healthBarLayer = new PIXI.Container();
        this.mainContainer.addChild(this.healthBarLayer);

        // Слой для UI элементов (здоровье, эффекты)
        this.uiLayer = new PIXI.Container();
        this.mainContainer.addChild(this.uiLayer);

        // Менеджер UI (инициализируется позже из игры)
        this.uiManager = null;

        // Слой для частиц
        this.particleLayer = new PIXI.ParticleContainer(10000, {
            scale: true,
            position: true,
            rotation: true,
            uvs: true,
            alpha: true
        });
        this.mainContainer.addChild(this.particleLayer);

        // Слой для частиц боевых эффектов (отдельный слой для избежания конфликтов)
        this.combatParticleLayer = new PIXI.ParticleContainer(10000, {
            scale: true,
            position: true,
            rotation: true,
            uvs: true,
            alpha: true
        });
        this.mainContainer.addChild(this.combatParticleLayer);

        // Слой для предметов (над частицами, под UI)
        this.itemLayer = new PIXI.Container();
        this.itemLayer.eventMode = 'passive'; // Пропускаем события через контейнер, но обрабатываем на детях
        this.mainContainer.addChild(this.itemLayer);

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

        // Текстуры спрайтшита кэшируются через PIXI
        this.spriteSheetTextures = new Map();

        // Для culling (отсечение невидимых объектов)
        this.viewBounds = new PIXI.Rectangle(0, 0, this.app.screen.width, this.app.screen.height);

        // Система частиц
        this.particles = [];

        // Оптимизация для большого количества объектов
        this.maxVisibleEntities = 200; // Максимальное количество видимых сущностей
        this.entityPool = []; // Пул для переиспользования спрайтов

        // Пул для спрайтов предметов
        this.itemSpritePool = []; // Пул для переиспользования ItemDropSprite
        this.activeItemSprites = new Map(); // Активные спрайты предметов (ключ — drop объект)

        // Кэш текстур для предметов
        this.itemTextures = new Map();

        // Пул для спрайтов частиц
        this.particleSpritePool = []; // Пул для переиспользования спрайтов частиц
        this.activeParticles = new Map(); // Активные частицы (ключ — объект частицы)

        // Пул для текстовых эффектов (LEVEL UP, цифры урона и т.д.)
        this.textSpritePool = []; // Пул для текстовых спрайтов
        this.activeTexts = new Map(); // Активные текстовые эффекты

        // Эффекты получения уровня
        this.levelUpEffects = []; // Массив эффектов уровня (частицы + текст)

        // Эффекты боя (частицы + текст + вспышки)
        this.combatEffects = []; // Массив боевых эффектов

        // Система полосок здоровья для врагов
        this.enemyHealthBars = null; // Инициализируется в initEnemyHealthBars()

        // Кэш для текстур вспышек
        this.flashTextureCache = null;

        // Система освещения (инициализируется извне)
        this.lightingSystem = null;
    }

    /**
     * Генерация текстур для персонажей и врагов
     */
    generateEntityTextures() {
        // Создаем текстуры для различных типов сущностей
        const entitySize = { width: 32, height: 32 };

        // Текстура игрока
        let playerTexture = this.createPlayerTexture(entitySize);
        if (!playerTexture || !playerTexture.valid) {
            console.warn('Не удалось создать текстуру игрока, используем резервную');
            playerTexture = this.createFallbackTexture(32, 0x4a9eff);
        }
        this.entityTextures.set('player', playerTexture);

        // Текстуры для различных типов врагов
        let basicEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemy);
        if (!basicEnemyTexture || !basicEnemyTexture.valid) {
            console.warn('Не удалось создать текстуру врага (basic), используем резервную');
            basicEnemyTexture = this.createFallbackTexture(32, 0xff4a4a);
        }
        this.entityTextures.set('enemy_basic', basicEnemyTexture);

        let weakEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyWeak);
        if (!weakEnemyTexture || !weakEnemyTexture.valid) {
            console.warn('Не удалось создать текстуру врага (weak), используем резервную');
            weakEnemyTexture = this.createFallbackTexture(32, 0xa0a0a0);
        }
        this.entityTextures.set('enemy_weak', weakEnemyTexture);

        let strongEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyStrong);
        if (!strongEnemyTexture || !strongEnemyTexture.valid) {
            console.warn('Не удалось создать текстуру врага (strong), используем резервную');
            strongEnemyTexture = this.createFallbackTexture(32, 0xff6600);
        }
        this.entityTextures.set('enemy_strong', strongEnemyTexture);

        let fastEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyFast);
        if (!fastEnemyTexture || !fastEnemyTexture.valid) {
            console.warn('Не удалось создать текстуру врага (fast), используем резервную');
            fastEnemyTexture = this.createFallbackTexture(32, 0xffff00);
        }
        this.entityTextures.set('enemy_fast', fastEnemyTexture);

        let tankEnemyTexture = this.createEnemyTexture(entitySize, this.colors.enemyTank);
        if (!tankEnemyTexture || !tankEnemyTexture.valid) {
            console.warn('Не удалось создать текстуру врага (tank), используем резервную');
            tankEnemyTexture = this.createFallbackTexture(32, 0x8b0000);
        }
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

        // Оружие (меч) - используем drawRect вместо lineTo
        graphics.beginFill(0xc0c0c0); // Серебристый
        graphics.drawRect(10, -10, 2, 10);
        graphics.endFill();

        // Рукоять меча
        graphics.beginFill(0x8b4513); // Коричневый
        graphics.drawRect(8, -8, 5, 10);
        graphics.endFill();

        try {
            return this.app.renderer.generateTexture(graphics);
        } catch (e) {
            console.error('Ошибка при создании текстуры игрока:', e);
            return null;
        }
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

        try {
            return this.app.renderer.generateTexture(graphics);
        } catch (e) {
            console.error('Ошибка при создании текстуры врага:', e);
            return null;
        }
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
            switch (animationType) {
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
            switch (entity.type) {
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
                    switch (entity.type) {
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
     * Генерация текстур для тайлов - отложенная загрузка
     * Текстуры создаются при первом обращении
     */
    generateTileTextures() {
        // Не создаём текстуры в конструкторе - они будут созданы при первом рендеринге
        // Инициализируем пустые записи в Map для всех типов тайлов
        this.tileTextures.set(0, null);
        this.tileTextures.set(1, null);
        this.tileTextures.set(2, null);
        this.tileTextures.set(3, null);
        this.tileTextures.set(4, null);
        this.tileTextures.set(5, null);
        this.tileTextures.set(6, null);
        this.tileTextures.set(7, null);
    }

    /**
     * Получение текстуры тайла с ленивой загрузкой
     * @param {number} tileType - тип тайла
     * @returns {PIXI.Texture} - текстура тайла
     */
    getTileTexture(tileType) {
        let texture = this.tileTextures.get(tileType);

        // Проверяем, что текстура существует и имеет валидные размеры
        const isValidTexture = texture &&
            texture.baseTexture &&
            (texture.baseTexture.width > 0 || (texture.width && texture.width > 0));

        // Если текстура не создана или невалидна - создаём её заново
        if (!isValidTexture) {
            const tileSize = this.baseTileSize;

            // Пытаемся создать текстуру для известного типа тайла через Graphics
            if (tileType >= 0 && tileType <= 7) {
                try {
                    switch (tileType) {
                        case 0: texture = this.createFloorTexture(tileSize); break;
                        case 1: texture = this.createWallTexture(tileSize); break;
                        case 2: texture = this.createColumnTexture(tileSize); break;
                        case 3: texture = this.createTreeTexture(tileSize); break;
                        case 4: texture = this.createRockTexture(tileSize); break;
                        case 5: texture = this.createWaterTexture(tileSize); break;
                        case 6: texture = this.createIceTexture(tileSize); break;
                        case 7: texture = this.createDecorationTexture(tileSize); break;
                    }
                } catch (e) {
                    console.error(`Ошибка создания текстуры для тайла ${tileType}:`, e);
                    texture = null;
                }
            }

            // Если не удалось создать или неизвестный тип - используем резервную
            if (!texture) {
                const fallbackColors = [0x556B2F, 0x8B7355, 0x696969, 0x228B22, 0x808080, 0x1976d2, 0xbbdefb, 0x8bc34a];
                texture = this.createFallbackTexture(tileSize, fallbackColors[tileType] || 0x808080);
            }

            this.tileTextures.set(tileType, texture);
        }

        return texture;
    }

    /**
     * Создание текстуры пола
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура пола
     */
    createFloorTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Основной пол - тёмный камень
            graphics.beginFill(this.hexToDecimal(this.colors.floor));
            this.drawIsometricTile(graphics, 0, 0, ts, ts / 2);
            graphics.endFill();

            // Добавляем градиент затемнения к краям
            graphics.beginFill(0x0a0806, 0.4);
            this.drawIsometricTile(graphics, 0, 0, ts * 0.9, ts / 2 * 0.9);
            graphics.endFill();

            // Текстура каменных плит с трещинами
            const stoneColors = [0x2a2218, 0x3d2f22, 0x1a1512, 0x4a3a2a];
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI;
                const dist = ts * 0.15 * Math.random();
                const px = Math.cos(angle) * dist;
                const py = Math.sin(angle) * dist * 0.5;
                const color = stoneColors[Math.floor(Math.random() * stoneColors.length)];
                graphics.beginFill(color, 0.3 + Math.random() * 0.3);
                graphics.drawCircle(px, py + ts * 0.1, ts * 0.03 + Math.random() * ts * 0.02);
                graphics.endFill();
            }

            // Трещины на камне
            graphics.lineStyle(1 + Math.random(), this.hexToDecimal(this.colors.grid), 0.4);
            for (let c = 0; c < 3; c++) {
                const startX = (Math.random() - 0.5) * ts * 0.4;
                const startY = (Math.random() - 0.5) * ts * 0.2 + ts * 0.1;
                graphics.moveTo(startX, startY);
                let cx = startX;
                let cy = startY;
                for (let seg = 0; seg < 4; seg++) {
                    cx += (Math.random() - 0.5) * ts * 0.15;
                    cy += ts * 0.05 + Math.random() * ts * 0.05;
                    if (cy < ts * 0.35) {
                        graphics.lineTo(cx, cy);
                    }
                }
            }

            // Контур плит по краям
            graphics.lineStyle(2, this.hexToDecimal(this.colors.grid), 0.6);
            graphics.moveTo(0, 0);
            graphics.lineTo(ts / 2, ts / 4);
            graphics.lineTo(0, ts / 2);
            graphics.lineTo(-ts / 2, ts / 4);
            graphics.closePath();

            // Добавляем неровности по краям
            graphics.lineStyle(1, 0x1a1512, 0.3);
            for (let e = 0; e < 12; e++) {
                const edgeAngle = (e / 12) * Math.PI * 2;
                const edgeX = Math.cos(edgeAngle) * ts * 0.35;
                const edgeY = Math.sin(edgeAngle) * ts * 0.175;
                graphics.beginFill(0x0a0806, 0.2);
                graphics.drawCircle(edgeX, edgeY, ts * 0.02);
                graphics.endFill();
            }

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры пола:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.floor));
    }

    /**
     * Создание текстуры стены
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура стены
     */
    createWallTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Основная стена - тёмный грубый камень
            graphics.beginFill(this.hexToDecimal(this.colors.wall));
            this.drawIsometricTile(graphics, 0, 0, ts, ts / 2);
            graphics.endFill();

            // Затемнение по краям для объёма
            graphics.beginFill(0x0a0806, 0.5);
            this.drawIsometricTile(graphics, 0, 0, ts * 0.85, ts / 2 * 0.85);
            graphics.endFill();

            // Текстура грубого камня с неровностями
            const stoneColors = [0x2d2520, 0x3d3028, 0x1a1512, 0x4a3a30, 0x2a2218];
            for (let row = 0; row < 4; row++) {
                for (let col = 0; col < 4; col++) {
                    const brickW = ts * (0.15 + Math.random() * 0.1);
                    const brickH = ts * (0.08 + Math.random() * 0.04);
                    const brickX = (col - 1.5) * ts * 0.25 + (Math.random() - 0.5) * ts * 0.1;
                    const brickY = (row - 1.5) * ts * 0.12 + (Math.random() - 0.5) * ts * 0.05;
                    const color = stoneColors[Math.floor(Math.random() * stoneColors.length)];
                    
                    graphics.beginFill(color, 0.6 + Math.random() * 0.3);
                    // Неровные края камней
                    graphics.moveTo(brickX, brickY);
                    graphics.lineTo(brickX + brickW, brickY + brickH * 0.3);
                    graphics.lineTo(brickX + brickW * 0.8, brickY + brickH);
                    graphics.lineTo(brickX - brickW * 0.2, brickY + brickH * 0.7);
                    graphics.closePath();
                    graphics.endFill();
                }
            }

            // Трещины между камнями
            graphics.lineStyle(1 + Math.random() * 0.5, 0x0a0806, 0.7);
            for (let c = 0; c < 5; c++) {
                const crackX = (Math.random() - 0.5) * ts * 0.6;
                const crackY = (Math.random() - 0.5) * ts * 0.3;
                graphics.moveTo(crackX, crackY);
                let cx = crackX;
                let cy = crackY;
                for (let seg = 0; seg < 3; seg++) {
                    cx += (Math.random() - 0.5) * ts * 0.2;
                    cy += (Math.random() - 0.5) * ts * 0.15;
                    graphics.lineTo(cx, cy);
                }
            }

            // Сколы и неровности на поверхности
            for (let chip = 0; chip < 6; chip++) {
                const chipX = (Math.random() - 0.5) * ts * 0.5;
                const chipY = (Math.random() - 0.5) * ts * 0.25;
                const chipSize = ts * (0.02 + Math.random() * 0.03);
                graphics.beginFill(0x0a0806, 0.4);
                graphics.drawCircle(chipX, chipY, chipSize);
                graphics.endFill();
            }

            // Контур стены по краям
            graphics.lineStyle(2, 0x0a0806, 0.8);
            graphics.moveTo(0, 0);
            graphics.lineTo(ts / 2, ts / 4);
            graphics.lineTo(0, ts / 2);
            graphics.lineTo(-ts / 2, ts / 4);
            graphics.closePath();

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры стены:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.wall));
    }

    /**
     * Создание текстуры колонны
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура колонны
     */
    createColumnTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Тень под колонной
            graphics.beginFill(0x0a0806, 0.4);
            this.drawIsometricTile(graphics, 0, 0, ts * 0.5, ts / 2 * 0.5);
            graphics.endFill();

            // Основание колонны - более широкое
            graphics.beginFill(this.hexToDecimal(this.colors.wallDark));
            graphics.moveTo(-ts * 0.25, ts * 0.05);
            graphics.lineTo(ts * 0.25, ts * 0.1);
            graphics.lineTo(0, ts * 0.2);
            graphics.lineTo(-ts * 0.3, ts * 0.12);
            graphics.closePath();
            graphics.endFill();

            // Тело колонны - готическая форма с вертикальными бороздами
            const columnColors = [0x2d2520, 0x3d3028, 0x1a1512];
            for (let i = 0; i < 4; i++) {
                const stripeX = (i - 1.5) * ts * 0.12;
                const stripeW = ts * 0.08;
                const color = columnColors[i % columnColors.length];
                graphics.beginFill(color, 0.7 + Math.random() * 0.3);
                graphics.moveTo(stripeX, -ts * 0.15);
                graphics.lineTo(stripeX + stripeW * 0.8, -ts * 0.08);
                graphics.lineTo(stripeX + stripeW, ts * 0.08);
                graphics.lineTo(stripeX + stripeW * 0.2, ts * 0.15);
                graphics.closePath();
                graphics.endFill();
            }

            // Вертикальные борозды
            graphics.lineStyle(1, 0x0a0806, 0.5);
            for (let g = 0; g < 3; g++) {
                const grooveX = (g - 1) * ts * 0.15;
                graphics.moveTo(grooveX, -ts * 0.12);
                graphics.lineTo(grooveX, ts * 0.1);
            }

            // Верхняя часть колонны - декоративная капитель
            graphics.beginFill(this.hexToDecimal(this.colors.wall), 0.8);
            graphics.moveTo(0, -ts * 0.22);
            graphics.lineTo(ts * 0.28, -ts * 0.12);
            graphics.lineTo(0, -ts * 0.05);
            graphics.lineTo(-ts * 0.28, -ts * 0.12);
            graphics.closePath();
            graphics.endFill();

            // Декоративные элементы на капителе
            graphics.beginFill(0x1a1512, 0.6);
            for (let d = 0; d < 4; d++) {
                const decX = (d - 1.5) * ts * 0.12;
                graphics.drawCircle(decX, -ts * 0.15, ts * 0.03);
            }
            graphics.endFill();

            // Контур колонны
            graphics.lineStyle(2, 0x0a0806, 0.7);
            graphics.moveTo(0, 0);
            graphics.lineTo(ts / 2, ts / 4);
            graphics.lineTo(0, ts / 2);
            graphics.lineTo(-ts / 2, ts / 4);
            graphics.closePath();

            // Трещины на поверхности
            graphics.lineStyle(1, 0x0a0806, 0.3);
            graphics.moveTo(-ts * 0.1, -ts * 0.05);
            graphics.lineTo(-ts * 0.08, ts * 0.02);
            graphics.lineTo(-ts * 0.12, ts * 0.08);

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры колонны:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.wall));
    }

    /**
     * Создание текстуры дерева
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура дерева
     */
    createTreeTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Тень под деревом
            graphics.beginFill(0x0a0806, 0.3);
            graphics.drawCircle(0, ts * 0.15, ts * 0.25);
            graphics.endFill();

            // Основание ствола с корнями
            const rootColors = [0x3d2818, 0x2d1f12, 0x4a3525];
            for (let r = 0; r < 5; r++) {
                const rootAngle = (r / 5) * Math.PI + Math.PI;
                const rootLen = ts * (0.15 + Math.random() * 0.1);
                const rootX = Math.cos(rootAngle) * rootLen;
                const rootY = ts * 0.1 + Math.sin(rootAngle) * rootLen * 0.3;
                const rootW = ts * (0.04 + Math.random() * 0.03);
                graphics.beginFill(rootColors[r % rootColors.length], 0.8);
                graphics.moveTo(rootX, rootY);
                graphics.quadraticCurveTo(rootX * 0.5, rootY - ts * 0.05, 0, ts * 0.12);
                graphics.lineTo(rootX * 0.3, rootY + ts * 0.05);
                graphics.closePath();
                graphics.endFill();
            }

            // Ствол - искривлённый, с сучками
            graphics.beginFill(this.hexToDecimal(this.colors.treeTrunk));
            graphics.moveTo(-ts * 0.12, ts * 0.08);
            graphics.lineTo(ts * 0.12, ts * 0.1);
            graphics.lineTo(ts * 0.08, -ts * 0.15);
            graphics.lineTo(-ts * 0.08, -ts * 0.18);
            graphics.closePath();
            graphics.endFill();

            // Текстура коры - вертикальные борозды
            graphics.lineStyle(1, 0x1a1008, 0.5);
            for (let b = 0; b < 3; b++) {
                const barkX = (b - 1) * ts * 0.06;
                graphics.moveTo(barkX, -ts * 0.12);
                graphics.lineTo(barkX + Math.sin(b) * ts * 0.02, ts * 0.05);
            }

            // Сучки на стволе
            graphics.beginFill(0x2d1f12, 0.7);
            graphics.drawCircle(-ts * 0.08, -ts * 0.05, ts * 0.03);
            graphics.drawCircle(ts * 0.07, -ts * 0.02, ts * 0.025);
            graphics.endFill();

            // Крона - тёмная, "мертвая" листва
            const leafColors = [0x1a2f1a, 0x2a3f2a, 0x0f1f0f, 0x1a2f1a];
            for (let l = 0; l < 8; l++) {
                const leafAngle = (l / 8) * Math.PI * 2;
                const leafDist = ts * (0.15 + Math.random() * 0.15);
                const leafX = Math.cos(leafAngle) * leafDist;
                const leafY = -ts * 0.25 + Math.sin(leafAngle) * leafDist * 0.5;
                const leafSize = ts * (0.12 + Math.random() * 0.08);
                const color = leafColors[l % leafColors.length];
                graphics.beginFill(color, 0.7 + Math.random() * 0.3);
                graphics.drawCircle(leafX, leafY, leafSize);
                graphics.endFill();
            }

            // Ветки - голые, искривлённые
            graphics.lineStyle(2, this.hexToDecimal(this.colors.treeTrunk), 0.8);
            for (let br = 0; br < 4; br++) {
                const branchAngle = (br / 4) * Math.PI * 2;
                const branchStartX = Math.cos(branchAngle) * ts * 0.08;
                const branchStartY = -ts * 0.28 + Math.sin(branchAngle) * ts * 0.05;
                const branchEndX = Math.cos(branchAngle) * ts * 0.25;
                const branchEndY = -ts * 0.35 + Math.sin(branchAngle) * ts * 0.1;
                graphics.moveTo(branchStartX, branchStartY);
                graphics.quadraticCurveTo(
                    (branchStartX + branchEndX) / 2,
                    (branchStartY + branchEndY) / 2 - ts * 0.05,
                    branchEndX,
                    branchEndY
                );
            }

            // Контур дерева
            graphics.lineStyle(1, 0x0a0806, 0.4);
            graphics.drawCircle(0, -ts * 0.28, ts * 0.35);

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры дерева:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.treeLeaves));
    }

    /**
     * Создание текстуры скалы
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура скалы
     */
    createRockTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Тень под скалой
            graphics.beginFill(0x0a0806, 0.3);
            graphics.moveTo(-ts * 0.3, ts * 0.1);
            graphics.lineTo(ts * 0.3, ts * 0.15);
            graphics.lineTo(0, ts * 0.25);
            graphics.lineTo(-ts * 0.35, ts * 0.18);
            graphics.closePath();
            graphics.endFill();

            // Основная скала - острая, рваная форма
            const rockColors = [0x1f1a17, 0x2d2522, 0x3d3028, 0x1a1512];
            
            // Нижний слой скалы
            graphics.beginFill(rockColors[0], 0.9);
            graphics.moveTo(-ts * 0.35, ts * 0.08);
            graphics.lineTo(-ts * 0.2, ts * 0.02);
            graphics.lineTo(-ts * 0.3, -ts * 0.08);
            graphics.lineTo(-ts * 0.15, -ts * 0.02);
            graphics.lineTo(0, -ts * 0.12);
            graphics.lineTo(ts * 0.2, -ts * 0.05);
            graphics.lineTo(ts * 0.35, ts * 0.05);
            graphics.lineTo(ts * 0.25, ts * 0.12);
            graphics.lineTo(0, ts * 0.18);
            graphics.lineTo(-ts * 0.25, ts * 0.15);
            graphics.closePath();
            graphics.endFill();

            // Средний слой - более светлые камни
            for (let r = 0; r < 5; r++) {
                const rockX = (r - 2) * ts * 0.15 + (Math.random() - 0.5) * ts * 0.1;
                const rockY = -ts * 0.05 + (Math.random() - 0.5) * ts * 0.1;
                const rockW = ts * (0.08 + Math.random() * 0.06);
                const rockH = ts * (0.04 + Math.random() * 0.03);
                const color = rockColors[1 + (r % 2)];
                
                graphics.beginFill(color, 0.7 + Math.random() * 0.3);
                graphics.moveTo(rockX, rockY);
                graphics.lineTo(rockX + rockW * 0.5, rockY - rockH * 0.3);
                graphics.lineTo(rockX + rockW, rockY);
                graphics.lineTo(rockX + rockW * 0.7, rockY + rockH);
                graphics.lineTo(rockX + rockW * 0.2, rockY + rockH * 0.8);
                graphics.lineTo(rockX - rockW * 0.2, rockY + rockH * 0.5);
                graphics.closePath();
                graphics.endFill();
            }

            // Верхние острые пики
            graphics.beginFill(rockColors[2], 0.8);
            for (let p = 0; p < 4; p++) {
                const peakX = (p - 1.5) * ts * 0.2;
                const peakH = ts * (0.15 + Math.random() * 0.1);
                graphics.moveTo(peakX - ts * 0.08, -ts * 0.02);
                graphics.lineTo(peakX, -peakH);
                graphics.lineTo(peakX + ts * 0.08, -ts * 0.02);
                graphics.closePath();
            }
            graphics.endFill();

            // Трещины и расщелины
            graphics.lineStyle(1, 0x0a0806, 0.6);
            for (let c = 0; c < 4; c++) {
                const crackStartX = (Math.random() - 0.5) * ts * 0.5;
                const crackStartY = (Math.random() - 0.5) * ts * 0.1;
                graphics.moveTo(crackStartX, crackStartY);
                let cx = crackStartX;
                let cy = crackStartY;
                for (let seg = 0; seg < 3; seg++) {
                    cx += (Math.random() - 0.5) * ts * 0.15;
                    cy += ts * 0.05 + Math.random() * ts * 0.05;
                    if (cy < ts * 0.15) {
                        graphics.lineTo(cx, cy);
                    }
                }
            }

            // Сколы и острые края
            graphics.lineStyle(1, 0x0a0806, 0.4);
            graphics.moveTo(-ts * 0.3, ts * 0.08);
            graphics.lineTo(-ts * 0.35, ts * 0.12);
            graphics.lineTo(-ts * 0.25, ts * 0.15);
            
            graphics.moveTo(ts * 0.3, ts * 0.1);
            graphics.lineTo(ts * 0.38, ts * 0.15);
            graphics.lineTo(ts * 0.25, ts * 0.18);

            // Контур скалы
            graphics.lineStyle(2, 0x0a0806, 0.5);
            graphics.moveTo(-ts * 0.35, ts * 0.08);
            graphics.lineTo(-ts * 0.2, ts * 0.02);
            graphics.lineTo(-ts * 0.3, -ts * 0.08);
            graphics.lineTo(-ts * 0.15, -ts * 0.02);
            graphics.lineTo(0, -ts * 0.12);
            graphics.lineTo(ts * 0.2, -ts * 0.05);
            graphics.lineTo(ts * 0.35, ts * 0.05);
            graphics.lineTo(ts * 0.25, ts * 0.12);
            graphics.lineTo(0, ts * 0.18);
            graphics.lineTo(-ts * 0.25, ts * 0.15);
            graphics.closePath();

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры скалы:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.rock));
    }

    /**
     * Создание текстуры воды
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура воды
     */
    createWaterTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Основная вода - тёмная, мутная
            graphics.beginFill(this.hexToDecimal(this.colors.water));
            this.drawIsometricTile(graphics, 0, 0, ts, ts / 2);
            graphics.endFill();

            // Градиент затемнения к центру
            graphics.beginFill(0x0a0f15, 0.3);
            this.drawIsometricTile(graphics, 0, 0, ts * 0.8, ts / 2 * 0.8);
            graphics.endFill();

            // Волны и рябь на поверхности
            const waveColors = [0x2a3f4f, 0x3a5a6f, 0x1a2f3f];
            for (let w = 0; w < 6; w++) {
                const waveX = (Math.random() - 0.5) * ts * 0.5;
                const waveY = (Math.random() - 0.5) * ts * 0.2 + ts * 0.05;
                const waveW = ts * (0.08 + Math.random() * 0.1);
                const waveH = ts * (0.02 + Math.random() * 0.02);
                const color = waveColors[Math.floor(Math.random() * waveColors.length)];
                
                graphics.beginFill(color, 0.4 + Math.random() * 0.3);
                graphics.moveTo(waveX - waveW / 2, waveY);
                graphics.quadraticCurveTo(
                    waveX, waveY - waveH * 2,
                    waveX + waveW / 2, waveY
                );
                graphics.quadraticCurveTo(
                    waveX, waveY + waveH,
                    waveX - waveW / 2, waveY
                );
                graphics.closePath();
                graphics.endFill();
            }

            // Блестящие блики на воде
            for (let s = 0; s < 4; s++) {
                const shineX = (Math.random() - 0.5) * ts * 0.4;
                const shineY = (Math.random() - 0.5) * ts * 0.15 + ts * 0.08;
                const shineSize = ts * (0.02 + Math.random() * 0.02);
                graphics.beginFill(0x4a6f7f, 0.3 + Math.random() * 0.2);
                graphics.drawEllipse(shineX, shineY, shineSize, shineSize * 0.4);
                graphics.endFill();
            }

            // Плавающие объекты (мусор, листья)
            for (let d = 0; d < 3; d++) {
                const debrisX = (Math.random() - 0.5) * ts * 0.3;
                const debrisY = (Math.random() - 0.5) * ts * 0.1 + ts * 0.05;
                graphics.beginFill(0x1a1510, 0.5);
                graphics.moveTo(debrisX, debrisY);
                graphics.lineTo(debrisX + ts * 0.03, debrisY - ts * 0.01);
                graphics.lineTo(debrisX + ts * 0.02, debrisY + ts * 0.02);
                graphics.closePath();
                graphics.endFill();
            }

            // Контур воды по краям
            graphics.lineStyle(2, 0x0a0f15, 0.6);
            graphics.moveTo(0, 0);
            graphics.lineTo(ts / 2, ts / 4);
            graphics.lineTo(0, ts / 2);
            graphics.lineTo(-ts / 2, ts / 4);
            graphics.closePath();

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры воды:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.water));
    }

    /**
     * Создание текстуры льда
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура льда
     */
    createIceTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Основной лёд - грязный, тёмный
            graphics.beginFill(this.hexToDecimal(this.colors.ice));
            this.drawIsometricTile(graphics, 0, 0, ts, ts / 2);
            graphics.endFill();

            // Градиент затемнения
            graphics.beginFill(0x1a252a, 0.3);
            this.drawIsometricTile(graphics, 0, 0, ts * 0.85, ts / 2 * 0.85);
            graphics.endFill();

            // Трещины на льду
            const crackColors = [0x3d4f55, 0x2d3a3f, 0x4a5f65];
            for (let c = 0; c < 5; c++) {
                const crackStartX = (Math.random() - 0.5) * ts * 0.5;
                const crackStartY = (Math.random() - 0.5) * ts * 0.2;
                const color = crackColors[Math.floor(Math.random() * crackColors.length)];
                
                graphics.lineStyle(1 + Math.random(), color, 0.5 + Math.random() * 0.3);
                graphics.moveTo(crackStartX, crackStartY);
                let cx = crackStartX;
                let cy = crackStartY;
                for (let seg = 0; seg < 4; seg++) {
                    cx += (Math.random() - 0.5) * ts * 0.15;
                    cy += (Math.random() - 0.5) * ts * 0.1;
                    if (Math.abs(cx) < ts * 0.4 && Math.abs(cy) < ts * 0.2) {
                        graphics.lineTo(cx, cy);
                    }
                }
            }

            // Грязные вкрапления
            for (let d = 0; d < 8; d++) {
                const dirtX = (Math.random() - 0.5) * ts * 0.5;
                const dirtY = (Math.random() - 0.5) * ts * 0.2;
                const dirtSize = ts * (0.02 + Math.random() * 0.03);
                graphics.beginFill(0x1a1512, 0.3 + Math.random() * 0.3);
                graphics.drawCircle(dirtX, dirtY, dirtSize);
                graphics.endFill();
            }

            // Ледяные кристаллы / осколки
            const crystalColors = [0x3d5a65, 0x4a6f7f, 0x2d4a55];
            for (let k = 0; k < 4; k++) {
                const crystalX = (Math.random() - 0.5) * ts * 0.4;
                const crystalY = (Math.random() - 0.5) * ts * 0.15;
                const crystalW = ts * (0.04 + Math.random() * 0.03);
                const crystalH = ts * (0.02 + Math.random() * 0.02);
                const color = crystalColors[k % crystalColors.length];
                
                graphics.beginFill(color, 0.4 + Math.random() * 0.3);
                graphics.moveTo(crystalX, crystalY - crystalH);
                graphics.lineTo(crystalX + crystalW, crystalY);
                graphics.lineTo(crystalX, crystalY + crystalH);
                graphics.lineTo(crystalX - crystalW * 0.5, crystalY);
                graphics.closePath();
                graphics.endFill();
            }

            // Белесые пятна инея
            for (let f = 0; f < 5; f++) {
                const frostX = (Math.random() - 0.5) * ts * 0.4;
                const frostY = (Math.random() - 0.5) * ts * 0.15;
                const frostSize = ts * (0.03 + Math.random() * 0.03);
                graphics.beginFill(0x4a5f65, 0.2 + Math.random() * 0.2);
                graphics.drawCircle(frostX, frostY, frostSize);
                graphics.endFill();
            }

            // Контур льда по краям
            graphics.lineStyle(2, 0x1a252a, 0.6);
            graphics.moveTo(0, 0);
            graphics.lineTo(ts / 2, ts / 4);
            graphics.lineTo(0, ts / 2);
            graphics.lineTo(-ts / 2, ts / 4);
            graphics.closePath();

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры льда:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.ice));
    }

    /**
     * Создание текстуры декорации
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Texture} - текстура декорации
     */
    createDecorationTexture(tileSize) {
        try {
            const graphics = new PIXI.Graphics();
            const ts = tileSize;

            // Тень под растительностью
            graphics.beginFill(0x0a0806, 0.3);
            graphics.drawCircle(0, ts * 0.08, ts * 0.15);
            graphics.endFill();

            // Тёмная трава / мох - основа
            const grassColors = [0x1a2f1a, 0x2a3f2a, 0x0f1f0f, 0x1a2f1a];
            for (let g = 0; g < 12; g++) {
                const grassX = (Math.random() - 0.5) * ts * 0.3;
                const grassY = (Math.random() - 0.5) * ts * 0.15 + ts * 0.05;
                const grassH = ts * (0.06 + Math.random() * 0.05);
                const grassW = ts * (0.02 + Math.random() * 0.02);
                const color = grassColors[Math.floor(Math.random() * grassColors.length)];
                
                graphics.beginFill(color, 0.6 + Math.random() * 0.3);
                graphics.moveTo(grassX, grassY);
                graphics.quadraticCurveTo(
                    grassX + (Math.random() - 0.5) * ts * 0.03,
                    grassY - grassH * 0.5,
                    grassX,
                    grassY - grassH
                );
                graphics.lineTo(grassX + grassW, grassY - grassH * 0.8);
                graphics.lineTo(grassX + grassW, grassY);
                graphics.closePath();
                graphics.endFill();
            }

            // Грибы - мрачные, тёмные
            const mushroomColors = [0x3d2f3d, 0x2a1f2a, 0x4a3f4a];
            for (let m = 0; m < 3; m++) {
                const mushX = (Math.random() - 0.5) * ts * 0.25;
                const mushY = (Math.random() - 0.5) * ts * 0.1 + ts * 0.05;
                const mushSize = ts * (0.04 + Math.random() * 0.03);
                const color = mushroomColors[m % mushroomColors.length];
                
                // Ножка гриба
                graphics.beginFill(0x2a1f1a, 0.7);
                graphics.moveTo(mushX - ts * 0.02, mushY);
                graphics.lineTo(mushX + ts * 0.02, mushY);
                graphics.lineTo(mushX + ts * 0.015, mushY - ts * 0.04);
                graphics.lineTo(mushX - ts * 0.015, mushY - ts * 0.04);
                graphics.closePath();
                graphics.endFill();
                
                // Шляпка гриба
                graphics.beginFill(color, 0.8);
                graphics.moveTo(mushX - mushSize, mushY - ts * 0.03);
                graphics.quadraticCurveTo(
                    mushX, mushY - ts * 0.03 - mushSize,
                    mushX + mushSize, mushY - ts * 0.03
                );
                graphics.lineTo(mushX + mushSize * 0.8, mushY - ts * 0.02);
                graphics.lineTo(mushX - mushSize * 0.8, mushY - ts * 0.02);
                graphics.closePath();
                graphics.endFill();
            }

            // Сухие листья / опавшая листва
            for (let l = 0; l < 5; l++) {
                const leafX = (Math.random() - 0.5) * ts * 0.3;
                const leafY = (Math.random() - 0.5) * ts * 0.12 + ts * 0.06;
                const leafSize = ts * (0.03 + Math.random() * 0.02);
                const leafAngle = Math.random() * Math.PI * 2;
                
                graphics.beginFill(0x2a1f1a, 0.5);
                graphics.moveTo(leafX, leafY);
                for (let p = 0; p < 5; p++) {
                    const petalAngle = leafAngle + (p / 5) * Math.PI * 2;
                    const petalX = Math.cos(petalAngle) * leafSize;
                    const petalY = Math.sin(petalAngle) * leafSize * 0.5;
                    graphics.lineTo(leafX + petalX, leafY + petalY);
                }
                graphics.closePath();
                graphics.endFill();
            }

            // Тёмные ягоды / цветы
            for (let b = 0; b < 3; b++) {
                const berryX = (Math.random() - 0.5) * ts * 0.2;
                const berryY = (Math.random() - 0.5) * ts * 0.08 + ts * 0.04;
                const berrySize = ts * (0.02 + Math.random() * 0.015);
                
                graphics.beginFill(0x3a1f2a, 0.7);
                graphics.drawCircle(berryX, berryY, berrySize);
                graphics.endFill();
            }

            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();

            if (texture && texture.width > 0 && texture.height > 0) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка при создании текстуры декорации:', e);
        }

        return this.createFallbackTexture(tileSize, this.hexToDecimal(this.colors.decoration));
    }

    /**
     * Создание контейнера для чанка
     * @param {Object} chunk - объект чанка
     * @returns {PIXI.Container} - контейнер с тайлами чанка
     */
    createChunkContainer(chunk) {
        const chunkContainer = new PIXI.Container();
        const tileSize = this.baseTileSize;
        let spriteCount = 0;

        for (let y = 0; y < chunk.tiles.length; y++) {
            for (let x = 0; x < chunk.tiles[y].length; x++) {
                const tileType = chunk.tiles[y][x];

                // Преобразуем локальные координаты тайла в 2D координаты
                // Добавляем смещение +0.5 для центрирования тайла в изометрической проекции
                const globalX = chunk.chunkX * chunk.size + x;
                const globalY = chunk.chunkY * chunk.size + y;
                const pos = this.isoTo2D(globalX - 1, globalY);

                // Получаем текстуру через ленивую загрузку
                const texture = this.getTileTexture(tileType);

                // Проверяем текстуру - должна существовать и иметь размеры
                if (!texture) {
                    continue;
                }

                // Проверяем, что у текстуры есть baseTexture и размеры
                const hasBaseTexture = texture.baseTexture !== null && texture.baseTexture !== undefined;
                const hasValidSize = hasBaseTexture && (texture.baseTexture.width > 0 || (texture.width && texture.width > 0));

                if (!hasValidSize) {
                    continue;
                }

                // Создаём спрайт
                const sprite = new PIXI.Sprite(texture);

                // Масштабируем спрайт до нужного размера
                // Защита от некорректных размеров текстуры
                const textureWidth = texture.width || tileSize;
                const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);
                const scaleX = tileSize / textureWidth;
                const scaleY = (tileSize / 2) / textureHeight;
                sprite.scale.set(scaleX, scaleY);

                // Устанавливаем позицию
                sprite.x = pos.x;
                sprite.y = pos.y;

                // Применяем освещение к спрайту, если система освещения активна
                if (this.lightingSystem) {
                    this.lightingSystem.applyLightingToSprite(sprite, globalX, globalY, tileType);
                }

                chunkContainer.addChild(sprite);
                spriteCount++;
            }
        }

        // Проверяем, что чанк не пустой
        if (spriteCount === 0) {
            console.warn(`Чанк (${chunk.chunkX}, ${chunk.chunkY}) создан пустым (${spriteCount} спрайтов)`);
        }

        return chunkContainer;
    }

    /**
     * Установка системы освещения
     * @param {LightingSystem} lightingSystem - система освещения
     */
    setLightingSystem(lightingSystem) {
        this.lightingSystem = lightingSystem;
        
        // Очищаем кэш чанков, чтобы пересоздать их с освещением
        this.chunkCache.clear();
    }

    /**
     * Обновление освещения для всех чанков в кэше
     * Вызывается при изменении позиции источника света
     */
    updateLightingForAllChunks() {
        if (!this.lightingSystem) return;

        // Очищаем кэш чанков для пересоздания с новым освещением
        this.chunkCache.clear();
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
        } else {
            // Проверяем, что чанк не пустой
            if (chunkContainer.children.length === 0) {
                console.warn(`Чанк ${chunkKey} в кэше пустой, пересоздаём`);
                chunkContainer = this.createChunkContainer(chunk);
                this.chunkCache.set(chunkKey, chunkContainer);
            }
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
                // Удаляем чанк из кэша и уничтожаем только его контейнер и спрайты
                // НЕ уничтожаем текстуры, так как они общие для всех чанков
                chunkContainer.destroy({ children: true, texture: false, baseTexture: false });
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

        return x + width / 2 > visibleLeft - buffer &&
            x - width / 2 < visibleRight + buffer &&
            y + height / 2 > visibleTop - buffer &&
            y - height / 2 < visibleBottom + buffer;
    }

    /**
     * Рендеринг тайлов (пол, стены, декорации, препятствия)
     * @param {Array<Array<number>>} map - карта тайлов (0 - пол, 1 - стена, 2 - колонна, 3 - дерево, 4 - скала, 5 - вода, 6 - лед, 7 - декорация)
     * @param {ChunkSystem} chunkSystem - система чанков (опционально)
     */
    renderTiles(map, chunkSystem = null) {
        // Очищаем предыдущие тайлы - removeChildren удаляет детей из контейнера, но не уничтожает их
        this.tileLayer.removeChildren();

        if (chunkSystem) {
            // Предварительно загружаем текстуры для всех типов тайлов
            // Это гарантирует, что текстуры будут созданы до рендеринга чанков
            for (let tileType = 0; tileType <= 7; tileType++) {
                this.getTileTexture(tileType);
            }

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

                    // Проверяем, что чанк имеет детей (тайлы)
                    if (chunkContainer.children.length === 0) {
                        // Если чанк пустой, пересоздаем его
                        const chunkKey = `${chunk.chunkX},${chunk.chunkY}`;
                        this.chunkCache.delete(chunkKey);
                        const newChunkContainer = this.createChunkContainer(chunk);
                        this.chunkCache.set(chunkKey, newChunkContainer);
                        this.tileLayer.addChild(newChunkContainer);
                    } else {
                        // Добавляем контейнер чанка к слою тайлов
                        this.tileLayer.addChild(chunkContainer);
                    }
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
     * Создание резервной текстуры (если основная не создана)
     * @param {number} tileSize - размер тайла
     * @param {number} color - цвет текстуры
     * @returns {PIXI.Texture} - резервная текстура
     */
    createFallbackTexture(tileSize, color) {
        const width = Math.max(tileSize, 2);
        const height = Math.max(Math.floor(tileSize / 2), 2);

        // Создаём текстуру через PIXI.Graphics
        const graphics = new PIXI.Graphics();
        graphics.beginFill(color);
        graphics.drawRect(0, 0, width, height);
        graphics.endFill();

        try {
            const texture = this.app.renderer.generateTexture(graphics);
            graphics.destroy();
            
            if (texture && texture.valid) {
                return texture;
            }
        } catch (e) {
            console.error('Ошибка создания fallback текстуры:', e);
        }

        // Если не удалось создать, возвращаем минимальную валидную текстуру
        const minGraphics = new PIXI.Graphics();
        minGraphics.beginFill(0xFF00FF);
        minGraphics.drawRect(0, 0, 2, 2);
        minGraphics.endFill();
        
        return this.app.renderer.generateTexture(minGraphics);
    }

    /**
     * Создание спрайта пола
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {number} tileSize - размер тайла
     * @returns {PIXI.Sprite} - спрайт пола
     */
    createFloorTile(x, y, tileSize) {
        let texture = this.tileTextures.get(0);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createFloorTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(0, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0x556B2F);
                this.tileTextures.set(0, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(1);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createWallTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(1, texture);
            } else {
                // Создаем простую текстуру программно
                texture = this.createFallbackTexture(tileSize, 0x8B7355);
                this.tileTextures.set(1, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(2);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createColumnTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(2, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0x696969);
                this.tileTextures.set(2, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(3);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createTreeTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(3, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0x228B22);
                this.tileTextures.set(3, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(4);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createRockTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(4, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0x808080);
                this.tileTextures.set(4, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(5);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createWaterTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(5, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0x1976d2);
                this.tileTextures.set(5, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(6);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createIceTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(6, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0xbbdefb);
                this.tileTextures.set(6, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        let texture = this.tileTextures.get(7);

        // Если текстура не создана, создаем резервную
        if (!texture || !texture.valid) {
            texture = this.createDecorationTexture(tileSize);
            if (texture && texture.valid) {
                this.tileTextures.set(7, texture);
            } else {
                texture = this.createFallbackTexture(tileSize, 0x8bc34a);
                this.tileTextures.set(7, texture);
            }
        }

        // Защита от некорректных размеров текстуры
        const textureWidth = texture.width || tileSize;
        const textureHeight = texture.height || Math.max(Math.floor(tileSize / 2), 2);

        const sprite = new PIXI.Sprite(texture);

        // Масштабируем спрайт до нужного размера
        const scaleX = tileSize / textureWidth;
        const scaleY = (tileSize / 2) / textureHeight;
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
        // Рисуем изометрический тайл с псевдо-3D эффектом
        // Верхняя грань (основной ромб)
        graphics.moveTo(x, y);
        graphics.lineTo(x + width / 2, y + height / 2);
        graphics.lineTo(x, y + height);
        graphics.lineTo(x - width / 2, y + height / 2);
        graphics.closePath();
    }

    /**
     * Рисование изометрического тайла с 3D эффектом (боковые грани)
     * @param {PIXI.Graphics} graphics - объект Graphics для рисования
     * @param {number} x - X координата центра
     * @param {number} y - Y координата центра
     * @param {number} width - ширина тайла
     * @param {number} height - высота тайла
     * @param {number} depth - глубина 3D эффекта
     * @param {number} sideColor - цвет боковых граней
     */
    drawIsometricTile3D(graphics, x, y, width, height, depth = 4, sideColor = 0x1a1512) {
        const halfW = width / 2;
        const halfH = height / 2;

        // Рисуем боковые грани для 3D эффекта
        // Правая грань
        graphics.beginFill(sideColor, 0.7);
        graphics.moveTo(x + halfW, y + halfH);
        graphics.lineTo(x + halfW, y + halfH + depth);
        graphics.lineTo(x, y + height + depth);
        graphics.lineTo(x, y + height);
        graphics.closePath();
        graphics.endFill();

        // Левая грань
        graphics.beginFill(sideColor, 0.5);
        graphics.moveTo(x - halfW, y + halfH);
        graphics.lineTo(x - halfW, y + halfH + depth);
        graphics.lineTo(x, y + height + depth);
        graphics.lineTo(x, y + height);
        graphics.closePath();
        graphics.endFill();

        // Верхняя грань (основной ромб)
        graphics.moveTo(x, y);
        graphics.lineTo(x + halfW, y + halfH);
        graphics.lineTo(x, y + height);
        graphics.lineTo(x - halfW, y + halfH);
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
            let texture = this.entityTextures.get('player');
            if (!texture || !texture.valid) {
                console.warn('Текстура игрока невалидна, создаем резервную');
                texture = this.createFallbackTexture(32, 0x4a9eff);
                this.entityTextures.set('player', texture);
            }

            characterSprite = new PIXI.Sprite(texture);
            // Устанавливаем точку привязки к нижнему центру (ноги персонажа)
            characterSprite.anchor.set(0.5, 1);
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
            switch (enemy.type) {
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

            let texture = this.entityTextures.get(textureKey);
            if (!texture || !texture.valid) {
                console.warn(`Текстура врага ${textureKey} невалидна, создаем резервную`);
                const fallbackColor = enemy.type === 'weak' ? 0xa0a0a0 :
                    enemy.type === 'strong' ? 0xff6600 :
                        enemy.type === 'fast' ? 0xffff00 :
                            enemy.type === 'tank' ? 0x8b0000 : 0xff4a4a;
                texture = this.createFallbackTexture(32, fallbackColor);
                this.entityTextures.set(textureKey, texture);
            }

            enemySprite = new PIXI.Sprite(texture);
            // Устанавливаем точку привязки к нижнему центру (ноги врага)
            enemySprite.anchor.set(0.5, 1);
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
     * Создание частицы для эффекта получения уровня
     * @param {number} x - X координата в мировых координатах
     * @param {number} y - Y координата в мировых координатах
     * @param {string} color - HEX цвет частицы
     * @param {number} size - размер частицы
     * @param {number} vx - скорость по X
     * @param {number} vy - скорость по Y
     * @param {number} lifetime - время жизни в миллисекундах
     */
    createLevelUpParticle(x, y, color, size, vx, vy, lifetime) {
        const particle = {
            x,
            y,
            startX: x,
            startY: y,
            color: this.hexToDecimal(color),
            size,
            velocityX: vx,
            velocityY: vy,
            lifetime,
            age: 0,
            alpha: 1,
            type: 'levelUp'
        };

        this.levelUpEffects.push(particle);
        return particle;
    }

    /**
     * Создание текстового эффекта для получения уровня
     * @param {number} x - X координата в мировых координатах
     * @param {number} y - Y координата в мировых координатах
     * @param {string} text - текст для отображения
     * @param {number} fontSize - размер шрифта
     * @param {string} color - HEX цвет текста
     * @param {number} lifetime - время жизни в миллисекундах
     * @param {number} offsetY - смещение по Y для анимации
     */
    createLevelUpText(x, y, text, fontSize, color, lifetime, offsetY = 0) {
        const textEffect = {
            x,
            y,
            startY: y,
            text,
            fontSize,
            color: this.hexToDecimal(color),
            lifetime,
            age: 0,
            alpha: 1,
            scale: 1.0,
            offsetY,
            type: 'text'
        };

        this.levelUpEffects.push(textEffect);
        return textEffect;
    }

    /**
     * Запуск эффекта получения уровня
     * @param {number} x - X координата центра эффекта в мировых координатах
     * @param {number} y - Y координата центра эффекта в мировых координатах
     * @param {number} level - новый уровень
     */
    triggerLevelUpEffect(x, y, level) {
        // Создаем частицы для эффекта
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const size = 2 + Math.random() * 4;
            const lifetime = 1000 + Math.random() * 1000; // 1-2 секунды

            // Разные цвета для эффекта (золотой, белый, желтый)
            const colors = ['#FFD700', '#FFFFFF', '#FFFF00', '#FFA500', '#FFFF99'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.createLevelUpParticle(
                x, y,
                color,
                size,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                lifetime
            );
        }

        // Добавляем текст "LEVEL UP!" в центр эффекта
        this.createLevelUpText(
            x, y - 30,
            'LEVEL UP!',
            24,
            '#FFD700',
            2000, // 2 секунды
            -30
        );

        // Добавляем числовое обозначение уровня
        this.createLevelUpText(
            x, y + 10,
            `${level}`,
            32,
            '#FFFFFF',
            1600, // 1.6 секунды
            10
        );
    }

    /**
     * Обновление эффектов получения уровня
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    updateLevelUpEffects(deltaTime) {
        for (let i = this.levelUpEffects.length - 1; i >= 0; i--) {
            const effect = this.levelUpEffects[i];
            effect.age += deltaTime;

            if (effect.type === 'levelUp') {
                // Обновляем позицию частицы
                effect.x += effect.velocityX;
                effect.y += effect.velocityY;

                // Добавляем гравитацию
                effect.velocityY += 0.1;

                // Уменьшаем скорость из-за трения
                effect.velocityX *= 0.98;
                effect.velocityY *= 0.98;

                // Обновляем прозрачность
                effect.alpha = 1 - (effect.age / effect.lifetime);
            } else if (effect.type === 'text') {
                // Для текста увеличиваем масштаб в начале и уменьшаем к концу
                const lifeRatio = 1 - (effect.age / effect.lifetime);
                if (lifeRatio > 0.7) {
                    effect.scale = 1 + (0.5 * (1 - (lifeRatio - 0.7) / 0.3)); // Увеличение в начале
                } else {
                    effect.scale = 1.5 - (0.5 * (1 - lifeRatio / 0.7)); // Уменьшение к концу
                }

                // Поднимаем текст вверх
                effect.y -= 0.5;

                // Обновляем прозрачность
                effect.alpha = lifeRatio;
            }

            // Удаляем эффект, если время жизни истекло
            if (effect.age >= effect.lifetime) {
                this.levelUpEffects.splice(i, 1);
            }
        }
    }

    /**
     * Отрисовка эффектов получения уровня на PIXI слоях
     */
    renderLevelUpEffects() {
        if (this.levelUpEffects.length === 0) {
            return;
        }

        // Сначала очищаем старые спрайты эффектов из слоев
        this._cleanupLevelUpSprites();

        // Рендерим частицы
        for (const effect of this.levelUpEffects) {
            if (effect.type === 'levelUp') {
                // Используем мировые координаты напрямую
                // mainContainer уже имеет смещение камеры и масштабирование
                const worldX = effect.x;
                const worldY = effect.y;

                // Получаем или создаем спрайт для частицы
                let sprite = this._getParticleSpriteFromPool();

                // Настраиваем спрайт
                sprite.x = worldX;
                sprite.y = worldY;
                sprite.scale.set(effect.size * effect.alpha);
                sprite.alpha = effect.alpha;
                sprite.tint = effect.color;
                sprite.visible = true;

                // Добавляем в particleLayer если еще не добавлен
                if (!sprite.parent) {
                    this.particleLayer.addChild(sprite);
                }
            }
        }

        // Рендерим текст (отдельно, после частиц)
        for (const effect of this.levelUpEffects) {
            if (effect.type === 'text') {
                // Используем мировые координаты напрямую
                const worldX = effect.x;
                const worldY = effect.y;

                // Получаем или создаем текстовый спрайт
                let textSprite = this._getTextSpriteFromPool();

                // Обновляем текст
                if (!textSprite.textObj) {
                    textSprite.textObj = new PIXI.Text(effect.text, {
                        fontSize: effect.fontSize,
                        fontFamily: "'MedievalSharp', Arial, sans-serif",
                        fill: effect.color,
                        fontWeight: 'bold'
                    });
                    textSprite.addChild(textSprite.textObj);
                } else {
                    textSprite.textObj.text = effect.text;
                    textSprite.textObj.style.fontSize = effect.fontSize;
                    textSprite.textObj.style.fill = effect.color;
                    textSprite.textObj.updateText();
                }

                // Позиционируем и масштабируем
                textSprite.x = worldX;
                textSprite.y = worldY;
                textSprite.scale.set(effect.scale);
                textSprite.alpha = effect.alpha;
                textSprite.visible = true;

                // Помечаем как текст уровня для очистки
                textSprite.isLevelUpText = true;

                // Центрируем текст
                if (textSprite.textObj) {
                    textSprite.textObj.anchor.set(0.5);
                }

                // Добавляем в uiLayer если еще не добавлен
                if (!textSprite.parent) {
                    this.uiLayer.addChild(textSprite);
                }
            }
        }
    }

    /**
     * Очистка старых спрайтов эффектов перед новым кадром
     */
    _cleanupLevelUpSprites() {
        // Возвращаем все спрайты частиц из particleLayer в пул и сбрасываем их
        for (const child of this.particleLayer.children) {
            child.visible = false;
            child.alpha = 1;
            child.scale.set(1);
            this.particleSpritePool.push(child);
        }
        this.particleLayer.removeChildren();

        // Очищаем только текстовые спрайты level-up эффектов из uiLayer
        for (let i = this.uiLayer.children.length - 1; i >= 0; i--) {
            const child = this.uiLayer.children[i];
            if (child.textObj && child.isLevelUpText) {
                this.uiLayer.removeChild(child);
                child.visible = false;
                this.textSpritePool.push(child);
            }
        }
    }

    /**
     * Получение спрайта частицы из пула
     * @returns {PIXI.Sprite} - спрайт частицы
     */
    _getParticleSpriteFromPool() {
        if (this.particleSpritePool.length > 0) {
            const sprite = this.particleSpritePool.pop();
            sprite.visible = true;
            sprite.alpha = 1;
            sprite.scale.set(1);
            sprite.tint = 0xFFFFFF;
            return sprite;
        }

        // Создаем новый спрайт частицы (простой круг)
        const graphics = new PIXI.Graphics();
        graphics.beginFill(0xFFFFFF);
        graphics.drawCircle(0, 0, 1); // Единичный круг, масштабирование будет через sprite.scale
        graphics.endFill();

        const texture = this.app.renderer.generateTexture(graphics);
        graphics.destroy();

        return new PIXI.Sprite(texture);
    }

    /**
     * Получение текстового спрайта из пула
     * @returns {PIXI.Container} - контейнер для текста
     */
    _getTextSpriteFromPool() {
        if (this.textSpritePool.length > 0) {
            const container = this.textSpritePool.pop();
            container.visible = true;
            container.alpha = 1;
            container.scale.set(1);
            // Сбрасываем флаги
            container.isCombatText = false;
            container.isLevelUpText = false;
            return container;
        }

        // Создаем новый контейнер для текста
        const container = new PIXI.Container();
        return container;
    }

    /**
     * Очистка пулов спрайтов эффектов
     */
    clearLevelUpEffects() {
        // Возвращаем все спрайты частиц из particleLayer в пул
        for (const child of this.particleLayer.children) {
            child.visible = false;
            child.alpha = 1;
            child.scale.set(1);
            this.particleSpritePool.push(child);
        }
        this.particleLayer.removeChildren();

        // Возвращаем все текстовые спрайты level-up из uiLayer в пул
        for (let i = this.uiLayer.children.length - 1; i >= 0; i--) {
            const child = this.uiLayer.children[i];
            if (child.textObj && child.isLevelUpText) {
                this.uiLayer.removeChild(child);
                child.visible = false;
                this.textSpritePool.push(child);
            }
        }

        // Очищаем массив эффектов
        this.levelUpEffects = [];
    }

    /**
     * Проверка, активны ли эффекты получения уровня
     * @returns {boolean} - true если эффекты активны
     */
    hasActiveLevelUpEffects() {
        return this.levelUpEffects.length > 0;
    }

    /**
     * Создание частицы для боевого эффекта
     * @param {number} x - X координата в мировых координатах
     * @param {number} y - Y координата в мировых координатах
     * @param {string} color - HEX цвет частицы
     * @param {number} size - размер частицы
     * @param {number} vx - скорость по X
     * @param {number} vy - скорость по Y
     * @param {number} lifetime - время жизни в миллисекундах
     * @param {string} subtype - подтип частицы ('damage', 'critical', 'dodge')
     */
    createCombatParticle(x, y, color, size, vx, vy, lifetime, subtype = 'damage') {
        const particle = {
            x,
            y,
            color: this.hexToDecimal(color),
            size,
            velocityX: vx,
            velocityY: vy,
            lifetime,
            age: 0,
            alpha: 1,
            type: 'combat_particle',
            subtype
        };

        this.combatEffects.push(particle);
        return particle;
    }

    /**
     * Создание текстового эффекта для боя
     * @param {number} x - X координата в мировых координатах
     * @param {number} y - Y координата в мировых координатах
     * @param {string} text - текст для отображения
     * @param {number} fontSize - размер шрифта
     * @param {string} color - HEX цвет текста
     * @param {number} lifetime - время жизни в миллисекундах
     * @param {string} subtype - подтип текста ('damage', 'critical', 'miss')
     */
    createCombatText(x, y, text, fontSize, color, lifetime, subtype = 'damage') {
        const textEffect = {
            x,
            y,
            startY: y,
            text,
            fontSize,
            color: this.hexToDecimal(color),
            lifetime,
            age: 0,
            alpha: 1,
            scale: 1.0,
            type: 'combat_text',
            subtype
        };

        this.combatEffects.push(textEffect);
        return textEffect;
    }



    /**
     * Создание текстуры для вспышки (круглая с градиентом)
     * @returns {PIXI.Texture} - текстура вспышки
     */
    _createFlashTexture() {
        // Проверяем, есть ли уже готовая текстура в кэше
        if (this.flashTextureCache) {
            return this.flashTextureCache;
        }

        // Создаём текстуру через PIXI.Graphics с градиентом
        const graphics = new PIXI.Graphics();
        
        // Рисуем круг с радиальным градиентом (от центра к краям)
        const gradientStops = [
            { offset: 0, color: 0xFFFFFF, alpha: 1 },
            { offset: 0.3, color: 0xFFFFFF, alpha: 0.8 },
            { offset: 0.6, color: 0xFFFFFF, alpha: 0.3 },
            { offset: 1, color: 0xFFFFFF, alpha: 0 }
        ];
        
        graphics.beginGradientFill({ type: 'radial-gradient' }, gradientStops);
        graphics.drawCircle(32, 32, 32);
        graphics.endFill();

        const texture = this.app.renderer.generateTexture(graphics);
        graphics.destroy();

        this.flashTextureCache = texture;
        return texture;
    }

    /**
     * Запуск эффекта урона
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {number} damage - количество урона
     */
    triggerDamageEffect(x, y, damage) {
        // Текст урона
        this.createCombatText(
            x, y - 20,
            `${damage}`,
            18,
            '#FF0000',
            1000, // 1 секунда
            'damage'
        );

        // Частицы урона (красные)
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const size = 2 + Math.random() * 3;

            this.createCombatParticle(
                x, y,
                '#FF0000',
                size,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                500 + Math.random() * 500, // 0.5-1 секунда
                'damage'
            );
        }
    }

    /**
     * Запуск эффекта критического удара
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {number} damage - количество урона
     */
    triggerCriticalEffect(x, y, damage) {
        // Текст критического урона
        this.createCombatText(
            x, y - 30,
            `${damage}!`,
            24,
            '#FFFF00',
            1500, // 1.5 секунды
            'critical'
        );

        // Частицы крита (жёлтые)
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const size = 3 + Math.random() * 4;

            this.createCombatParticle(
                x, y,
                '#FFFF00',
                size,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                800 + Math.random() * 800, // 0.8-1.6 секунды
                'critical'
            );
        }
    }

    /**
     * Запуск эффекта уворота (MISS)
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     */
    triggerDodgeEffect(x, y) {
        // Текст "MISS"
        this.createCombatText(
            x, y - 20,
            'MISS',
            20,
            '#808080',
            1000, // 1 секунда
            'miss'
        );

        // Частицы уворота (серые)
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 1.5;
            const size = 1 + Math.random() * 2;

            this.createCombatParticle(
                x, y,
                '#808080',
                size,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                400 + Math.random() * 400, // 0.4-0.8 секунды
                'dodge'
            );
        }
    }

    /**
     * Обновление боевых эффектов
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    updateCombatEffects(deltaTime) {
        for (let i = this.combatEffects.length - 1; i >= 0; i--) {
            const effect = this.combatEffects[i];
            effect.age += deltaTime;

            if (effect.type === 'combat_flash') {
                // Увеличиваем размер вспышки
                effect.size = Math.min(effect.size * effect.growthRate, effect.maxSize);
                // Обновляем прозрачность
                effect.alpha = 1 - (effect.age / effect.lifetime);
            } else if (effect.type === 'combat_particle') {
                // Обновляем позицию частицы
                effect.x += effect.velocityX;
                effect.y += effect.velocityY;

                // Добавляем гравитацию
                effect.velocityY += 0.1;

                // Уменьшаем скорость из-за трения
                effect.velocityX *= 0.98;
                effect.velocityY *= 0.98;

                // Обновляем прозрачность
                effect.alpha = 1 - (effect.age / effect.lifetime);
            } else if (effect.type === 'combat_text') {
                // Для текста увеличиваем масштаб в начале и уменьшаем к концу
                const lifeRatio = 1 - (effect.age / effect.lifetime);
                if (lifeRatio > 0.7) {
                    effect.scale = 1 + (0.5 * (1 - (lifeRatio - 0.7) / 0.3));
                } else {
                    effect.scale = 1.5 - (0.5 * (1 - lifeRatio / 0.7));
                }

                // Поднимаем текст вверх
                effect.y -= 0.5;

                // Обновляем прозрачность
                effect.alpha = lifeRatio;
            }

            // Удаляем эффект, если время жизни истекло
            if (effect.age >= effect.lifetime) {
                this.combatEffects.splice(i, 1);
            }
        }
    }

    /**
     * Инициализация системы полосок здоровья для врагов
     */
    initEnemyHealthBars() {
        if (!this.enemyHealthBars) {
            this.enemyHealthBars = new EnemyHealthBarSystem(this);
        }
    }

    /**
     * Обновление полосок здоровья врагов
     * @param {number} deltaTime - время с последнего обновления в мс
     */
    updateEnemyHealthBars(deltaTime) {
        if (this.enemyHealthBars) {
            this.enemyHealthBars.updateAll(deltaTime);
        }
    }

    /**
     * Обновление или создание полоски здоровья для врага
     * @param {Enemy} enemy - враг
     * @param {boolean} justHit - только что получил урон
     */
    updateEnemyHealthBar(enemy, justHit = false) {
        if (this.enemyHealthBars) {
            console.log(`[PIXIRenderer] updateEnemyHealthBar вызван для: ${enemy.name || enemy.type}`);
            this.enemyHealthBars.update(enemy, enemy.health, enemy.maxHealth, justHit);
        } else {
            console.warn('[PIXIRenderer] enemyHealthBars не инициализирован!');
        }
    }

    /**
     * Удаление полоски здоровья для врага
     * @param {Enemy} enemy - враг
     */
    removeEnemyHealthBar(enemy) {
        if (this.enemyHealthBars) {
            this.enemyHealthBars.remove(enemy);
        }
    }

    /**
     * Отрисовка боевых эффектов на PIXI слоях
     */
    renderCombatEffects() {
        if (this.combatEffects.length === 0) {
            return;
        }

        // Сначала очищаем старые спрайты эффектов
        this._cleanupCombatSprites();

        // Рендерим частицы и вспышки
        for (const effect of this.combatEffects) {
            if (effect.type === 'combat_particle' || effect.type === 'combat_flash') {
                // Используем мировые координаты напрямую
                const worldX = effect.x;
                const worldY = effect.y;

                let sprite;

                if (effect.type === 'combat_flash') {
                    // Для вспышки используем специальную текстуру и создаём спрайт отдельно
                    if (!effect.flashSprite) {
                        // Создаём новый спрайт с текстурой вспышки
                        effect.flashSprite = new PIXI.Sprite(effect.texture);
                        effect.flashSprite.anchor.set(0.5); // Центрируем текстуру
                    }
                    sprite = effect.flashSprite;
                    sprite.x = worldX;
                    sprite.y = worldY;
                    // Масштабируем относительно размера текстуры (64px)
                    const scale = effect.size / 64;
                    sprite.scale.set(scale);
                    sprite.alpha = effect.alpha;
                    sprite.tint = effect.color;
                    sprite.visible = true;
                } else {
                    // Для частицы используем пул
                    sprite = this._getParticleSpriteFromPool();
                    sprite.x = worldX;
                    sprite.y = worldY;
                    sprite.scale.set(effect.size * effect.alpha);
                    sprite.alpha = effect.alpha;
                    sprite.tint = effect.color;
                    sprite.visible = true;
                }

                // Добавляем в combatParticleLayer если еще не добавлен
                if (!sprite.parent) {
                    this.combatParticleLayer.addChild(sprite);
                }
            }
        }

        // Рендерим текст
        for (const effect of this.combatEffects) {
            if (effect.type === 'combat_text') {
                // Используем мировые координаты напрямую
                const worldX = effect.x;
                const worldY = effect.y;

                // Получаем или создаем текстовый спрайт
                let textSprite = this._getTextSpriteFromPool();

                // Обновляем текст
                if (!textSprite.textObj) {
                    textSprite.textObj = new PIXI.Text(effect.text, {
                        fontSize: effect.fontSize,
                        fontFamily: "'MedievalSharp', Arial, sans-serif",
                        fill: effect.color,
                        fontWeight: 'bold'
                    });
                    textSprite.addChild(textSprite.textObj);
                } else {
                    textSprite.textObj.text = effect.text;
                    textSprite.textObj.style.fontSize = effect.fontSize;
                    textSprite.textObj.style.fill = effect.color;
                    textSprite.textObj.updateText();
                }

                // Позиционируем и масштабируем
                textSprite.x = worldX;
                textSprite.y = worldY;
                textSprite.scale.set(effect.scale);
                textSprite.alpha = effect.alpha;
                textSprite.visible = true;

                // Помечаем как боевой текст для очистки
                textSprite.isCombatText = true;

                // Центрируем текст
                if (textSprite.textObj) {
                    textSprite.textObj.anchor.set(0.5);
                }

                // Добавляем в uiLayer если еще не добавлен
                if (!textSprite.parent) {
                    this.uiLayer.addChild(textSprite);
                }
            }
        }
    }

    /**
     * Очистка старых спрайтов боевых эффектов перед новым кадром
     */
    _cleanupCombatSprites() {
        // Возвращаем все спрайты частиц из combatParticleLayer в пул и сбрасываем их
        for (const child of this.combatParticleLayer.children) {
            child.visible = false;
            child.alpha = 1;
            child.scale.set(1);
            this.particleSpritePool.push(child);
        }
        this.combatParticleLayer.removeChildren();

        // Очищаем только текстовые спрайты боевых эффектов из uiLayer
        // (не трогаем другие UI элементы и тексты level-up эффектов)
        for (let i = this.uiLayer.children.length - 1; i >= 0; i--) {
            const child = this.uiLayer.children[i];
            if (child.textObj && child.isCombatText) {
                this.uiLayer.removeChild(child);
                child.visible = false;
                this.textSpritePool.push(child);
            }
        }
    }

    /**
     * Проверка, есть ли активные боевые эффекты
     * @returns {boolean} - true если эффекты активны
     */
    hasActiveCombatEffects() {
        return this.combatEffects.length > 0;
    }

    /**
     * Очистка всех боевых эффектов
     */
    clearCombatEffects() {
        // Возвращаем все спрайты частиц из combatParticleLayer в пул
        for (const child of this.combatParticleLayer.children) {
            child.visible = false;
            child.alpha = 1;
            child.scale.set(1);
            this.particleSpritePool.push(child);
        }
        this.combatParticleLayer.removeChildren();

        // Возвращаем все текстовые спрайты боевых эффектов из uiLayer в пул
        for (let i = this.uiLayer.children.length - 1; i >= 0; i--) {
            const child = this.uiLayer.children[i];
            if (child.textObj && child.isCombatText) {
                this.uiLayer.removeChild(child);
                child.visible = false;
                this.textSpritePool.push(child);
            }
        }

        // Очищаем массив эффектов
        this.combatEffects = [];
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
                            // Добавляем смещение +0.5 для центрирования тайла в изометрической проекции
                            const globalX = chunk.chunkX * chunk.size + x;
                            const globalY = chunk.chunkY * chunk.size + y;
                            const pos = this.isoTo2D(globalX + 0.5, globalY + 0.5);

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

    /**
     * Инициализация текстур для предметов (ленивая загрузка)
     */
    initItemTextures() {
        // Текстуры создаются динамически через ItemDropSprite
        // Этот метод может использоваться для предварительной генерации если нужно
    }

    /**
     * Рендеринг выпавших предметов
     * @param {Array} drops - массив объектов ItemDrop
     * @param {ItemDrop} hoveredDrop - подсвеченный предмет (или null)
     */
    renderItems(drops, hoveredDrop = null) {
        const zoom = this.camera.zoom;

        // Создаём множество активных drop объектов для быстрого поиска
        const activeDropsSet = new Set(drops.filter(d => !d.pickedUp));

        // Удаляем неактивные спрайты (предметы которые были подобраны или исчезли)
        for (const [drop, sprite] of this.activeItemSprites.entries()) {
            if (!activeDropsSet.has(drop)) {
                // Предмет больше не активен - скрываем спрайт и возвращаем в пул
                this.itemLayer.removeChild(sprite);
                sprite.reset(); // Сбрасываем без уничтожения
                this.activeItemSprites.delete(drop);
                this.itemSpritePool.push(sprite);
            }
        }

        // Рендерим активные предметы
        for (const drop of drops) {
            if (drop.pickedUp) continue;

            // Вычисляем мировые координаты с учётом зума
            // mainContainer уже имеет смещение камеры, поэтому используем только мировые координаты
            const worldX = drop.displayX;
            const worldY = drop.displayY;

            // Проверяем, находится ли предмет в пределах видимой области (culling)
            // Преобразуем мировые координаты в экранные для проверки
            const screenX = this.app.screen.width / 2 + (worldX - this.camera.x) * zoom;
            const screenY = this.app.screen.height / 2 + (worldY - this.camera.y) * zoom;

            const buffer = 100;
            if (screenX < -buffer || screenX > this.app.screen.width + buffer ||
                screenY < -buffer || screenY > this.app.screen.height + buffer) {
                continue;
            }

            // Получаем или создаём спрайт для предмета
            let sprite = this.activeItemSprites.get(drop);
            if (!sprite) {
                sprite = this.createItemSprite(drop);
                this.activeItemSprites.set(drop, sprite);
            }

            // Обновляем состояние hover
            sprite.isHovered = (hoveredDrop === drop);
            sprite.updateVisuals();

            // Обновляем позицию спрайта в мировых координатах с учётом зума
            sprite.updatePosition(worldX, worldY, zoom);
        }

        // Сортируем предметы по Y для правильного наложения
        this.itemLayer.sortableChildren = true;
        for (const [drop, sprite] of this.activeItemSprites.entries()) {
            sprite.zIndex = Math.floor(sprite.y);
        }
    }

    /**
     * Создание или получение из пула спрайта предмета
     * @param {ItemDrop} drop - объект предмета
     * @returns {ItemDropSprite} - спрайт предмета
     */
    createItemSprite(drop) {
        let sprite;

        // Пытаемся получить из пула
        if (this.itemSpritePool.length > 0) {
            sprite = this.itemSpritePool.pop();
            sprite.reuse(drop); // Восстанавливаем спрайт с новым предметом
        } else {
            // Создаём новый спрайт
            sprite = new ItemDropSprite(drop, this);
        }

        // Добавляем в слой предметов
        this.itemLayer.addChild(sprite);

        return sprite;
    }

    /**
     * Очистка всех спрайтов предметов (например, при смене локации)
     */
    clearItemSprites() {
        for (const [drop, sprite] of this.activeItemSprites.entries()) {
            this.itemLayer.removeChild(sprite);
            sprite.reset();
            this.itemSpritePool.push(sprite);
        }
        this.activeItemSprites.clear();
    }
}