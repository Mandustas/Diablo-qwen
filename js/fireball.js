/**
 * Класс огненного шара
 * Снаряд с динамическим освещением и эффектом взрыва
 */
class Fireball extends Projectile {
    /**
     * Конструктор огненного шара
     * @param {Object} config - конфигурация
     */
    constructor(config) {
        super(config);
        
        this.type = 'fireball';
        
        // Настройки из конфигурации
        const fireballConfig = GAME_CONFIG.LIGHTING.FIREBALL;
        this.lightRadius = config.lightRadius || fireballConfig.LIGHT_RADIUS;
        this.lightColor = config.lightColor || fireballConfig.LIGHT_COLOR;
        this.lightIntensity = config.lightIntensity || fireballConfig.LIGHT_INTENSITY;
        this.speed = config.speed || fireballConfig.SPEED;
        this.explosionRadius = config.explosionRadius || fireballConfig.EXPLOSION_RADIUS;
        this.maxRange = config.maxRange || fireballConfig.MAX_RANGE * GAME_CONFIG.TILE.BASE_SIZE;

        // Отслеживание пройденного расстояния
        this.distanceTraveled = 0;
        this.lastX = this.x;
        this.lastY = this.y;
        
        // Частицы огня
        this.particles = [];
        this.particleCount = config.particleCount || fireballConfig.PARTICLE_COUNT;
        
        // Время жизни частиц взрыва
        this.explosionLifetime = 500; // мс
        this.explosionTime = 0;
        this.isExploding = false;
        
        // Графика
        this.flameGraphics = null;
        this.glowGraphics = null;
        
        // Анимация
        this.animTime = 0;
    }
    
    /**
     * Создание спрайта огненного шара
     */
    createSprite() {
        // Контейнер уже создан в родительском классе
        
        // Создаём графику для частиц пламени
        this.flameGraphics = new PIXI.Graphics();
        this.container.addChild(this.flameGraphics);
        
        // Создаём эффект свечения
        this.glowGraphics = new PIXI.Graphics();
        this.glowGraphics.blendMode = PIXI.BLEND_MODES.ADD;
        this.container.addChild(this.glowGraphics);
        
        // Инициализируем частицы
        this.initParticles();
        
        // Создаём источник света
        if (this.lightSource === null) {
            this.createLightSource(window.game?.lightingSystem, {
                radius: this.lightRadius,
                color: this.lightColor,
                intensity: this.lightIntensity,
                flicker: true,
                flickerSpeed: 10,
                flickerAmount: 0.2,
                height: 32
            });
        }
    }
    
    /**
     * Инициализация частиц пламени
     */
    initParticles() {
        this.particles = [];
        
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                size: 3 + Math.random() * 5,
                speed: 0.3 + Math.random() * 0.5,
                phase: Math.random() * Math.PI * 2,
                alpha: 0.6 + Math.random() * 0.4,
                lifetime: 0,
                maxLifetime: 200 + Math.random() * 300
            });
        }
    }
    
    /**
     * Обновление огненного шара
     * @param {number} deltaTime - время с последнего обновления в мс
     * @returns {boolean} - активен ли снаряд
     */
    update(deltaTime) {
        if (!this.active) return false;

        this.animTime += deltaTime / 1000;

        // Если взрываемся
        if (this.isExploding) {
            return this.updateExplosion(deltaTime);
        }

        // Сохраняем предыдущую позицию
        this.lastX = this.x;
        this.lastY = this.y;

        // Обычное обновление
        const result = super.update(deltaTime);

        // Обновляем пройденное расстояние
        const dx = this.x - this.lastX;
        const dy = this.y - this.lastY;
        this.distanceTraveled += Math.sqrt(dx * dx + dy * dy);

        // Проверяем превышение максимальной дальности
        if (this.distanceTraveled >= this.maxRange) {
            this.explode();
            return false;
        }

        // Обновляем частицы
        this.updateParticles(deltaTime);

        // Обновляем графику
        this.updateGraphics();

        return result;
    }
    
    /**
     * Обновление частиц пламени
     * @param {number} deltaTime - время с последнего обновления
     */
    updateParticles(deltaTime) {
        for (const particle of this.particles) {
            particle.lifetime += deltaTime;

            // Если частица умерла, возрождаем её
            if (particle.lifetime > particle.maxLifetime) {
                particle.lifetime = 0;
                particle.x = 0;
                particle.y = 0;
                particle.size = 3 + Math.random() * 5;
            }

            // Движение частицы (назад относительно движения снаряда)
            particle.phase += deltaTime * 0.01;
            // speed теперь в пикселях в секунду, конвертируем в пиксели за deltaTime
            particle.x -= this.directionX * particle.speed * (deltaTime / 1000);
            particle.y -= this.directionY * particle.speed * (deltaTime / 1000);

            // Добавляем небольшое случайное движение
            particle.x += Math.sin(particle.phase) * 0.5;
            particle.y += Math.cos(particle.phase) * 0.5;
        }
    }
    
    /**
     * Обновление графики огненного шара
     */
    updateGraphics() {
        // Очищаем графику
        this.flameGraphics.clear();
        this.glowGraphics.clear();
        
        // Рисуем частицы пламени
        for (const particle of this.particles) {
            const lifeRatio = particle.lifetime / particle.maxLifetime;
            
            // Цвет от жёлтого к красному
            const r = 255;
            const g = Math.floor(200 - lifeRatio * 150);
            const b = Math.floor(50 - lifeRatio * 50);
            const color = (r << 16) + (Math.max(0, g) << 8) + Math.max(0, b);
            
            const alpha = particle.alpha * (1 - lifeRatio * 0.5);
            const size = particle.size * (1 - lifeRatio * 0.3);
            
            this.flameGraphics.beginFill(color, alpha);
            this.flameGraphics.drawCircle(particle.x, particle.y, size);
            this.flameGraphics.endFill();
        }
        
        // Рисуем ядро огненного шара
        const coreSize = 8 + Math.sin(this.animTime * 10) * 2;
        
        // Внешнее ядро (оранжевое)
        this.flameGraphics.beginFill(0xff6600, 0.8);
        this.flameGraphics.drawCircle(0, 0, coreSize);
        this.flameGraphics.endFill();
        
        // Внутреннее ядро (жёлтое)
        this.flameGraphics.beginFill(0xffcc00, 0.9);
        this.flameGraphics.drawCircle(0, 0, coreSize * 0.6);
        this.flameGraphics.endFill();
        
        // Центр (белый)
        this.flameGraphics.beginFill(0xffffee, 1.0);
        this.flameGraphics.drawCircle(0, 0, coreSize * 0.3);
        this.flameGraphics.endFill();
        
        // Рисуем свечение
        const glowSize = 15 + Math.sin(this.animTime * 8) * 3;
        for (let i = glowSize; i > 0; i -= 3) {
            const alpha = (1 - i / glowSize) * 0.4;
            this.glowGraphics.beginFill(0xff4400, alpha);
            this.glowGraphics.drawCircle(0, 0, i);
            this.glowGraphics.endFill();
        }
    }
    
    /**
     * Обработка достижения цели
     */
    onReachTarget() {
        this.explode();
    }
    
    /**
     * Взрыв огненного шара
     */
    explode() {
        this.isExploding = true;
        this.explosionTime = 0;
        
        // Увеличиваем радиус света для взрыва
        if (this.lightSource) {
            this.lightSource.radius = this.explosionRadius * 2;
            this.lightSource.intensity = 1.5;
        }
        
        // Наносим урон в области
        this.dealExplosionDamage();
        
        // Создаём эффект взрыва
        this.createExplosionEffect();
    }
    
    /**
     * Нанесение урона в области взрыва
     */
    dealExplosionDamage() {
        const tileSize = GAME_CONFIG.TILE.BASE_SIZE;
        const explosionRadiusPixels = this.explosionRadius * tileSize;
        
        // Получаем врагов из игры
        const enemies = window.game?.enemies || [];
        
        for (const enemy of enemies) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= explosionRadiusPixels) {
                // Урон уменьшается с расстоянием
                const damageMultiplier = 1 - (distance / explosionRadiusPixels) * 0.5;
                const actualDamage = Math.floor(this.damage * damageMultiplier);
                
                if (enemy.takeDamage) {
                    enemy.takeDamage(actualDamage);
                }
            }
        }
    }
    
    /**
     * Создание эффекта взрыва
     */
    createExplosionEffect() {
        // Очищаем старые частицы
        this.particles = [];
        
        // Создаём частицы взрыва
        for (let i = 0; i < 30; i++) {
            const angle = (Math.PI * 2 / 30) * i + Math.random() * 0.5;
            const speed = 2 + Math.random() * 3;
            
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 5 + Math.random() * 8,
                alpha: 0.8 + Math.random() * 0.2,
                lifetime: 0,
                maxLifetime: this.explosionLifetime
            });
        }
    }
    
    /**
     * Обновление взрыва
     * @param {number} deltaTime - время с последнего обновления
     * @returns {boolean} - продолжается ли взрыв
     */
    updateExplosion(deltaTime) {
        this.explosionTime += deltaTime;

        // Проверяем, закончился ли взрыв
        if (this.explosionTime >= this.explosionLifetime) {
            this.active = false;
            return false;
        }

        const progress = this.explosionTime / this.explosionLifetime;

        // Обновляем частицы взрыва
        this.flameGraphics.clear();
        this.glowGraphics.clear();

        for (const particle of this.particles) {
            particle.lifetime += deltaTime;

            // Движение частицы
            // speed теперь в пикселях в секунду, конвертируем в пиксели за deltaTime
            particle.x += particle.vx * (deltaTime / 1000);
            particle.y += particle.vy * (deltaTime / 1000);
            
            // Затухание
            const alpha = particle.alpha * (1 - progress);
            const size = particle.size * (1 - progress * 0.5);
            
            // Цвет от оранжевого к красному
            const r = 255;
            const g = Math.floor(100 - progress * 100);
            const b = 0;
            const color = (r << 16) + (Math.max(0, g) << 8) + b;
            
            this.flameGraphics.beginFill(color, alpha);
            this.flameGraphics.drawCircle(particle.x, particle.y, size);
            this.flameGraphics.endFill();
        }
        
        // Центральная вспышка
        if (progress < 0.3) {
            const flashProgress = progress / 0.3;
            const flashSize = 30 * (1 - flashProgress);
            const flashAlpha = 0.8 * (1 - flashProgress);
            
            this.glowGraphics.beginFill(0xffff00, flashAlpha);
            this.glowGraphics.drawCircle(0, 0, flashSize);
            this.glowGraphics.endFill();
        }
        
        // Уменьшаем интенсивность света
        if (this.lightSource) {
            this.lightSource.intensity = this.lightIntensity * (1 - progress);
        }
        
        return true;
    }
    
    /**
     * Проверка столкновения с целью
     * Переопределено для учёта радиуса взрыва
     * @param {Object} target - цель
     * @returns {boolean} - произошло ли столкновение
     */
    checkCollision(target) {
        if (!target) return false;
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = target.hitboxRadius || 16;
        
        // Увеличенный радиус попадания для файрбола
        return distance < hitRadius + 10;
    }
}

/**
 * Фабрика для создания огненных шаров
 */
class FireballFactory {
    /**
     * Создание огненного шара от игрока к цели
     * @param {Character} character - персонаж-владелец
     * @param {number} targetX - X координата цели
     * @param {number} targetY - Y координата цели
     * @param {Object} skill - данные навыка
     * @returns {Fireball} - созданный огненный шар
     */
    static createFromCharacter(character, targetX, targetY, skill) {
        // Вычисляем урон
        const baseDamage = character.getTotalStat('damage') * 0.5;
        const skillBonus = character.getSkillBonus('fireball');
        const totalDamage = baseDamage + skillBonus;
        
        return new Fireball({
            x: character.x,
            y: character.y,
            targetX: targetX,
            targetY: targetY,
            damage: totalDamage,
            owner: character,
            speed: GAME_CONFIG.LIGHTING.FIREBALL.SPEED,
            lightRadius: GAME_CONFIG.LIGHTING.FIREBALL.LIGHT_RADIUS,
            lightColor: GAME_CONFIG.LIGHTING.FIREBALL.LIGHT_COLOR,
            lightIntensity: GAME_CONFIG.LIGHTING.FIREBALL.LIGHT_INTENSITY,
            explosionRadius: GAME_CONFIG.LIGHTING.FIREBALL.EXPLOSION_RADIUS,
            particleCount: GAME_CONFIG.LIGHTING.FIREBALL.PARTICLE_COUNT
        });
    }
}