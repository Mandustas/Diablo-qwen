/**
 * Класс факела
 * Статический источник света с мерцанием и анимацией пламени
 */
class Torch {
    /**
     * Конструктор факела
     * @param {number} x - X координата в мировых координатах
     * @param {number} y - Y координата в мировых координатах
     * @param {Object} config - дополнительные настройки
     */
    constructor(x, y, config = {}) {
        this.x = x;
        this.y = y;
        
        // Уникальный ID факела
        this.id = `torch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Настройки из конфигурации
        const torchConfig = GAME_CONFIG.LIGHTING.TORCH;
        this.radius = config.radius || torchConfig.RADIUS;
        this.color = config.color || GAME_CONFIG.LIGHTING.LIGHT_COLOR;
        this.intensity = config.intensity !== undefined ? config.intensity : 1.0;
        this.flickerEnabled = config.flickerEnabled !== undefined ? config.flickerEnabled : torchConfig.FLICKER_ENABLED;
        this.flickerSpeed = config.flickerSpeed || torchConfig.FLICKER_SPEED;
        this.flickerAmount = config.flickerAmount || torchConfig.FLICKER_AMOUNT;
        
        // Источник света
        this.lightSource = null;
        
        // Графические элементы
        this.container = null;      // Контейнер для всех элементов
        this.baseSprite = null;     // Спрайт основания факела
        this.flameGraphics = null;  // Графика пламени
        this.lightSprite = null;    // Спрайт для эффекта свечения
        
        // Анимация пламени
        this.flamePhase = Math.random() * Math.PI * 2;
        this.flameParticles = [];
        this.flameTime = 0;
        
        // Состояние
        this.active = true;
        this.initialized = false;
    }
    
    /**
     * Инициализация факела
     * @param {LightingSystem} lightingSystem - система освещения
     * @param {PIXI.Container} parentContainer - родительский контейнер для графики
     */
    init(lightingSystem, parentContainer) {
        if (this.initialized) return;
        
        // Создаём источник света
        this.lightSource = new LightSource({
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: this.color,
            intensity: this.intensity,
            type: 'torch',
            flicker: this.flickerEnabled,
            flickerSpeed: this.flickerSpeed,
            flickerAmount: this.flickerAmount,
            height: 48 // Факел ниже игрока
        });
        
        // Добавляем в систему освещения
        lightingSystem.addLightSource(this.lightSource);
        
        // Создаём графический контейнер
        this.container = new PIXI.Container();
        this.container.x = this.x;
        this.container.y = this.y;
        
        // Создаём спрайт основания факела
        this.createBaseSprite();
        
        // Создаём графику пламени
        this.createFlameGraphics();
        
        // Создаём эффект свечения
        this.createLightGlow();
        
        // Добавляем в родительский контейнер
        if (parentContainer) {
            parentContainer.addChild(this.container);
        }
        
        this.initialized = true;
    }
    
    /**
     * Создание спрайта основания факела
     */
    createBaseSprite() {
        const graphics = new PIXI.Graphics();
        
        // Рисуем основание факела (деревянная подставка)
        graphics.beginFill(0x3d2818); // Тёмно-коричневый
        graphics.drawRect(-4, -8, 8, 16);
        graphics.endFill();
        
        // Металлическое кольцо
        graphics.beginFill(0x4a4a4a);
        graphics.drawRect(-5, -6, 10, 3);
        graphics.endFill();
        
        // Создаём текстуру из графики
        const texture = window.game && window.game.renderer 
            ? window.game.renderer.app.renderer.generateTexture(graphics)
            : null;
        
        if (texture) {
            this.baseSprite = new PIXI.Sprite(texture);
            this.baseSprite.anchor.set(0.5, 0.5);
        } else {
            this.baseSprite = graphics;
        }
        
        this.container.addChild(this.baseSprite);
    }
    
    /**
     * Создание графики пламени
     */
    createFlameGraphics() {
        this.flameGraphics = new PIXI.Graphics();
        this.container.addChild(this.flameGraphics);
        
        // Инициализируем частицы пламени
        for (let i = 0; i < 8; i++) {
            this.flameParticles.push({
                x: 0,
                y: 0,
                size: 3 + Math.random() * 4,
                speed: 0.5 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.8 + Math.random() * 0.2
            });
        }
    }
    
    /**
     * Создание эффекта свечения
     */
    createLightGlow() {
        // Создаём спрайт для эффекта свечения
        const glowGraphics = new PIXI.Graphics();
        
        // Рисуем мягкое свечение
        const glowRadius = 20;
        for (let i = glowRadius; i > 0; i -= 2) {
            const alpha = (1 - i / glowRadius) * 0.3;
            glowGraphics.beginFill(0xff8800, alpha);
            glowGraphics.drawCircle(0, -12, i);
            glowGraphics.endFill();
        }
        
        this.lightSprite = glowGraphics;
        this.lightSprite.blendMode = PIXI.BLEND_MODES.ADD;
        this.container.addChild(this.lightSprite);
    }
    
    /**
     * Обновление факела
     * @param {number} deltaTime - время с последнего обновления в мс
     */
    update(deltaTime) {
        if (!this.active || !this.initialized) return;
        
        this.flameTime += deltaTime / 1000;
        
        // Обновляем анимацию пламени
        this.updateFlame(deltaTime);
        
        // Обновляем эффект свечения
        this.updateGlow();
    }
    
    /**
     * Обновление анимации пламени
     * @param {number} deltaTime - время с последнего обновления
     */
    updateFlame(deltaTime) {
        if (!this.flameGraphics) return;

        this.flameGraphics.clear();

        // Рисуем частицы пламени
        for (const particle of this.flameParticles) {
            // Обновляем позицию частицы
            particle.phase += deltaTime * 0.01;
            // speed теперь в пикселях в секунду, конвертируем в пиксели за deltaTime
            particle.y -= particle.speed * (deltaTime / 1000);
            particle.x = Math.sin(particle.phase) * 2;
            
            // Сбрасываем частицу, когда она поднимается слишком высоко
            if (particle.y < -20) {
                particle.y = 0;
                particle.x = 0;
                particle.size = 3 + Math.random() * 4;
            }
            
            // Вычисляем цвет пламени (от жёлтого к красному)
            const heightRatio = Math.abs(particle.y) / 20;
            const r = 255;
            const g = Math.floor(200 - heightRatio * 150);
            const b = Math.floor(50 - heightRatio * 50);
            const color = (r << 16) + (Math.max(0, g) << 8) + Math.max(0, b);
            
            // Рисуем частицу
            const alpha = particle.alpha * (1 - heightRatio);
            this.flameGraphics.beginFill(color, alpha);
            this.flameGraphics.drawCircle(
                particle.x,
                -12 + particle.y, // Смещение вверх от основания
                particle.size * (1 - heightRatio * 0.5)
            );
            this.flameGraphics.endFill();
        }
        
        // Рисуем основное пламя
        const mainFlameHeight = 12 + Math.sin(this.flameTime * 8) * 3;
        const mainFlameWidth = 6 + Math.sin(this.flameTime * 6) * 2;
        
        // Внешнее пламя (красное)
        this.flameGraphics.beginFill(0xff4400, 0.6);
        this.flameGraphics.moveTo(-mainFlameWidth, -8);
        this.flameGraphics.quadraticCurveTo(
            -mainFlameWidth * 0.5, -8 - mainFlameHeight * 0.5,
            0, -8 - mainFlameHeight
        );
        this.flameGraphics.quadraticCurveTo(
            mainFlameWidth * 0.5, -8 - mainFlameHeight * 0.5,
            mainFlameWidth, -8
        );
        this.flameGraphics.endFill();
        
        // Внутреннее пламя (жёлтое)
        const innerHeight = mainFlameHeight * 0.7;
        const innerWidth = mainFlameWidth * 0.6;
        this.flameGraphics.beginFill(0xffcc00, 0.8);
        this.flameGraphics.moveTo(-innerWidth, -8);
        this.flameGraphics.quadraticCurveTo(
            -innerWidth * 0.5, -8 - innerHeight * 0.5,
            0, -8 - innerHeight
        );
        this.flameGraphics.quadraticCurveTo(
            innerWidth * 0.5, -8 - innerHeight * 0.5,
            innerWidth, -8
        );
        this.flameGraphics.endFill();
        
        // Ядро пламени (белое)
        const coreHeight = innerHeight * 0.4;
        this.flameGraphics.beginFill(0xffffee, 0.9);
        this.flameGraphics.drawEllipse(0, -10, 2, coreHeight * 0.5);
        this.flameGraphics.endFill();
    }
    
    /**
     * Обновление эффекта свечения
     */
    updateGlow() {
        if (!this.lightSprite) return;
        
        // Пульсация свечения
        const scale = 1 + Math.sin(this.flameTime * 5) * 0.1;
        this.lightSprite.scale.set(scale);
        
        // Изменение прозрачности
        this.lightSprite.alpha = 0.8 + Math.sin(this.flameTime * 7) * 0.2;
    }
    
    /**
     * Удаление факела
     * @param {LightingSystem} lightingSystem - система освещения
     * @param {PIXI.Container} parentContainer - родительский контейнер
     */
    destroy(lightingSystem, parentContainer) {
        this.active = false;
        
        // Удаляем источник света
        if (lightingSystem && this.lightSource) {
            lightingSystem.removeLightSource(this.id);
        }
        
        // Удаляем графику
        if (parentContainer && this.container) {
            parentContainer.removeChild(this.container);
        }
        
        // Уничтожаем контейнер
        if (this.container) {
            this.container.destroy({ children: true });
        }
        
        this.initialized = false;
    }
    
    /**
     * Сериализация факела
     * @returns {Object} - данные для сохранения
     */
    serialize() {
        return {
            id: this.id,
            x: this.x,
            y: this.y,
            radius: this.radius,
            color: this.color,
            intensity: this.intensity
        };
    }
    
    /**
     * Десериализация факела
     * @param {Object} data - данные для восстановления
     * @returns {Torch} - восстановленный факел
     */
    static deserialize(data) {
        return new Torch(data.x, data.y, data);
    }
}

/**
 * Менеджер факелов
 * Управляет всеми факелами в игровом мире
 */
class TorchManager {
    /**
     * Конструктор менеджера факелов
     * @param {LightingSystem} lightingSystem - система освещения
     */
    constructor(lightingSystem) {
        this.lightingSystem = lightingSystem;
        this.torches = new Map();
        this.container = new PIXI.Container();
        this.container.sortableChildren = true;
        this.initialized = false;
        
        // Отслеживание чанков, где уже сгенерированы факелы
        this.generatedChunks = new Set();
    }
    
    /**
     * Инициализация менеджера
     */
    init() {
        this.initialized = true;
    }
    
    /**
     * Добавление факела
     * @param {number} x - X координата
     * @param {number} y - Y координата
     * @param {Object} config - дополнительные настройки
     * @returns {Torch|null} - созданный факел или null если достигнут лимит
     */
    addTorch(x, y, config = {}) {
        const torchConfig = GAME_CONFIG.LIGHTING.TORCH;
        const maxTorches = torchConfig.MAX_TORCHES || 50;
        
        // Проверяем лимит факелов
        if (this.torches.size >= maxTorches) {
            return null;
        }
        
        const torch = new Torch(x, y, config);
        torch.init(this.lightingSystem, this.container);
        this.torches.set(torch.id, torch);
        return torch;
    }
    
    /**
     * Удаление факела
     * @param {string} id - ID факела
     */
    removeTorch(id) {
        const torch = this.torches.get(id);
        if (torch) {
            torch.destroy(this.lightingSystem, this.container);
            this.torches.delete(id);
        }
    }
    
    /**
     * Получение факела по ID
     * @param {string} id - ID факела
     * @returns {Torch|null} - факел или null
     */
    getTorch(id) {
        return this.torches.get(id) || null;
    }
    
    /**
     * Генерация факелов на карте
     * @param {Map} chunks - карта чанков
     * @param {number} tileSize - размер тайла
     */
    generateTorches(chunks, tileSize) {
        const torchConfig = GAME_CONFIG.LIGHTING.TORCH;
        const minDistance = torchConfig.MIN_DISTANCE * tileSize;
        
        // Проходим по всем чанкам
        for (const [chunkKey, chunk] of chunks) {
            // Пропускаем чанки, где ещё не сгенерированы тайлы
            if (!chunk.generated) continue;

            // Пропускаем чанки без данных о тайлах
            if (!chunk.tiles) continue;

            // Пропускаем чанки, где уже сгенерированы факелы
            if (this.generatedChunks.has(chunkKey)) continue;
            
            const chunkSize = chunk.tiles.length;
            
            // Проходим по тайлам чанка
            for (let y = 0; y < chunkSize; y++) {
                for (let x = 0; x < chunkSize; x++) {
                    const tile = chunk.tiles[y][x];
                    
                    // Только тайлы с полом (тип 0)
                    if (tile !== 0) continue;
                    
                    // Случайный шанс спауна
                    if (Math.random() > torchConfig.SPAWN_CHANCE) continue;

                    // Вычисляем мировые координаты
                    const worldX = chunk.chunkX * chunkSize * tileSize + x * tileSize + tileSize / 2;
                    const worldY = chunk.chunkY * chunkSize * tileSize + y * tileSize + tileSize / 2;

                    // Максимальное количество попыток для одной позиции
                    const maxAttempts = 3;

                    // Пробуем создать факел с несколькими попытками
                    for (let attempt = 0; attempt < maxAttempts; attempt++) {
                        // Проверяем минимальное расстояние до других факелов
                        let tooClose = false;
                        for (const torch of this.torches.values()) {
                            const dx = torch.x - worldX;
                            const dy = torch.y - worldY;
                            if (Math.sqrt(dx * dx + dy * dy) < minDistance) {
                                tooClose = true;
                                break;
                            }
                        }

                        if (!tooClose) {
                            // Успешно — создаём факел и выходим из цикла попыток
                            this.addTorch(worldX, worldY);
                            break;
                        }
                        // Если слишком близко — пробуем ещё раз (макс. maxAttempts раз)
                    }
                }
            }
            
            // Помечаем чанк как обработанный
            this.generatedChunks.add(chunkKey);
        }
    }
    
    /**
     * Обновление всех факелов
     * @param {number} deltaTime - время с последнего обновления в мс
     */
    update(deltaTime) {
        for (const torch of this.torches.values()) {
            torch.update(deltaTime);
        }
    }
    
    /**
     * Очистка факелов вне радиуса от игрока
     * @param {number} playerX - X координата игрока
     * @param {number} playerY - Y координата игрока
     * @param {number} radius - радиус сохранения
     * @param {number} tileSize - размер тайла (для вычисления чанка)
     */
    cullTorches(playerX, playerY, radius, tileSize = GAME_CONFIG.TILE.BASE_SIZE) {
        const toRemove = [];
        const chunksToUnmark = new Set();
        
        // Размер чанка (по умолчанию 16)
        const chunkSize = 16;
        
        for (const [id, torch] of this.torches) {
            const dx = torch.x - playerX;
            const dy = torch.y - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > radius) {
                toRemove.push(id);
                
                // Вычисляем ключ чанка, где находится факел
                // Преобразуем мировые координаты в координаты тайла, затем в координаты чанка
                const tileX = Math.floor(torch.x / tileSize);
                const tileY = Math.floor(torch.y / tileSize);
                const chunkX = Math.floor(tileX / chunkSize);
                const chunkY = Math.floor(tileY / chunkSize);
                const chunkKey = `${chunkX},${chunkY}`;
                chunksToUnmark.add(chunkKey);
            }
        }
        
        for (const id of toRemove) {
            this.removeTorch(id);
        }
        
        // Удаляем чанки из списка обработанных, чтобы факелы могли быть регенерированы
        for (const chunkKey of chunksToUnmark) {
            this.generatedChunks.delete(chunkKey);
        }
    }
    
    /**
     * Очистка списка сгенерированных чанков
     */
    clearGeneratedChunks() {
        this.generatedChunks.clear();
    }
    
    /**
     * Получение контейнера для рендеринга
     * @returns {PIXI.Container} - контейнер с факелами
     */
    getContainer() {
        return this.container;
    }
    
    /**
     * Сериализация всех факелов
     * @returns {Array} - массив данных факелов
     */
    serialize() {
        return Array.from(this.torches.values()).map(t => t.serialize());
    }
    
    /**
     * Десериализация факелов
     * @param {Array} data - массив данных факелов
     */
    deserialize(data) {
        // Очищаем существующие факелы
        this.clear();
        
        // Создаём новые факелы
        for (const torchData of data) {
            const torch = Torch.deserialize(torchData);
            torch.init(this.lightingSystem, this.container);
            this.torches.set(torch.id, torch);
        }
    }
    
    /**
     * Очистка всех факелов
     */
    clear() {
        for (const torch of this.torches.values()) {
            torch.destroy(this.lightingSystem, this.container);
        }
        this.torches.clear();
        this.generatedChunks.clear();
    }
    
    /**
     * Получение количества факелов
     * @returns {number} - количество факелов
     */
    getCount() {
        return this.torches.size;
    }
    
    /**
     * Рендеринг факелов
     * @param {PIXIRenderer} renderer - рендерер
     */
    render(renderer) {
        if (!renderer || !this.container) return;
        
        // Добавляем контейнер факелов в mainContainer рендерера
        if (renderer.mainContainer && !renderer.mainContainer.children.includes(this.container)) {
            renderer.mainContainer.addChild(this.container);
        }
    }
}
