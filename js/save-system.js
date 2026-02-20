class SaveSystem {
    constructor(game) {
        this.game = game;
        this.saveKey = GAME_CONFIG.SAVE.KEY;
    }
    
    /**
     * Сохранение состояния игры
     */
    saveGame() {
        try {
            const gameState = {
                character: this.serializeCharacter(this.game.character),
                enemies: this.serializeEnemies(this.game.enemies),
                map: this.game.map,
                fogOfWar: this.serializeFogOfWar(),
                timestamp: Date.now()
            };
            
            localStorage.setItem(this.saveKey, JSON.stringify(gameState));
            console.log('Игра сохранена');
        } catch (error) {
            console.error('Ошибка при сохранении игры:', error);
        }
    }
    
    /**
     * Загрузка состояния игры
     */
    loadGame() {
        try {
            const savedData = localStorage.getItem(this.saveKey);
            
            if (!savedData) {
                console.log('Сохраненных данных не найдено');
                return false;
            }
            
            const gameState = JSON.parse(savedData);
            
            // Восстанавливаем состояние персонажа
            this.deserializeCharacter(this.game.character, gameState.character);
            
            // Восстанавливаем врагов
            this.game.enemies = this.deserializeEnemies(gameState.enemies);
            
            // Восстанавливаем карту
            this.game.map = gameState.map;
            
            // Восстанавливаем туман войны
            if (gameState.fogOfWar && this.game.fogOfWar) {
                this.deserializeFogOfWar(gameState.fogOfWar);
            }
            
            // Обновляем UI
            this.game.character.updateInventoryUI();
            if (this.game.uiStatsWindow) {
                this.game.uiStatsWindow.onStatsUpdate();
            }
            if (this.game.uiSkillBar) {
                this.game.uiSkillBar.update();
            }

            console.log('Игра загружена');
            return true;
        } catch (error) {
            console.error('Ошибка при загрузке игры:', error);
            return false;
        }
    }
    
    /**
     * Сериализация персонажа для сохранения
     * @param {Character} character - персонаж для сериализации
     * @returns {Object} - сериализованный объект
     */
    serializeCharacter(character) {
        return {
            x: character.x,
            y: character.y,
            health: character.health,
            maxHealth: character.maxHealth,
            level: character.level,
            experience: character.experience,
            experienceForNextLevel: character.experienceForNextLevel,
            strength: character.strength,
            dexterity: character.dexterity,
            vitality: character.vitality,
            energy: character.energy,
            skillPoints: character.skillPoints,
            skills: character.skills,
            equipment: this.serializeEquipment(character.equipment),
            inventory: this.serializeInventory(character.inventory)
        };
    }
    
    /**
     * Сериализация экипировки
     * @param {Object} equipment - экипировка
     * @returns {Object} - сериализованный объект
     */
    serializeEquipment(equipment) {
        const serialized = {};
        
        for (const slot in equipment) {
            const item = equipment[slot];
            if (item) {
                serialized[slot] = {
                    type: item.type,
                    name: item.name,
                    stats: item.stats,
                    rarity: item.rarity,
                    value: item.value
                };
            } else {
                serialized[slot] = null;
            }
        }
        
        return serialized;
    }
    
    /**
     * Сериализация инвентаря
     * @param {Array} inventory - инвентарь
     * @returns {Array} - сериализованный массив
     */
    serializeInventory(inventory) {
        return inventory.map(item => {
            if (item) {
                return {
                    type: item.type,
                    name: item.name,
                    stats: item.stats,
                    rarity: item.rarity,
                    value: item.value
                };
            }
            return null;
        });
    }
    
    /**
     * Сериализация врагов
     * @param {Array} enemies - массив врагов
     * @returns {Array} - сериализованный массив
     */
    serializeEnemies(enemies) {
        return enemies.map(enemy => ({
            x: enemy.x,
            y: enemy.y,
            type: enemy.type,
            health: enemy.health,
            maxHealth: enemy.maxHealth
        }));
    }
    
    /**
     * Десериализация персонажа из сохранения
     * @param {Character} character - персонаж для обновления
     * @param {Object} data - сериализованные данные
     */
    deserializeCharacter(character, data) {
        character.x = data.x;
        character.y = data.y;
        character.health = data.health;
        character.maxHealth = data.maxHealth;
        character.level = data.level;
        character.experience = data.experience;
        character.experienceForNextLevel = data.experienceForNextLevel;
        character.strength = data.strength;
        character.dexterity = data.dexterity;
        character.vitality = data.vitality;
        character.energy = data.energy;
        character.skillPoints = data.skillPoints;
        character.skills = data.skills;
        
        // Восстанавливаем экипировку
        character.equipment = this.deserializeEquipment(data.equipment);
        
        // Восстанавливаем инвентарь
        character.inventory = this.deserializeInventory(data.inventory);
        
        // Обновляем изометрические координаты
        character.updateIsoCoords();
    }
    
    /**
     * Десериализация экипировки
     * @param {Object} equipmentData - сериализованные данные экипировки
     * @returns {Object} - восстановленная экипировка
     */
    deserializeEquipment(equipmentData) {
        const equipment = {};
        
        for (const slot in equipmentData) {
            const itemData = equipmentData[slot];
            if (itemData) {
                equipment[slot] = new Item(
                    itemData.type,
                    itemData.name,
                    itemData.stats
                );
                equipment[slot].rarity = itemData.rarity;
                equipment[slot].value = itemData.value;
            } else {
                equipment[slot] = null;
            }
        }
        
        return equipment;
    }
    
    /**
     * Десериализация инвентаря
     * @param {Array} inventoryData - сериализованные данные инвентаря
     * @returns {Array} - восстановленный инвентарь
     */
    deserializeInventory(inventoryData) {
        return inventoryData.map(itemData => {
            if (itemData) {
                const item = new Item(
                    itemData.type,
                    itemData.name,
                    itemData.stats
                );
                item.rarity = itemData.rarity;
                item.value = itemData.value;
                return item;
            }
            return null;
        });
    }
    
    /**
     * Десериализация врагов
     * @param {Array} enemiesData - сериализованные данные врагов
     * @returns {Array} - восстановленные враги
     */
    deserializeEnemies(enemiesData) {
        return enemiesData.map(enemyData => {
            const enemy = new Enemy(enemyData.x, enemyData.y, enemyData.type);
            enemy.health = enemyData.health;
            enemy.maxHealth = enemyData.maxHealth;
            return enemy;
        });
    }
    
    /**
     * Сериализация тумана войны
     * @returns {Object} - сериализованные данные
     */
    serializeFogOfWar() {
        if (!this.game.fogOfWar) return null;
        
        const fogOfWar = this.game.fogOfWar;
        const exploredTiles = [];
        
        // Преобразуем Set в массив для сохранения
        for (const key of fogOfWar.explored) {
            exploredTiles.push(key);
        }
        
        return {
            exploredTiles: exploredTiles,
            exploredCount: exploredTiles.length
        };
    }
    
    /**
     * Десериализация тумана войны
     * @param {Object} fogData - сериализованные данные тумана войны
     */
    deserializeFogOfWar(fogData) {
        if (!this.game.fogOfWar || !fogData) return;
        
        const fogOfWar = this.game.fogOfWar;
        
        // Восстанавливаем исследованные тайлы
        fogOfWar.explored = new Set(fogData.exploredTiles || []);
        
        console.log(`Восстановлено ${fogOfWar.explored.size} исследованных тайлов`);
    }
    
    /**
     * Проверка наличия сохраненной игры
     * @returns {boolean} - есть ли сохраненные данные
     */
    hasSave() {
        return !!localStorage.getItem(this.saveKey);
    }
    
    /**
     * Удаление сохраненной игры
     */
    deleteSave() {
        localStorage.removeItem(this.saveKey);
        console.log('Сохраненная игра удалена');
    }
}