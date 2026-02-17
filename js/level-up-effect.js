/**
 * Система визуальных эффектов получения нового уровня
 * Адаптирована для работы с PIXIRenderer
 */
class LevelUpEffect {
    constructor(renderer) {
        this.renderer = renderer;
        this.isActive = false;
        this.effects = []; // Для совместимости со старым Canvas рендерером
    }

    /**
     * Запуск эффекта получения уровня
     * @param {number} x - X координата центра эффекта в мировых координатах
     * @param {number} y - Y координата центра эффекта в мировых координатах
     * @param {number} level - новый уровень
     */
    triggerLevelUp(x, y, level) {
        this.isActive = true;

        // Проверяем, поддерживает ли рендерер эффекты уровня PIXI
        if (this.renderer.triggerLevelUpEffect) {
            // Используем новый PIXI-метод
            this.renderer.triggerLevelUpEffect(x, y, level);
        } else {
            // Fallback для старого Canvas рендерера
            this._triggerLevelUpCanvas(x, y, level);
        }

        // Воспроизводим звук получения уровня (если доступен)
        this.playLevelUpSound();
    }

    /**
     * Запуск эффекта получения уровня для Canvas рендерера (fallback)
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {number} level - новый уровень
     */
    _triggerLevelUpCanvas(x, y, level) {
        // Создаем частицы для эффекта
        for (let i = 0; i < 50; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const size = 2 + Math.random() * 4;
            const lifetime = 1000 + Math.random() * 1000; // 1-2 секунды

            // Разные цвета для эффекта (золотой, белый, желтый)
            const colors = ['#FFD700', '#FFFFFF', '#FFFF00', '#FFA500', '#FFFF99'];
            const color = colors[Math.floor(Math.random() * colors.length)];

            this.renderer.createLevelUpParticle(
                x, y,
                color,
                size,
                Math.cos(angle) * speed,
                Math.sin(angle) * speed,
                lifetime
            );
        }

        // Добавляем текст "LEVEL UP!" в центр эффекта
        this.renderer.createLevelUpText(
            x, y - 30,
            'LEVEL UP!',
            24,
            '#FFD700',
            2000, // 2 секунды
            -30
        );

        // Добавляем числовое обозначение уровня
        this.renderer.createLevelUpText(
            x, y + 10,
            `${level}`,
            32,
            '#FFFFFF',
            1600, // 1.6 секунды
            10
        );
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
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    update(deltaTime = 16.67) { // 16.67ms = 60fps
        // Проверяем, поддерживает ли рендерер обновление эффектов уровня PIXI
        if (this.renderer.updateLevelUpEffects) {
            // Используем новый PIXI-метод
            this.renderer.updateLevelUpEffects(deltaTime);
            
            // Проверяем активность эффектов через рендерер
            this.isActive = this.renderer.hasActiveLevelUpEffects();
        } else {
            // Fallback для старого Canvas рендерера
            this._updateCanvas();
        }
    }

    /**
     * Обновление эффектов для Canvas рендерера (fallback)
     */
    _updateCanvas() {
        // Старая логика обновления для совместимости
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
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    render(deltaTime = 16.67) {
        // Проверяем, поддерживает ли рендерер рендеринг эффектов уровня PIXI
        if (this.renderer.renderLevelUpEffects) {
            // Используем новый PIXI-метод
            this.renderer.renderLevelUpEffects();
        }
        // Для старого Canvas рендерера ничего не делаем - он рендерит в update
    }

    /**
     * Проверка, активен ли эффект
     */
    getActiveStatus() {
        if (this.renderer.hasActiveLevelUpEffects) {
            return this.renderer.hasActiveLevelUpEffects();
        }
        return this.isActive;
    }
}

// Экспортируем класс для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LevelUpEffect;
} else if (typeof window !== 'undefined') {
    window.LevelUpEffect = LevelUpEffect;
}