class InventoryWindow {
    constructor(character) {
        this.character = character;
        this.isOpen = false;
        
        this.createInventoryWindow();
    }
    
    /**
     * Создание окна инвентаря
     */
    createInventoryWindow() {
        // Создаем контейнер для окна инвентаря
        this.container = document.createElement('div');
        this.container.id = 'inventoryWindow';
        this.container.style.position = 'absolute';
        this.container.style.top = GAME_CONFIG.UI.INVENTORY_WINDOW.POSITION_TOP;
        this.container.style.left = GAME_CONFIG.UI.INVENTORY_WINDOW.POSITION_LEFT;
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.container.style.border = GAME_CONFIG.UI.INVENTORY_WINDOW.BORDER_WIDTH + 'px solid #4a4a4a';
        this.container.style.borderRadius = '10px';
        this.container.style.padding = GAME_CONFIG.UI.INVENTORY_WINDOW.PADDING + 'px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none'; // Скрыто по умолчанию
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.minWidth = GAME_CONFIG.UI.INVENTORY_WINDOW.WIDTH + 'px';
        this.container.style.minHeight = GAME_CONFIG.UI.INVENTORY_WINDOW.HEIGHT + 'px';
        
        // Заголовок
        const title = document.createElement('h2');
        title.textContent = 'Инвентарь';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        this.container.appendChild(title);
        
        // Кнопка закрытия
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Закрыть';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = '#555';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => this.close();
        this.container.appendChild(closeButton);
        
        // Контейнер для слотов инвентаря
        this.slotsContainer = document.createElement('div');
        this.slotsContainer.style.display = 'grid';
        this.slotsContainer.style.gridTemplateColumns = 'repeat(' + GAME_CONFIG.UI.INVENTORY_WINDOW.GRID_COLUMNS + ', 1fr)'; // 5 колонок
        this.slotsContainer.style.gap = GAME_CONFIG.UI.INVENTORY_WINDOW.SLOT_GAP + 'px';
        this.container.appendChild(this.slotsContainer);
        
        // Добавляем в документ
        document.body.appendChild(this.container);
    }
    
    /**
     * Открытие окна инвентаря
     */
    open() {
        this.isOpen = true;
        this.container.style.display = 'block';
        this.updateDisplay();
    }
    
    /**
     * Закрытие окна инвентаря
     */
    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
    }
    
    /**
     * Переключение видимости окна инвентаря
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Обновление отображения инвентаря
     */
    updateDisplay() {
        // Очищаем контейнер со слотами
        this.slotsContainer.innerHTML = '';
        
        // Создаем слоты для каждого предмета в инвентаре
        for (let i = 0; i < this.character.inventory.length; i++) {
            const item = this.character.inventory[i];
            const slot = this.createItemSlot(item, i);
            this.slotsContainer.appendChild(slot);
        }
    }
    
    /**
     * Создание слота для предмета
     * @param {Object} item - предмет
     * @param {number} index - индекс слота
     * @returns {HTMLElement} - элемент слота
     */
    createItemSlot(item, index) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        slot.style.width = GAME_CONFIG.UI.INVENTORY_WINDOW.SLOT_SIZE + 'px';
        slot.style.height = GAME_CONFIG.UI.INVENTORY_WINDOW.SLOT_SIZE + 'px';
        slot.style.border = '2px solid #444';
        slot.style.borderRadius = '5px';
        slot.style.backgroundColor = '#222';
        slot.style.display = 'flex';
        slot.style.flexDirection = 'column';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        
        if (item) {
            // Устанавливаем цвет рамки в зависимости от редкости
            if (item.getColorByRarity) {
                slot.style.borderColor = item.getColorByRarity();
                slot.style.borderWidth = '2px';
            }
            
            // Создаем иконку предмета
            const icon = this.createItemIcon(item);
            slot.appendChild(icon);
            
            // Устанавливаем всплывающую подсказку
            slot.title = item.getDescription ? item.getDescription() : (item.name || 'Предмет');
            
            // Обработчик клика для использования/экипировки предмета
            slot.onclick = () => {
                if (item.type && ['weapon', 'helmet', 'armor', 'ring', 'amulet'].includes(item.type)) {
                    this.character.equipItem(item);
                    this.character.removeFromInventory(index);
                    this.updateDisplay(); // Обновляем отображение после экипировки
                }
            };
        } else {
            slot.title = 'Пустой слот';
        }
        
        return slot;
    }
    
    /**
     * Создание иконки предмета
     * @param {Object} item - предмет
     * @returns {HTMLElement} - элемент иконки
     */
    createItemIcon(item) {
        const icon = document.createElement('div');
        icon.style.width = '32px';
        icon.style.height = '32px';
        icon.style.display = 'flex';
        icon.style.alignItems = 'center';
        icon.style.justifyContent = 'center';
        icon.style.fontSize = '20px';
        
        // Устанавливаем внешний вид иконки в зависимости от типа предмета
        switch(item.type) {
            case 'weapon':
                icon.textContent = '⚔️'; // Меч
                break;
            case 'helmet':
                icon.textContent = '🛡️'; // Шлем
                break;
            case 'armor':
                icon.textContent = '👕'; // Доспехи
                break;
            case 'ring':
                icon.textContent = '💍'; // Кольцо
                break;
            case 'amulet':
                icon.textContent = '📿'; // Амулет
                break;
            default:
                icon.textContent = '📦'; // Общий значок
        }
        
        return icon;
    }
    
    /**
     * Обновление при изменении инвентаря
     */
    onInventoryUpdate() {
        if (this.isOpen) {
            this.updateDisplay();
        }
    }
}

class StatsWindow {
    constructor(character) {
        this.character = character;
        this.isOpen = false;
        
        this.createStatsWindow();
    }
    
    /**
     * Создание окна характеристик
     */
    createStatsWindow() {
        // Создаем контейнер для окна характеристик
        this.container = document.createElement('div');
        this.container.id = 'statsWindow';
        this.container.style.position = 'absolute';
        this.container.style.top = GAME_CONFIG.UI.STATS_WINDOW.POSITION_TOP;
        this.container.style.left = GAME_CONFIG.UI.STATS_WINDOW.POSITION_LEFT;
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.container.style.border = GAME_CONFIG.UI.STATS_WINDOW.BORDER_WIDTH + 'px solid #4a4a4a';
        this.container.style.borderRadius = '10px';
        this.container.style.padding = GAME_CONFIG.UI.STATS_WINDOW.PADDING + 'px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none'; // Скрыто по умолчанию
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.minWidth = GAME_CONFIG.UI.STATS_WINDOW.WIDTH + 'px';
        
        // Заголовок
        const title = document.createElement('h2');
        title.textContent = 'Характеристики';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        this.container.appendChild(title);
        
        // Кнопка закрытия
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Закрыть';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = '#555';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => this.close();
        this.container.appendChild(closeButton);
        
        // Контейнер для характеристик
        this.statsContainer = document.createElement('div');
        this.container.appendChild(this.statsContainer);
        
        // Добавляем в документ
        document.body.appendChild(this.container);
    }
    
    /**
     * Открытие окна характеристик
     */
    open() {
        this.isOpen = true;
        this.container.style.display = 'block';
        this.updateDisplay();
    }
    
    /**
     * Закрытие окна характеристик
     */
    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
    }
    
    /**
     * Переключение видимости окна характеристик
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Обновление отображения характеристик
     */
    updateDisplay() {
        // Очищаем контейнер с характеристиками
        this.statsContainer.innerHTML = '';
        
        // Основные характеристики
        const statsDiv = document.createElement('div');
        statsDiv.innerHTML = `
            <h3>Основные характеристики:</h3>
            <p>Уровень: ${this.character.level}</p>
            <p>Здоровье: ${this.character.health}/${this.character.maxHealth}</p>
            <p>Мана: ${Math.floor(this.character.mana)}/${this.character.maxMana}</p>
            <p>Опыт: ${this.character.experience}/${this.character.experienceForNextLevel}</p>
            <p>Очков навыков: ${this.character.skillPoints}</p>
            <br>
            <h3>Статы:</h3>
            <p>Сила: ${this.character.strength} (Урон +${this.character.getTotalStat('damage')})</p>
            <p>Ловкость: ${this.character.dexterity} (Точность +${this.character.getTotalStat('accuracy')}%, Уклонение +${this.character.getTotalStat('dodge')}%)</p>
            <p>Живучесть: ${this.character.vitality} (Здоровье +${this.character.getTotalStat('health')}, Броня +${this.character.getTotalStat('armor')})</p>
            <p>Энергия: ${this.character.energy} (Мана +${this.character.getTotalStat('mana')}, Восст. маны +${this.character.getManaRegenRate().toFixed(1)}/сек)</p>
        `;
        
        this.statsContainer.appendChild(statsDiv);
    }
    
    /**
     * Обновление при изменении характеристик
     */
    onStatsUpdate() {
        if (this.isOpen) {
            this.updateDisplay();
        }
    }
}