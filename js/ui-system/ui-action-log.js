/**
 * UIActionLog - лог действий игрока
 * Отображает сообщения о событиях игры (уровни, предметы, убийства)
 * Располагается в правом нижнем углу, сообщения идут снизу вверх
 */
class UIActionLog extends UIComponent {
    constructor(game, config = {}) {
        super(config);

        this.game = game;

        // Размеры (ширина в 1.5 раза больше базовой, высота как у миникарты)
        this.width = config.width || 420; // 280 * 1.5
        this.height = config.height || 265; // Высота миникарты
        this.padding = 12;
        this.headerHeight = 28;
        this.scrollbarWidth = 12;
        this.messageLineHeight = 18;
        this.messageSpacing = 4;

        // Максимальное количество сообщений
        this.maxMessages = 100;

        // Массив сообщений
        this.messages = [];
        this.messageIdCounter = 0;

        // Состояние прокрутки
        this.scrollOffset = 0; // Смещение от верха (0 = вверху, показываем новые)
        this.maxScrollOffset = 0;
        this.isAutoScroll = true; // Автопрокрутка к новым сообщениям

        // Контейнер для сообщений
        this.messagesContainer = null;
        this.scrollbarGraphics = null;
        this.contentMask = null;

        // Позиционирование
        this.config.positionKey = 'actionLog';

        // Цвета
        this.colors = {
            background: { top: '#1a1414', bottom: '#0d0a0a' },
            border: '#3a2a1a',
            borderLight: '#6a5a4a',
            text: '#c9b896',
            textSecondary: '#8a7a6a',
            scrollbar: {
                track: '#0d0a0a',
                thumb: '#3a2a1a',
                thumbHover: '#4a3a2a'
            },
            // Цвета для типов сообщений (без иконок)
            messageTypes: {
                level: { color: '#FFD700' },
                item: { color: '#ffffff' }, // Белый для текста "Получен предмет:"
                kill: { color: '#ff4a4a' },
                experience: { color: '#4CAF50' },
                default: { color: '#c9b896' }
            }
        };

        // Кэш текстовых спрайтов
        this.textSprites = [];
        this.needsMessageRender = true;

        // Состояние скроллбара
        this.isDraggingScrollbar = false;
        this.scrollbarDragStartY = 0;
        this.scrollbarDragStartOffset = 0;
        this.isHoveredScrollbar = false;

        // Тултип для предметов
        this.itemTooltip = null;
        this.hoveredItem = null;
    }

    /**
     * Хук инициализации
     */
    onInit() {
        // Создаем контейнер для сообщений
        this.messagesContainer = new PIXI.Container();
        this.messagesContainer.x = this.padding;
        this.messagesContainer.y = this.headerHeight + this.padding;
        // Включаем интерактивность для контейнера сообщений, чтобы события доходили до дочерних элементов
        this.messagesContainer.eventMode = 'static';
        this.messagesContainer.interactiveChildren = true;
        
        
        this.container.addChild(this.messagesContainer);

        // Создаем маску для обрезки содержимого
        this.createContentMask();

        // Создаем графику для скроллбара
        this.scrollbarGraphics = new PIXI.Graphics();
        this.scrollbarGraphics.x = this.width - this.scrollbarWidth - this.padding / 2;
        this.scrollbarGraphics.y = this.headerHeight + this.padding;
        this.container.addChild(this.scrollbarGraphics);

        // Настраиваем интерактивность для прокрутки
        this.setupInteractions();
    }

    /**
     * Создание маски для содержимого
     */
    createContentMask() {
        const contentWidth = this.width - this.scrollbarWidth - this.padding * 1.5;
        const contentHeight = this.height - this.headerHeight - this.padding * 2;

        // Создаем маску
        const maskGraphics = new PIXI.Graphics();
        maskGraphics.beginFill(0xFFFFFF);
        maskGraphics.drawRect(0, 0, contentWidth, contentHeight);
        maskGraphics.endFill();
        maskGraphics.x = this.padding;
        maskGraphics.y = this.headerHeight + this.padding;

        this.container.addChild(maskGraphics);
        this.messagesContainer.mask = maskGraphics;
        this.contentMask = maskGraphics;
        
        // Сохраняем размеры области контента
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;
        
        // НЕ устанавливаем hitArea - пусть PIXI использует bounds дочерних элементов
        // hitArea может блокировать события для дочерних элементов
    }

    /**
     * Настройка интерактивности
     */
    setupInteractions() {
        // Интерактивность для колеса мыши и pointer events
        this.container.eventMode = 'static';
        this.container.interactiveChildren = true;
        this.container.on('wheel', (e) => {
            // Останавливаем всплытие, чтобы зум карты не срабатывал
            e.stopPropagation();
            this.handleWheel(e);
        });

        // Интерактивность для скроллбара
        this.scrollbarGraphics.eventMode = 'static';
        this.scrollbarGraphics.interactive = true;

        this.scrollbarGraphics.on('pointerdown', (e) => this.startScrollbarDrag(e));
        this.scrollbarGraphics.on('pointerup', () => this.endScrollbarDrag());
        this.scrollbarGraphics.on('pointerupoutside', () => this.endScrollbarDrag());
        this.scrollbarGraphics.on('pointermove', (e) => this.handleScrollbarMove(e));
        this.scrollbarGraphics.on('pointerover', () => {
            this.isHoveredScrollbar = true;
            this.markForUpdate();
        });
        this.scrollbarGraphics.on('pointerout', () => {
            this.isHoveredScrollbar = false;
            this.markForUpdate();
        });
    }

    /**
     * Обработка колеса мыши
     */
    handleWheel(e) {
        const delta = e.deltaY > 0 ? 1 : -1;
        this.scrollBy(delta * 3);
    }

    /**
     * Начало перетаскивания скроллбара
     */
    startScrollbarDrag(e) {
        this.isDraggingScrollbar = true;
        this.scrollbarDragStartY = e.data.global.y;
        this.scrollbarDragStartOffset = this.scrollOffset;
        this.isAutoScroll = false;
    }

    /**
     * Окончание перетаскивания скроллбара
     */
    endScrollbarDrag() {
        this.isDraggingScrollbar = false;
    }

    /**
     * Обработка движения при перетаскивании скроллбара
     * Тянем вниз = показываем старые сообщения, тянем вверх = показываем новые
     */
    handleScrollbarMove(e) {
        if (!this.isDraggingScrollbar) return;

        const contentHeight = this.height - this.headerHeight - this.padding * 2;
        const totalMessagesHeight = this.messages.length * (this.messageLineHeight + this.messageSpacing);
        const trackHeight = contentHeight - 4;

        // Вычисляем максимальное смещение
        const maxOffset = Math.max(0, totalMessagesHeight - contentHeight);

        // Вычисляем изменение позиции (прямая логика)
        const deltaY = e.data.global.y - this.scrollbarDragStartY;
        const scrollRatio = maxOffset > 0 ? (deltaY / trackHeight) * maxOffset : 0;

        this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollbarDragStartOffset + scrollRatio));
        this.needsMessageRender = true;
        this.markForUpdate();
    }

    /**
     * Прокрутка на заданное количество строк
     */
    scrollBy(lines) {
        const contentHeight = this.height - this.headerHeight - this.padding * 2;
        const totalMessagesHeight = this.messages.length * (this.messageLineHeight + this.messageSpacing);
        const maxOffset = Math.max(0, totalMessagesHeight - contentHeight);

        const scrollAmount = lines * (this.messageLineHeight + this.messageSpacing);
        this.scrollOffset = Math.max(0, Math.min(maxOffset, this.scrollOffset + scrollAmount));

        // Если прокрутили вверх, отключаем автопрокрутку
        if (lines > 0) {
            this.isAutoScroll = false;
        }

        this.needsMessageRender = true;
        this.markForUpdate();
    }

    /**
     * Прокрутка к новым сообщениям (в начало списка)
     */
    scrollToNewest() {
        this.scrollOffset = 0;
        this.isAutoScroll = true;
        this.needsMessageRender = true;
        this.markForUpdate();
    }

    /**
     * Прокрутка к старым сообщениям (в конец списка)
     */
    scrollToOldest() {
        const contentHeight = this.height - this.headerHeight - this.padding * 2;
        const totalMessagesHeight = this.messages.length * (this.messageLineHeight + this.messageSpacing);
        this.scrollOffset = Math.max(0, totalMessagesHeight - contentHeight);
        this.isAutoScroll = false;
        this.needsMessageRender = true;
        this.markForUpdate();
    }

    /**
     * Добавление сообщения
     * @param {string} type - тип сообщения ('level', 'item', 'kill', 'experience', 'custom')
     * @param {Object} data - данные сообщения
     */
    addMessage(type, data = {}) {
        const messageConfig = this.colors.messageTypes[type] || this.colors.messageTypes.default;

        const message = {
            id: ++this.messageIdCounter,
            type: type,
            text: data.text || '',
            color: data.color || messageConfig.color,
            icon: data.icon || messageConfig.icon,
            prefix: data.prefix || messageConfig.prefix,
            timestamp: Date.now(),
            raw: data.raw || null // Сырые данные для кастомных сообщений
        };

        // Формируем текст сообщения
        message.text = this.formatMessageText(message, data);

        // Добавляем сообщение в начало массива (новые сообщения сверху)
        this.messages.unshift(message);

        // Удаляем старые сообщения если превышен лимит (удаляем с конца - самые старые)
        while (this.messages.length > this.maxMessages) {
            this.messages.pop();
        }

        // Всегда прокручиваем к новым сообщениям при добавлении
        this.scrollToNewest();

        this.needsMessageRender = true;
        this.markForUpdate();

        return message;
    }

    /**
     * Форматирование времени в формате "час:мин:сек"
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        const seconds = date.getSeconds().toString().padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Форматирование текста сообщения
     */
    formatMessageText(message, data) {
        const time = this.formatTime(message.timestamp);
        
        switch (message.type) {
            case 'level':
                return `${time} Достигнут уровень ${data.level}`;
            case 'item':
                return `${time} Получен предмет: ${data.itemName}`;
            case 'kill':
                return `${time} Убит враг: ${data.enemyName}`;
            case 'experience':
                return `${time} Получено опыта: ${data.amount}`;
            default:
                return `${time} ${data.text || ''}`;
        }
    }

    /**
     * Добавление сообщения о новом уровне
     * @param {number} level - новый уровень
     */
    addLevelUpMessage(level) {
        return this.addMessage('level', { level: level });
    }

    /**
     * Добавление сообщения о получении предмета
     * @param {Object} item - объект предмета
     */
    addItemMessage(item) {
        if (!item) return null;

        // Получаем цвет редкости предмета
        const rarityColor = this.getRarityColor(item.rarity);

        return this.addMessage('item', {
            itemName: item.name,
            color: rarityColor,
            raw: item
        });
    }

    /**
     * Добавление сообщения об убийстве врага
     * @param {string} enemyName - имя/тип врага
     */
    addKillMessage(enemyName) {
        const displayName = this.getEnemyDisplayName(enemyName);
        return this.addMessage('kill', { enemyName: displayName });
    }

    /**
     * Добавление сообщения о получении опыта
     * @param {number} amount - количество опыта
     */
    addExperienceMessage(amount) {
        return this.addMessage('experience', { amount: amount });
    }

    /**
     * Получение цвета редкости
     * серый (common), зеленый (uncommon), синий (rare), оранжевый (epic)
     */
    getRarityColor(rarity) {
        const rarityColors = {
            common: '#9d9d9d',    // серый
            uncommon: '#4CAF50',  // зеленый
            rare: '#2196F3',      // синий
            epic: '#FF9800'       // оранжевый
        };
        return rarityColors[rarity] || rarityColors.common;
    }

    /**
     * Получение отображаемого имени врага
     */
    getEnemyDisplayName(enemyType) {
        const names = {
            basic: 'Гоблин',
            weak: 'Слабый гоблин',
            strong: 'Сильный гоблин',
            fast: 'Быстрый гоблин',
            tank: 'Танк-гоблин'
        };
        return names[enemyType] || enemyType;
    }

    /**
     * Отрисовка фона - дарк фентези стиль
     */
    renderBackground() {
        if (!this.graphics) return;

        // Градиентный фон
        for (let i = 0; i < this.height; i++) {
            const t = i / (this.height - 1);
            const r1 = 26, g1 = 20, b1 = 20; // #1a1414
            const r2 = 13, g2 = 10, b2 = 10; // #0d0a0a
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            const color = (r << 16) + (g << 8) + b;
            this.graphics.beginFill(color, 0.9);
            this.graphics.drawRect(0, i, this.width, 1);
            this.graphics.endFill();
        }

        // Внешняя рамка
        this.graphics.lineStyle(2, this.hexToDecimal(this.colors.border));
        this.graphics.drawRect(0, 0, this.width, this.height);

        // Внутренняя тень
        this.graphics.lineStyle(1, this.hexToDecimal(this.colors.borderLight), 0.2);
        this.graphics.drawRect(2, 2, this.width - 4, this.height - 4);

        // Декоративные уголки
        this.drawCornerDecorations();

        // Заголовок
        this.drawHeader();
    }

    /**
     * Отрисовка декоративных уголков
     */
    drawCornerDecorations() {
        const cornerSize = 6;

        this.graphics.lineStyle(2, this.hexToDecimal(this.colors.borderLight));

        // Верхний левый
        this.graphics.moveTo(5, 5 + cornerSize);
        this.graphics.lineTo(5, 5);
        this.graphics.lineTo(5 + cornerSize, 5);

        // Верхний правый
        this.graphics.moveTo(this.width - 5 - cornerSize, 5);
        this.graphics.lineTo(this.width - 5, 5);
        this.graphics.lineTo(this.width - 5, 5 + cornerSize);

        // Нижний левый
        this.graphics.moveTo(5, this.height - 5 - cornerSize);
        this.graphics.lineTo(5, this.height - 5);
        this.graphics.lineTo(5 + cornerSize, this.height - 5);

        // Нижний правый
        this.graphics.moveTo(this.width - 5 - cornerSize, this.height - 5);
        this.graphics.lineTo(this.width - 5, this.height - 5);
        this.graphics.lineTo(this.width - 5, this.height - 5 - cornerSize);
    }

    /**
     * Отрисовка заголовка
     */
    drawHeader() {
        // Линия под заголовком
        this.graphics.lineStyle(1, this.hexToDecimal(this.colors.border));
        this.graphics.moveTo(this.padding, this.headerHeight);
        this.graphics.lineTo(this.width - this.padding, this.headerHeight);

        // Декоративная линия
        this.graphics.lineStyle(1, this.hexToDecimal(this.colors.borderLight), 0.5);
        this.graphics.moveTo(this.padding + 5, this.headerHeight + 2);
        this.graphics.lineTo(this.width - this.padding - 5, this.headerHeight + 2);
    }

    /**
     * Отрисовка содержимого
     */
    renderContent() {
        // Рисуем заголовок
        this.renderTitle();

        // Рисуем сообщения
        if (this.needsMessageRender) {
            this.renderMessages();
            this.needsMessageRender = false;
        }

        // Рисуем скроллбар
        this.renderScrollbar();
    }

    /**
     * Отрисовка заголовка
     */
    renderTitle() {
        if (!this.titleText) {
            this.titleText = this.uiRenderer.createText('ЛОГ ДЕЙСТВИЙ', {
                fontFamily: UIConfig.fonts.family,
                fontSize: 12,
                fill: this.hexToDecimal(this.colors.text),
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 2,
                dropShadowDistance: 1
            });
            this.titleText.anchor.set(0.5, 0.5);
            this.container.addChild(this.titleText);
        }

        this.titleText.x = this.width / 2;
        this.titleText.y = this.headerHeight / 2;
    }

    /**
     * Отрисовка сообщений
     * Новые сообщения отображаются сверху, старые снизу.
     * scrollOffset = 0 показывает новые сообщения (вверху)
     * scrollOffset = maxOffset показывает старые сообщения (внизу)
     */
    renderMessages() {
        // Очищаем старые текстовые спрайты
        for (const sprite of this.textSprites) {
            this.messagesContainer.removeChild(sprite);
            sprite.destroy();
        }
        this.textSprites = [];

        if (this.messages.length === 0) return;

        const contentHeight = this.height - this.headerHeight - this.padding * 2;
        const contentWidth = this.width - this.scrollbarWidth - this.padding * 2;
        const messageHeight = this.messageLineHeight + this.messageSpacing;

        // Вычисляем общую высоту всех сообщений
        const totalMessagesHeight = this.messages.length * messageHeight;

        // Вычисляем максимальное смещение
        const maxOffset = Math.max(0, totalMessagesHeight - contentHeight);
        const currentOffset = Math.min(this.scrollOffset, maxOffset);

        // Вычисляем индекс первого видимого сообщения
        // scrollOffset = 0: startIndex = 0 (показываем с нового сообщения)
        // scrollOffset = maxOffset: startIndex = последние сообщения
        const startIndex = Math.floor(currentOffset / messageHeight);
        
        // Вычисляем начальную позицию Y с учетом дробного смещения
        const pixelOffset = currentOffset % messageHeight;
        let currentY = -pixelOffset;

        // Проходим по сообщениям начиная с startIndex
        for (let i = startIndex; i < this.messages.length; i++) {
            const message = this.messages[i];

            // Проверяем, видимо ли сообщение
            if (currentY > contentHeight) break; // Ниже видимой области
            if (currentY < -this.messageLineHeight) {
                // Выше видимой области, переходим к следующему
                currentY += messageHeight;
                continue;
            }

            // Создаем текстовое спрайт
            const textSprite = this.createMessageText(message, contentWidth);
            textSprite.x = 0;
            textSprite.y = currentY;

            this.messagesContainer.addChild(textSprite);
            this.textSprites.push(textSprite);

            currentY += messageHeight;
        }
    }

    /**
     * Создание текстового спрайта для сообщения
     */
    createMessageText(message, maxWidth) {
        // Для предметов используем составной текст с разными цветами
        if (message.type === 'item' && message.raw) {
            return this.createItemMessageText(message, maxWidth);
        }

        // Для остальных сообщений - обычный текст
        const textStyle = {
            fontFamily: UIConfig.fonts.family,
            fontSize: 11,
            fill: this.hexToDecimal(message.color),
            wordWrap: true,
            wordWrapWidth: maxWidth,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 1,
            dropShadowDistance: 1
        };

        const textSprite = new PIXI.Text(message.text, textStyle);
        textSprite.anchor.set(0, 0);

        return textSprite;
    }

    /**
     * Создание составного текста для предмета
     * Белый текст для "Время Получен предмет: " и цвет качества для названия в скобках
     * При наведении на название показывается тултип
     */
    createItemMessageText(message, maxWidth) {
        const container = new PIXI.Container();
        
        const baseStyle = {
            fontFamily: UIConfig.fonts.family,
            fontSize: 11,
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 1,
            dropShadowDistance: 1
        };

        // Формируем части текста
        const time = this.formatTime(message.timestamp);
        const prefix = `${time} Получен предмет: `;
        const itemName = message.raw.name || 'Неизвестный предмет';
        const rarityColor = this.getRarityColor(message.raw.rarity);
        const rarityColorHex = this.hexToDecimal(rarityColor);

        // Создаем текст префикса (белый)
        const prefixStyle = { ...baseStyle, fill: 0xffffff };
        const prefixText = new PIXI.Text(prefix, prefixStyle);
        prefixText.anchor.set(0, 0);
        container.addChild(prefixText);

        // Создаем контейнер для названия предмета со скобками (интерактивный)
        const itemContainer = new PIXI.Container();
        itemContainer.x = prefixText.width;
        
        // Создаем открывающую скобку (цвет качества)
        const bracketStyle = { ...baseStyle, fill: rarityColorHex };
        const openBracket = new PIXI.Text('[', bracketStyle);
        openBracket.anchor.set(0, 0);
        itemContainer.addChild(openBracket);

        // Создаем текст названия предмета (цвет качества)
        const nameStyle = { ...baseStyle, fill: rarityColorHex };
        const nameText = new PIXI.Text(itemName, nameStyle);
        nameText.anchor.set(0, 0);
        nameText.x = openBracket.width;
        itemContainer.addChild(nameText);

        // Создаем закрывающую скобку (цвет качества)
        const closeBracket = new PIXI.Text(']', bracketStyle);
        closeBracket.anchor.set(0, 0);
        closeBracket.x = openBracket.width + nameText.width;
        itemContainer.addChild(closeBracket);

        // Добавляем интерактивность для всего контейнера предмета
        itemContainer.eventMode = 'static';
        itemContainer.interactive = true;
        itemContainer.interactiveChildren = true;
        itemContainer.cursor = 'pointer';
        
        // Сохраняем ссылку на предмет в контейнере
        itemContainer.itemData = message.raw;
        
        // PIXI автоматически использует bounds контейнера для hit testing
        
        itemContainer.on('pointerover', (e) => {
            this.showItemTooltip(e, itemContainer.itemData);
        });
        
        itemContainer.on('pointerout', () => {
            this.hideItemTooltip();
        });
        
        itemContainer.on('pointermove', (e) => {
            this.updateTooltipPosition(e);
        });
        
        container.addChild(itemContainer);

        // Проверяем, не превышает ли ширина
        const totalWidth = container.width;
        if (totalWidth > maxWidth) {
            // Если слишком длинное, используем обычный текст с переносом
            container.destroy({ children: true });
            
            // Текст со скобками для переноса
            const itemTextWithBrackets = `[${itemName}]`;
            
            const fullTextStyle = {
                fontFamily: UIConfig.fonts.family,
                fontSize: 11,
                fill: rarityColorHex,
                wordWrap: true,
                wordWrapWidth: maxWidth,
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 1,
                dropShadowDistance: 1
            };
            
            const wrappedText = new PIXI.Text(`${prefix}${itemTextWithBrackets}`, fullTextStyle);
            // Добавляем интерактивность и для перенесенного текста
            wrappedText.eventMode = 'static';
            wrappedText.interactive = true;
            wrappedText.cursor = 'pointer';
            wrappedText.itemData = message.raw;
            wrappedText.on('pointerover', (e) => this.showItemTooltip(e, wrappedText.itemData));
            wrappedText.on('pointerout', () => this.hideItemTooltip());
            wrappedText.on('pointermove', (e) => this.updateTooltipPosition(e));
            
            return wrappedText;
        }

        return container;
    }

    /**
     * Показать тултип предмета
     */
    showItemTooltip(e, item) {
        if (!item || !this.game || !this.game.itemTooltip) return;
        
        const tooltip = this.game.itemTooltip;
        
        this.hoveredItem = item;
        tooltip.locked = true; // Блокируем тултип, чтобы game.js не скрывал его
        tooltip.showForItem(item);
        this.updateTooltipPosition(e);
    }

    /**
     * Скрыть тултип предмета
     */
    hideItemTooltip() {
        if (!this.game || !this.game.itemTooltip) return;
        
        this.hoveredItem = null;
        this.game.itemTooltip.locked = false; // Снимаем блокировку
        this.game.itemTooltip.hide();
    }

    /**
     * Обновить позицию тултипа
     */
    updateTooltipPosition(e) {
        if (!this.game || !this.game.itemTooltip || !this.hoveredItem) return;
        
        // Получаем глобальные координаты курсора
        const globalPos = e.data.global;
        
        // Позиционируем тултип рядом с курсором
        this.game.itemTooltip.positionAt(globalPos.x, globalPos.y);
    }

    /**
     * Отрисовка скроллбара
     * Ползунок вверху = показываем новые сообщения (scrollOffset = 0)
     * Ползунок внизу = показываем старые сообщения (scrollOffset = maxOffset)
     */
    renderScrollbar() {
        if (!this.scrollbarGraphics) return;

        this.scrollbarGraphics.clear();

        const contentHeight = this.height - this.headerHeight - this.padding * 2;
        const totalMessagesHeight = this.messages.length * (this.messageLineHeight + this.messageSpacing);

        // Если все сообщения помещаются, не рисуем скроллбар
        if (totalMessagesHeight <= contentHeight) {
            return;
        }

        const trackHeight = contentHeight - 4;
        const maxOffset = totalMessagesHeight - contentHeight;

        // Фон скроллбара (трек)
        this.scrollbarGraphics.beginFill(this.hexToDecimal(this.colors.scrollbar.track), 0.8);
        this.scrollbarGraphics.drawRoundedRect(0, 2, this.scrollbarWidth - 2, trackHeight, 3);
        this.scrollbarGraphics.endFill();

        // Вычисляем размер и позицию ползунка
        const thumbHeight = Math.max(20, (contentHeight / totalMessagesHeight) * trackHeight);
        // scrollOffset = 0 -> ползунок вверху, scrollOffset = maxOffset -> ползунок внизу
        const thumbY = 2 + (this.scrollOffset / maxOffset) * (trackHeight - thumbHeight);

        // Ползунок
        const thumbColor = this.isHoveredScrollbar || this.isDraggingScrollbar
            ? this.colors.scrollbar.thumbHover
            : this.colors.scrollbar.thumb;

        this.scrollbarGraphics.beginFill(this.hexToDecimal(thumbColor), 0.9);
        this.scrollbarGraphics.drawRoundedRect(1, thumbY, this.scrollbarWidth - 4, thumbHeight, 2);
        this.scrollbarGraphics.endFill();

        // Декоративная линия на ползунке
        this.scrollbarGraphics.lineStyle(1, this.hexToDecimal(this.colors.borderLight), 0.3);
        this.scrollbarGraphics.moveTo(3, thumbY + thumbHeight / 2);
        this.scrollbarGraphics.lineTo(this.scrollbarWidth - 5, thumbY + thumbHeight / 2);
    }

    /**
     * Обновление компонента
     */
    onUpdate(deltaTime) {
        // Проверяем, нужно ли обновить сообщения
        if (this.needsMessageRender) {
            this.renderMessages();
            this.needsMessageRender = false;
        }
    }

    /**
     * Очистка лога
     */
    clear() {
        this.messages = [];
        this.messageIdCounter = 0;
        this.scrollOffset = 0;
        this.isAutoScroll = true;
        this.needsMessageRender = true;
        this.markForUpdate();
    }

    /**
     * Получение количества сообщений
     */
    getMessageCount() {
        return this.messages.length;
    }

    /**
     * Установка максимального количества сообщений
     */
    setMaxMessages(max) {
        this.maxMessages = max;

        // Удаляем лишние сообщения
        while (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        this.needsMessageRender = true;
        this.markForUpdate();
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIActionLog;
} else if (typeof window !== 'undefined') {
    window.UIActionLog = UIActionLog;
}