/**
 * Класс спрайта предмета для PIXI рендерера
 * Предназначен для отображения выпавших предметов на земле
 * Аутентичный dark fantasy стиль в стиле Diablo
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

        // Цвета в стиле Diablo
        this.colors = {
            // Статичная тёмная рамка (не меняется)
            border: 0x4a3a2a,
            borderInner: 0x8b7355,
            // Тёмный фон
            background: 0x1a1414,
            backgroundHover: 0x2a1f1f,
            // Золотые угловые украшения
            corner: 0xd4af37
        };

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

        // Фон предмета (тёмный, полупрозрачный)
        this.background = new PIXI.Graphics();
        this.background.eventMode = 'none'; // Не перехватывает события
        this.drawBackground();
        this.addChild(this.background);

        // Рамка предмета (статичная, не меняет цвет)
        this.border = new PIXI.Graphics();
        this.border.eventMode = 'none'; // Не перехватывает события
        this.drawBorder();
        this.addChild(this.border);

        // Название предмета в стиле Diablo
        this.textStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 11,
            fontWeight: 'bold',
            fill: this.drop.item.getColorByRarity(),
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 3,
            dropShadowAngle: Math.PI / 2,
            dropShadowDistance: 2,
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
        // Тёмный полупрозрачный фон, при наведении слегка светлеет
        const bgColor = this.isHovered ? this.colors.backgroundHover : this.colors.background;
        const bgAlpha = this.isHovered ? 0.7 : 0.5;
        this.background.beginFill(bgColor, bgAlpha);
        this.background.drawRect(-width / 2, -height / 2, width, height);
        this.background.endFill();
    }

    /**
     * Отрисовка рамки предмета (статичная, не меняется)
     */
    drawBorder() {
        const width = this.baseWidth;
        const height = this.baseHeight;

        this.border.clear();
        
        // Внешняя тёмная рамка
        this.border.lineStyle(2, this.colors.border, 1);
        this.border.drawRect(-width / 2, -height / 2, width, height);
        
        // Внутренняя золотая рамка (тонкая)
        this.border.lineStyle(1, this.colors.borderInner, 0.6);
        this.border.drawRect(-width / 2 + 3, -height / 2 + 3, width - 6, height - 6);
        
        // Угловые украшения
        this.drawCorners(this.border, width, height);
    }

    /**
     * Отрисовка угловых украшений
     * @param {PIXI.Graphics} graphics - графика для рисования
     * @param {number} width - ширина рамки
     * @param {number} height - высота рамки
     */
    drawCorners(graphics, width, height) {
        const cornerSize = 5;
        const color = this.colors.corner;
        const halfW = width / 2;
        const halfH = height / 2;

        graphics.beginFill(color, 0.7);

        // Верхний левый угол
        graphics.moveTo(-halfW, -halfH + cornerSize);
        graphics.lineTo(-halfW, -halfH);
        graphics.lineTo(-halfW + cornerSize, -halfH);

        // Верхний правый угол
        graphics.moveTo(halfW, -halfH + cornerSize);
        graphics.lineTo(halfW, -halfH);
        graphics.lineTo(halfW - cornerSize, -halfH);

        // Нижний правый угол
        graphics.moveTo(halfW, halfH - cornerSize);
        graphics.lineTo(halfW, halfH);
        graphics.lineTo(halfW - cornerSize, halfH);

        // Нижний левый угол
        graphics.moveTo(-halfW, halfH - cornerSize);
        graphics.lineTo(-halfW, halfH);
        graphics.lineTo(-halfW + cornerSize, halfH);

        graphics.endFill();
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

        // Обновляем фон (прозрачный бекграунд слегка меняет цвет при наведении)
        this.background.clear();
        const bgColor = this.isHovered ? this.colors.backgroundHover : this.colors.background;
        const bgAlpha = this.isHovered ? 0.7 : 0.5;
        this.background.beginFill(bgColor, bgAlpha);
        this.background.drawRect(-this.baseWidth / 2, -this.baseHeight / 2, this.baseWidth, this.baseHeight);
        this.background.endFill();

        // Перерисовываем рамку (статичная, не меняет цвет)
        this.border.clear();
        this.border.lineStyle(2, this.colors.border, 1);
        this.border.drawRect(-this.baseWidth / 2, -this.baseHeight / 2, this.baseWidth, this.baseHeight);
        this.border.lineStyle(1, this.colors.borderInner, 0.6);
        this.border.drawRect(-this.baseWidth / 2 + 3, -this.baseHeight / 2 + 3, this.baseWidth - 6, this.baseHeight - 6);
        this.drawCorners(this.border, this.baseWidth, this.baseHeight);

        // Обновляем цвет текста в зависимости от редкости (НЕ меняется при наведении)
        const textColor = this.drop.item.getColorByRarity();
        this.textStyle.fill = textColor;
        this.textLabel.style = this.textStyle;
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
