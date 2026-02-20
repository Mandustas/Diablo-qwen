/**
 * Базовый класс снаряда
 * Представляет летящий объект в игровом мире
 */
class Projectile {
    /**
     * Конструктор снаряда
     * @param {Object} config - конфигурация снаряда
     */
    constructor(config) {
        // Уникальный ID снаряда
        this.id = `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Позиция
        this.x = config.x || 0;
        this.y = config.y || 0;
        
        // Цель
        this.targetX = config.targetX || this.x;
        this.targetY = config.targetY || this.y;
        
        // Скорость
        this.speed = config.speed || 5;
        
        // Урон
        this.damage = config.damage || 10;
        
        // Владелец (кто выпустил снаряд)
        this.owner = config.owner || null;
        
        // Тип снаряда
        this.type = config.type || 'default';
        
        // Источник света (опционально)
        this.lightSource = null;
        this.lightId = null;
        
        // Графические элементы
        this.container = null;
        this.sprite = null;
        
        // Состояние
        this.active = true;
        this.reachedTarget = false;
        this.initialized = false;
        
        // Направление движения
        this.directionX = 0;
        this.directionY = 0;
        this.angle = 0;
        
        // Вычисляем направление
        this.calculateDirection();
    }
    
    /**
     * Вычисление направления к цели
     */
    calculateDirection() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            this.directionX = dx / distance;
            this.directionY = dy / distance;
            this.angle = Math.atan2(dy, dx);
        }
    }
    
    /**
     * Инициализация снаряда
     * @param {PIXI.Container} parentContainer - родительский контейнер
     * @param {LightingSystem} lightingSystem - система освещения (опционально)
     */
    init(parentContainer, lightingSystem = null) {
        if (this.initialized) return;
        
        // Создаём контейнер
        this.container = new PIXI.Container();
        this.container.x = this.x;
        this.container.y = this.y;
        
        // Создаём спрайт
        this.createSprite();
        
        // Добавляем в родительский контейнер
        if (parentContainer) {
            parentContainer.addChild(this.container);
        }
        
        this.initialized = true;
    }
    
    /**
     * Создание спрайта снаряда
     * Переопределяется в дочерних классах
     */
    createSprite() {
        this.sprite = new PIXI.Graphics();
        
        // Базовый спрайт - простой круг
        this.sprite.beginFill(0xffffff);
        this.sprite.drawCircle(0, 0, 5);
        this.sprite.endFill();
        
        this.container.addChild(this.sprite);
    }
    
    /**
     * Создание источника света для снаряда
     * @param {LightingSystem} lightingSystem - система освещения
     * @param {Object} config - конфигурация источника света
     */
    createLightSource(lightingSystem, config) {
        if (!lightingSystem) return;
        
        this.lightId = `light_${this.id}`;
        this.lightSource = new LightSource({
            id: this.lightId,
            x: this.x,
            y: this.y,
            radius: config.radius || 5,
            color: config.color || { R: 1.0, G: 0.85, B: 0.6 },
            intensity: config.intensity || 1.0,
            type: 'projectile',
            flicker: config.flicker || false,
            height: config.height || 32
        });
        
        lightingSystem.addLightSource(this.lightSource);
    }
    
    /**
     * Обновление снаряда
     * @param {number} deltaTime - время с последнего обновления в мс
     * @returns {boolean} - активен ли снаряд
     */
    update(deltaTime) {
        if (!this.active) return false;

        // Перемещаем снаряд
        // speed теперь в пикселях в секунду, конвертируем в пиксели за deltaTime
        const moveSpeed = this.speed * (deltaTime / 1000);
        this.x += this.directionX * moveSpeed;
        this.y += this.directionY * moveSpeed;
        
        // Обновляем позицию контейнера
        if (this.container) {
            this.container.x = this.x;
            this.container.y = this.y;
        }
        
        // Обновляем позицию источника света
        if (this.lightSource) {
            this.lightSource.setPosition(this.x, this.y);
        }
        
        // Проверяем, достиг ли снаряд цели
        if (this.hasReachedTarget()) {
            this.reachedTarget = true;
            this.onReachTarget();
            return false;
        }
        
        return true;
    }
    
    /**
     * Проверка, достиг ли снаряд цели
     * @returns {boolean} - достиг ли снаряд цели
     */
    hasReachedTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < this.speed;
    }
    
    /**
     * Обработка достижения цели
     * Переопределяется в дочерних классах
     */
    onReachTarget() {
        this.active = false;
    }
    
    /**
     * Проверка столкновения с целью
     * @param {Object} target - цель с координатами x, y и hitboxRadius
     * @returns {boolean} - произошло ли столкновение
     */
    checkCollision(target) {
        if (!target) return false;
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = target.hitboxRadius || 16;
        
        return distance < hitRadius + 5;
    }
    
    /**
     * Удаление снаряда
     * @param {PIXI.Container} parentContainer - родительский контейнер
     * @param {LightingSystem} lightingSystem - система освещения
     */
    destroy(parentContainer, lightingSystem) {
        this.active = false;
        
        // Удаляем источник света
        if (lightingSystem && this.lightId) {
            lightingSystem.removeLightSource(this.lightId);
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
}

/**
 * Менеджер снарядов
 * Управляет всеми снарядами в игровом мире
 */
class ProjectileManager {
    /**
     * Конструктор менеджера снарядов
     * @param {LightingSystem} lightingSystem - система освещения
     */
    constructor(lightingSystem) {
        this.lightingSystem = lightingSystem;
        this.projectiles = new Map();
        this.container = new PIXI.Container();
        this.initialized = false;
    }
    
    /**
     * Инициализация менеджера
     */
    init() {
        this.initialized = true;
    }
    
    /**
     * Добавление снаряда
     * @param {Projectile} projectile - снаряд
     * @returns {Projectile} - добавленный снаряд
     */
    addProjectile(projectile) {
        projectile.init(this.container, this.lightingSystem);
        this.projectiles.set(projectile.id, projectile);
        return projectile;
    }
    
    /**
     * Удаление снаряда
     * @param {string} id - ID снаряда
     */
    removeProjectile(id) {
        const projectile = this.projectiles.get(id);
        if (projectile) {
            projectile.destroy(this.container, this.lightingSystem);
            this.projectiles.delete(id);
        }
    }
    
    /**
     * Получение снаряда по ID
     * @param {string} id - ID снаряда
     * @returns {Projectile|null} - снаряд или null
     */
    getProjectile(id) {
        return this.projectiles.get(id) || null;
    }
    
    /**
     * Обновление всех снарядов
     * @param {number} deltaTime - время с последнего обновления в мс
     * @param {Array} enemies - массив врагов для проверки столкновений
     * @returns {Array} - массив снарядов, достигших цели
     */
    update(deltaTime, enemies = []) {
        const reachedProjectiles = [];
        const toRemove = [];
        
        for (const [id, projectile] of this.projectiles) {
            const active = projectile.update(deltaTime);
            
            // Проверяем столкновения с врагами
            if (enemies.length > 0 && projectile.active) {
                for (const enemy of enemies) {
                    if (projectile.checkCollision(enemy)) {
                        projectile.reachedTarget = true;
                        projectile.onReachTarget();
                        
                        // Наносим урон
                        if (enemy.takeDamage) {
                            enemy.takeDamage(projectile.damage);
                        }
                        
                        reachedProjectiles.push({
                            projectile,
                            target: enemy
                        });
                        break;
                    }
                }
            }
            
            if (!active || projectile.reachedTarget) {
                toRemove.push(id);
                if (projectile.reachedTarget) {
                    reachedProjectiles.push({ projectile, target: null });
                }
            }
        }
        
        // Удаляем неактивные снаряды
        for (const id of toRemove) {
            this.removeProjectile(id);
        }
        
        return reachedProjectiles;
    }
    
    /**
     * Получение контейнера для рендеринга
     * @returns {PIXI.Container} - контейнер со снарядами
     */
    getContainer() {
        return this.container;
    }
    
    /**
     * Очистка всех снарядов
     */
    clear() {
        for (const projectile of this.projectiles.values()) {
            projectile.destroy(this.container, this.lightingSystem);
        }
        this.projectiles.clear();
    }
    
    /**
     * Получение количества снарядов
     * @returns {number} - количество снарядов
     */
    getCount() {
        return this.projectiles.size;
    }
    
    /**
     * Рендеринг снарядов
     * @param {PIXIRenderer} renderer - рендерер
     */
    render(renderer) {
        if (!renderer || !this.container) return;
        
        // Добавляем контейнер снарядов в mainContainer рендерера
        if (renderer.mainContainer && !renderer.mainContainer.children.includes(this.container)) {
            renderer.mainContainer.addChild(this.container);
        }
    }
}
