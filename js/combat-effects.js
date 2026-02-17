/**
 * Система визуальных и звуковых эффектов боя
 * Адаптирована для работы с PIXIRenderer
 */
class CombatEffectsSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.effects = [];
        this.audioContext = null;
        this.initAudioContext();
    }

    /**
     * Инициализация аудио контекста
     */
    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.log('Web Audio API не поддерживается:', e);
        }
    }

    /**
     * Запуск эффекта атаки
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {string} attackerType - Тип атакующего ('player' или 'enemy')
     */
    triggerAttack(x, y, attackerType) {
        // Проверяем, поддерживает ли рендерер эффекты атаки PIXI
        if (this.renderer.triggerAttackEffect) {
            this.renderer.triggerAttackEffect(x, y, attackerType);
        }

        // Воспроизводим звук атаки
        this.playAttackSound(attackerType);
    }


    /**
     * Запуск эффекта получения урона
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {number} damageAmount - Количество урона
     * @param {boolean} isCritical - Является ли критическим ударом
     */
    triggerDamage(x, y, damageAmount, isCritical) {
        if (isCritical) {
            this.triggerCritical(x, y, damageAmount);
        } else {
            // Создаем визуальный эффект урона через PIXI
            if (this.renderer.triggerDamageEffect) {
                this.renderer.triggerDamageEffect(x, y, damageAmount);
            }

            // Воспроизводим звук получения урона
            this.playDamageSound();
        }
    }

    /**
     * Запуск эффекта критического удара
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     * @param {number} damageAmount - Количество урона
     */
    triggerCritical(x, y, damageAmount) {
        // Создаем визуальный эффект критического удара через PIXI
        if (this.renderer.triggerCriticalEffect) {
            this.renderer.triggerCriticalEffect(x, y, damageAmount);
        }

        // Воспроизводим звук критического удара
        this.playCriticalSound();
    }

    /**
     * Запуск эффекта уворота
     * @param {number} x - X координата центра эффекта
     * @param {number} y - Y координата центра эффекта
     */
    triggerDodge(x, y) {
        // Создаем визуальный эффект уворота через PIXI
        if (this.renderer.triggerDodgeEffect) {
            this.renderer.triggerDodgeEffect(x, y);
        }

        // Воспроизводим звук уворота
        this.playDodgeSound();
    }

    /**
     * Воспроизведение звука атаки
     */
    playAttackSound(attackerType) {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Разные звуки для игрока и врага
            if (attackerType === 'player') {
                // Более высокий тон для игрока
                oscillator.type = 'square';
                oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(660, this.audioContext.currentTime + 0.1);
            } else {
                // Более низкий тон для врага
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(220, this.audioContext.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(330, this.audioContext.currentTime + 0.1);
            }
            
            gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.15);
        } catch (e) {
            console.log('Ошибка воспроизведения звука атаки:', e);
        }
    }

    /**
     * Воспроизведение звука получения урона
     */
    playDamageSound() {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(150, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.25);
        } catch (e) {
            console.log('Ошибка воспроизведения звука урона:', e);
        }
    }

    /**
     * Воспроизведение звука критического удара
     */
    playCriticalSound() {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const filter = this.audioContext.createBiquadFilter();
            
            oscillator.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.3);
            
            filter.type = 'highpass';
            filter.frequency.value = 1000;
            
            gainNode.gain.setValueAtTime(0.4, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.35);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.35);
        } catch (e) {
            console.log('Ошибка воспроизведения звука крита:', e);
        }
    }

    /**
     * Воспроизведение звука уворота
     */
    playDodgeSound() {
        if (!this.audioContext) return;
        
        try {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, this.audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0.15, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
        } catch (e) {
            console.log('Ошибка воспроизведения звука уворота:', e);
        }
    }

    /**
     * Обновление эффектов
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    update(deltaTime = 16.67) {
        // Проверяем, поддерживает ли рендерер обновление боевых эффектов PIXI
        if (this.renderer.updateCombatEffects) {
            // Используем новый PIXI-метод
            this.renderer.updateCombatEffects(deltaTime);
        }
    }

    /**
     * Отрисовка эффектов
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    render(deltaTime = 16.67) {
        // Проверяем, поддерживает ли рендерер рендеринг боевых эффектов PIXI
        if (this.renderer.renderCombatEffects) {
            this.renderer.renderCombatEffects();
        }
    }

    /**
     * Проверка, есть ли активные эффекты
     */
    hasActiveEffects() {
        if (this.renderer.hasActiveCombatEffects) {
            return this.renderer.hasActiveCombatEffects();
        }
        return this.effects.length > 0;
    }
}

// Экспортируем класс для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CombatEffectsSystem;
} else if (typeof window !== 'undefined') {
    window.CombatEffectsSystem = CombatEffectsSystem;
}