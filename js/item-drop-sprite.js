/**
 * Класс спрайта предмета для PIXI рендерера
 * Предназначен для отображения выпавших предметов на земле
 */

class ItemDropSprite extends PIXI.Container {
    /**
     * @param {Object} drop - Объект ItemDrop для отображения
     * @param {PIXIRenderer} pixiRenderer - Ссылка на PIXI рендерер
     */
    constructor(drop, pixiRenderer) {
        super();

        this.drop = drop;
        this.pixiRenderer = pixiRenderer;
        this.isHovered = false;

        // Размеры предмета
        this.baseWidth = drop.width;
        this.baseHeight = drop.height;

        // Создаём визуальные элементы предмета
        this.createVisuals();

        // Настраиваем интерактивность
        this.setupInteraction();
    }

    /**
     * Создание визуальных элементов предмета
     */
    createVisuals() {
        const width = this.baseWidth;
        const height = this.baseHeight;

        // Фон предмета (полупрозрачная заливка)
        this.background = new PIXI.Graphics();
        this.background.eventMode = 'none'; // Не перехватывает события
        this.drawBackground();
        this.addChild(this.background);

        // Рамка предмета (цвет зависит от редкости)
        this.border = new PIXI.Graphics();
        this.border.eventMode = 'none'; // Не перехватывает события
        this.drawBorder();
        this.addChild(this.border);

        // Название предмета
        this.textStyle = new PIXI.TextStyle({
            fontFamily: 'Arial',
            fontSize: 10,
            fontWeight: 'bold',
            fill: this.drop.item.getColorByRarity(),
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowAngle: Math.PI / 2,
            dropShadowDistance: 1,
        });

        this.textLabel = new PIXI.Text(this.drop.item.name, this.textStyle);
        this.textLabel.anchor.set(0.5, 0.5);
        this.textLabel.eventMode = 'none'; // Не перехватывает события
        this.addChild(this.textLabel);

        // Применяем начальное состояние
        this.updateVisuals();
    }

    /**
     * Отрисовка фона предмета
     */
    drawBackground() {
        const width = this.baseWidth;
        const height = this.baseHeight;

        this.background.clear();
        this.background.beginFill(0xFFFFFF, this.isHovered ? 0.4 : 0.2);
        this.background.drawRect(-width / 2, -height / 2, width, height);
        this.background.endFill();
    }

    /**
     * Отрисовка рамки предмета
     */
    drawBorder() {
        const width = this.baseWidth;
        const height = this.baseHeight;
        const colorHex = this.hexToDecimal(this.drop.item.getColorByRarity());

        this.border.clear();
        this.border.lineStyle(2, colorHex, 1);
        this.border.drawRect(-width / 2, -height / 2, width, height);
    }

    /**
     * Настройка интерактивности
     */
    setupInteraction() {
        // Включаем интерактивность для обработки наведений
        // Для PIXI v7 используем eventMode
        this.eventMode = 'static';
        this.cursor = 'pointer';

        // Обработчики событий PIXI
        this.on('pointerenter', () => this.onHoverEnter());
        this.on('pointerleave', () => this.onHoverLeave());
    }

    /**
     * Обработчик наведения курсора
     */
    onHoverEnter() {
        this.isHovered = true;
        this.updateVisuals();
    }

    /**
     * Обработчик ухода курсора
     */
    onHoverLeave() {
        this.isHovered = false;
        this.updateVisuals();
    }

    /**
     * Обновление визуального состояния
     */
    updateVisuals() {
        // Проверяем, что графические элементы и предмет существуют
        if (!this.background || !this.textStyle || !this.textLabel || !this.border || !this.drop || !this.drop.item || !this.visible) {
            return;
        }

        // Обновляем прозрачность фона
        this.background.clear();
        this.background.beginFill(0xFFFFFF, this.isHovered ? 0.4 : 0.2);
        this.background.drawRect(-this.baseWidth / 2, -this.baseHeight / 2, this.baseWidth, this.baseHeight);
        this.background.endFill();

        // Обновляем цвет рамки в зависимости от редкости предмета
        const borderColor = this.drop.item.getColorByRarity();
        const colorHex = this.hexToDecimal(borderColor);
        this.border.clear();
        this.border.lineStyle(2, colorHex, 1);
        this.border.drawRect(-this.baseWidth / 2, -this.baseHeight / 2, this.baseWidth, this.baseHeight);

        // Обновляем цвет текста в зависимости от редкости и hover
        const textColor = this.isHovered ? '#FFFF00' : this.drop.item.getColorByRarity();
        this.textStyle.fill = textColor;
        this.textLabel.style = this.textStyle;

        // Добавляем свечение для редких предметов при наведении
        if (this.isHovered && (this.drop.item.rarity === 'epic' || this.drop.item.rarity === 'rare')) {
            // Проверяем, доступен ли GlowFilter (требуется pixi-filters)
            if (PIXI.filters && PIXI.filters.GlowFilter) {
                if (!this.glowFilter) {
                    this.glowFilter = new PIXI.filters.GlowFilter({
                        distance: 8,
                        outerStrength: 2,
                        innerStrength: 1,
                        color: this.drop.item.getColorByRarity(),
                        quality: 0.5
                    });
                }
                this.filters = [this.glowFilter];
            } else {
                // Fallback: просто увеличиваем прозрачность
                this.alpha = 1.0;
            }
        } else {
            this.filters = null;
            this.alpha = 1.0;
        }
    }

    /**
     * Обновление позиции спрайта на экране
     * @param {number} worldX - Мировая координата X
     * @param {number} worldY - Мировая координата Y
     * @param {number} zoom - Текущий зум камеры
     */
    updatePosition(worldX, worldY, zoom) {
        // Позиционируем в мировых координатах
        // mainContainer уже имеет смещение камеры и масштабирование,
        // поэтому не нужно масштабировать спрайт отдельно
        this.x = worldX;
        this.y = worldY;

        // НЕ масштабируем спрайт - mainContainer.scale уже применён
        // this.scale.set(zoom);

        // hitArea задаётся в локальных координатах спрайта (до масштабирования)
        this.hitArea = new PIXI.Rectangle(
            -this.baseWidth / 2,
            -this.baseHeight / 2,
            this.baseWidth,
            this.baseHeight
        );
    }

    /**
     * Обновление анимации падения
     */
    updateAnimation() {
        if (this.drop.fallProgress < 1) {
            this.drop.fallProgress = Math.min(1, this.drop.fallProgress + 0.1);
            const currentY = this.drop.fallY + (this.drop.targetY - this.drop.fallY) * this.drop.fallProgress;
            // Анимация будет применена в updatePosition через screenY
        }
    }

    /**
     * Преобразование HEX цвета в десятичное число
     * @param {string} hex - HEX цвет (например, '#ff0000')
     * @returns {number} - Десятичное представление цвета
     */
    hexToDecimal(hex) {
        if (!hex) return 0xFFFFFF;
        return parseInt(hex.replace('#', '0x'));
    }

    /**
     * Очистка и уничтожение спрайта
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
        if (this.textLabel) {
            this.textLabel.destroy();
            this.textLabel = null;
        }
        this.drop = null;
        this.pixiRenderer = null;
        super.destroy();
    }

    /**
     * Сброс спрайта для возврата в пул (без уничтожения)
     */
    reset() {
        this.drop = null;
        this.isHovered = false;
        this.visible = false;
    }

    /**
     * Восстановление спрайта из пула с новым предметом
     * @param {ItemDrop} drop - новый предмет
     */
    reuse(drop) {
        this.drop = drop;
        this.isHovered = false;
        this.visible = true;

        // Обновляем текст
        if (this.textLabel && drop.item) {
            this.textLabel.text = drop.item.name;
        }

        this.updateVisuals();
    }
}

// Делаем класс глобально доступным
if (typeof window !== 'undefined') {
    window.ItemDropSprite = ItemDropSprite;
}
