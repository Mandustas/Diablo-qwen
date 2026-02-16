/**
 * Система визуальных эффектов получения нового уровня
 */
class LevelUpEffect {
    constructor(renderer) {
        this.renderer = renderer;
        this.effects = [];
        this.isActive = false;
    }

    /**
     * Запуск эффекта получения уровня
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {number} level - новый уровень
     */
    triggerLevelUp(x, y, level) {
        this.isActive = true;
        
        // Создаем частицы для эффекта
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const size = 2 + Math.random() * 4;
            const lifetime = 60 + Math.random() * 60; // 1-2 секунды при 60fps
            
            // Разные цвета для эффекта (золотой, белый, желтый)
            const colors = ['#FFD700', '#FFFFFF', '#FFFF00', '#FFA500', '#FFFF99'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.effects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: color,
                life: lifetime,
                maxLife: lifetime,
                type: 'particle'
            });
        }
        
        // Добавляем текст "LEVEL UP!" в центр эффекта
        this.effects.push({
            x: x,
            y: y - 30,
            text: 'LEVEL UP!',
            fontSize: 24,
            color: '#FFD700',
            life: 120, // 2 секунды при 60fps
            maxLife: 120,
            type: 'text',
            scale: 1.0
        });
        
        // Добавляем числовое обозначение уровня
        this.effects.push({
            x: x,
            y: y + 10,
            text: `${level}`,
            fontSize: 32,
            color: '#FFFFFF',
            life: 100, // 1.6 секунды при 60fps
            maxLife: 100,
            type: 'text',
            scale: 1.0
        });
        
        // Воспроизводим звук получения уровня (если доступен)
        this.playLevelUpSound();
    }

    /**
     * Воспроизведение звука получения уровня
     */
    playLevelUpSound() {
        // Создаем простой звуковой эффект с помощью Web Audio API
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            
            // Создаем гармоничную мелодию для получения уровня
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            // Устанавливаем параметры осциллятора для приятного звука
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
            oscillator.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
            oscillator.frequency.setValueAtTime(783.99, audioCtx.currentTime + 0.2); // G5
            oscillator.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.3); // C6
            
            // Регулируем громкость
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
            
            // Запускаем и останавливаем осциллятор
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.5);
        } catch (e) {
            console.log('Не удалось воспроизвести звук получения уровня:', e);
        }
    }

    /**
     * Обновление эффектов
     */
    update() {
        if (!this.isActive || this.effects.length === 0) {
            this.isActive = false;
            return;
        }

        // Обновляем каждый эффект
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life--;

            if (effect.type === 'particle') {
                // Обновляем позицию частицы
                effect.x += effect.vx;
                effect.y += effect.vy;
                
                // Добавляем гравитацию
                effect.vy += 0.1;
                
                // Уменьшаем скорость из-за трения
                effect.vx *= 0.98;
                effect.vy *= 0.98;
            } else if (effect.type === 'text') {
                // Для текста увеличиваем масштаб в начале и уменьшаем к концу
                const lifeRatio = effect.life / effect.maxLife;
                if (lifeRatio > 0.7) {
                    effect.scale = 1 + (0.5 * (1 - (lifeRatio - 0.7) / 0.3)); // Увеличение в начале
                } else {
                    effect.scale = 1.5 - (0.5 * (1 - lifeRatio / 0.7)); // Уменьшение к концу
                }
                
                // Поднимаем текст вверх
                effect.y -= 0.5;
            }

            // Удаляем эффект, если время жизни истекло
            if (effect.life <= 0) {
                this.effects.splice(i, 1);
            }
        }

        // Если все эффекты закончились, деактивируем систему
        if (this.effects.length === 0) {
            this.isActive = false;
        }
    }

    /**
     * Отрисовка эффектов
     */
    render() {
        if (!this.isActive || this.effects.length === 0) {
            return;
        }

        // Получаем canvas и ctx (поддержка как старого Renderer, так и PIXIRenderer)
        const canvas = this.renderer.canvas || (this.renderer.app && this.renderer.app.view);
        const ctx = this.renderer.ctx || (canvas ? canvas.getContext('2d') : null);

        if (!ctx) {
            // Если контекст не найден (PIXI рендерер), пропускаем рендеринг эффектов
            return;
        }

        // Сохраняем текущее состояние контекста
        ctx.save();

        // Центр экрана
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        for (const effect of this.effects) {
            // Преобразуем мировые координаты в экранные с учетом зума
            const screenX = centerX + (effect.x - this.renderer.camera.x) * this.renderer.camera.zoom;
            const screenY = centerY + (effect.y - this.renderer.camera.y) * this.renderer.camera.zoom;

            if (effect.type === 'particle') {
                // Рассчитываем прозрачность в зависимости от оставшегося времени жизни
                const alpha = effect.life / effect.maxLife;
                ctx.globalAlpha = alpha;

                // Устанавливаем цвет частицы
                ctx.fillStyle = effect.color;

                // Рисуем круг-частицу (масштабируем размер с учетом зума)
                ctx.beginPath();
                ctx.arc(screenX, screenY, effect.size * this.renderer.camera.zoom * alpha, 0, Math.PI * 2);
                ctx.fill();
            } else if (effect.type === 'text') {
                // Рассчитываем прозрачность
                const alpha = effect.life / effect.maxLife;
                ctx.globalAlpha = alpha;

                // Устанавливаем стиль текста (масштабируем размер с учетом зума)
                ctx.font = `${effect.fontSize * effect.scale * this.renderer.camera.zoom}px 'MedievalSharp', Arial, sans-serif`;
                ctx.fillStyle = effect.color;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                // Рисуем текст
                ctx.fillText(effect.text, screenX, screenY);
            }
        }

        // Восстанавливаем состояние контекста
        ctx.restore();
    }

    /**
     * Проверка, активен ли эффект
     */
    getActiveStatus() {
        return this.isActive;
    }
}

// Экспортируем класс для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelUpEffect;
} else if (typeof window !== 'undefined') {
    window.LevelUpEffect = LevelUpEffect;
}