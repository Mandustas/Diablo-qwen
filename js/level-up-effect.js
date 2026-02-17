/**
 * Система визуальных эффектов получения нового уровня
 * Адаптирована для работы с PIXIRenderer
 */
class LevelUpEffect {
    constructor(renderer) {
        this.renderer = renderer;
        this.isActive = false;
        this.effects = [];
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
            this.renderer.triggerLevelUpEffect(x, y, level);
        }

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
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    update(deltaTime = 16.67) {
        // Проверяем, поддерживает ли рендерер обновление эффектов уровня PIXI
        if (this.renderer.updateLevelUpEffects) {
            this.renderer.updateLevelUpEffects(deltaTime);

            // Проверяем активность эффектов через рендерер
            this.isActive = this.renderer.hasActiveLevelUpEffects();
        }
    }

    /**
     * Отрисовка эффектов
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    render(deltaTime = 16.67) {
        // Проверяем, поддерживает ли рендерер рендеринг эффектов уровня PIXI
        if (this.renderer.renderLevelUpEffects) {
            this.renderer.renderLevelUpEffects();
        }
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