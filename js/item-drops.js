/**
 * Система выпадения предметов на землю
 * Адаптирована для PIXI рендерера
 */

class ItemDrop {
    constructor(item, x, y, stackOffset = 0) {
        this.item = item;
        this.realX = x; // Реальные координаты
        this.realY = y; // Реальные координаты
        this.displayX = x; // Отображаемые координаты (могут быть смещенными для предотвращения наложения)
        this.displayY = y; // Отображаемые координаты
        this.stackOffset = stackOffset; // Смещение для предотвращения наложения
        this.width = 60;
        this.height = 20;
        this.pickupRadius = 5; // Радиус, в котором можно подобрать предмет
        this.lifetime = 300; // Время жизни предмета в тиках (5 секунд при 60 FPS)
        this.age = 0;
        this.pickedUp = false;

        // Анимация падения
        this.fallY = y - 20; // Начальная высота падения
        this.targetY = y; // Конечная позиция
        this.fallProgress = 0; // Прогресс падения (0-1)

        // Применяем смещение для предотвращения наложения
        this.applyStackOffset();
    }

    /**
     * Применение смещения для предотвращения наложения
     */
    applyStackOffset() {
        // Смещаем позицию для отображения в зависимости от номера в стеке
        const offsetDistance = 12; // Расстояние между предметами в стеке
        const angle = (this.stackOffset * 30) * Math.PI / 180; // Угол смещения

        this.displayX = this.realX + Math.cos(angle) * offsetDistance * this.stackOffset;
        this.displayY = this.realY + Math.sin(angle) * offsetDistance * this.stackOffset;
    }

    /**
     * Обновление состояния предмета
     */
    update() {
        if (this.pickedUp) return;

        this.age++;

        // Анимация падения
        if (this.fallProgress < 1) {
            this.fallProgress = Math.min(1, this.fallProgress + 0.1);
            this.y = this.fallY + (this.targetY - this.fallY) * this.fallProgress;
        }

        // Проверяем, не истекло ли время жизни
        if (this.age >= this.lifetime) {
            this.pickedUp = true; // Удаляем как "собранный" чтобы не рендерить
        }
    }

    /**
     * Проверка, можно ли подобрать предмет
     */
    canBePickedUpBy(character) {
        if (this.pickedUp) return false;

        const distance = Math.sqrt(
            Math.pow(this.realX - character.x, 2) +
            Math.pow(this.realY - character.y, 2)
        );

        return distance <= this.pickupRadius;
    }

    /**
     * Подбор предмета
     */
    pickup(character) {
        if (this.pickedUp) return false;

        // Пытаемся добавить в инвентарь
        if (character.addToInventory(this.item)) {
            this.pickedUp = true;
            console.log(`Подобран предмет: ${this.item.name} (${this.item.rarity})`);
            return true;
        }

        return false;
    }
}

class ItemDropSystem {
    constructor() {
        this.drops = [];
    }

    /**
     * Создание выпавшего предмета
     */
    createItemDrop(item, x, y) {
        // Проверяем, есть ли уже предметы в этой позиции для определения смещения
        const nearbyDrops = this.getDropsAtPosition(x, y);
        const stackOffset = nearbyDrops.length;
        
        const drop = new ItemDrop(item, x, y, stackOffset);
        this.drops.push(drop);
        return drop;
    }

    /**
     * Получение предметов в определенной позиции (для определения наложений)
     */
    getDropsAtPosition(x, y) {
        const nearbyDrops = [];
        const proximityThreshold = 25; // Порог близости для определения наложения
        
        for (const drop of this.drops) {
            if (drop.pickedUp) continue;
            
            const distance = Math.sqrt(
                Math.pow(drop.realX - x, 2) + Math.pow(drop.realY - y, 2)
            );
            
            if (distance <= proximityThreshold) {
                nearbyDrops.push(drop);
            }
        }
        
        return nearbyDrops;
    }

    /**
     * Обновление всех выпавших предметов
     */
    update() {
        // Обновляем каждый предмет
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            drop.update();

            // Удаляем просроченные предметы
            if (drop.pickedUp) {
                this.drops.splice(i, 1);
            }
        }
        
        // После удаления предметов, пересчитываем смещения для оставшихся
        this.recalculateStackOffsets();
    }
    
    /**
     * Пересчет смещений для стека предметов
     */
    recalculateStackOffsets() {
        // Группируем предметы по позициям
        const positionGroups = new Map();

        for (const drop of this.drops) {
            // Используем округленные координаты как ключ
            const key = `${Math.round(drop.realX / 10)}_${Math.round(drop.realY / 10)}`;

            if (!positionGroups.has(key)) {
                positionGroups.set(key, []);
            }
            positionGroups.get(key).push(drop);
        }

        // Для каждой группы переназначаем смещения
        for (const group of positionGroups.values()) {
            group.sort((a, b) => a.stackOffset - b.stackOffset); // Сортируем по текущему смещению

            for (let i = 0; i < group.length; i++) {
                if (group[i].stackOffset !== i) {
                    group[i].stackOffset = i;
                    group[i].applyStackOffset();
                }
            }
        }
    }

    /**
     * Попытка подобрать предмет по координатам
     */
    tryPickupAt(x, y, character) {
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            const distance = Math.sqrt(
                Math.pow(drop.realX - x, 2) + Math.pow(drop.realY - y, 2)
            );

            if (distance <= drop.pickupRadius && !drop.pickedUp) {
                return drop.pickup(character);
            }
        }
        return false;
    }

    /**
     * Попытка подобрать ближайший предмет к персонажу
     */
    tryPickupNearest(character) {
        let nearestDrop = null;
        let nearestDistance = Infinity;

        for (const drop of this.drops) {
            if (drop.pickedUp) continue;

            const distance = Math.sqrt(
                Math.pow(drop.realX - character.x, 2) + Math.pow(drop.realY - character.y, 2)
            );

            if (distance <= drop.pickupRadius && distance < nearestDistance) {
                nearestDrop = drop;
                nearestDistance = distance;
            }
        }

        if (nearestDrop) {
            return nearestDrop.pickup(character);
        }

        return false;
    }

    /**
     * Получение всех предметов в радиусе
     */
    getDropsInRange(x, y, range) {
        const dropsInRange = [];

        for (const drop of this.drops) {
            if (drop.pickedUp) continue;

            const distance = Math.sqrt(
                Math.pow(drop.realX - x, 2) + Math.pow(drop.realY - y, 2)
            );

            if (distance <= range) {
                dropsInRange.push(drop);
            }
        }

        return dropsInRange;
    }

    /**
     * Получение предмета под курсором
     * @param {number} mouseX - Координата X курсора (экранная)
     * @param {number} mouseY - Координата Y курсора (экранная)
     * @param {Object} renderer - PIXI renderer с камерой
     * @returns {ItemDrop|null} - предмет под курсором или null
     */
    getDropAtPoint(mouseX, mouseY, renderer) {
        const centerX = renderer.app.screen.width / 2;
        const centerY = renderer.app.screen.height / 2;
        const zoom = renderer.camera.zoom;

        // Проходим по предметам в обратном порядке, чтобы верхние элементы имели приоритет
        for (let i = this.drops.length - 1; i >= 0; i--) {
            const drop = this.drops[i];
            if (drop.pickedUp) continue;

            // Преобразуем мировые координаты в экранные
            const screenX = centerX + (drop.displayX - renderer.camera.x) * zoom;
            const screenY = centerY + (drop.displayY - renderer.camera.y) * zoom;

            // Размеры с учетом зума
            const scaledWidth = drop.width * zoom;
            const scaledHeight = drop.height * zoom;

            // Проверяем, находится ли точка внутри прямоугольника предмета
            if (
                mouseX >= screenX - scaledWidth / 2 &&
                mouseX <= screenX + scaledWidth / 2 &&
                mouseY >= screenY - scaledHeight / 2 &&
                mouseY <= screenY + scaledHeight / 2
            ) {
                return drop;
            }
        }
        return null;
    }
}