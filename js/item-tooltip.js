/**
 * ItemTooltip - всплывающая подсказка для предметов в стиле Diablo
 * Отображает информацию о предмете при наведении курсора
 */

class ItemTooltip extends PIXI.Container {
    constructor(pixiRenderer) {
        super();

        this.pixiRenderer = pixiRenderer;
        this.visible = false;
        this.currentItem = null;

        // Размеры подсказки
        this.minWidth = 200;
        this.maxWidth = 300;
        this.padding = 12;
        this.rowHeight = 18;
        
        // Сохраняем вычисленные размеры (для использования до отрисовки)
        this.tooltipWidth = this.minWidth;
        this.tooltipHeight = 100;

        // Создаём элементы подсказки
        this.createVisuals();
    }
    
    /**
     * Создание визуальных элементов подсказки
     */
    createVisuals() {
        // Фон подсказки
        this.background = new PIXI.Graphics();
        this.addChildAt(this.background, 0);
        
        // Рамка
        this.border = new PIXI.Graphics();
        this.addChildAt(this.border, 1);
        
        // Название предмета
        this.nameStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 14,
            fontWeight: 'bold',
            fill: '#ffd700',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowDistance: 2,
            align: 'center'
        });
        this.nameLabel = new PIXI.Text('', this.nameStyle);
        this.nameLabel.anchor.set(0.5, 0);
        this.addChild(this.nameLabel);
        
        // Тип предмета
        this.typeStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 11,
            fill: '#9d9d9d',
            align: 'center'
        });
        this.typeLabel = new PIXI.Text('', this.typeStyle);
        this.typeLabel.anchor.set(0.5, 0);
        this.addChild(this.typeLabel);
        
        // Разделительная линия
        this.separator = new PIXI.Graphics();
        this.addChild(this.separator);
        
        // Характеристики
        this.statsStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 12,
            fill: '#e8d9b8',
            align: 'left'
        });
        this.statsLabel = new PIXI.Text('', this.statsStyle);
        this.statsLabel.anchor.set(0, 0);
        this.addChild(this.statsLabel);
        
        // Редкость
        this.rarityStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 11,
            fontWeight: 'bold',
            fill: '#ffffff',
            align: 'center'
        });
        this.rarityLabel = new PIXI.Text('', this.rarityStyle);
        this.rarityLabel.anchor.set(0.5, 0);
        this.addChild(this.rarityLabel);
        
        // Стоимость
        this.valueStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 11,
            fill: '#ffd700',
            align: 'center'
        });
        this.valueLabel = new PIXI.Text('', this.valueStyle);
        this.valueLabel.anchor.set(0.5, 0);
        this.addChild(this.valueLabel);
    }
    
    /**
     * Показ подсказки для предмета
     * @param {ItemDrop} drop - предмет для отображения
     */
    show(drop) {
        if (!drop || !drop.item) {
            this.hide();
            return;
        }
        
        this.currentItem = drop.item;
        this.visible = true;
        
        // Обновляем содержимое
        this.updateContent();
        
        // Позиционируем относительно предмета
        this.updatePosition(drop);
    }

    /**
     * Показ подсказки для предмета (напрямую из объекта Item)
     * @param {Item} item - предмет для отображения
     */
    showForItem(item) {
        if (!item) {
            this.hide();
            return;
        }
        
        this.currentItem = item;
        this.visible = true;
        
        // Обновляем содержимое
        this.updateContent();
    }

    /**
     * Позиционирование тултипа в заданных экранных координатах
     * @param {number} x - экранная координата X
     * @param {number} y - экранная координата Y
     */
    positionAt(x, y) {
        if (!this.pixiRenderer || !this.pixiRenderer.app) {
            // Если нет рендерера, просто устанавливаем позицию
            this.x = x + 15;
            this.y = y - this.tooltipHeight / 2;
            return;
        }

        const tooltipWidth = this.tooltipWidth || this.minWidth;
        const tooltipHeight = this.tooltipHeight || 100;

        // Позиционируем справа от курсора
        let posX = x + 15;
        if (posX + tooltipWidth > this.pixiRenderer.app.screen.width) {
            // Не помещается справа, ставим слева
            posX = x - tooltipWidth - 15;
        }

        // Вертикальное позиционирование - по центру курсора
        let posY = y - tooltipHeight / 2;
        if (posY < 0) {
            posY = 0;
        }
        if (posY + tooltipHeight > this.pixiRenderer.app.screen.height) {
            posY = this.pixiRenderer.app.screen.height - tooltipHeight;
        }

        this.x = posX;
        this.y = posY;
    }
    
    /**
     * Скрытие подсказки
     */
    hide() {
        this.visible = false;
        this.currentItem = null;
    }
    
    /**
     * Обновление содержимого подсказки
     */
    updateContent() {
        const item = this.currentItem;
        if (!item) return;
        
        // Название
        this.nameLabel.text = item.name;
        this.nameLabel.style.fill = item.getColorByRarity();
        
        // Тип
        this.typeLabel.text = this.getItemTypeDisplayName(item.type);
        
        // Редкость
        this.rarityLabel.text = this.getRarityDisplayName(item.rarity);
        this.rarityLabel.style.fill = item.getColorByRarity();
        
        // Характеристики
        let statsText = '';
        for (const stat in item.stats) {
            const statName = this.getStatDisplayName(stat);
            statsText += `+${item.stats[stat]} ${statName}\n`;
        }
        this.statsLabel.text = statsText;
        
        // Стоимость
        this.valueLabel.text = `${item.value} золота`;
        
        // Вычисляем размеры и перерисовываем фон
        this.updateLayout();
    }
    
    /**
     * Обновление компоновки подсказки
     */
    updateLayout() {
        const padding = this.padding;
        let y = padding;

        // Название
        this.nameLabel.y = y;
        y += this.rowHeight + 2;

        // Тип
        this.typeLabel.y = y;
        y += this.rowHeight - 4;

        // Разделитель
        this.separator.clear();

        // Редкость
        this.rarityLabel.y = y;
        y += this.rowHeight;

        // Характеристики
        this.statsLabel.y = y;
        const statsHeight = this.statsLabel.height || this.rowHeight * Object.keys(this.currentItem.stats).length;
        y += statsHeight + 8;

        // Стоимость
        this.valueLabel.y = y;
        y += this.rowHeight + padding;

        // Вычисляем ширину на основе содержимого
        const maxWidth = Math.max(
            this.nameLabel.width + padding * 2,
            this.typeLabel.width + padding * 2,
            this.rarityLabel.width + padding * 2,
            this.statsLabel.width + padding * 2,
            this.valueLabel.width + padding * 2,
            this.minWidth
        );

        const width = Math.min(maxWidth, this.maxWidth);
        const height = y;

        // Сохраняем размеры в отдельных свойствах для использования до отрисовки
        this.tooltipWidth = width;
        this.tooltipHeight = height;

        // Рисуем фон
        this.drawBackground(width, height);

        // Позиционируем элементы по центру
        const centerX = width / 2;
        this.nameLabel.x = centerX;
        this.typeLabel.x = centerX;
        this.rarityLabel.x = centerX;
        this.valueLabel.x = centerX;

        // Характеристики слева
        this.statsLabel.x = padding;

        // Разделительная линия
        this.separator.lineStyle(1, 0x4a3a2a, 1);
        this.separator.moveTo(padding, this.rarityLabel.y - 4);
        this.separator.lineTo(width - padding, this.rarityLabel.y - 4);
    }
    
    /**
     * Отрисовка фона подсказки
     */
    drawBackground(width, height) {
        // Тёмный градиентный фон (имитация через несколько слоёв)
        this.background.clear();
        
        // Основной фон
        this.background.beginFill(0x1a1414, 0.95);
        this.background.drawRect(0, 0, width, height);
        this.background.endFill();
        
        // Внутренний градиент (светлее)
        this.background.beginFill(0x2a1f1f, 0.5);
        this.background.drawRect(2, 2, width - 4, height - 4);
        this.background.endFill();
        
        // Рамка
        this.border.clear();
        this.border.lineStyle(2, 0x4a3a2a, 1);
        this.border.drawRect(0, 0, width, height);
        
        // Золотая внутренняя рамка
        this.border.lineStyle(1, 0x8b7355, 0.5);
        this.border.drawRect(2, 2, width - 4, height - 4);
        
        // Угловые украшения
        this.drawCornerDecorations(width, height);
    }
    
    /**
     * Отрисовка угловых украшений
     */
    drawCornerDecorations(width, height) {
        const cornerSize = 8;
        const color = 0xd4af37;
        
        this.border.beginFill(color, 0.6);
        
        // Верхний левый угол
        this.border.moveTo(0, cornerSize);
        this.border.lineTo(0, 0);
        this.border.lineTo(cornerSize, 0);
        
        // Верхний правый угол
        this.border.moveTo(width, cornerSize);
        this.border.lineTo(width, 0);
        this.border.lineTo(width - cornerSize, 0);
        
        // Нижний правый угол
        this.border.moveTo(width, height - cornerSize);
        this.border.lineTo(width, height);
        this.border.lineTo(width - cornerSize, height);
        
        // Нижний левый угол
        this.border.moveTo(0, height - cornerSize);
        this.border.lineTo(0, height);
        this.border.lineTo(cornerSize, height);
        
        this.border.endFill();
    }
    
    /**
     * Обновление позиции подсказки
     * @param {ItemDrop} drop - предмет
     */
    updatePosition(drop) {
        if (!this.pixiRenderer || !this.pixiRenderer.app) return;

        const centerX = this.pixiRenderer.app.screen.width / 2;
        const centerY = this.pixiRenderer.app.screen.height / 2;
        const zoom = this.pixiRenderer.camera.zoom;

        // Преобразуем мировые координаты предмета в экранные
        const screenX = centerX + (drop.displayX - this.pixiRenderer.camera.x) * zoom;
        const screenY = centerY + (drop.displayY - this.pixiRenderer.camera.y) * zoom;

        // Позиционируем справа и выше предмета
        // Используем tooltipWidth/tooltipHeight вместо width/height
        const tooltipWidth = this.tooltipWidth || this.minWidth;
        const tooltipHeight = this.tooltipHeight || 100;

        // Проверяем, помещается ли справа
        let posX = screenX + 20;
        if (posX + tooltipWidth > this.pixiRenderer.app.screen.width) {
            // Не помещается справа, ставим слева
            posX = screenX - tooltipWidth - 20;
        }

        // Проверяем, помещается ли сверху
        let posY = screenY - tooltipHeight / 2;
        if (posY < 0) {
            // Не помещается сверху, ставим ниже
            posY = screenY + 20;
        }

        // Устанавливаем позицию в экранных координатах (stage)
        this.x = posX;
        this.y = posY;
    }
    
    /**
     * Получение отображаемого имени типа предмета
     */
    getItemTypeDisplayName(type) {
        const names = {
            'weapon': 'Оружие',
            'helmet': 'Шлем',
            'armor': 'Броня',
            'ring': 'Кольцо',
            'amulet': 'Амулет'
        };
        return names[type] || type;
    }
    
    /**
     * Получение отображаемого имени редкости
     */
    getRarityDisplayName(rarity) {
        const names = {
            'common': 'Обычный',
            'uncommon': 'Необычный',
            'rare': 'Редкий',
            'epic': 'Эпический'
        };
        return names[rarity] || rarity;
    }
    
    /**
     * Получение отображаемого имени характеристики
     */
    getStatDisplayName(stat) {
        const names = {
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
        return names[stat] || stat;
    }
    
    /**
     * Обновление подсказки (вызывается каждый кадр)
     * @param {ItemDrop} drop - предмет
     */
    update(drop) {
        if (this.visible && drop) {
            this.updatePosition(drop);
        }
    }
    
    /**
     * Уничтожение подсказки
     */
    destroy() {
        if (this.background) {
            this.background.destroy();
            this.background = null;
        }
        if (this.border) {
            this.border.destroy();
            this.border = null;
        }
        if (this.nameLabel) {
            this.nameLabel.destroy();
            this.nameLabel = null;
        }
        if (this.typeLabel) {
            this.typeLabel.destroy();
            this.typeLabel = null;
        }
        if (this.separator) {
            this.separator.destroy();
            this.separator = null;
        }
        if (this.statsLabel) {
            this.statsLabel.destroy();
            this.statsLabel = null;
        }
        if (this.rarityLabel) {
            this.rarityLabel.destroy();
            this.rarityLabel = null;
        }
        if (this.valueLabel) {
            this.valueLabel.destroy();
            this.valueLabel = null;
        }
        
        super.destroy();
    }
}

// Делаем класс глобально доступным
if (typeof window !== 'undefined') {
    window.ItemTooltip = ItemTooltip;
}
