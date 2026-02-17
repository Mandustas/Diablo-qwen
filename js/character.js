class Character {
    constructor(x, y) {
        this.x = x;           // 2D координата X
        this.y = y;           // 2D координата Y
        this.isoX = 0;        // Изометрическая координата X
        this.isoY = 0;        // Изометрическая координата Y
        this.width = 32;      // Ширина персонажа
        this.height = 32;     // Высота персонажа

        // Характеристики персонажа
        this.health = GAME_CONFIG.CHARACTER.INITIAL_HEALTH;
        this.maxHealth = GAME_CONFIG.CHARACTER.INITIAL_HEALTH;
        this.mana = GAME_CONFIG.CHARACTER.INITIAL_MANA;       // Мана для использования навыков
        this.maxMana = GAME_CONFIG.CHARACTER.INITIAL_MANA;    // Максимальная mana
        this.level = GAME_CONFIG.CHARACTER.INITIAL_LEVEL;
        this.experience = GAME_CONFIG.CHARACTER.INITIAL_EXPERIENCE;
        this.experienceForNextLevel = GAME_CONFIG.CHARACTER.EXPERIENCE_PER_LEVEL;

        // Статы
        this.strength = GAME_CONFIG.CHARACTER.INITIAL_STRENGTH;   // Сила влияет на физический урон
        this.dexterity = GAME_CONFIG.CHARACTER.INITIAL_DEXTERITY;  // Ловкость влияет на шанс попадания и уклонения
        this.vitality = GAME_CONFIG.CHARACTER.INITIAL_VITALITY;   // Живучесть влияет на здоровье
        this.energy = GAME_CONFIG.CHARACTER.INITIAL_ENERGY;     // Энергия влияет на магию и восстановление маны
        
        // Слоты экипировки
        this.equipment = {
            weapon: null,
            helmet: null,
            armor: null,
            ring: null,
            amulet: null
        };
        
        // Инвентарь
        this.inventory = Array(GAME_CONFIG.CHARACTER.INVENTORY_SIZE).fill(null); // Слоты инвентаря из конфига
        
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
        this.hitboxRadius = GAME_CONFIG.CHARACTER.HITBOX_RADIUS; // Радиус хитбокса персонажа
        
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
     * @param {boolean} isCritical - является ли урон критическим
     */
    takeDamage(damage, isCritical = false) {
        // Учитываем броню при получении урона
        const totalArmor = this.getTotalStat('armor');
        const actualDamage = Math.max(1, damage - totalArmor); // Минимум 1 урон
        this.health -= actualDamage;

        // Вызываем эффект получения урона
        if (typeof game !== 'undefined' && game.combatEffects) {
            game.combatEffects.triggerDamage(this.x, this.y, actualDamage, isCritical);
        } else {
            console.warn('Боевая система эффектов не доступна при получении урона персонажем');
        }

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
        // Вызываем эффект атаки
        if (typeof game !== 'undefined' && game.combatEffects) {
            game.combatEffects.triggerAttack(this.x, this.y, 'player');
        } else {
            console.warn('Боевая система эффектов не доступна при атаке персонажем');
        }

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
            let isCritical = false;
            if (Math.random() <= criticalChance) {
                damage = Math.floor(damage * 1.5); // Критический урон 150%
                console.log('КРИТИЧЕСКИЙ УДАР!');
                isCritical = true;
            }

            return target.takeDamage(damage, isCritical);
        } else {
            // Промах - вызываем эффект уворота для цели
            if (typeof game !== 'undefined' && game.combatEffects) {
                game.combatEffects.triggerDodge(target.x, target.y);
            }
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
                baseValue = this.vitality * GAME_CONFIG.CHARACTER.VITALITY_HP_MULTIPLIER; // Каждая единица живучести даёт 10 хп
                break;
            case 'mana':
                baseValue = this.energy * GAME_CONFIG.CHARACTER.ENERGY_MANA_MULTIPLIER; // Каждая единица энергии даёт 5 маны
                break;
            case 'damage':
                baseValue = this.strength * GAME_CONFIG.CHARACTER.STRENGTH_DAMAGE_MULTIPLIER; // Каждая единица силы даёт 1.5 урона
                break;
            case 'armor':
                baseValue = this.vitality * GAME_CONFIG.CHARACTER.VITALITY_ARMOR_MULTIPLIER; // Каждая единица живучести даёт 0.5 брони
                break;
            case 'accuracy':
                baseValue = GAME_CONFIG.CHARACTER.DEXTERITY_ACCURACY_BASE + this.dexterity * GAME_CONFIG.CHARACTER.DEXTERITY_ACCURACY_MULTIPLIER; // Базовый шанс попадания 80% + ловкость
                break;
            case 'dodge':
                baseValue = this.dexterity * GAME_CONFIG.CHARACTER.DEXTERITY_DODGE_MULTIPLIER; // Каждая единица ловкости даёт 0.3% уклонения
                break;
            case 'critical':
                baseValue = this.dexterity * GAME_CONFIG.CHARACTER.DEXTERITY_CRITICAL_MULTIPLIER; // Каждая единица ловкости даёт 0.2% к крит. шансу
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

        // Обновляем UI, если есть доступ к игре
        if (window.game && window.game.uiStatsWindow && window.game.uiStatsWindow.isOpen) {
            window.game.uiStatsWindow.onStatsUpdate();
        }
        if (window.game && window.game.uiSkillBar) {
            window.game.uiSkillBar.update();
        }
    }
    
    /**
     * Повышение уровня
     */
    levelUp() {
        this.level++;
        this.experience -= this.experienceForNextLevel;
        this.experienceForNextLevel = Math.floor(this.experienceForNextLevel * GAME_CONFIG.CHARACTER.EXPERIENCE_MULTIPLIER); // Увеличиваем требуемый опыт

        // Увеличиваем характеристики
        this.maxHealth += GAME_CONFIG.CHARACTER.LEVEL_UP_HEALTH_INCREASE;
        this.health = this.maxHealth;
        this.maxMana += GAME_CONFIG.CHARACTER.LEVEL_UP_MANA_INCREASE; // Увеличиваем максимальную ману
        this.mana = this.maxMana; // Восстанавливаем ману при повышении уровня
        this.strength += GAME_CONFIG.CHARACTER.LEVEL_UP_STAT_INCREASE;
        this.dexterity += GAME_CONFIG.CHARACTER.LEVEL_UP_STAT_INCREASE;
        this.vitality += GAME_CONFIG.CHARACTER.LEVEL_UP_STAT_INCREASE;
        this.energy += GAME_CONFIG.CHARACTER.LEVEL_UP_ENERGY_INCREASE;

        // Добавляем очко навыков за каждый уровень
        this.gainSkillPoint();

        // Обновляем UI, если есть доступ к игре
        if (window.game && window.game.uiStatsWindow) {
            window.game.uiStatsWindow.onStatsUpdate();
        }
        if (window.game && window.game.uiSkillBar) {
            window.game.uiSkillBar.update();
        }

        // Уведомляем об изменении уровня (эффект будет вызван в game.js)
        this.onLevelChanged && this.onLevelChanged(this.level, this.x, this.y);
    }
    
    /**
     * Получение очков навыков (при повышении уровня)
     */
    gainSkillPoint() {
        this.skillPoints++;
        console.log(`Получено очко навыков. Всего доступно: ${this.skillPoints}`);

        // Обновляем UI дерева навыков
        if (window.game && window.game.uiSkillTree) {
            window.game.uiSkillTree.onCharacterUpdate();
        }
    }
    
    /**
     * Обработка смерти персонажа
     */
    onDeath() {
        console.log('Персонаж умер!');
        
        // Создаем устрашающее сообщение о смерти
        this.showDeathScreen();
    }
    
    /**
     * Показ экрана смерти
     */
    showDeathScreen() {
        // Создаем контейнер экрана смерти
        const deathOverlay = document.createElement('div');
        deathOverlay.id = 'deathOverlay';
        deathOverlay.style.position = 'fixed';
        deathOverlay.style.top = '0';
        deathOverlay.style.left = '0';
        deathOverlay.style.width = '100%';
        deathOverlay.style.height = '100%';
        deathOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0)';
        deathOverlay.style.display = 'flex';
        deathOverlay.style.flexDirection = 'column';
        deathOverlay.style.justifyContent = 'center';
        deathOverlay.style.alignItems = 'center';
        deathOverlay.style.zIndex = '9999';
        deathOverlay.style.pointerEvents = 'none';
        deathOverlay.style.transition = 'background-color 1s ease-in';
        
        // Текст смерти
        const deathText = document.createElement('div');
        deathText.innerHTML = 'ВЫ ПОГИБЛИ';
        deathText.style.fontFamily = "'MedievalSharp', Georgia, serif";
        deathText.style.fontSize = '72px';
        deathText.style.color = '#8b0000';
        deathText.style.textShadow = '0 0 20px #ff0000, 0 0 40px #8b0000, 3px 3px 6px #000';
        deathText.style.letterSpacing = '10px';
        deathText.style.textTransform = 'uppercase';
        deathText.style.opacity = '0';
        deathText.style.transform = 'scale(0.5)';
        deathText.style.transition = 'all 1s ease-out';
        deathText.style.animation = 'none';
        
        // Подтекст
        const deathSubtext = document.createElement('div');
        deathSubtext.innerHTML = 'Тьма поглотила вашу душу...';
        deathSubtext.style.fontFamily = "'MedievalSharp', Georgia, serif";
        deathSubtext.style.fontSize = '24px';
        deathSubtext.style.color = '#666';
        deathSubtext.style.marginTop = '30px';
        deathSubtext.style.opacity = '0';
        deathSubtext.style.transition = 'opacity 1s ease-in 0.5s';
        
        // Кнопка возрождения
        const respawnButton = document.createElement('button');
        respawnButton.innerHTML = 'ВОЗРОДИТЬСЯ';
        respawnButton.style.fontFamily = "'MedievalSharp', Georgia, serif";
        respawnButton.style.fontSize = '20px';
        respawnButton.style.color = '#c9b896';
        respawnButton.style.background = 'linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 100%)';
        respawnButton.style.border = '2px solid #4a3a2a';
        respawnButton.style.padding = '15px 40px';
        respawnButton.style.marginTop = '50px';
        respawnButton.style.cursor = 'pointer';
        respawnButton.style.opacity = '0';
        respawnButton.style.transform = 'translateY(20px)';
        respawnButton.style.transition = 'all 0.5s ease-out 1.5s';
        respawnButton.style.pointerEvents = 'auto';
        
        // Добавляем эффекты при наведении
        respawnButton.addEventListener('mouseenter', () => {
            respawnButton.style.background = 'linear-gradient(to bottom, #3a2a2a 0%, #2a1a1a 100%)';
            respawnButton.style.borderColor = '#6a5a4a';
            respawnButton.style.color = '#fff';
        });
        
        respawnButton.addEventListener('mouseleave', () => {
            respawnButton.style.background = 'linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 100%)';
            respawnButton.style.borderColor = '#4a3a2a';
            respawnButton.style.color = '#c9b896';
        });
        
        // Обработчик возрождения
        respawnButton.addEventListener('click', () => {
            this.respawn();
            document.body.removeChild(deathOverlay);
        });
        
        deathOverlay.appendChild(deathText);
        deathOverlay.appendChild(deathSubtext);
        deathOverlay.appendChild(respawnButton);
        document.body.appendChild(deathOverlay);
        
        // Запускаем анимацию
        setTimeout(() => {
            deathOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
        }, 100);
        
        setTimeout(() => {
            deathText.style.opacity = '1';
            deathText.style.transform = 'scale(1)';
            deathText.style.animation = 'deathPulse 2s ease-in-out infinite';
        }, 500);
        
        setTimeout(() => {
            deathSubtext.style.opacity = '1';
        }, 1000);
        
        setTimeout(() => {
            respawnButton.style.opacity = '1';
            respawnButton.style.transform = 'translateY(0)';
        }, 1500);
        
        // Добавляем CSS анимацию
        if (!document.getElementById('deathAnimation')) {
            const style = document.createElement('style');
            style.id = 'deathAnimation';
            style.innerHTML = `
                @keyframes deathPulse {
                    0%, 100% { 
                        text-shadow: 0 0 20px #ff0000, 0 0 40px #8b0000, 3px 3px 6px #000;
                        transform: scale(1);
                    }
                    50% { 
                        text-shadow: 0 0 40px #ff0000, 0 0 80px #8b0000, 3px 3px 6px #000;
                        transform: scale(1.05);
                    }
                }
                @keyframes screenShake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-5px); }
                    75% { transform: translateX(5px); }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    /**
     * Возрождение персонажа
     */
    respawn() {
        // Восстанавливаем здоровье
        this.health = this.maxHealth;
        this.mana = this.maxMana;
        
        // Телепортируем в безопасное место (центр карты)
        this.x = 0;
        this.y = 0;
        this.updateIsoCoords();
        
        console.log('Персонаж возрожден!');
        
        // Если есть игра, обновляем позицию
        if (window.game) {
            window.game.character.setPosition(0, 0);
        }
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
        if (window.game && window.game.uiInventory) {
            window.game.uiInventory.onInventoryUpdate();
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
        if (window.game && window.game.uiStatsWindow) {
            window.game.uiStatsWindow.onStatsUpdate();
        }

        // Обновляем отображение в дереве навыков, если оно открыто
        if (window.game && window.game.uiSkillTree) {
            window.game.uiSkillTree.onCharacterUpdate();
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
                return this.getTotalStat('damage') * GAME_CONFIG.CHARACTER.MELEE_MASTERY_BONUS * skill.level; // +10% урона за уровень

            case 'critical_strike':
                return skill.level * GAME_CONFIG.CHARACTER.CRITICAL_STRIKE_BONUS; // +5% шанса крита за уровень

            case 'life_leech':
                return skill.level * GAME_CONFIG.CHARACTER.LIFE_LEECH_BONUS; // 2% похищения за уровень

            case 'iron_skin':
                return this.getTotalStat('armor') * GAME_CONFIG.CHARACTER.IRON_SKIN_BONUS * skill.level; // +10% брони за уровень

            case 'dodge':
                return skill.level * GAME_CONFIG.CHARACTER.DODGE_BONUS; // +3% уклонения за уровень

            case 'fireball':
                return GAME_CONFIG.CHARACTER.FIREBALL_DAMAGE_BONUS * skill.level; // +10 урона за уровень

            case 'heal':
                return this.maxHealth * GAME_CONFIG.CHARACTER.HEAL_PERCENT_BONUS * skill.level; // +5% хила за уровень

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
                return GAME_CONFIG.CHARACTER.SKILL_MANA_COST.fireball.base + (skill.level * GAME_CONFIG.CHARACTER.SKILL_MANA_COST.fireball.per_level); // 10 + 2 за уровень
            case 'heal':
                return GAME_CONFIG.CHARACTER.SKILL_MANA_COST.heal.base + (skill.level * GAME_CONFIG.CHARACTER.SKILL_MANA_COST.heal.per_level); // 8 + 1.5 за уровень
            default:
                return GAME_CONFIG.CHARACTER.SKILL_MANA_COST.default.base + skill.level; // 5 + 1 за уровень
        }
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
        return GAME_CONFIG.CHARACTER.BASE_MANA_REGEN + this.getTotalStat('energy') * GAME_CONFIG.CHARACTER.ENERGY_MANA_REGEN_MULTIPLIER;
    }
    
    /**
     * Восстановление маны с течением времени
     */
    regenerateMana() {
        // Восстанавливаем ману по чуть-чуть каждый тик
        if (this.mana < this.maxMana) {
            const regenAmount = this.getManaRegenRate() / GAME_CONFIG.CHARACTER.FPS_FOR_MANA_REGEN; // Предполагаем 60 FPS
            this.restoreMana(regenAmount);
        }
    }
}
