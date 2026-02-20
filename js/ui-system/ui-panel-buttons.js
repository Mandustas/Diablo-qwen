/**
 * UIPanelButtons - панель кнопок открытия окон
 * Изящный дарк фентези стиль
 */
class UIPanelButtons extends UIComponent {
    constructor(config = {}) {
        super(config);

        // Параметры кнопок
        this.buttonWidth = 140;
        this.buttonHeight = 32;
        this.buttonGap = 8;
        this.padding = 10;

        // Вычисляем размеры (5 кнопок)
        this.width = this.buttonWidth * 5 + this.buttonGap * 4 + this.padding * 2;
        this.height = this.buttonHeight + this.padding * 2;

        // Позиционирование
        this.config.positionKey = 'panelButtons';

        // Кнопки
        this.buttons = {};
    }

    /**
     * Хук инициализации
     */
    onInit() {
        // Создаем контейнер для кнопок
        this.buttonsContainer = new PIXI.Container();
        this.buttonsContainer.x = this.padding;
        this.buttonsContainer.y = this.padding;
        this.container.addChild(this.buttonsContainer);

        // Создаем кнопки
        this.createButtons();
    }

    /**
     * Создание кнопок
     */
    createButtons() {
        const buttonConfig = [
            { key: 'map', text: 'КАРТА (TAB)', window: 'map' },
            { key: 'stats', text: 'ХАРАКТЕРИСТИКИ (S)', window: 'stats' },
            { key: 'inventory', text: 'ИНВЕНТАРЬ (I)', window: 'inventory' },
            { key: 'skillTree', text: 'НАВЫКИ (C)', window: 'skillTree' },
            { key: 'pauseMenu', text: 'МЕНЮ (ESC)', window: 'pauseMenu' }
        ];

        buttonConfig.forEach((config, index) => {
            const x = index * (this.buttonWidth + this.buttonGap);
            const button = this.createButton(config, x, 0);
            this.buttons[config.key] = button;
            this.buttonsContainer.addChild(button.container);
        });
    }

    /**
     * Создание отдельной кнопки
     */
    createButton(config, x, y) {
        const button = new UIComponent({
            x: x,
            y: y,
            width: this.buttonWidth,
            height: this.buttonHeight
        });

        // Фон кнопки
        button.onInit = function() {
            this.bgGraphics = new PIXI.Graphics();
            this.container.addChild(this.bgGraphics);

            // Текст кнопки
            this.textSprite = new PIXI.Text(config.text, {
                fontFamily: "'MedievalSharp', Georgia, serif",
                fontSize: 11,
                fill: '#c9b896',
                fontWeight: 'bold',
                dropShadow: true,
                dropShadowColor: '#000000',
                dropShadowBlur: 2,
                dropShadowDistance: 1,
                dropShadowAngle: Math.PI / 4
            });
            this.textSprite.anchor.set(0.5);
            this.textSprite.x = this.width / 2;
            this.textSprite.y = this.height / 2;
            this.container.addChild(this.textSprite);

            // Интерактивность
            this.container.eventMode = 'static';
            this.container.cursor = 'pointer';

            this.state = 'normal';
            this.setupInteractions();
            this.renderButton();
        };

        button.setupInteractions = function() {
            this.container.on('pointerover', () => {
                if (this.state !== 'active') {
                    this.state = 'hover';
                }
                this.renderButton();
            });

            this.container.on('pointerout', () => {
                this.state = 'normal';
                this.renderButton();
            });

            this.container.on('pointerdown', () => {
                this.state = 'active';
                this.renderButton();
            });

            this.container.on('pointerup', () => {
                this.state = 'hover';
                this.renderButton();
                // Открываем/закрываем окно
                if (window.game && window.game.uiManager) {
                    window.game.uiManager.toggle(config.window);
                } else if (window.game) {
                    console.log('uiManager не найден, пытаемся открыть', config.window);
                } else {
                    console.log('window.game не найден');
                }
            });

            this.container.on('pointerupoutside', () => {
                this.state = 'normal';
                this.renderButton();
            });
        };

        button.renderButton = function() {
            const g = this.bgGraphics;
            g.clear();

            // Градиентный фон
            for (let i = 0; i < this.height; i++) {
                const t = i / (this.height - 1);
                let r1, g1, b1, r2, g2, b2;

                if (this.state === 'hover') {
                    r1 = 58; g1 = 42; b1 = 42;
                    r2 = 42; g2 = 26; b2 = 26;
                } else if (this.state === 'active') {
                    r1 = 26; g1 = 15; b1 = 15;
                    r2 = 13; g2 = 8; b2 = 8;
                } else {
                    r1 = 42; g1 = 26; b1 = 26;
                    r2 = 26; g2 = 15; b2 = 15;
                }

                const r = Math.round(r1 + (r2 - r1) * t);
                const gr = Math.round(g1 + (g2 - g1) * t);
                const b = Math.round(b1 + (b2 - b1) * t);
                const color = (r << 16) + (gr << 8) + b;
                g.beginFill(color);
                g.drawRect(0, i, this.width, 1);
                g.endFill();
            }

            // Рамка
            let borderColor;
            if (this.state === 'hover') {
                borderColor = 0x6a5a4a;
            } else if (this.state === 'active') {
                borderColor = 0x3a2a1a;
            } else {
                borderColor = 0x4a3a2a;
            }

            g.lineStyle(2, borderColor);
            g.drawRoundedRect(0, 0, this.width, this.height, 3);

            // Цвет текста
            if (this.state === 'hover') {
                this.textSprite.style.fill = '#e8d9b8';
            } else {
                this.textSprite.style.fill = '#c9b896';
            }
        };

        // Инициализируем кнопку
        button.init(this.renderer, this.container);

        return button;
    }

    /**
     * Отрисовка фона панели
     */
    renderBackground() {
        if (!this.graphics) return;

        // Основной градиентный фон
        for (let i = 0; i < this.height; i++) {
            const t = i / (this.height - 1);
            const r1 = 26, g1 = 20, b1 = 20;
            const r2 = 13, g2 = 10, b2 = 10;
            const r = Math.round(r1 + (r2 - r1) * t);
            const gr = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            const color = (r << 16) + (gr << 8) + b;
            this.graphics.beginFill(color);
            this.graphics.drawRect(0, i, this.width, 1);
            this.graphics.endFill();
        }

        // Внешняя рамка
        this.graphics.lineStyle(2, 0x3a2a1a);
        this.graphics.drawRect(0, 0, this.width, this.height);

        // Толстая внешняя тень
        this.graphics.lineStyle(4, 0x000000, 0.4);
        this.graphics.drawRect(-3, -3, this.width + 6, this.height + 6);

        // Внутренняя тень
        this.graphics.lineStyle(2, 0x4a3a2a, 0.2);
        this.graphics.drawRect(3, 3, this.width - 6, this.height - 6);

        // Декоративные уголки
        this.drawCornerDecorations();
    }

    /**
     * Отрисовка декоративных уголков
     */
    drawCornerDecorations() {
        const cornerSize = 8;

        // Верхний левый
        this.graphics.lineStyle(2, 0x6a5a4a);
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
     * Отрисовка содержимого
     */
    renderContent() {
        // Содержимое уже отрисовано в createButtons
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIPanelButtons;
} else if (typeof window !== 'undefined') {
    window.UIPanelButtons = UIPanelButtons;
}
