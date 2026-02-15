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
        this.container.style.background = 'linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%)';
        this.container.style.border = GAME_CONFIG.UI.INVENTORY_WINDOW.BORDER_WIDTH + 'px solid #3a2a1a';
        this.container.style.borderRadius = '3px';
        this.container.style.padding = GAME_CONFIG.UI.INVENTORY_WINDOW.PADDING + 'px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none'; // Скрыто по умолчанию
        this.container.style.color = '#c9b896';
        this.container.style.fontFamily = "'MedievalSharp', Georgia, serif";
        this.container.style.minWidth = GAME_CONFIG.UI.INVENTORY_WINDOW.WIDTH + 'px';
        this.container.style.minHeight = GAME_CONFIG.UI.INVENTORY_WINDOW.HEIGHT + 'px';
        this.container.style.boxShadow = '0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(74,58,42,0.3)';
        this.container.style.textShadow = '1px 1px 2px #000';

        // Заголовок
        const title = document.createElement('h2');
        title.textContent = 'ИНВЕНТАРЬ';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.color = '#c9b896';
        title.style.fontFamily = "'MedievalSharp', Georgia, serif";
        title.style.textTransform = 'uppercase';
        title.style.letterSpacing = '2px';
        title.style.textShadow = '2px 2px 4px #000';
        title.style.borderBottom = '1px solid #3a2a1a';
        title.style.paddingBottom = '8px';
        this.container.appendChild(title);

        // Кнопка закрытия
        const closeButton = document.createElement('button');
        closeButton.textContent = 'ЗАКРЫТЬ';
        closeButton.className = 'fantasy-btn';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.textTransform = 'uppercase';
        closeButton.style.letterSpacing = '1px';
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
        slot.style.background = 'linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 100%)';
        slot.style.border = '2px solid #3a2a1a';
        slot.style.borderRadius = '3px';
        slot.style.display = 'flex';
        slot.style.flexDirection = 'column';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        slot.style.boxShadow = 'inset 0 1px 0 rgba(201,184,150,0.1)';

        if (item) {
            // Устанавливаем цвет рамки в зависимости от редкости
            if (item.getColorByRarity) {
                const rarityColor = item.getColorByRarity();
                slot.style.border = '2px solid ' + rarityColor;
                slot.style.boxShadow = '0 0 5px ' + rarityColor + ', inset 0 1px 0 rgba(201,184,150,0.1)';
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
            // Добавляем эффект при наведении на пустой слот
            slot.addEventListener('mouseenter', () => {
                slot.style.border = '2px solid #6a5a4a';
            });
            slot.addEventListener('mouseleave', () => {
                slot.style.border = '2px solid #3a2a1a';
            });
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
        this.container.style.background = 'linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%)';
        this.container.style.border = GAME_CONFIG.UI.STATS_WINDOW.BORDER_WIDTH + 'px solid #3a2a1a';
        this.container.style.borderRadius = '3px';
        this.container.style.padding = GAME_CONFIG.UI.STATS_WINDOW.PADDING + 'px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none'; // Скрыто по умолчанию
        this.container.style.color = '#c9b896';
        this.container.style.fontFamily = "'MedievalSharp', Georgia, serif";
        this.container.style.minWidth = GAME_CONFIG.UI.STATS_WINDOW.WIDTH + 'px';
        this.container.style.boxShadow = '0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(74,58,42,0.3)';
        this.container.style.textShadow = '1px 1px 2px #000';

        // Заголовок
        const title = document.createElement('h2');
        title.textContent = 'ХАРАКТЕРИСТИКИ';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.color = '#c9b896';
        title.style.fontFamily = "'MedievalSharp', Georgia, serif";
        title.style.textTransform = 'uppercase';
        title.style.letterSpacing = '2px';
        title.style.textShadow = '2px 2px 4px #000';
        title.style.borderBottom = '1px solid #3a2a1a';
        title.style.paddingBottom = '8px';
        this.container.appendChild(title);

        // Кнопка закрытия
        const closeButton = document.createElement('button');
        closeButton.textContent = 'ЗАКРЫТЬ';
        closeButton.className = 'fantasy-btn';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.textTransform = 'uppercase';
        closeButton.style.letterSpacing = '1px';
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
        statsDiv.style.fontFamily = "'MedievalSharp', Georgia, serif";
        statsDiv.style.color = '#c9b896';
        statsDiv.style.textShadow = '1px 1px 2px #000';
        
        statsDiv.innerHTML = `
            <div style="margin-bottom: 15px;">
                <h3 style="color: #c9b896; font-size: 16px; margin: 10px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #3a2a1a; padding-bottom: 3px;">Основные характеристики:</h3>
                <p style="margin: 5px 0;">Уровень: <span style="color: #FFD700; font-weight: bold;">${this.character.level}</span></p>
                <p style="margin: 5px 0;">Здоровье: <span style="color: #4CAF50; font-weight: bold;">${this.character.health}</span>/<span style="color: #4CAF50;">${this.character.maxHealth}</span></p>
                <p style="margin: 5px 0;">Мана: <span style="color: #2196F3; font-weight: bold;">${Math.floor(this.character.mana)}</span>/<span style="color: #2196F3;">${this.character.maxMana}</span></p>
                <p style="margin: 5px 0;">Опыт: <span style="color: #FF9800; font-weight: bold;">${this.character.experience}</span>/<span style="color: #FF9800;">${this.character.experienceForNextLevel}</span></p>
                <p style="margin: 5px 0;">Очков навыков: <span style="color: #9C27B0; font-weight: bold;">${this.character.skillPoints}</span></p>
            </div>
            <div>
                <h3 style="color: #c9b896; font-size: 16px; margin: 15px 0 8px 0; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #3a2a1a; padding-bottom: 3px;">Статы:</h3>
                <p style="margin: 5px 0;"><span style="color: #FF9800;">Сила:</span> ${this.character.strength} (Урон +<span style="color: #FF5722; font-weight: bold;">${this.character.getTotalStat('damage')}</span>)</p>
                <p style="margin: 5px 0;"><span style="color: #2196F3;">Ловкость:</span> ${this.character.dexterity} (Точность +<span style="color: #4CAF50; font-weight: bold;">${this.character.getTotalStat('accuracy')}%</span>, Уклонение +<span style="color: #4CAF50; font-weight: bold;">${this.character.getTotalStat('dodge')}%</span>)</p>
                <p style="margin: 5px 0;"><span style="color: #4CAF50;">Живучесть:</span> ${this.character.vitality} (Здоровье +<span style="color: #4CAF50; font-weight: bold;">${this.character.getTotalStat('health')}</span>, Броня +<span style="color: #4CAF50; font-weight: bold;">${this.character.getTotalStat('armor')}</span>)</p>
                <p style="margin: 5px 0;"><span style="color: #2196F3;">Энергия:</span> ${this.character.energy} (Мана +<span style="color: #2196F3; font-weight: bold;">${this.character.getTotalStat('mana')}</span>, Восст. маны +<span style="color: #2196F3; font-weight: bold;">${this.character.getManaRegenRate().toFixed(1)}</span>/сек)</p>
            </div>
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