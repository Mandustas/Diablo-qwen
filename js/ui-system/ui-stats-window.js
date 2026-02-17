/**
 * UIStatsWindow - окно характеристик на новой системе UI
 * Изящный дарк фентези стиль с полным отображением статов
 */
class UIStatsWindow extends UIComponent {
    constructor(character, config = {}) {
        super(config);

        this.character = character;

        // Размеры окна
        this.width = 380;
        this.height = 450;
        this.padding = 20;

        // Позиционирование по центру
        this.config.positionKey = 'stats';

        // Кеш текстовых спрайтов для обновления
        this.textSprites = {};
    }

    /**
     * Хук инициализации
     */
    onInit() {
        // Создаем контейнер для текстовых спрайтов
        this.textContainer = new PIXI.Container();
        this.container.addChild(this.textContainer);

        // Первоначальное отображение
        this.renderStats();
    }

    /**
     * Основной метод отрисовки - отображает все статы
     */
    renderStats() {
        // Очищаем контейнер
        this.textContainer.removeChildren();
        this.textSprites = {};

        let currentY = this.padding + 35; // После заголовка

        // === ОСНОВНЫЕ ХАРАКТЕРИСТИКИ ===
        
        // Заголовок секции
        currentY = this.renderSectionHeader('Основные характеристики:', currentY);

        // Уровень (золотой)
        currentY = this.renderStatRow('Уровень:', this.character.level, '#FFD700', currentY);

        // Здоровье (зеленый)
        const healthText = `${this.character.health}/${this.character.maxHealth}`;
        currentY = this.renderStatRow('Здоровье:', healthText, '#4CAF50', currentY);

        // Мана (синий)
        const manaText = `${Math.floor(this.character.mana)}/${this.character.maxMana}`;
        currentY = this.renderStatRow('Мана:', manaText, '#2196F3', currentY);

        // Опыт (оранжевый)
        const expText = `${this.character.experience}/${this.character.experienceForNextLevel}`;
        currentY = this.renderStatRow('Опыт:', expText, '#FF9800', currentY);

        // Очки навыков (фиолетовый)
        currentY = this.renderStatRow('Очков навыков:', this.character.skillPoints.toString(), '#9C27B0', currentY);

        // Разделитель
        currentY += 10;
        currentY = this.renderDivider(currentY);
        currentY += 10;

        // === ВТОРИЧНЫЕ ХАРАКТЕРИСТИКИ ===

        // Заголовок секции
        currentY = this.renderSectionHeader('Статы:', currentY);

        // Получаем бонусы
        const damageBonus = this.character.getTotalStat ? this.character.getTotalStat('damage') : 0;
        const accuracyBonus = this.character.getTotalStat ? this.character.getTotalStat('accuracy') : 0;
        const dodgeBonus = this.character.getTotalStat ? this.character.getTotalStat('dodge') : 0;
        const healthBonus = this.character.getTotalStat ? this.character.getTotalStat('health') : 0;
        const armorBonus = this.character.getTotalStat ? this.character.getTotalStat('armor') : 0;
        const manaBonus = this.character.getTotalStat ? this.character.getTotalStat('mana') : 0;
        const manaRegen = this.character.getManaRegenRate ? this.character.getManaRegenRate().toFixed(1) : '0';

        // Сила (оранжевый)
        currentY = this.renderStatRowWithBonus('Сила:', this.character.strength, `+${damageBonus}`, '#FF5722', currentY);

        // Ловкость (голубой)
        const dexBonus = `+${accuracyBonus}% точн., +${dodgeBonus}% уклон.`;
        currentY = this.renderStatRowWithBonus('Ловкость:', this.character.dexterity, dexBonus, '#03A9F4', currentY);

        // Живучесть (зеленый)
        const vitBonus = `+${healthBonus} хп, +${armorBonus} брони`;
        currentY = this.renderStatRowWithBonus('Живучесть:', this.character.vitality, vitBonus, '#4CAF50', currentY);

        // Энергия (синий)
        const eneBonus = `+${manaBonus} маны, +${manaRegen}/сек`;
        currentY = this.renderStatRowWithBonus('Энергия:', this.character.energy, eneBonus, '#2196F3', currentY);

        // Обновляем высоту контейнера
        this.height = currentY + this.padding + 20;
        this.markForUpdate();
    }

    /**
     * Отрисовка заголовка секции
     */
    renderSectionHeader(text, y) {
        const label = this.createText(text, {
            fontSize: 14,
            color: '#c9b896',
            bold: true
        });
        label.x = this.padding;
        label.y = y;
        this.textContainer.addChild(label);
        
        return y + 22;
    }

    /**
     * Отрисовка линии-разделителя
     */
    renderDivider(y) {
        const graphics = new PIXI.Graphics();
        graphics.lineStyle(1, 0x3a2a1a, 0.8);
        graphics.moveTo(this.padding, y);
        graphics.lineTo(this.width - this.padding, y);
        this.textContainer.addChild(graphics);
        
        return y + 5;
    }

    /**
     * Отрисовка строки стата (название + значение)
     */
    renderStatRow(label, value, color, y) {
        // Название стата
        const labelText = this.createText(label, {
            fontSize: 14,
            color: '#c9b896'
        });
        labelText.x = this.padding;
        labelText.y = y;
        this.textContainer.addChild(labelText);

        // Значение стата
        const valueText = this.createText(value, {
            fontSize: 14,
            color: color,
            bold: true
        });
        valueText.x = this.padding + 130;
        valueText.y = y;
        this.textContainer.addChild(valueText);

        // Сохраняем ссылку для обновления
        this.textSprites[label] = { label: labelText, value: valueText, type: 'simple' };

        return y + 20;
    }

    /**
     * Отрисовка строки стата с бонусом
     */
    renderStatRowWithBonus(label, value, bonus, color, y) {
        // Название стата
        const labelText = this.createText(label, {
            fontSize: 14,
            color: '#c9b896'
        });
        labelText.x = this.padding;
        labelText.y = y;
        this.textContainer.addChild(labelText);

        // Значение стата
        const valueText = this.createText(value.toString(), {
            fontSize: 14,
            color: color,
            bold: true
        });
        valueText.x = this.padding + 80;
        valueText.y = y;
        this.textContainer.addChild(valueText);

        // Бонус
        const bonusText = this.createText(`(${bonus})`, {
            fontSize: 12,
            color: '#8a7a6a'
        });
        bonusText.x = this.padding + 130;
        bonusText.y = y;
        this.textContainer.addChild(bonusText);

        // Сохраняем ссылки для обновления
        this.textSprites[label] = { 
            label: labelText, 
            value: valueText, 
            bonus: bonusText,
            type: 'bonus' 
        };

        return y + 20;
    }

    /**
     * Создание текстового спрайта с тенью
     */
    createText(text, options = {}) {
        const fontSize = options.fontSize || 14;
        const color = options.color || '#c9b896';
        const bold = options.bold || false;

        const style = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: fontSize,
            fill: color,
            fontWeight: bold ? 'bold' : 'normal',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 2,
            dropShadowDistance: 1,
            dropShadowAngle: Math.PI / 4
        });

        const textSprite = new PIXI.Text(text, style);
        return textSprite;
    }

    /**
     * Обновление отображения
     */
    updateDisplay() {
        if (!this.isOpen) return;
        this.renderStats();
    }

    /**
     * Хук при открытии
     */
    onOpen() {
        this.renderStats();
    }

    /**
     * Обновление при изменении характеристик
     */
    onStatsUpdate() {
        if (this.isOpen) {
            this.renderStats();
        }
    }

    /**
     * Отрисовка фона окна - изящный дарк фентези стиль
     */
    renderBackground() {
        if (!this.graphics) return;

        // Основной градиентный фон (вертикальный от #1a1414 к #0d0a0a)
        for (let i = 0; i < this.height; i++) {
            const t = i / (this.height - 1);
            const r1 = 26, g1 = 20, b1 = 20;
            const r2 = 13, g2 = 10, b2 = 10;
            const r = Math.round(r1 + (r2 - r1) * t);
            const g = Math.round(g1 + (g2 - g1) * t);
            const b = Math.round(b1 + (b2 - b1) * t);
            const color = (r << 16) + (g << 8) + b;
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

        // Внутренняя тень (свечение)
        this.graphics.lineStyle(2, 0x4a3a2a, 0.2);
        this.graphics.drawRect(3, 3, this.width - 6, this.height - 6);

        // Декоративные уголки (золотые)
        this.drawCornerDecorations();

        // Заголовок
        this.drawTitleBackground();
    }

    /**
     * Отрисовка декоративных уголков
     */
    drawCornerDecorations() {
        const cornerSize = 8;
        
        // Верхний левый угол
        this.graphics.lineStyle(2, 0x6a5a4a);
        this.graphics.moveTo(5, 5 + cornerSize);
        this.graphics.lineTo(5, 5);
        this.graphics.lineTo(5 + cornerSize, 5);

        // Верхний правый угол
        this.graphics.moveTo(this.width - 5 - cornerSize, 5);
        this.graphics.lineTo(this.width - 5, 5);
        this.graphics.lineTo(this.width - 5, 5 + cornerSize);

        // Нижний левый угол
        this.graphics.moveTo(5, this.height - 5 - cornerSize);
        this.graphics.lineTo(5, this.height - 5);
        this.graphics.lineTo(5 + cornerSize, this.height - 5);

        // Нижний правый угол
        this.graphics.moveTo(this.width - 5 - cornerSize, this.height - 5);
        this.graphics.lineTo(this.width - 5, this.height - 5);
        this.graphics.lineTo(this.width - 5, this.height - 5 - cornerSize);
    }

    /**
     * Отрисовка фона заголовка
     */
    drawTitleBackground() {
        // Линия под заголовком
        this.graphics.lineStyle(1, 0x3a2a1a);
        this.graphics.moveTo(this.padding, this.padding + 28);
        this.graphics.lineTo(this.width - this.padding, this.padding + 28);

        // Декоративная линия
        this.graphics.lineStyle(1, 0x6a5a4a, 0.5);
        this.graphics.moveTo(this.padding + 5, this.padding + 30);
        this.graphics.lineTo(this.width - this.padding - 5, this.padding + 30);
    }

    /**
     * Отрисовка содержимого - заголовок
     */
    renderContent() {
        if (!this.textContainer) return;

        // Заголовок "ХАРАКТЕРИСТИКИ"
        const titleStyle = new PIXI.TextStyle({
            fontFamily: "'MedievalSharp', Georgia, serif",
            fontSize: 22,
            fill: '#c9b896',
            fontWeight: 'bold',
            dropShadow: true,
            dropShadowColor: '#000000',
            dropShadowBlur: 4,
            dropShadowDistance: 2,
            dropShadowAngle: Math.PI / 4
        });

        const title = new PIXI.Text('ХАРАКТЕРИСТИКИ', titleStyle);
        title.anchor.set(0.5, 0);
        title.x = this.width / 2;
        title.y = this.padding;
        this.container.addChild(title);

        // Кнопка закрытия уже добавлена в createCloseButton
    }

    /**
     * Создание кнопки закрытия
     */
    createCloseButton() {
        const closeBtn = new UIButton({
            x: this.width - 80,
            y: 8,
            width: 70,
            height: 24,
            text: 'ЗАКРЫТЬ',
            fontSize: 11,
            onClick: () => this.close()
        });
        this.addChild(closeBtn);
    }

    /**
     * Хук инициализации - переопределен
     */
    onInit() {
        // Создаем контейнер для текста
        this.textContainer = new PIXI.Container();
        this.container.addChild(this.textContainer);

        // Создаем заголовок
        this.renderContent();

        // Создаем кнопку закрытия
        this.createCloseButton();

        // Первоначальная отрисовка
        this.renderStats();
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIStatsWindow;
} else if (typeof window !== 'undefined') {
    window.UIStatsWindow = UIStatsWindow;
}
