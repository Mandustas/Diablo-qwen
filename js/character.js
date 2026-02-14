class Character {
    constructor(x, y) {
        this.x = x;           // 2D координата X
        this.y = y;           // 2D координата Y
        this.isoX = 0;        // Изометрическая координата X
        this.isoY = 0;        // Изометрическая координата Y
        this.width = 32;      // Ширина персонажа
        this.height = 32;     // Высота персонажа
        
        // Характеристики персонажа
        this.health = 100;
        this.maxHealth = 100;
        this.mana = 50;       // Мана для использования навыков
        this.maxMana = 50;    // Максимальная mana
        this.level = 1;
        this.experience = 0;
        this.experienceForNextLevel = 100;
        
        // Статы
        this.strength = 10;   // Сила влияет на физический урон
        this.dexterity = 10;  // Ловкость влияет на шанс попадания и уклонения
        this.vitality = 10;   // Живучесть влияет на здоровье
        this.energy = 10;     // Энергия влияет на магию и восстановление маны
        
        // Слоты экипировки
        this.equipment = {
            weapon: null,
            helmet: null,
            armor: null,
            ring: null,
            amulet: null
        };
        
        // Инвентарь
        this.inventory = Array(20).fill(null); // 20 слотов инвентаря
        
        // Навыки
        this.skillPoints = 0; // Очков навыков для распределения
        this.skills = {
            // Боевые навыки
            'melee_mastery': { level: 0, maxLevel: 5, cost: 1, name: 'Боевое мастерство', description: 'Увеличивает физический урон на 10% за уровень' },
            'critical_strike': { level: 0, maxLevel: 5, cost: 1, name: 'Критический удар', description: 'Увеличивает шанс критического удара на 5% за уровень' },
            'life_leech': { level: 0, maxLevel: 5, cost: 1, name: 'Похищение жизни', description: 'Восстанавливает 2% нанесенного урона как здоровье за уровень' },
            
            // Защитные навыки
            'iron_skin': { level: 0, maxLevel: 5, cost: 1, name: 'Железная кожа', description: 'Увеличивает броню на 10% за уровень' },
            'dodge': { level: 0, maxLevel: 5, cost: 1, name: 'Уклонение', description: 'Увеличивает шанс уклонения на 3% за уровень' },
            
            // Специальные навыки
            'fireball': { level: 0, maxLevel: 5, cost: 2, name: 'Огненный шар', description: 'Атака магическим огнем, наносит 50% урона + 10 за уровень' },
            'heal': { level: 0, maxLevel: 5, cost: 2, name: 'Лечение', description: 'Восстанавливает 20% здоровья + 5% за уровень' }
        };
        
        // Хитбокс
        this.hitboxRadius = 16; // Радиус хитбокса персонажа
        
        // Обновляем изометрические координаты
        this.updateIsoCoords();
    }
    
    /**
     * Обновление изометрических координат на основе 2D координат
     */
    updateIsoCoords() {
        const isoCoords = coordToIso(this.x, this.y);
        this.isoX = isoCoords.isoX;
        this.isoY = isoCoords.isoY;
    }
    
    /**
     * Перемещение персонажа
     * @param {number} deltaX - изменение по оси X
     * @param {number} deltaY - изменение по оси Y
     */
    move(deltaX, deltaY) {
        this.x += deltaX;
        this.y += deltaY;
        this.updateIsoCoords();
    }
    
    /**
     * Установка позиции персонажа
     * @param {number} x - новая X координата
     * @param {number} y - новая Y координата
     */
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.updateIsoCoords();
    }
    
    /**
     * Получение урона
     * @param {number} damage - количество урона
     */
    takeDamage(damage) {
        // Учитываем броню при получении урона
        const totalArmor = this.getTotalStat('armor');
        const actualDamage = Math.max(1, damage - totalArmor); // Минимум 1 урон
        this.health -= actualDamage;
        
        if (this.health <= 0) {
            this.health = 0;
            // Персонаж умер
            this.onDeath();
        }
        
        return actualDamage;
    }
    
    /**
     * Восстановление здоровья
     * @param {number} amount - количество восстанавливаемого здоровья
     */
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    /**
     * Нанесение урона цели
     * @param {Character|Enemy} target - цель для атаки
     * @returns {number} - нанесённый урон
     */
    attack(target) {
        // Базовый урон зависит от силы и оружия
        const baseDamage = this.getTotalStat('damage');
        
        // Рассчитываем шанс попадания
        const accuracy = this.getTotalStat('accuracy');
        const targetDodge = target.getTotalStat ? target.getTotalStat('dodge') : 0; // Учитываем уклонение цели
        const hitChance = (accuracy - targetDodge) / 100;
        
        // Проверяем, попали ли
        if (Math.random() <= hitChance) {
            // Рассчитываем урон с учетом брони цели
            const targetArmor = target.getTotalStat ? target.getTotalStat('armor') : 0;
            let damage = Math.floor(baseDamage * (0.8 + Math.random() * 0.4)); // Разброс урона 80-120%
            
            // Применяем броню (уменьшаем урон)
            damage = Math.max(1, damage - targetArmor); // Минимум 1 урон
            
            // Проверяем на критический удар
            const criticalChance = this.getTotalStat('critical') / 100;
            if (Math.random() <= criticalChance) {
                damage = Math.floor(damage * 1.5); // Критический урон 150%
                console.log('КРИТИЧЕСКИЙ УДАР!');
            }
            
            return target.takeDamage(damage);
        } else {
            // Промах
            console.log('Промах!');
            return 0;
        }
    }
    
    /**
     * Получение общего значения характеристики с учётом экипировки
     * @param {string} statName - название характеристики
     * @returns {number} - общее значение характеристики
     */
    getTotalStat(statName) {
        let baseValue = 0;
        
        switch(statName) {
            case 'health':
                baseValue = this.vitality * 10; // Каждая единица живучести даёт 10 хп
                break;
            case 'mana':
                baseValue = this.energy * 5; // Каждая единица энергии даёт 5 маны
                break;
            case 'damage':
                baseValue = this.strength * 1.5; // Каждая единица силы даёт 1.5 урона
                break;
            case 'armor':
                baseValue = this.vitality * 0.5; // Каждая единица живучести даёт 0.5 брони
                break;
            case 'accuracy':
                baseValue = 80 + this.dexterity * 0.5; // Базовый шанс попадания 80% + ловкость
                break;
            case 'dodge':
                baseValue = this.dexterity * 0.3; // Каждая единица ловкости даёт 0.3% уклонения
                break;
            case 'critical':
                baseValue = this.dexterity * 0.2; // Каждая единица ловкости даёт 0.2% к крит. шансу
                break;
            default:
                baseValue = this[statName] || 0;
        }
        
        // Добавляем бонусы от экипировки
        for (const slot in this.equipment) {
            const item = this.equipment[slot];
            if (item && item.stats && item.stats[statName]) {
                baseValue += item.stats[statName];
            }
        }
        
        // Добавляем бонусы от навыков
        baseValue += this.getSkillsBonusForStat(statName);
        
        return Math.floor(baseValue);
    }
    
    /**
     * Получение опыта
     * @param {number} exp - количество опыта
     */
    gainExperience(exp) {
        this.experience += exp;
        
        // Проверяем, повысился ли уровень
        while (this.experience >= this.experienceForNextLevel) {
            this.levelUp();
        }
        
        // Обновляем UI
        document.getElementById('levelValue').textContent = this.level;
    }
    
    /**
     * Повышение уровня
     */
    levelUp() {
        this.level++;
        this.experience -= this.experienceForNextLevel;
        this.experienceForNextLevel = Math.floor(this.experienceForNextLevel * 1.5); // Увеличиваем требуемый опыт
        
        // Увеличиваем характеристики
        this.maxHealth += 20;
        this.health = this.maxHealth;
        this.strength += 2;
        this.dexterity += 2;
        this.vitality += 2;
        this.energy += 1;
        
        // Обновляем UI
        document.getElementById('healthValue').textContent = this.health;
    }
    
    /**
     * Обработка смерти персонажа
     */
    onDeath() {
        console.log('Персонаж умер!');
        // Здесь можно добавить логику смерти (например, телепорт к ближайшему городу)
    }
    
    /**
     * Попытка надеть предмет
     * @param {Item} item - предмет для экипировки
     * @returns {boolean} - успешно ли надет предмет
     */
    equipItem(item) {
        if (!item || !item.type) return false;
        
        // Проверяем, есть ли такой слот экипировки
        if (this.equipment.hasOwnProperty(item.type)) {
            // Снимаем текущий предмет, если есть
            const previousItem = this.equipment[item.type];
            if (previousItem) {
                this.addToInventory(previousItem);
            }
            
            // Надеваем новый предмет
            this.equipment[item.type] = item;
            
            // Обновляем UI
            this.updateInventoryUI();
            return true;
        }
        
        return false;
    }
    
    /**
     * Снятие предмета
     * @param {string} slot - тип слота (weapon, helmet и т.д.)
     * @returns {Item|null} - снятый предмет
     */
    unequipItem(slot) {
        if (this.equipment[slot]) {
            const item = this.equipment[slot];
            this.equipment[slot] = null;
            return item;
        }
        return null;
    }
    
    /**
     * Добавление предмета в инвентарь
     * @param {Item} item - предмет для добавления
     * @returns {boolean} - успешно ли добавлен предмет
     */
    addToInventory(item) {
        // Ищем свободный слот
        const emptySlotIndex = this.inventory.findIndex(slot => slot === null);
        
        if (emptySlotIndex !== -1) {
            this.inventory[emptySlotIndex] = item;
            this.updateInventoryUI();
            return true;
        }
        
        return false; // Нет места в инвентаре
    }
    
    /**
     * Удаление предмета из инвентаря
     * @param {number} index - индекс слота
     * @returns {Item|null} - удалённый предмет
     */
    removeFromInventory(index) {
        if (index >= 0 && index < this.inventory.length) {
            const item = this.inventory[index];
            this.inventory[index] = null;
            this.updateInventoryUI();
            return item;
        }
        return null;
    }
    
    /**
     * Обновление UI инвентаря
     */
    updateInventoryUI() {
        // В новой системе инвентарь обновляется в отдельном окне
        // Этот метод пока оставим для совместимости
        if (window.game && window.game.inventoryWindow) {
            window.game.inventoryWindow.onInventoryUpdate();
        }
    }
    
    /**
     * Повышение уровня навыка
     * @param {string} skillName - название навыка
     * @returns {boolean} - успешно ли прокачан навык
     */
    upgradeSkill(skillName) {
        const skill = this.skills[skillName];
        
        if (!skill) {
            console.error(`Навык ${skillName} не найден`);
            return false;
        }
        
        if (skill.level >= skill.maxLevel) {
            console.log(`Навык ${skill.name} уже достиг максимального уровня`);
            return false;
        }
        
        if (this.skillPoints < skill.cost) {
            console.log(`Недостаточно очков навыков для прокачки ${skill.name}`);
            return false;
        }
        
        // Повышаем уровень навыка
        skill.level++;
        this.skillPoints -= skill.cost;

        console.log(`Навык ${skill.name} прокачан до уровня ${skill.level}`);
        
        // Обновляем UI, если есть доступ к игре
        if (window.game && window.game.statsWindow) {
            window.game.statsWindow.onStatsUpdate();
        }
        
        // Обновляем отображение в дереве навыков, если оно открыто
        if (window.game && window.game.skillTree) {
            window.game.skillTree.onCharacterUpdate();
        }
        
        return true;
    }
    
    /**
     * Получение информации о навыке
     * @param {string} skillName - название навыка
     * @returns {Object} - информация о навыке
     */
    getSkillInfo(skillName) {
        const skill = this.skills[skillName];
        if (!skill) return null;
        
        return {
            name: skill.name,
            level: skill.level,
            maxLevel: skill.maxLevel,
            cost: skill.cost,
            description: skill.description,
            manaCost: this.getSkillManaCost(skillName)
        };
    }
    
    /**
     * Получение списка всех изученных навыков
     * @returns {Array} - список изученных навыков
     */
    getLearnedSkills() {
        const learnedSkills = [];
        for (const skillName in this.skills) {
            const skill = this.skills[skillName];
            if (skill.level > 0) {
                learnedSkills.push({
                    name: skill.name,
                    level: skill.level,
                    skillName: skillName
                });
            }
        }
        return learnedSkills;
    }
    
    /**
     * Получение бонуса от навыка
     * @param {string} skillName - название навыка
     * @returns {number} - значение бонуса
     */
    getSkillBonus(skillName) {
        const skill = this.skills[skillName];
        
        if (!skill || skill.level === 0) {
            return 0;
        }
        
        // Расчет бонуса в зависимости от типа навыка
        switch(skillName) {
            case 'melee_mastery':
                return this.getTotalStat('damage') * 0.1 * skill.level; // +10% урона за уровень
                
            case 'critical_strike':
                return skill.level * 5; // +5% шанса крита за уровень
                
            case 'life_leech':
                return skill.level * 2; // 2% похищения за уровень
                
            case 'iron_skin':
                return this.getTotalStat('armor') * 0.1 * skill.level; // +10% брони за уровень
                
            case 'dodge':
                return skill.level * 3; // +3% уклонения за уровень
                
            case 'fireball':
                return 10 * skill.level; // +10 урона за уровень
                
            case 'heal':
                return this.maxHealth * 0.05 * skill.level; // +5% хила за уровень
                
            default:
                return skill.level; // По умолчанию просто уровень
        }
    }
    
    /**
     * Получение общего бонуса от всех навыков для определенной характеристики
     * @param {string} statName - название характеристики
     * @returns {number} - общий бонус от навыков
     */
    getSkillsBonusForStat(statName) {
        let totalBonus = 0;
        
        // Для каждой характеристики проверяем, какие навыки дают бонус
        for (const skillName in this.skills) {
            const skill = this.skills[skillName];
            if (skill.level > 0) {
                // Определяем, влияет ли навык на данную характеристику
                switch(statName) {
                    case 'damage':
                        if (skillName === 'melee_mastery') {
                            // Для избежания рекурсии, используем базовое значение
                            const baseDamage = this.strength * 1.5;
                            totalBonus += baseDamage * 0.1 * skill.level;
                        }
                        break;
                    case 'armor':
                        if (skillName === 'iron_skin') {
                            // Для избежания рекурсии, используем базовое значение
                            const baseArmor = this.vitality * 0.5;
                            totalBonus += baseArmor * 0.1 * skill.level;
                        }
                        break;
                    case 'critical':
                        if (skillName === 'critical_strike') {
                            totalBonus += skill.level * 5;
                        }
                        break;
                    case 'dodge':
                        if (skillName === 'dodge') {
                            totalBonus += skill.level * 3;
                        }
                        break;
                    case 'health':
                        if (skillName === 'heal') {
                            totalBonus += this.maxHealth * 0.05 * skill.level;
                        }
                        break;
                }
            }
        }
        
        return totalBonus;
    }
    
    /**
     * Применение навыка
     * @param {string} skillName - название навыка
     * @param {Character|Enemy} [target] - цель (если требуется)
     * @param {Object} [options] - дополнительные опции
     * @returns {number} - результат применения навыка (урон, лечение и т.д.)
     */
    useSkill(skillName, target, options = {}) {
        const skill = this.skills[skillName];
        
        if (!skill || skill.level === 0) {
            console.error(`Навык ${skillName} не изучен`);
            return 0;
        }
        
        // Определяем стоимость маны для навыка
        const manaCost = this.getSkillManaCost(skillName);
        
        // Проверяем, достаточно ли маны
        if (!this.consumeMana(manaCost)) {
            console.log(`Недостаточно маны для использования навыка ${skill.name}`);
            return 0;
        }
        
        switch(skillName) {
            case 'fireball':
                if (!target) return 0;
                
                // Огненный шар: 50% от базового урона + 10 за уровень
                const baseDamage = this.getTotalStat('damage') * 0.5;
                const fireDamage = baseDamage + this.getSkillBonus(skillName);
                const actualDamage = target.takeDamage(fireDamage);
                
                console.log(`Использован Огненный шар, нанесено урона: ${actualDamage}`);
                return actualDamage;
                
            case 'heal':
                // Лечение: 20% от макс. здоровья + 5% за уровень
                const healAmount = (this.maxHealth * 0.2) + this.getSkillBonus(skillName);
                this.heal(healAmount);
                
                console.log(`Использовано Лечение, восстановлено здоровья: ${healAmount}`);
                return healAmount;
                
            default:
                console.log(`Навык ${skillName} не может быть использован напрямую`);
                return 0;
        }
    }
    
    /**
     * Обновление характеристик при изменении навыков
     */
    updateStatsFromSkills() {
        // Этот метод может быть вызван после изменения навыков
        // для пересчета всех зависимых характеристик
    }
    
    /**
     * Получение стоимости маны для навыка
     * @param {string} skillName - название навыка
     * @returns {number} - стоимость маны
     */
    getSkillManaCost(skillName) {
        const skill = this.skills[skillName];
        
        if (!skill) return 0;
        
        // Базовая стоимость в зависимости от типа навыка
        switch(skillName) {
            case 'fireball':
                return 10 + (skill.level * 2); // 10 + 2 за уровень
            case 'heal':
                return 8 + (skill.level * 1.5); // 8 + 1.5 за уровень
            default:
                return 5 + skill.level; // 5 + 1 за уровень
        }
    }
    
    /**
     * Получение очков навыков (при повышении уровня)
     */
    gainSkillPoint() {
        this.skillPoints++;
        console.log(`Получено очко навыков. Всего доступно: ${this.skillPoints}`);
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
    
    /**
     * Восстановление маны
     * @param {number} amount - количество восстанавливаемой маны
     */
    restoreMana(amount) {
        this.mana = Math.min(this.maxMana, this.mana + amount);
    }
    
    /**
     * Потребление маны
     * @param {number} amount - количество потребляемой маны
     * @returns {boolean} - успешно ли потрачена мана
     */
    consumeMana(amount) {
        if (this.mana >= amount) {
            this.mana -= amount;
            return true;
        }
        return false; // Недостаточно маны
    }
    
    /**
     * Получение общего значения восстановления маны в секунду
     * @returns {number} - значение восстановления маны
     */
    getManaRegenRate() {
        // Базовое восстановление + бонус от энергии
        return 1 + this.getTotalStat('energy') * 0.1;
    }
    
    /**
     * Повышение уровня (переопределяем родительский метод)
     */
    levelUp() {
        // Повышаем уровень
        this.level++;
        this.experience -= this.experienceForNextLevel;
        this.experienceForNextLevel = Math.floor(this.experienceForNextLevel * 1.5); // Увеличиваем требуемый опыт

        // Увеличиваем характеристики
        this.maxHealth += 20;
        this.health = this.maxHealth;
        this.maxMana += 10; // Увеличиваем максимальную ману
        this.mana = this.maxMana; // Восстанавливаем ману при повышении уровня
        this.strength += 2;
        this.dexterity += 2;
        this.vitality += 2;
        this.energy += 1;

        // Добавляем очко навыков за каждый 3 уровень
        if (this.level % 3 === 0) {
            this.gainSkillPoint();
        }

        // Обновляем UI
        document.getElementById('levelValue').textContent = this.level;
    }

    /**
     * Восстановление маны с течением времени
     */
    regenerateMana() {
        // Восстанавливаем ману по чуть-чуть каждый тик
        if (this.mana < this.maxMana) {
            const regenAmount = this.getManaRegenRate() / 60; // Предполагаем 60 FPS
            this.restoreMana(regenAmount);
        }
    }
}