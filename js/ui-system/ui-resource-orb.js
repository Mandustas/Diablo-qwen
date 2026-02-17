/**
 * UIResourceOrb - универсальный компонент орба ресурса (здоровье/мана)
 * Изящный дарк фентези стиль с эффектами свечения и частиц
 */
class UIResourceOrb extends UIComponent {
    constructor(character, config = {}) {
        super(config);

        this.character = character;
        this.resourceType = config.resourceType || 'health'; // 'health' или 'mana'

        // Размеры
        this.orbSize = 120;
        this.orbRadius = 52;
        this.orbCircumference = 2 * Math.PI * this.orbRadius;

        // Анимация
        this.pulsePhase = 0;
        this.particleTime = 0;

        // Частицы для маны
        this.particles = [];
        this.maxParticles = 8;

        // Цвета и градиенты
        this.colors = {
            health: {
                fill: 0xff0000,
                fillBright: 0xff4444,
                fillDark: 0x8b0000,
                fillLow: 0xff3333,
                fillCritical: 0xff6600,
                text: '#ff4444',
                textLow: '#ff6600',
                textCritical: '#ff8800',
                glow: 0xff0000,
                border: 0x4a1a1a,
                borderBright: 0x8a3a3a
            },
            mana: {
                fill: 0x0066ff,
                fillBright: 0x4488ff,
                fillDark: 0x003388,
                text: '#4488ff',
                glow: 0x0044ff,
                border: 0x1a2a4a,
                borderBright: 0x3a5a8a
            }
        };

        // Графика
        this.backgroundGraphics = null;
        this.progressGraphics = null;
        this.glowGraphics = null;
        this.textSprite = null;
        this.textBgGraphics = null;
    }

    /**
     * Хук инициализации
     */
    onInit() {
        this.width = this.orbSize;
        this.height = this.orbSize;

        // Создаём графику для фона (нижний слой)
        this.backgroundGraphics = new PIXI.Graphics();
        this.container.addChild(this.backgroundGraphics);

        // Создаём графику для свечения
        this.glowGraphics = new PIXI.Graphics();
        this.container.addChild(this.glowGraphics);

        // Создаём графику для прогресса
        this.progressGraphics = new PIXI.Graphics();
        this.container.addChild(this.progressGraphics);

        // Создаём фон для текста
        this.textBgGraphics = new PIXI.Graphics();
        this.container.addChild(this.textBgGraphics);

        // Создаём текст
        this.textSprite = this.createText('', {
            fontSize: 16,
            color: this.colors[this.resourceType].text,
            bold: true
        });
        this.textSprite.anchor.set(0.5);
        this.textSprite.x = this.orbSize / 2;
        this.textSprite.y = this.orbSize / 2;
        this.textSprite.zIndex = 10;
        this.container.addChild(this.textSprite);

        // Обновляем отображение
        this.updateDisplay();
    }

    /**
     * Отрисовка фона орба
     */
    renderBackground() {
        if (!this.backgroundGraphics) return;

        const centerX = this.orbSize / 2;
        const centerY = this.orbSize / 2;
        const colors = this.colors[this.resourceType];

        this.backgroundGraphics.clear();

        // Внешнее свечение (мягкий градиент)
        for (let r = this.orbRadius + 8; r >= this.orbRadius; r--) {
            const alpha = 0.15 * (1 - (r - this.orbRadius) / 8);
            const glowColor = colors.glow;
            this.backgroundGraphics.lineStyle(1, glowColor, alpha);
            this.backgroundGraphics.drawCircle(centerX, centerY, r);
        }

        // Тёмный фон орба (основа)
        const bgGradient = this.createRadialGradient(
            centerX, centerY, this.orbRadius,
            0x1a1a1a, 0x0a0a0a
        );
        
        for (let i = 0; i < this.orbRadius; i++) {
            const t = i / this.orbRadius;
            const r = Math.round(26 + (10 - 26) * t);
            const g = Math.round(26 + (10 - 26) * t);
            const b = Math.round(26 + (10 - 26) * t);
            const color = (r << 16) + (g << 8) + b;
            this.backgroundGraphics.lineStyle(1, color);
            this.backgroundGraphics.drawCircle(centerX, centerY, this.orbRadius - i);
        }

        // Внутренняя тень по краю
        this.backgroundGraphics.lineStyle(3, 0x000000, 0.5);
        this.backgroundGraphics.drawCircle(centerX, centerY, this.orbRadius - 1);

        // Декоративная рамка
        this.drawOrbBorder();
    }

    /**
     * Отрисовка декоративной рамки орба
     */
    drawOrbBorder() {
        const centerX = this.orbSize / 2;
        const centerY = this.orbSize / 2;
        const colors = this.colors[this.resourceType];

        // Металлическая рамка с градиентом
        for (let i = 0; i < 4; i++) {
            const t = i / 4;
            const brightness = 0.4 + 0.3 * Math.sin(t * Math.PI);
            const r = Math.round(74 * brightness);
            const g = Math.round(58 * brightness);
            const b = Math.round(42 * brightness);
            const color = (r << 16) + (g << 8) + b;
            this.backgroundGraphics.lineStyle(1, color);
            this.backgroundGraphics.drawCircle(centerX, centerY, this.orbRadius + 2 - i * 0.5);
        }
    }

    /**
     * Отрисовка прогресса
     */
    renderProgress() {
        if (!this.progressGraphics) return;

        const value = this.getValue();
        const colors = this.colors[this.resourceType];
        const centerX = this.orbSize / 2;
        const centerY = this.orbSize / 2;
        const isLow = this.resourceType === 'health' && value < 0.3;
        const isCritical = this.resourceType === 'health' && value < 0.15;

        this.progressGraphics.clear();

        if (value <= 0) return;

        // Пульсация при низком здоровье
        let pulseScale = 1;
        if (isLow) {
            this.pulsePhase += 0.15;
            pulseScale = 1 + Math.sin(this.pulsePhase) * 0.08;
        }

        // Определяем цвет на основе уровня ресурса
        let mainColor;
        if (this.resourceType === 'health') {
            if (isCritical) {
                mainColor = colors.fillCritical;
            } else if (isLow) {
                mainColor = colors.fillLow;
            } else if (value < 0.5) {
                mainColor = colors.fill;
            } else {
                mainColor = colors.fillBright;
            }
        } else {
            mainColor = value > 0.8 ? colors.fillBright : colors.fill;
        }

        // Рисуем заполнение орба (круговое, снизу вверх)
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + 2 * Math.PI * value;

        // Внешнее свечение прогресса
        if (value > 0.5) {
            const glowIntensity = (value - 0.5) * 0.4;
            for (let r = this.orbRadius - 2; r >= this.orbRadius - 6; r -= 0.5) {
                const alpha = glowIntensity * (1 - (this.orbRadius - 2 - r) / 4);
                if (alpha > 0.02) {
                    this.progressGraphics.lineStyle(1, colors.glow, alpha);
                    this.progressGraphics.drawCircle(centerX, centerY, r * pulseScale);
                }
            }
        }

        // Основное заполнение (градиентный эффект через слои)
        const steps = Math.max(20, Math.floor(this.orbCircumference));
        
        for (let layer = 0; layer < 3; layer++) {
            const layerRadius = (this.orbRadius - 3 - layer * 1.5) * pulseScale;
            const layerAlpha = 1 - layer * 0.25;
            
            this.progressGraphics.lineStyle(3 - layer * 0.8, mainColor, layerAlpha);
            
            const points = [];
            for (let i = 0; i <= steps; i++) {
                const angle = startAngle + (endAngle - startAngle) * (i / steps);
                points.push(centerX + Math.cos(angle) * layerRadius);
                points.push(centerY + Math.sin(angle) * layerRadius);
            }

            if (points.length >= 4) {
                this.progressGraphics.moveTo(points[0], points[1]);
                for (let i = 2; i < points.length; i += 2) {
                    this.progressGraphics.lineTo(points[i], points[i + 1]);
                }
            }
        }

        // Блик на поверхности орба
        if (value > 0.3) {
            const highlightRadius = this.orbRadius * 0.3 * Math.min(1, value);
            const highlightX = centerX - this.orbRadius * 0.25;
            const highlightY = centerY - this.orbRadius * 0.25;

            this.progressGraphics.beginFill(0xffffff, 0.15 * value);
            this.progressGraphics.drawCircle(highlightX, highlightY, highlightRadius);
            this.progressGraphics.endFill();
        }

        // Частицы для маны
        if (this.resourceType === 'mana' && value > 0) {
            this.renderParticles(centerX, centerY);
        }
    }

    /**
     * Отрисовка частиц для маны
     */
    renderParticles(centerX, centerY) {
        this.particleTime += 0.05;

        // Обновляем частицы
        while (this.particles.length < this.maxParticles) {
            const angle = Math.random() * Math.PI * 2;
            const distance = this.orbRadius + 10 + Math.random() * 20;
            this.particles.push({
                angle: angle,
                distance: distance,
                speed: 0.02 + Math.random() * 0.03,
                size: 2 + Math.random() * 4,
                offset: Math.random() * Math.PI * 2
            });
        }

        this.progressGraphics.lineStyle(0);

        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            p.angle += p.speed;
            
            const pulse = Math.sin(this.particleTime + p.offset) * 0.3 + 0.7;
            const x = centerX + Math.cos(p.angle) * p.distance;
            const y = centerY + Math.sin(p.angle) * p.distance;

            // Свечение частицы
            for (let r = p.size * 2; r > 0; r -= 0.5) {
                const alpha = pulse * (1 - r / (p.size * 2)) * 0.6;
                this.progressGraphics.beginFill(0x4488ff, alpha);
                this.progressGraphics.drawCircle(x, y, r);
                this.progressGraphics.endFill();
            }
        }

        // Удаляем старые частицы и добавляем новые
        if (this.particles.length > this.maxParticles) {
            this.particles.shift();
        }
    }

    /**
     * Отрисовка фона для текста
     */
    renderTextBackground() {
        if (!this.textBgGraphics) return;

        const centerX = this.orbSize / 2;
        const centerY = this.orbSize / 2;

        this.textBgGraphics.clear();

        // Тёмный фон для текста
        const textBgWidth = 72;
        const textBgHeight = 36;

        // Градиентный фон
        for (let i = 0; i < textBgHeight / 2; i++) {
            const t = i / (textBgHeight / 2);
            const brightness = Math.round(15 + 10 * (1 - t));
            const color = (brightness << 16) + (brightness << 8) + brightness;
            this.textBgGraphics.beginFill(color, 0.8 - t * 0.3);
            this.textBgGraphics.drawRect(
                centerX - textBgWidth / 2,
                centerY - textBgHeight / 2 + i,
                textBgWidth,
                1
            );
            this.textBgGraphics.endFill();
        }

        // Золотая рамка
        this.textBgGraphics.lineStyle(2, 0xc9b896, 0.6);
        this.textBgGraphics.drawRoundedRect(
            centerX - textBgWidth / 2,
            centerY - textBgHeight / 2,
            textBgWidth,
            textBgHeight,
            4
        );
    }

    /**
     * Получение текущего значения ресурса
     */
    getValue() {
        if (!this.character) return 0;

        if (this.resourceType === 'health') {
            return this.character.health / this.character.maxHealth;
        } else if (this.resourceType === 'mana') {
            return this.character.mana / this.character.maxMana;
        }
        return 0;
    }

    /**
     * Получение текста для отображения
     */
    getText() {
        if (!this.character) return '0/0';

        if (this.resourceType === 'health') {
            return `${Math.ceil(this.character.health)}/${this.character.maxHealth}`;
        } else if (this.resourceType === 'mana') {
            return `${Math.floor(this.character.mana)}/${this.character.maxMana}`;
        }
        return '0/0';
    }

    /**
     * Обновление отображения
     */
    updateDisplay() {
        // Обновляем фон
        this.renderBackground();

        // Обновляем прогресс
        this.renderProgress();

        // Обновляем фон текста
        this.renderTextBackground();

        // Обновляем текст
        if (this.textSprite) {
            this.textSprite.text = this.getText();

            // Меняем цвет текста в зависимости от уровня ресурса
            const value = this.getValue();
            let textColor;
            
            if (this.resourceType === 'health') {
                if (value < 0.15) {
                    textColor = this.colors.health.textCritical;
                } else if (value < 0.3) {
                    textColor = this.colors.health.textLow;
                } else {
                    textColor = this.colors.health.text;
                }
            } else {
                textColor = this.colors.mana.text;
            }
            
            this.textSprite.style.fill = textColor;
            
            // Свечение текста при высоком ресурсе
            const glowIntensity = value > 0.8 ? 0.8 : 0.4;
            this.textSprite.style.dropShadowBlur = 2 + glowIntensity * 2;
            this.textSprite.style.dropShadowAlpha = glowIntensity;
        }
    }

    /**
     * Создание текстового спрайта
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

        return new PIXI.Text(text, style);
    }

    /**
     * Создание радиального градиента (вспомогательный метод)
     */
    createRadialGradient(centerX, centerY, radius, colorInner, colorOuter) {
        // В PIXI.Graphics нет встроенного радиального градиента,
        // поэтому используем послойную отрисовку кругов
        const layers = 10;
        for (let i = 0; i < layers; i++) {
            const t = i / layers;
            const r = Math.round(26 + (10 - 26) * t);
            const g = Math.round(26 + (10 - 10) * t);
            const b = Math.round(26 + (10 - 10) * t);
            const color = (r << 16) + (g << 8) + b;
        }
    }

    /**
     * Обновление при изменении
     */
    onUpdate(deltaTime) {
        this.updateDisplay();
    }

    /**
     * Отрисовка содержимого
     */
    renderContent() {
        // Содержимое уже отрисовано в соответствующих методах
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIResourceOrb;
} else if (typeof window !== 'undefined') {
    window.UIResourceOrb = UIResourceOrb;
}
