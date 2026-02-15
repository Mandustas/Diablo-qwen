// Импортируем необходимые модули
// (в браузере эти зависимости должны быть загружены до этого файла)

// Глобальная переменная для игры
let game;

class Game {
    constructor() {
        this.renderer = new Renderer('gameCanvas');

        // Инициализируем систему чанков со связной генерацией карты
        this.chunkSystem = new ConnectedChunkSystem(16); // Чанки размером 16x16 тайлов

        // Генерируем стартовый чанк
        this.chunkSystem.loadChunksAround(0, 0);

        // Создаем персонажа в центре стартового чанка
        const startPos = this.getValidSpawnPosition();
        this.character = new Character(startPos.x, startPos.y);

        this.enemies = [];

        // Состояние игры
        this.gameState = 'playing';

        // Управление
        this.keys = {};
        this.setupEventListeners();

        // Создаем дерево навыков
        this.skillTree = new SkillTree(this.character);

        // Создаем панель навыков
        this.skillBar = new SkillBar(this.character);
        this.skillBar.setGame(this);

        // Создаем окна инвентаря и характеристик
        this.inventoryWindow = new InventoryWindow(this.character);
        this.statsWindow = new StatsWindow(this.character);

        // Создаем систему сохранения
        this.saveSystem = new SaveSystem(this);

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
        
        this.renderer.canvas.width = width;
        this.renderer.canvas.height = height;
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
                this.togglePauseMenu();
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
                this.skillTree.toggle();
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
        this.renderer.canvas.addEventListener('mousedown', (e) => {
            this.handleClick(e);
        });

        // Обработка кнопки открытия дерева навыков
        document.getElementById('skillTreeButton').addEventListener('click', () => {
            this.skillTree.toggle();
        });

        // Обработка кнопки открытия инвентаря
        document.getElementById('inventoryButton').addEventListener('click', () => {
            this.inventoryWindow.toggle();
        });

        // Обработка кнопки открытия характеристик
        document.getElementById('statsButton').addEventListener('click', () => {
            this.statsWindow.toggle();
        });

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
                this.inventoryWindow.toggle();
            }

            // Клавиша S для открытия характеристик
            if (e.key.toLowerCase() === 'o') {
                e.preventDefault();
                this.statsWindow.toggle();
            }
        });

        // Обработка кнопок сохранения и загрузки
        document.getElementById('saveButton').addEventListener('click', () => {
            this.saveSystem.saveGame();
        });

        document.getElementById('loadButton').addEventListener('click', () => {
            this.saveSystem.loadGame();
        });
        
        // Обработка кнопок меню паузы
        document.getElementById('resumeButton').addEventListener('click', () => {
            this.togglePauseMenu();
        });
        
        document.getElementById('exitButton').addEventListener('click', () => {
            // Выход в главное меню (перезагрузка страницы)
            location.reload();
        });
    }
    
    /**
     * Переключение меню паузы
     */
    togglePauseMenu() {
        const pauseMenu = document.getElementById('pauseMenu');
        
        if (this.gameState === 'playing') {
            this.gameState = 'paused';
            pauseMenu.classList.add('active');
        } else {
            this.gameState = 'playing';
            pauseMenu.classList.remove('active');
        }
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
        const attackRange = 50; // Радиус атаки

        for (const enemy of this.enemies) {
            const distance = Math.sqrt(
                Math.pow(this.character.x - enemy.x, 2) +
                Math.pow(this.character.y - enemy.y, 2)
            );

            if (distance <= attackRange) {
                const damage = this.character.attack(enemy);
                console.log(`Атакован враг, нанесено урона: ${damage}`);

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
        const skillRange = 80; // Радиус действия навыка
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

        const rect = this.renderer.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Преобразуем координаты клика в мировые координаты
        const worldX = mouseX + this.renderer.camera.x;
        const worldY = mouseY + this.renderer.camera.y;

        // Проверяем, был ли клик по врагу
        const clickedEnemy = this.getEnemyAtPosition(worldX, worldY);
        
        if (clickedEnemy && e.button === 0) { // Левая кнопка мыши
            // Атакуем врага
            const distance = Math.sqrt(
                Math.pow(this.character.x - clickedEnemy.x, 2) +
                Math.pow(this.character.y - clickedEnemy.y, 2)
            );
            
            if (distance <= 50) { // В радиусе атаки
                const damage = this.character.attack(clickedEnemy);
                console.log(`Атакован враг, нанесено урона: ${damage}`);
                
                // Если враг умер, удаляем его
                if (!clickedEnemy.isAlive()) {
                    // Добавляем опыт за убийство будет обработан в основном цикле
                }
            }
        } else {
            // Перемещаем персонажа к точке клика
            this.moveTo(worldX, worldY);
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
            if (distance <= enemy.width / 2) {
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

        if (distance > 5) { // Если расстояние больше 5 пикселей
            const speed = 6; // Скорость перемещения (увеличена в 2 раза)
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
                tilePos = { tileX: Math.floor(nextX / 64), tileY: Math.floor(nextY / 32) };
            }

            // Проверяем коллизии с врагами перед перемещением
            if (this.isPassable(tilePos.tileX, tilePos.tileY) && !this.checkCharacterEnemyCollision(nextX, nextY)) {
                this.character.move(moveX, moveY);
            }
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
        const enemiesToSpawn = Math.max(Math.floor(loadedChunksCount / 2), 2);

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
        const desiredEnemyCount = Math.max(Math.floor(loadedChunksCount / 2), 3);
        
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
                
                if (distanceToPlayer > 80) { // Минимальное расстояние от игрока
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
            this.enemies.splice(index, 1);
        }
    }
    
    /**
     * Создание случайного предмета
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
     * Обновление состояния игры
     */
    update() {
        if (this.gameState !== 'playing') return;

        // Обработка движения персонажа с клавиатуры
        const speed = 8; // Увеличена скорость в 2 раза
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
                this.character.move(targetX - this.character.x, targetY - this.character.y);
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
        if (this.updateCounter >= 60) {
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

                // Добавляем случайный предмет
                if (Math.random() < 0.3) {
                    this.dropRandomItem(enemy.x, enemy.y);
                }

                // Удаляем мертвого врага
                this.enemies.splice(i, 1);
            }
        }

        // Обновляем восстановление маны
        this.character.regenerateMana();

        // Обновляем UI каждый кадр для отзывчивости
        this.updateCharacterUI();
    }
    
    /**
     * Обновление UI при изменении характеристик персонажа
     */
    updateCharacterUI() {
        // Обновляем отображение характеристик
        document.getElementById('healthValue').textContent = this.character.health;
        document.getElementById('manaValue').textContent = Math.floor(this.character.mana);
        document.getElementById('levelValue').textContent = this.character.level;
        
        // Обновляем дерево навыков, если оно открыто
        this.skillTree.onCharacterUpdate();
        
        // Обновляем панель навыков
        this.skillBar.update();
        
        // Обновляем окна при необходимости
        this.inventoryWindow.onInventoryUpdate();
        this.statsWindow.onStatsUpdate();
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
        for (let radius = 1; radius < 10; radius++) {
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
        for (let attempts = 0; attempts < 1000; attempts++) {
            // Определяем диапазон поиска в пределах загруженных чанков
            const chunkRange = 3; // Диапазон в чанках от персонажа
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

                if (distanceToPlayer > 100 && distanceToPlayer < 300) { // Минимальное и максимальное расстояние до игрока
                    return [pos.x, pos.y];
                }
            }
        }

        // Если не удалось найти подходящую позицию, возвращаем позицию подальше от игрока
        const angle = Math.random() * Math.PI * 2;
        const distance = 200; // Расстояние от игрока
        const x = this.character.x + Math.cos(angle) * distance;
        const y = this.character.y + Math.sin(angle) * distance;
        return [x, y];
    }
    
    /**
     * Рендеринг игры
     */
    render() {
        // Очищаем холст
        this.renderer.clear();

        // Рендерим фоновые тайлы (пол, вода и т.д.)
        this.renderer.renderBackgroundTiles(null, this.chunkSystem);

        // Получаем все объекты для рендеринга с учетом глубины
        const allRenderables = this.renderer.getAllRenderablesWithDepth(null, this.chunkSystem, this.enemies, this.character);

        // Рендерим все объекты с учетом глубины
        this.renderer.renderWithDepth(allRenderables, (obj) => obj.render());

        // При необходимости рендерим сетку (для отладки)
        // this.renderer.renderGrid();
    }
    
    /**
     * Основной игровой цикл
     */
    gameLoop() {
        this.update();
        this.render();
        
        // Запрашиваем следующий кадр
        requestAnimationFrame(() => this.gameLoop());
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
    game = new Game();
    game.start();
});