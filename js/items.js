class Item {
    constructor(type, name, stats = {}) {
        this.type = type; // weapon, helmet, armor, ring, amulet
        this.name = name;
        this.stats = stats; // Объект с бонусами {strength: 2, damage: 10, ...}
        this.rarity = this.generateRarity(); // обычный, редкий, эпический и т.д.
        this.value = this.calculateValue(); // стоимость предмета
    }
    
    /**
     * Генерация редкости предмета
     * @returns {string} - редкость (common, rare, epic, legendary)
     */
    generateRarity() {
        const roll = Math.random();
        
        if (roll < 0.5) return 'common';      // 50% шанс на обычный
        else if (roll < 0.8) return 'uncommon'; // 30% шанс на необычный
        else if (roll < 0.95) return 'rare';   // 15% шанс на редкий
        else return 'epic';                   // 5% шанс на эпический
    }
    
    /**
     * Расчет стоимости предмета на основе редкости и статов
     * @returns {number} - стоимость
     */
    calculateValue() {
        let baseValue = 10;
        
        // Увеличиваем стоимость в зависимости от редкости
        switch(this.rarity) {
            case 'uncommon': baseValue *= 2; break;
            case 'rare': baseValue *= 5; break;
            case 'epic': baseValue *= 10; break;
        }
        
        // Увеличиваем стоимость в зависимости от суммы статов
        let statsSum = 0;
        for (const stat in this.stats) {
            statsSum += this.stats[stat];
        }
        
        return Math.floor(baseValue + statsSum * 5);
    }
    
    /**
     * Получение цвета для отображения в зависимости от редкости
     * @returns {string} - цвет в формате CSS
     */
    getColorByRarity() {
        switch(this.rarity) {
            case 'common': return '#ffffff';    // Белый
            case 'uncommon': return '#00ff00';  // Зеленый
            case 'rare': return '#0080ff';     // Синий
            case 'epic': return '#d4af37';     // Золотой
            default: return '#ffffff';
        }
    }
    
    /**
     * Получение описания предмета
     * @returns {string} - описание
     */
    getDescription() {
        let description = `<b>${this.name}</b><br>`;
        description += `<span style="color:${this.getColorByRarity()}">${this.rarity.toUpperCase()}</span><br><br>`;
        
        for (const stat in this.stats) {
            const statName = this.getStatDisplayName(stat);
            description += `+${this.stats[stat]} ${statName}<br>`;
        }
        
        description += `<br>Стоимость: ${this.value} золота`;
        
        return description;
    }
    
    /**
     * Получение отображаемого названия стата
     * @param {string} stat - внутреннее имя стата
     * @returns {string} - отображаемое имя
     */
    getStatDisplayName(stat) {
        const statNames = {
            'damage': 'Урон',
            'armor': 'Броня',
            'strength': 'Сила',
            'dexterity': 'Ловкость',
            'vitality': 'Живучесть',
            'energy': 'Энергия',
            'health': 'Здоровье',
            'accuracy': 'Меткость',
            'dodge': 'Уклонение'
        };
        
        return statNames[stat] || stat;
    }
}

// Функция для генерации случайного предмета
function generateRandomItem(level = 1) {
    // Типы предметов
    const itemTypes = ['weapon', 'helmet', 'armor', 'ring', 'amulet'];
    const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    
    // Базовые названия для разных типов
    const itemNames = {
        'weapon': ['Меч', 'Топор', 'Кинжал', 'Посох', 'Лук'],
        'helmet': ['Шлем', 'Капюшон', 'Корона', 'Маска', 'Обруч'],
        'armor': ['Доспехи', 'Халат', 'Кожанка', 'Кольчуга', 'Нагрудник'],
        'ring': ['Кольцо', 'Перстень', 'Обруч'],
        'amulet': ['Амулет', 'Кулон', 'Пendant']
    };
    
    // Выбираем случайное имя для типа предмета
    const itemName = itemNames[itemType][Math.floor(Math.random() * itemNames[itemType].length)];
    
    // Генерируем случайные статы в зависимости от типа и уровня
    const stats = {};
    
    // Определяем возможные статы для каждого типа
    let possibleStats = [];
    switch(itemType) {
        case 'weapon':
            possibleStats = ['damage', 'strength', 'dexterity'];
            break;
        case 'helmet':
            possibleStats = ['armor', 'vitality', 'energy'];
            break;
        case 'armor':
            possibleStats = ['armor', 'vitality', 'dodge'];
            break;
        case 'ring':
            possibleStats = ['strength', 'dexterity', 'vitality', 'energy'];
            break;
        case 'amulet':
            possibleStats = ['energy', 'strength', 'dexterity', 'health'];
            break;
    }
    
    // Добавляем 1-3 случайных стата
    const statsCount = Math.floor(Math.random() * 3) + 1;
    const selectedStats = [];
    
    for (let i = 0; i < statsCount; i++) {
        const randomStat = possibleStats[Math.floor(Math.random() * possibleStats.length)];
        if (!selectedStats.includes(randomStat)) {
            selectedStats.push(randomStat);
            
            // Значение стата зависит от уровня
            const statValue = Math.floor(Math.random() * level) + 1;
            stats[randomStat] = statValue;
        }
    }
    
    // Создаем и возвращаем предмет
    return new Item(itemType, itemName, stats);
}