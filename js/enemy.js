class Enemy {
    constructor(x, y, type = 'basic') {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 30;
        
        // Уникальные характеристики в зависимости от типа
        this.stats = this.generateStatsByType(type);
        
        this.health = this.stats.maxHealth;
        this.maxHealth = this.stats.maxHealth;
        this.speed = this.stats.speed;
        this.damage = this.stats.damage;
        this.detectionRange = this.stats.detectionRange;
        this.attackRange = this.stats.attackRange;
        this.attackCooldown = 0;
        this.maxAttackCooldown = 60; // 60 тиков между атаками
        
        // Хитбокс
        this.hitboxRadius = 15; // Радиус хитбокса врага
        
        // Состояние врага
        this.state = 'idle'; // idle, chasing, attacking
        this.target = null; // цель для преследования
    }
    
    /**
     * Генерация характеристик в зависимости от типа врага
     * @param {string} type - тип врага
     * @returns {Object} - объект с характеристиками
     */
    generateStatsByType(type) {
        const baseStats = {
            maxHealth: 50,
            speed: 1,
            damage: 10,
            detectionRange: 100,
            attackRange: 30
        };
        
        switch(type) {
            case 'weak':
                return {
                    maxHealth: 30,
                    speed: 1.2,
                    damage: 8,
                    detectionRange: 80,
                    attackRange: 25
                };
                
            case 'strong':
                return {
                    maxHealth: 80,
                    speed: 0.8,
                    damage: 15,
                    detectionRange: 120,
                    attackRange: 35
                };
                
            case 'fast':
                return {
                    maxHealth: 40,
                    speed: 1.8,
                    damage: 12,
                    detectionRange: 150,
                    attackRange: 30
                };
                
            case 'tank':
                return {
                    maxHealth: 120,
                    speed: 0.5,
                    damage: 20,
                    detectionRange: 70,
                    attackRange: 40
                };
                
            default: // basic
                return baseStats;
        }
    }
    
    /**
     * Обновление состояния врага
     * @param {Character} player - игрок
     * @param {Array<Array<number>>} map - карта
     */
    update(player, map) {
        // Уменьшаем кулдаун атаки
        if (this.attackCooldown > 0) {
            this.attackCooldown--;
        }
        
        // Проверяем расстояние до игрока
        const distanceToPlayer = Math.sqrt(
            Math.pow(this.x - player.x, 2) + 
            Math.pow(this.y - player.y, 2)
        );
        
        if (distanceToPlayer <= this.detectionRange) {
            // Игрок в зоне обнаружения
            this.state = 'chasing';
            this.target = player;
            
            // Двигаемся к игроку
            this.moveToTarget(player, map);
            
            // Если в пределах атаки и кулдаун прошел
            if (distanceToPlayer <= this.attackRange && this.attackCooldown === 0) {
                this.state = 'attacking';
                this.attack(player);
            }
        } else {
            // Игрок вне зоны обнаружения
            this.state = 'idle';
            this.target = null;
        }
    }
    
    /**
     * Движение к цели
     * @param {Character} target - цель для движения
     * @param {Array<Array<number>>} map - карта для проверки столкновений
     */
    moveToTarget(target, map) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0) {
            const moveX = (dx / distance) * this.speed;
            const moveY = (dy / distance) * this.speed;
            
            // Проверяем столкновения с препятствиями (упрощенная проверка)
            const newX = this.x + moveX;
            const newY = this.y + moveY;
            
            // Преобразуем координаты в координаты тайлов
            let tilePos;
            if (typeof getTileIndex !== 'undefined') {
                tilePos = getTileIndex(newX, newY);
            } else {
                // Резервный вариант, если функция недоступна
                tilePos = { tileX: Math.floor(newX / 64), tileY: Math.floor(newY / 32) };
            }
            
            // Проверяем, является ли тайл проходимым
            if (map && this.isPassable(tilePos.tileX, tilePos.tileY, map)) {
                // Проверяем коллизию с целью перед движением
                const tempPos = {
                    x: newX,
                    y: newY,
                    hitboxRadius: this.hitboxRadius,
                    checkCollisionWith: function(other) {
                        const dx = this.x - other.x;
                        const dy = this.y - other.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        
                        // Коллизия происходит, если расстояние меньше суммы радиусов
                        return distance < (this.hitboxRadius + other.hitboxRadius);
                    }
                };
                if (!tempPos.checkCollisionWith(target)) {
                    this.x = newX;
                    this.y = newY;
                }
            }
        }
    }
    
    /**
     * Проверка, можно ли пройти через тайл
     * @param {number} tileX - координата X тайла
     * @param {number} tileY - координата Y тайла
     * @param {Array<Array<number>>} map - карта
     * @returns {boolean} - проходимый ли тайл
     */
    isPassable(tileX, tileY, map) {
        // Проверяем, находится ли тайл внутри границ карты
        if (tileX < 0 || tileX >= map[0].length || tileY < 0 || tileY >= map.length) {
            return false;
        }
        
        // Проверяем тип тайла - проходимые: 0 (пол), 6 (лед), 7 (декорация)
        // Непроходимые: 1 (стена), 2 (колонна), 3 (дерево), 4 (скала), 5 (вода)
        const tileType = map[tileY][tileX];
        return tileType === 0 || tileType === 6 || tileType === 7;
    }
    
    /**
     * Атака цели
     * @param {Character} target - цель для атаки
     */
    attack(target) {
        if (this.attackCooldown === 0) {
            // Рассчитываем шанс попадания
            const accuracy = this.getTotalStat('accuracy');
            const targetDodge = target.getTotalStat ? target.getTotalStat('dodge') : 0;
            const hitChance = (accuracy - targetDodge) / 100;
            
            if (Math.random() <= hitChance) {
                // Рассчитываем урон с учетом брони цели
                const targetArmor = target.getTotalStat ? target.getTotalStat('armor') : 0;
                let damage = Math.floor(this.damage * (0.8 + Math.random() * 0.4)); // Разброс урона 80-120%
                
                // Применяем броню (уменьшаем урон)
                damage = Math.max(1, damage - targetArmor); // Минимум 1 урон
                
                // Проверяем на критический удар
                const criticalChance = this.getTotalStat('critical') / 100;
                if (Math.random() <= criticalChance) {
                    damage = Math.floor(damage * 1.5); // Критический урон 150%
                    console.log('Враг нанес КРИТИЧЕСКИЙ УДАР!');
                }
                
                const actualDamage = target.takeDamage(damage);
                console.log(`Враг атаковал игрока, нанесено урона: ${actualDamage}`);
                
                // Сбрасываем кулдаун атаки
                this.attackCooldown = this.maxAttackCooldown;
                
                return actualDamage;
            } else {
                // Промах
                console.log('Враг промахнулся!');
                return 0;
            }
        }
        
        return 0;
    }
    
    /**
     * Получение урона
     * @param {number} damage - количество урона
     * @returns {number} - фактический полученный урон
     */
    takeDamage(damage) {
        // Учитываем броню врага при получении урона
        const totalArmor = this.getTotalStat('armor');
        const actualDamage = Math.max(1, damage - totalArmor); // Минимум 1 урон
        this.health -= actualDamage;
        
        if (this.health <= 0) {
            this.health = 0;
            return actualDamage;
        }
        
        return actualDamage;
    }
    
    /**
     * Получение общего значения характеристики с учётом типа врага
     * @param {string} statName - название характеристики
     * @returns {number} - общее значение характеристики
     */
    getTotalStat(statName) {
        switch(statName) {
            case 'health':
                return this.maxHealth;
            case 'damage':
                return this.damage;
            case 'armor':
                return this.stats.armor || 0;
            case 'accuracy':
                return this.stats.accuracy || 80; // Базовая точность
            case 'dodge':
                return this.stats.dodge || 5; // Базовое уклонение
            case 'critical':
                return this.stats.critical || 5; // Базовый крит. шанс
            default:
                return this[statName] || 0;
        }
    }
    
    /**
     * Проверка, жив ли враг
     * @returns {boolean} - жив ли враг
     */
    isAlive() {
        return this.health > 0;
    }
    
    /**
     * Проверка коллизии с другим объектом
     * @param {Object} other - другой объект с x, y и hitboxRadius
     * @returns {boolean} - произошла ли коллизия
     */
    checkCollisionWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Коллизия происходит, если расстояние меньше суммы радиусов
        return distance < (this.hitboxRadius + other.hitboxRadius);
    }
    
}