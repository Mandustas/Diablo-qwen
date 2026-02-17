// Импортируем необходимые модули
// (в браузере эти зависимости должны быть загружены до этого файла)

// Глобальная переменная для игры
let game;

class Game {
    constructor() {
        this.renderer = new PIXIRenderer('gameCanvas');

        // Инициализируем систему чанков со связной генерацией карты
        this.chunkSystem = new ConnectedChunkSystem(GAME_CONFIG.INITIAL_CHUNK_SIZE); // Чанки размером 16x16 тайлов

        // Генерируем стартовый чанк
        this.chunkSystem.loadChunksAround(0, 0);

        // Создаем персонажа в центре стартового чанка
        const startPos = this.getValidSpawnPosition();
        this.character = new Character(startPos.x, startPos.y);

        this.enemies = [];

        // Система выпадения предметов
        this.itemDropSystem = new ItemDropSystem();

        // Состояние игры
        this.gameState = 'playing';

        // Управление
        this.keys = {};

        // === НОВАЯ СИСТЕМА UI НА PIXI ===
        // Инициализация UIManager
        this.uiManager = new UIManager(this.renderer);

        // Регистрируем новые UI компоненты
        this.uiSkillBar = new UISkillBar(this.character);
        this.uiManager.register('skillBar', this.uiSkillBar);
        this.uiSkillBar.setGame(this);

        this.uiSkillTree = new UISkillTree(this.character, { visible: false });
        this.uiManager.register('skillTree', this.uiSkillTree);

        this.uiInventory = new UIInventory(this.character, { visible: false });
        this.uiManager.register('inventory', this.uiInventory);

        this.uiStatsWindow = new UIStatsWindow(this.character, { visible: false });
        this.uiManager.register('stats', this.uiStatsWindow);

        // Миникарта на новой UI системе
        this.uiMinimap = new UIMinimap(this, { visible: true });
        this.uiManager.register('minimap', this.uiMinimap);

        // Панель кнопок открытия окон
        this.uiPanelButtons = new UIPanelButtons({ visible: true });
        this.uiManager.register('panelButtons', this.uiPanelButtons);

        // Меню паузы
        this.uiPauseMenu = new UIPauseMenu(this, { visible: false });
        this.uiManager.register('pauseMenu', this.uiPauseMenu);
        // =================================

        this.setupEventListeners();

        // Создаем систему эффектов получения уровня
        this.levelUpEffect = new LevelUpEffect(this.renderer);

        // Создаем систему боевых эффектов
        this.combatEffects = new CombatEffectsSystem(this.renderer);

        // Инициализируем систему полосок здоровья для врагов
        this.renderer.initEnemyHealthBars();

        // Переменная для отслеживания подсвеченного предмета
        this.hoveredItemDrop = null;

        // Создаём всплывающую подсказку для предметов
        this.itemTooltip = new ItemTooltip(this.renderer);
        // Добавляем тултип напрямую в stage (не в mainContainer), чтобы он был в экранных координатах
        this.renderer.app.stage.addChild(this.itemTooltip);
        // Устанавливаем высокий zIndex, чтобы тултип был поверх всех элементов
        this.itemTooltip.zIndex = 1000;
        this.renderer.app.stage.sortableChildren = true;

        // Устанавливаем обработчик изменения уровня персонажа
        this.character.onLevelChanged = (level, x, y) => {
            this.levelUpEffect.triggerLevelUp(x, y, level);
        };

        // Загружаем чанки вокруг персонажа
        const spawnTilePos = getTileIndex(this.character.x, this.character.y);
        this.chunkSystem.loadChunksAround(spawnTilePos.tileX, spawnTilePos.tileY);

        // Создаем врагов в стартовой области
        this.spawnEnemies();

        // Обновляем UI инвентаря
        this.character.updateInventoryUI();

        // Обработчик изменения размера окна
        window.addEventListener('resize', () => this.handleResize());
        this.handleResize(); // Установить начальный размер
    }

    /**
     * Обработка изменения размера окна
     */
    handleResize() {
        const container = document.getElementById('gameContainer');
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        // В PIXI размер холста управляется приложением
        this.renderer.app.renderer.resize(width, height);
    }

    /**
     * Настройка обработчиков событий
     */
    setupEventListeners() {
        // Обработка клавиш
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;

            // ESC - открыть/закрыть меню паузы
            if (e.key === 'Escape') {
                e.preventDefault();
                // Используем новую систему UI
                if (this.uiManager) {
                    // Если есть открытые окна, закрываем их
                    if (this.uiManager.hasOpenWindows()) {
                        this.uiManager.closeAllWindows();
                    } else {
                        // Иначе переключаем меню паузы
                        this.uiManager.toggle('pauseMenu');
                    }
                }
                return;
            }

            // Дополнительные действия по клавишам
            if (e.key === ' ') {
                e.preventDefault(); // Предотвращаем прокрутку страницы
                this.handleSpacePress();
            }

            // Открытие дерева навыков по клавише C
            if (e.key.toLowerCase() === 'c') {
                e.preventDefault();
                // Используем новую систему UI
                if (this.uiManager) {
                    this.uiManager.toggle('skillTree');
                } else {
                    this.skillTree.toggle();
                }
            }

            // Использование навыков по цифровым клавишам
            if (e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                this.handleSkillHotkey(parseInt(e.key));
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Обработка кликов мыши
        this.renderer.app.view.addEventListener('mousedown', (e) => {
            this.handleClick(e);
        });

        // Обработка движения мыши для подсветки предметов
        this.renderer.app.view.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });

        // Обработка контекстного меню (для правого клика)
        this.renderer.app.view.addEventListener('contextmenu', (e) => {
            if (GAME_CONFIG.DEBUG.TELEPORT_ON_RIGHT_CLICK) {
                e.preventDefault(); // Предотвращаем контекстное меню при включенной отладке телепортации
            }
        });

        // Обработка зуммирования колесиком мыши
        this.renderer.app.view.addEventListener('wheel', (e) => {
            e.preventDefault();
            this.handleZoom(e);
        }, { passive: false });

        // Обработка клавиш сохранения и загрузки
        window.addEventListener('keydown', (e) => {
            // Ctrl+S для сохранения
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveSystem.saveGame();
            }

            // Ctrl+L для загрузки
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                this.saveSystem.loadGame();
            }

            // Клавиша I для открытия инвентаря
            if (e.key.toLowerCase() === 'i') {
                e.preventDefault();
                if (this.uiManager) {
                    this.uiManager.toggle('inventory');
                }
            }

            // Клавиша S для открытия характеристик
            if (e.key.toLowerCase() === 'o') {
                e.preventDefault();
                if (this.uiManager) {
                    this.uiManager.toggle('stats');
                }
            }
        });
    }

    /**
     * Обработка нажатия пробела
     */
    handleSpacePress() {
        // Атака или использование способности
        if (this.gameState === 'playing') {
            // Если удерживается Shift, используем навык вместо атаки
            if (this.keys['shift']) {
                this.useSkillOnNearbyEnemies('fireball'); // Используем огненный шар по умолчанию при Shift+Пробел
            } else {
                this.attackNearbyEnemies();
            }
        }
    }

    /**
     * Обработка горячих клавиш навыков
     * @param {number} skillNumber - номер навыка (1-9)
     */
    handleSkillHotkey(skillNumber) {
        if (this.gameState !== 'playing') return;

        // Используем панель навыков для вызова навыка
        this.skillBar.useSkillInSlot(skillNumber);
    }

    /**
     * Атака ближайших врагов
     */
    attackNearbyEnemies() {
        const attackRange = GAME_CONFIG.ATTACK.RANGE; // Радиус атаки

        for (const enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(this.character.x - enemy.x, 2) +
                Math.pow(this.character.y - enemy.y, 2)
            );

            if (distance <= attackRange) {
                const damage = this.character.attack(enemy);

                // Если враг умер, удаляем его
                if (!enemy.isAlive()) {
                    // Добавляем опыт за убийство будет обработан в основном цикле
                }
            }
        }
    }

    /**
     * Использование навыка на ближайших врагов
     * @param {string} skillName - название навыка
     */
    useSkillOnNearbyEnemies(skillName) {
        const skillRange = GAME_CONFIG.ATTACK.SKILL_RANGE; // Радиус действия навыка
        let usedSkill = false;

        for (const enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(this.character.x - enemy.x, 2) +
                Math.pow(this.character.y - enemy.y, 2)
            );

            if (distance <= skillRange) {
                const result = this.character.useSkill(skillName, enemy);
                console.log(`Использован навык ${skillName} на враге, результат: ${result}`);
                usedSkill = true;
                break; // Используем навык только на одном враге
            }
        }

        if (!usedSkill) {
            // Если нет врагов в радиусе, используем навык без цели (например, лечение)
            const result = this.character.useSkill(skillName);
            console.log(`Использован навык ${skillName} без цели, результат: ${result}`);
        }
    }

    /**
     * Обработка клика мыши
     */
    handleClick(e) {
        if (this.gameState !== 'playing') return;

        const rect = this.renderer.app.view.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Центр экрана
        const centerX = this.renderer.app.screen.width / 2;
        const centerY = this.renderer.app.screen.height / 2;

        // Преобразуем координаты клика в мировые координаты с учетом зума
        const worldX = (mouseX - centerX) / this.renderer.camera.zoom + this.renderer.camera.x;
        const worldY = (mouseY - centerY) / this.renderer.camera.zoom + this.renderer.camera.y;

        // Проверяем, включена ли отладка телепортации по правому клику
        if (GAME_CONFIG.DEBUG.TELEPORT_ON_RIGHT_CLICK && e.button === 2) { // Правая кнопка мыши
            e.preventDefault(); // Предотвращаем контекстное меню

            // Получаем информацию о тайле для отладки
            const tilePos = getTileIndex(worldX, worldY);
            const tileType = this.chunkSystem.getTileType(tilePos.tileX, tilePos.tileY);
            const isPassable = this.chunkSystem.isPassable(tilePos.tileX, tilePos.tileY);
            
            // Выводим отладочную информацию
            console.log('=== Информация о тайле (ПКМ) ===');
            console.log(`Координаты клика (мировые): X=${worldX.toFixed(2)}, Y=${worldY.toFixed(2)}`);
            console.log(`Координаты тайла: tileX=${tilePos.tileX}, tileY=${tilePos.tileY}`);
            console.log(`Тип тайла: ${tileType} (${this.getTileTypeName(tileType)})`);
            console.log(`Проходимость: ${isPassable ? 'проходим' : 'непроходим'}`);
            console.log('================================');

            // Телепортируем персонажа в точку клика
            this.teleportTo(worldX, worldY);
            return;
        }

        // Проверяем, был ли клик по врагу
        const clickedEnemy = this.getEnemyAtPosition(worldX, worldY);

        if (clickedEnemy && e.button === 0) { // Левая кнопка мыши
            // Атакуем врага
            const distance = Math.sqrt(
                Math.pow(this.character.x - clickedEnemy.x, 2) +
                Math.pow(this.character.y - clickedEnemy.y, 2)
            );

            if (distance <= GAME_CONFIG.ATTACK.RANGE) { // В радиусе атаки
                const damage = this.character.attack(clickedEnemy);

                // Если враг умер, удаляем его
                if (!clickedEnemy.isAlive()) {
                    // Добавляем опыт за убийство будет обработан в основном цикле
                }
            }
        } else {
            // Проверяем, был ли клик по выпавшему предмету
            if (e.button === 0) { // Левая кнопка мыши
                // Если есть подсвеченный предмет, пытаемся его подобрать
                if (this.hoveredItemDrop) {
                    const pickedUp = this.hoveredItemDrop.pickup(this.character);
                    if (pickedUp) {
                        console.log('Подобран подсвеченный предмет по клику');
                    } else {
                        // Если не удалось подобрать подсвеченный предмет, пробуем обычный способ
                        const pickedUpAtCoords = this.itemDropSystem.tryPickupAt(worldX, worldY, this.character);

                        if (!pickedUpAtCoords) {
                            // Если не подобрали предмет по точным координатам клика, пробуем подобрать ближайший
                            const nearestPickedUp = this.itemDropSystem.tryPickupNearest(this.character);

                            if (!nearestPickedUp) {
                                // Если и ближайший не подобрали, ничего не делаем
                                // this.moveTo(worldX, worldY); // Убрано перемещение по ЛКМ
                            } else {
                                console.log('Подобран ближайший предмет по клику');
                            }
                        } else {
                            console.log('Подобран предмет по точным координатам клика');
                        }
                    }
                } else {
                    // Если нет подсвеченного предмета, используем старую логику
                    const pickedUp = this.itemDropSystem.tryPickupAt(worldX, worldY, this.character);

                    // Если не подобрали предмет по точным координатам клика, пробуем подобрать ближайший
                    if (!pickedUp) {
                        // Проверяем, есть ли ближайшие предметы в радиусе pickup
                        const nearestPickedUp = this.itemDropSystem.tryPickupNearest(this.character);

                        if (!nearestPickedUp) {
                            // Если и ближайший не подобрали, ничего не делаем
                            // this.moveTo(worldX, worldY); // Убрано перемещение по ЛКМ
                        } else {
                            console.log('Подобран ближайший предмет по клику');
                        }
                    } else {
                        console.log('Подобран предмет по точным координатам клика');
                    }
                }
            }
            // Перемещение по правой кнопке мыши убрано
        }
    }

    /**
     * Обработка движения мыши
     */
    handleMouseMove(e) {
        if (this.gameState !== 'playing') return;

        const rect = this.renderer.app.view.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Получаем предмет под курсором
        const hoveredDrop = this.itemDropSystem.getDropAtPoint(mouseX, mouseY, this.renderer);

        // Обновляем подсвеченный предмет
        this.hoveredItemDrop = hoveredDrop;

        // Обновляем тултип
        if (hoveredDrop) {
            this.itemTooltip.show(hoveredDrop);
            this.renderer.app.view.style.cursor = 'pointer'; // Меняем курсор на указатель при наведении на предмет
        } else {
            this.itemTooltip.hide();
            this.renderer.app.view.style.cursor = 'default'; // Возвращаем стандартный курсор
        }
    }

    /**
     * Получение врага в позиции
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @returns {Object|null} - враг или null
     */
    getEnemyAtPosition(x, y) {
        for (const enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(enemy.x - x, 2) +
                Math.pow(enemy.y - y, 2)
            );

            // Проверяем, находится ли точка в пределах хитбокса врага
            // hitboxRadius - это радиус в мировых координатах
            if (distance <= enemy.hitboxRadius) {
                return enemy;
            }
        }
        return null;
    }

    /**
     * Перемещение персонажа к точке
     */
    moveTo(targetX, targetY) {
        // Простое перемещение к цели (в реальной игре можно добавить A* алгоритм)
        const dx = targetX - this.character.x;
        const dy = targetY - this.character.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > GAME_CONFIG.MOVEMENT.MIN_DISTANCE_TO_TARGET) { // Если расстояние больше 5 пикселей
            const speed = GAME_CONFIG.PLAYER_SPEED; // Скорость перемещения (увеличена в 2 раза)
            const moveX = (dx / distance) * speed;
            const moveY = (dy / distance) * speed;

            // Проверяем, можно ли двигаться в направлении цели
            const nextX = this.character.x + moveX;
            const nextY = this.character.y + moveY;
            let tilePos;
            if (typeof getTileIndex !== 'undefined') {
                tilePos = getTileIndex(nextX, nextY);
            } else {
                // Резервный вариант, если функция недоступна
                tilePos = { tileX: Math.floor(nextX / GAME_CONFIG.TILE_DIMENSIONS.WIDTH), tileY: Math.floor(nextY / GAME_CONFIG.TILE_DIMENSIONS.HEIGHT) };
            }

            // Проверяем коллизии с врагами перед перемещением
            if (this.isPassable(tilePos.tileX, tilePos.tileY) && !this.checkCharacterEnemyCollision(nextX, nextY)) {
                // Получаем множитель скорости для текущего тайла
                const speedMultiplier = this.chunkSystem.getSpeedMultiplier(tilePos.tileX, tilePos.tileY);
                const adjustedMoveX = moveX * speedMultiplier;
                const adjustedMoveY = moveY * speedMultiplier;
                this.character.move(adjustedMoveX, adjustedMoveY);
            }
        }
    }

    /**
     * Телепортация персонажа в точку (для отладки)
     */
    teleportTo(targetX, targetY) {
        // Проверяем, нет ли врага в целевой позиции
        if (!this.checkCharacterEnemyCollision(targetX, targetY)) {
            // Телепортируем персонажа независимо от проходимости тайла (для отладки)
            this.character.x = targetX;
            this.character.y = targetY;

            console.log(`Телепортирован в точку: (${targetX}, ${targetY})`);
        } else {
            console.log('Невозможно телепортироваться: враг в целевой позиции');
        }
    }

    /**
     * Проверка коллизии персонажа с врагами в заданной позиции
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @returns {boolean} - есть ли коллизия
     */
    checkCharacterEnemyCollision(x, y) {
        // Оптимизация: используем квадрат расстояния для избежания Math.sqrt
        const minDist = this.character.hitboxRadius;
        const minDistSq = minDist * minDist;

        for (const enemy of this.enemies) {
            const dx = x - enemy.x;
            const dy = y - enemy.y;
            const distSq = dx * dx + dy * dy;
            const combinedRadius = this.character.hitboxRadius + enemy.hitboxRadius;

            if (distSq < combinedRadius * combinedRadius) {
                return true;
            }
        }

        return false;
    }

    /**
     * Создание врага
     */
    createEnemy(x, y, type = 'basic') {
        // Проверяем, являются ли x и y массивом (когда передаются через spread оператор)
        if (Array.isArray(x)) {
            [x, y] = x;
        }

        const enemy = new Enemy(x, y, type);
        this.enemies.push(enemy);
    }

    /**
     * Спаун врагов в загруженных чанках - равномерное распределение
     */
    spawnEnemies() {
        // Рассчитываем количество врагов пропорционально количеству загруженных чанков
        const loadedChunksCount = this.chunkSystem.activeChunks.size;
        const enemiesToSpawn = Math.max(Math.floor(loadedChunksCount * GAME_CONFIG.SPAWN.ENEMIES_PER_CHUNK), GAME_CONFIG.SPAWN.MIN_ENEMIES);

        // Получаем список всех активных чанков
        const activeChunkKeys = Array.from(this.chunkSystem.activeChunks);

        // Перемешиваем чанки для случайного распределения
        this.shuffleArray(activeChunkKeys);

        // Распределяем врагов по чанкам
        for (let i = 0; i < enemiesToSpawn; i++) {
            // Выбираем чанк по очереди (равномерное распределение)
            const chunkKey = activeChunkKeys[i % activeChunkKeys.length];
            const [chunkX, chunkY] = chunkKey.split(',').map(Number);

            const [x, y] = this.getRandomPositionInChunk(chunkX, chunkY);
            const enemyTypes = ['basic', 'weak', 'strong', 'fast', 'tank'];
            const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            this.createEnemy(x, y, randomType);
        }
    }

    /**
     * Обновление спауна врагов - равномерное распределение по всей карте
     */
    updateEnemySpawning() {
        // Рассчитываем количество врагов, которое должно быть в игре
        const loadedChunksCount = this.chunkSystem.activeChunks.size;
        const desiredEnemyCount = Math.max(Math.floor(loadedChunksCount * GAME_CONFIG.SPAWN.ENEMIES_PER_CHUNK), GAME_CONFIG.SPAWN.MIN_ENEMIES_UPDATE);

        // Получаем список всех активных чанков
        const activeChunkKeys = Array.from(this.chunkSystem.activeChunks);

        // Если врагов меньше нужного количества, добавляем новых
        if (this.enemies.length < desiredEnemyCount) {
            const enemiesToAdd = desiredEnemyCount - this.enemies.length;

            // Перемешиваем для случайного выбора чанка
            this.shuffleArray(activeChunkKeys);

            for (let i = 0; i < enemiesToAdd; i++) {
                // Выбираем случайный чанк из активных
                const chunkKey = activeChunkKeys[Math.floor(Math.random() * activeChunkKeys.length)];
                const [chunkX, chunkY] = chunkKey.split(',').map(Number);

                const [x, y] = this.getRandomPositionInChunk(chunkX, chunkY);
                const enemyTypes = ['basic', 'weak', 'strong', 'fast', 'tank'];
                const randomType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];

                // Проверяем, не слишком ли близко к игроку (больше допустимое расстояние)
                const distanceToPlayer = Math.sqrt(
                    Math.pow(x - this.character.x, 2) +
                    Math.pow(y - this.character.y, 2)
                );

                if (distanceToPlayer > GAME_CONFIG.SPAWN.PLAYER_SPAWN_DISTANCE_MIN) { // Минимальное расстояние от игрока
                    this.createEnemy(x, y, randomType);
                }
            }
        }
    }

    /**
     * Получение случайной позиции в чанке
     */
    getRandomPositionInChunk(chunkX, chunkY) {
        const tilesPerChunk = this.chunkSystem.chunkSize;
        const worldStartX = chunkX * tilesPerChunk;
        const worldStartY = chunkY * tilesPerChunk;

        // Пытаемся найти проходимую позицию в чанке
        for (let attempts = 0; attempts < 50; attempts++) {
            const localX = Math.floor(Math.random() * tilesPerChunk);
            const localY = Math.floor(Math.random() * tilesPerChunk);
            const tileX = worldStartX + localX;
            const tileY = worldStartY + localY;

            if (this.isPassable(tileX, tileY)) {
                const pos = isoTo2D(tileX, tileY);
                return [pos.x, pos.y];
            }
        }

        // Если не нашли проходимую позицию, возвращаем центр чанка
        const centerTileX = worldStartX + Math.floor(tilesPerChunk / 2);
        const centerTileY = worldStartY + Math.floor(tilesPerChunk / 2);
        const pos = isoTo2D(centerTileX, centerTileY);
        return [pos.x, pos.y];
    }

    /**
     * Перемешивание массива (алгоритм Фишера-Йетса)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Удаление врага
     */
    removeEnemy(enemy) {
        const index = this.enemies.indexOf(enemy);
        if (index !== -1) {
            // Удаляем спрайт врага из кэша и сцены
            const enemySprite = this.renderer.entitySprites.get(enemy);
            if (enemySprite) {
                if (enemySprite.parent) {
                    enemySprite.parent.removeChild(enemySprite);
                }
                this.renderer.entitySprites.delete(enemy);
            }

            this.enemies.splice(index, 1);
        }
    }

    /**
     * Создание случайного...
     */
    dropRandomItem(x, y) {
        // Генерируем случайный предмет
        const randomItem = generateRandomItem(this.character.level);

        // Добавляем предмет в инвентарь персонажа
        if (!this.character.addToInventory(randomItem)) {
            console.log('Инвентарь полон, предмет исчез');
        } else {
            console.log(`Получен предмет: ${randomItem.name} (${randomItem.rarity})`);
        }
    }

    /**
     * Выпадение предметов с врага
     * @param {Enemy} enemy - враг, с которого выпадают предметы
     */
    dropItemsFromEnemy(enemy) {
        // Определяем количество предметов, которые могут выпасть (до 3)
        const maxDrops = 3;
        const strengthFactor = this.getMonsterStrengthFactor(enemy);

        // Базовый шанс выпадения предмета
        let baseDropChance = 0.3;

        // Увеличиваем шанс выпадения в зависимости от силы врага
        baseDropChance *= strengthFactor;

        // Максимальное количество выпадающих предметов зависит от силы врага
        const maxPossibleDrops = Math.min(maxDrops, Math.ceil(strengthFactor));

        // Выбираем количество предметов для выпадения
        const numDrops = Math.min(maxPossibleDrops, Math.max(1, Math.floor(Math.random() * maxPossibleDrops) + 1));

        for (let i = 0; i < numDrops; i++) {
            // Проверяем шанс выпадения для каждого предмета
            if (Math.random() < baseDropChance) {
                // Генерируем предмет с учетом силы врага
                const item = this.generateItemBasedOnEnemy(enemy);

                // Создаем выпавший предмет на земле
                this.itemDropSystem.createItemDrop(item, enemy.x, enemy.y);

                console.log(`Выпал предмет: ${item.name} (${item.rarity}) с врага ${enemy.type}`);
            }
        }
    }

    /**
     * Генерация предмета с учетом силы врага
     * @param {Enemy} enemy - враг, с которого выпадает предмет
     * @returns {Item} - сгенерированный предмет
     */
    generateItemBasedOnEnemy(enemy) {
        const strengthFactor = this.getMonsterStrengthFactor(enemy);

        // Увеличиваем уровень предмета в зависимости от силы врага
        const itemLevel = Math.max(1, Math.floor(this.character.level * strengthFactor));

        // Генерируем случайный предмет
        const item = generateRandomItem(itemLevel);

        // Улучшаем редкость предмета в зависимости от силы врага
        if (strengthFactor > 1.5 && Math.random() < 0.1) {
            // Повышаем редкость до эпической для очень сильных врагов
            item.rarity = 'epic';
        } else if (strengthFactor > 1.2 && Math.random() < 0.2) {
            // Повышаем редкость до редкой для сильных врагов
            item.rarity = 'rare';
        } else if (strengthFactor > 1.0 && Math.random() < 0.3) {
            // Повышаем редкость до необычной для средних врагов
            item.rarity = 'uncommon';
        }

        // Пересчитываем стоимость предмета с учетом новой редкости
        item.value = item.calculateValue();

        return item;
    }

    /**
     * Получение фактора силы врага
     * @param {Enemy} enemy - враг
     * @returns {number} - фактор силы (1.0 для базового врага)
     */
    getMonsterStrengthFactor(enemy) {
        // Базовые характеристики для сравнения
        const baseHealth = GAME_CONFIG.ENEMY.TYPES.BASIC.maxHealth;
        const baseDamage = GAME_CONFIG.ENEMY.TYPES.BASIC.damage;

        // Рассчитываем общий показатель силы врага
        const healthFactor = enemy.stats.maxHealth / baseHealth;
        const damageFactor = enemy.damage / baseDamage;

        // Взвешиваем факторы (здоровье важнее урона)
        return (healthFactor * 0.6 + damageFactor * 0.4);
    }

    /**
     * Проверка, можно ли пройти через тайл
     * @param {number} tileX - координата X тайла
     * @param {number} tileY - координата Y тайла
     * @returns {boolean} - проходимый ли тайл
     */
    isPassable(tileX, tileY) {
        // Используем chunkSystem для проверки проходимости
        return this.chunkSystem.isPassable(tileX, tileY);
    }

    /**
     * Получение названия тайла по типу
     * @param {number} tileType - тип тайла
     * @returns {string} - название тайла
     */
    getTileTypeName(tileType) {
        const tileNames = {
            0: 'пол',
            1: 'стена',
            2: 'колонна',
            3: 'дерево',
            4: 'скала',
            5: 'вода',
            6: 'лёд',
            7: 'декорация'
        };
        return tileNames[tileType] || 'неизвестный';
    }

    /**
     * Обновление состояния игры
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    update(deltaTime = 16.67) {
        if (this.gameState !== 'playing') return;

        // Обработка движения персонажа с клавиатуры
        const speed = GAME_CONFIG.PLAYER_SPEED; // Увеличена скорость в 2 раза
        let targetX = this.character.x;
        let targetY = this.character.y;

        if (this.keys['w'] || this.keys['ц']) targetY -= speed;
        if (this.keys['s'] || this.keys['ы']) targetY += speed;
        if (this.keys['a'] || this.keys['ф']) targetX -= speed;
        if (this.keys['d'] || this.keys['в']) targetX += speed;

        // Двигаем персонажа только если есть ввод
        if (targetX !== this.character.x || targetY !== this.character.y) {
            let tilePos = getTileIndex(targetX, targetY);
            if (this.isPassable(tilePos.tileX, tilePos.tileY)) {
                // Получаем множитель скорости для текущего тайла
                const speedMultiplier = this.chunkSystem.getSpeedMultiplier(tilePos.tileX, tilePos.tileY);
                const adjustedMoveX = (targetX - this.character.x) * speedMultiplier;
                const adjustedMoveY = (targetY - this.character.y) * speedMultiplier;
                this.character.move(adjustedMoveX, adjustedMoveY);
            }
        }

        // Центрируем камеру на персонаже
        this.renderer.centerCameraOnCharacter(this.character);

        // Загружаем новые чанки только при переходе в новый чанк
        const currentTilePos = getTileIndex(this.character.x, this.character.y);
        const currentChunkX = Math.floor(currentTilePos.tileX / this.chunkSystem.chunkSize);
        const currentChunkY = Math.floor(currentTilePos.tileY / this.chunkSystem.chunkSize);

        if (this.lastChunkX !== currentChunkX || this.lastChunkY !== currentChunkY) {
            this.lastChunkX = currentChunkX;
            this.lastChunkY = currentChunkY;
            this.chunkSystem.loadChunksAround(currentTilePos.tileX, currentTilePos.tileY);
        }

        // Обновляем спаун врагов (реже - раз в 60 кадров)
        if (this.updateCounter === undefined) this.updateCounter = 0;
        this.updateCounter++;
        if (this.updateCounter >= GAME_CONFIG.UPDATE.ENEMY_SPAWN_INTERVAL) {
            this.updateEnemySpawning();
            this.updateCounter = 0;
        }

        // Обновляем врагов
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];

            // Обновляем состояние врага
            enemy.update(this.character, null, this.chunkSystem);

            // Проверяем коллизии с другими врагами и персонажем
            this.handleEnemyCollisions(enemy);

            // Проверяем, жив ли враг
            if (!enemy.isAlive()) {
                // Добавляем опыт за убийство
                this.character.gainExperience(enemy.stats.maxHealth / 2);

                // Добавляем случайные предметы с врага
                this.dropItemsFromEnemy(enemy);

                // Удаляем мертвого врага (используем метод removeEnemy для очистки спрайтов)
                this.removeEnemy(enemy);
                // После удаления врага из массива в removeEnemy, продолжаем цикл
                // i уже указывает на следующий элемент, поэтому не уменьшаем i
                continue;
            }
        }

        // Обновляем систему выпадения предметов
        this.itemDropSystem.update();

        // Обновляем восстановление маны
        this.character.regenerateMana();

        // Обновляем эффект получения уровня
        this.levelUpEffect.update(deltaTime);

        // Обновляем боевые эффекты
        this.combatEffects.update(deltaTime);

        // Обновляем полоски здоровья врагов
        if (this.renderer.updateEnemyHealthBars) {
            this.renderer.updateEnemyHealthBars(deltaTime);
        }

        // Обновляем UI каждый кадр для отзывчивости
        this.updateCharacterUI();
    }

    /**
     * Обновление UI при изменении характеристик персонажа
     */
    updateCharacterUI() {
        // Обновляем координаты персонажа
        document.getElementById('coordX').textContent = Math.floor(this.character.x);
        document.getElementById('coordY').textContent = Math.floor(this.character.y);

        // Обновляем координаты тайла
        const tilePos = getTileIndex(this.character.x, this.character.y);
        document.getElementById('tileX').textContent = tilePos.tileX;
        document.getElementById('tileY').textContent = tilePos.tileY;

        // === НОВАЯ СИСТЕМА UI НА PIXI ===
        // Обновляем новые UI компоненты через UIManager
        if (this.uiManager) {
            // Обновляем UI компоненты
            if (this.uiSkillBar) {
                this.uiSkillBar.update();
            }
            if (this.uiSkillTree && this.uiSkillTree.isOpen) {
                this.uiSkillTree.onCharacterUpdate();
            }
            if (this.uiInventory && this.uiInventory.isOpen) {
                this.uiInventory.onInventoryUpdate();
            }
            if (this.uiStatsWindow && this.uiStatsWindow.isOpen) {
                this.uiStatsWindow.onStatsUpdate();
            }
        }
        // =================================
    }

    /**
     * Проверка, можно ли пройти через тайл
     * @param {number} tileX - координата X тайла
     * @param {number} tileY - координата Y тайла
     * @returns {boolean} - проходимый ли тайл
     */
    /**
     * Обработка коллизий врага с другими объектами
     * @param {Object} enemy - враг
     */
    handleEnemyCollisions(enemy) {
        // Проверяем коллизию с персонажем
        if (enemy.checkCollisionWith(this.character)) {
            // При столкновении с персонажем, немного сдвигаем врага назад
            const dx = enemy.x - this.character.x;
            const dy = enemy.y - this.character.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < (enemy.hitboxRadius + this.character.hitboxRadius) && distance > 0) {
                // Нормализуем вектор
                const nx = dx / distance;
                const ny = dy / distance;

                // Вычисляем, насколько нужно отодвинуть
                const overlap = (enemy.hitboxRadius + this.character.hitboxRadius) - distance;

                // Сдвигаем врага
                enemy.x += nx * overlap / 2;
                enemy.y += ny * overlap / 2;
            }
        }

        // Проверяем коллизии с другими врагами
        for (const otherEnemy of this.enemies) {
            if (enemy !== otherEnemy && enemy.checkCollisionWith(otherEnemy)) {
                // При столкновении с другим врагом, немного сдвигаем их
                const dx = enemy.x - otherEnemy.x;
                const dy = enemy.y - otherEnemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < (enemy.hitboxRadius + otherEnemy.hitboxRadius) && distance > 0) {
                    // Нормализуем вектор
                    const nx = dx / distance;
                    const ny = dy / distance;

                    // Вычисляем, насколько нужно отодвинуть
                    const overlap = (enemy.hitboxRadius + otherEnemy.hitboxRadius) - distance;

                    // Сдвигаем врагов в противоположные стороны
                    const moveAmount = overlap / 2;
                    enemy.x += nx * moveAmount;
                    enemy.y += ny * moveAmount;
                    otherEnemy.x -= nx * moveAmount;
                    otherEnemy.y -= ny * moveAmount;
                }
            }
        }
    }

    /**
     * Получение подходящей стартовой позиции для персонажа
     * @returns {Object} - координаты {x, y}
     */
    getValidSpawnPosition() {
        // Для бесконечной генерации начинаем с центра стартового чанка
        const centerX = 0; // Центр координат
        const centerY = 0; // Центр координат

        // Проверяем, проходим ли центральный тайл
        if (this.isPassable(centerX, centerY)) {
            const pos = isoTo2D(centerX, centerY);
            return { x: pos.x, y: pos.y };
        }

        // Если центральный тайл непроходим, ищем ближайший проходимый
        for (let radius = 1; radius < GAME_CONFIG.POSITION_SEARCH.MAX_RADIUS; radius++) {
            for (let y = -radius; y <= radius; y++) {
                for (let x = -radius; x <= radius; x++) {
                    if (Math.abs(x) === radius || Math.abs(y) === radius) { // Только по периметру
                        if (this.isPassable(centerX + x, centerY + y)) {
                            const pos = isoTo2D(centerX + x, centerY + y);
                            return { x: pos.x, y: pos.y };
                        }
                    }
                }
            }
        }

        // Если ничего не найдено, возвращаем центральную точку
        const pos = isoTo2D(centerX, centerY);
        return { x: pos.x, y: pos.y };
    }

    /**
     * Получение подходящей позиции для врага
     * @returns {Array} - координаты [x, y]
     */
    getValidSpawnPositionForEnemy() {
        // Попробуем найти подходящую позицию в загруженных чанках, не слишком близко к персонажу
        for (let attempts = 0; attempts < GAME_CONFIG.ENEMY_SPAWN_ATTEMPTS; attempts++) {
            // Определяем диапазон поиска в пределах загруженных чанков
            const chunkRange = GAME_CONFIG.SPAWN.CHUNK_RANGE_FOR_SPAWN; // Диапазон в чанках от персонажа
            const tilesPerChunk = this.chunkSystem.chunkSize;

            // Определяем координаты персонажа в системе тайлов, затем в чанках
            const charTilePos = getTileIndex(this.character.x, this.character.y);
            const charChunkX = Math.floor(charTilePos.tileX / tilesPerChunk);
            const charChunkY = Math.floor(charTilePos.tileY / tilesPerChunk);

            // Выбираем случайный чанк в диапазоне
            const spawnChunkX = charChunkX + Math.floor(Math.random() * chunkRange * 2) - chunkRange;
            const spawnChunkY = charChunkY + Math.floor(Math.random() * chunkRange * 2) - chunkRange;

            // Выбираем случайную позицию в чанке
            const tileX = spawnChunkX * tilesPerChunk + Math.floor(Math.random() * tilesPerChunk);
            const tileY = spawnChunkY * tilesPerChunk + Math.floor(Math.random() * tilesPerChunk);

            if (this.isPassable(tileX, tileY)) {
                // Преобразуем координаты тайла в 2D координаты
                const pos = isoTo2D(tileX, tileY);

                // Проверяем, не слишком ли близко к персонажу
                const distanceToPlayer = Math.sqrt(
                    Math.pow(pos.x - this.character.x, 2) +
                    Math.pow(pos.y - this.character.y, 2)
                );

                if (distanceToPlayer > GAME_CONFIG.SPAWN.PLAYER_SPAWN_DISTANCE_MIN && distanceToPlayer < GAME_CONFIG.SPAWN.PLAYER_SPAWN_DISTANCE_MAX) { // Минимальное и максимальное расстояние до игрока
                    return [pos.x, pos.y];
                }
            }
        }

        // Если не удалось найти подходящую позицию, возвращаем позицию подальше от игрока
        const angle = Math.random() * Math.PI * 2;
        const distance = GAME_CONFIG.SPAWN.PLAYER_SPAWN_DISTANCE_DEFAULT; // Расстояние от игрока
        const x = this.character.x + Math.cos(angle) * distance;
        const y = this.character.y + Math.sin(angle) * distance;
        return [x, y];
    }

    /**
     * Обработка зуммирования колесиком мыши
     * @param {WheelEvent} e - событие колеса мыши
     */
    handleZoom(e) {
        // Получаем направление прокрутки
        const zoomDelta = e.deltaY > 0 ? -GAME_CONFIG.CAMERA.ZOOM_DELTA_ON_WHEEL : GAME_CONFIG.CAMERA.ZOOM_DELTA_ON_WHEEL;

        // Вычисляем новый зум
        const newZoom = this.renderer.camera.targetZoom + zoomDelta;

        // Применяем зум с ограничениями
        this.renderer.camera.targetZoom = Math.max(
            this.renderer.camera.minZoom,
            Math.min(this.renderer.camera.maxZoom, newZoom)
        );
    }

    /**
     * Рендеринг игры
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    render(deltaTime = 16.67) {
        // Очищаем холст
        this.renderer.clear();

        // Обновляем плавный зум
        this.renderer.updateZoom();

        // Рендерим фоновые тайлы (пол, вода и т.д.)
        this.renderer.renderBackgroundTiles(null, this.chunkSystem);

        // Получаем все объекты для рендеринга с учетом глубины
        const allRenderables = this.renderer.getAllRenderablesWithDepth(null, this.chunkSystem, this.enemies, this.character);

        // Рендерим все объекты с учетом глубины
        this.renderer.renderWithDepth(allRenderables, (obj) => obj.render());

        // Рендерим выпавшие предметы через PIXI
        this.renderer.renderItems(this.itemDropSystem.drops, this.hoveredItemDrop);

        // Обновляем и рендерим тултип предмета
        if (this.itemTooltip && this.hoveredItemDrop) {
            this.itemTooltip.update(this.hoveredItemDrop);
        }

        // Миникарта обновляется автоматически через UIManager

        // Рендерим эффект получения уровня
        this.levelUpEffect.render(deltaTime);

        // Рендерим боевые эффекты
        this.combatEffects.render(deltaTime);

        // При необходимости рендерим сетку (для отладки)
        // this.renderer.renderGrid();
    }

    /**
     * Основной игровой цикл
     */
    gameLoop(currentTime = 0) {
        // Вычисляем deltaTime в миллисекундах
        const deltaTime = currentTime - (this.lastTime || currentTime);
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.render(deltaTime);

        // Запрашиваем следующий кадр
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    /**
     * Запуск игры
     */
    start() {
        this.gameLoop();
    }
}

// Запуск игры после загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    window.game = game = new Game();
    game.start();
});