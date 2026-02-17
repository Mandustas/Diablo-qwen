/**
 * Система визуальных и звуковых эффектов боя
 * Адаптирована для работы с PIXIRenderer
 */
class CombatEffectsSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.effects = []; // Для совместимости со старым Canvas рендерером
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
            } else {
                // Fallback для старого Canvas рендерера
                this.createDamageVisualEffect(x, y, damageAmount);
            }

            // Воспроизводим звук получения урона
            this.playDamageSound();
        }
    }

    /**
     * Создание визуального эффекта урона (fallback для Canvas)
     */
    createDamageVisualEffect(x, y, damageAmount) {
        // Отображение числа урона
        const damageText = {
            x: x,
            y: y - 20,
            text: `${damageAmount}`,
            fontSize: 18,
            color: '#FF0000',
            life: 60, // 1 секунда при 60fps
            maxLife: 60,
            type: 'damage_text',
            scale: 1.0
        };

        this.effects.push(damageText);

        // Красные частицы урона
        for (let i = 0; i < 8; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 2;
            const size = 2 + Math.random() * 3;

            this.effects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: '#FF0000',
                life: 30 + Math.random() * 30,
                maxLife: 30 + Math.random() * 30,
                type: 'damage_particle'
            });
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
        } else {
            // Fallback для старого Canvas рендерера
            this.createCriticalVisualEffect(x, y, damageAmount);
        }

        // Воспроизводим звук критического удара
        this.playCriticalSound();
    }

    /**
     * Создание визуального эффекта критического удара (fallback для Canvas)
     */
    createCriticalVisualEffect(x, y, damageAmount) {
        // Отображение числа критического урона
        const criticalText = {
            x: x,
            y: y - 30,
            text: `${damageAmount}!`,
            fontSize: 24,
            color: '#FFFF00', // Желтый для крита
            life: 90, // 1.5 секунды при 60fps
            maxLife: 90,
            type: 'critical_text',
            scale: 1.0
        };

        this.effects.push(criticalText);

        // Особые частицы для крита
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 3;
            const size = 3 + Math.random() * 4;

            this.effects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: '#FFFF00',
                life: 40 + Math.random() * 40,
                maxLife: 40 + Math.random() * 40,
                type: 'critical_particle'
            });
        }

        // Вспышка крита
        this.effects.push({
            x: x,
            y: y,
            size: 15,
            maxSize: 50,
            growthRate: 1.5,
            color: '#FFFF00',
            life: 15,
            maxLife: 15,
            type: 'critical_flash'
        });
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
        } else {
            // Fallback для старого Canvas рендерера
            this.createDodgeVisualEffect(x, y);
        }

        // Воспроизводим звук уворота
        this.playDodgeSound();
    }

    /**
     * Создание визуального эффекта уворота (fallback для Canvas)
     */
    createDodgeVisualEffect(x, y) {
        // Отображение текста "MISS"
        const missText = {
            x: x,
            y: y - 20,
            text: 'MISS',
            fontSize: 20,
            color: '#808080', // Серый для уворота
            life: 60, // 1 секунда при 60fps
            maxLife: 60,
            type: 'miss_text',
            scale: 1.0
        };

        this.effects.push(missText);

        // Легкие частицы для уворота
        for (let i = 0; i < 5; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * 1.5;
            const size = 1 + Math.random() * 2;

            this.effects.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: size,
                color: '#808080',
                life: 20 + Math.random() * 20,
                maxLife: 20 + Math.random() * 20,
                type: 'dodge_particle'
            });
        }
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
        } else {
            // Fallback для старого Canvas рендерера
            this._updateCanvas();
        }
    }

    /**
     * Обновление эффектов для Canvas рендерера (fallback)
     */
    _updateCanvas() {
        // Обновляем каждый эффект
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const effect = this.effects[i];
            effect.life--;

            if (effect.type === 'attack_flash' || effect.type === 'critical_flash') {
                // Увеличиваем размер вспышки
                effect.size = Math.min(effect.size * effect.growthRate, effect.maxSize);

                // Уменьшаем прозрачность
                effect.alpha = effect.life / effect.maxLife;
            } else if (effect.type === 'damage_particle' || effect.type === 'critical_particle' || effect.type === 'dodge_particle') {
                // Обновляем позицию частицы
                effect.x += effect.vx;
                effect.y += effect.vy;

                // Добавляем гравитацию
                effect.vy += 0.1;

                // Уменьшаем скорость из-за трения
                effect.vx *= 0.98;
                effect.vy *= 0.98;
            } else if (effect.type === 'damage_text' || effect.type === 'critical_text' || effect.type === 'miss_text') {
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
    }

    /**
     * Отрисовка эффектов
     * @param {number} deltaTime - время с последнего обновления в миллисекундах
     */
    render(deltaTime = 16.67) {
        // Проверяем, поддерживает ли рендерер рендеринг боевых эффектов PIXI
        if (this.renderer.renderCombatEffects) {
            // Используем новый PIXI-метод
            this.renderer.renderCombatEffects();
        }
        // Для старого Canvas рендерера ничего не делаем - он рендерит в update
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