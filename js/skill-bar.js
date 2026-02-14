class SkillBar {
    constructor(character) {
        this.character = character;
        this.hotkeys = {}; // Сопоставление горячих клавиш с навыками
        this.skillElements = {}; // Элементы UI для каждого слота
        
        this.createSkillBarUI();
    }
    
    /**
     * Создание UI панели навыков
     */
    createSkillBarUI() {
        // Создаем контейнер для панели навыков
        this.container = document.createElement('div');
        this.container.id = 'skillBar';
        this.container.style.position = 'absolute';
        this.container.style.bottom = '10px';
        this.container.style.left = '50%';
        this.container.style.transform = 'translateX(-50%)';
        this.container.style.display = 'flex';
        this.container.style.gap = '5px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.padding = '10px';
        this.container.style.borderRadius = '5px';
        this.container.style.zIndex = '30';
        
        // Создаем 9 слотов для навыков (под горячие клавиши 1-9)
        for (let i = 1; i <= 9; i++) {
            const slot = this.createSkillSlot(i);
            this.container.appendChild(slot);
            this.skillElements[i] = slot;
        }
        
        document.body.appendChild(this.container);
    }
    
    /**
     * Создание слота для навыка
     * @param {number} slotNumber - номер слота
     * @returns {HTMLElement} - элемент слота
     */
    createSkillSlot(slotNumber) {
        const slot = document.createElement('div');
        slot.className = 'skill-slot';
        slot.style.width = '50px';
        slot.style.height = '50px';
        slot.style.border = '2px solid #444';
        slot.style.borderRadius = '5px';
        slot.style.backgroundColor = '#222';
        slot.style.display = 'flex';
        slot.style.flexDirection = 'column';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        
        // Номер слота
        const numberLabel = document.createElement('div');
        numberLabel.textContent = slotNumber;
        numberLabel.style.position = 'absolute';
        numberLabel.style.top = '-10px';
        numberLabel.style.left = '2px';
        numberLabel.style.fontSize = '12px';
        numberLabel.style.color = '#fff';
        numberLabel.style.backgroundColor = '#333';
        numberLabel.style.borderRadius = '3px';
        numberLabel.style.padding = '1px 3px';
        slot.appendChild(numberLabel);
        
        // Иконка навыка
        const icon = document.createElement('div');
        icon.className = 'skill-icon';
        icon.style.width = '24px';
        icon.style.height = '24px';
        icon.style.backgroundColor = '#555';
        icon.style.borderRadius = '3px';
        slot.appendChild(icon);
        
        // Кулдаун
        const cooldownOverlay = document.createElement('div');
        cooldownOverlay.className = 'cooldown-overlay';
        cooldownOverlay.style.position = 'absolute';
        cooldownOverlay.style.top = '0';
        cooldownOverlay.style.left = '0';
        cooldownOverlay.style.width = '100%';
        cooldownOverlay.style.height = '100%';
        cooldownOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        cooldownOverlay.style.display = 'none';
        cooldownOverlay.style.borderRadius = '3px';
        cooldownOverlay.style.display = 'flex';
        cooldownOverlay.style.justifyContent = 'center';
        cooldownOverlay.style.alignItems = 'center';
        cooldownOverlay.style.color = '#fff';
        cooldownOverlay.style.fontSize = '14px';
        slot.appendChild(cooldownOverlay);
        
        // Обработчик клика
        slot.addEventListener('click', () => {
            this.useSkillInSlot(slotNumber);
        });
        
        return slot;
    }
    
    /**
     * Назначение навыка на слот
     * @param {number} slotNumber - номер слота
     * @param {string} skillName - название навыка
     */
    assignSkillToSlot(slotNumber, skillName) {
        if (slotNumber < 1 || slotNumber > 9) {
            console.error('Неверный номер слота. Должен быть от 1 до 9');
            return;
        }
        
        this.hotkeys[slotNumber] = skillName;
        
        // Обновляем отображение слота
        this.updateSlotDisplay(slotNumber);
    }
    
    /**
     * Обновление отображения слота
     * @param {number} slotNumber - номер слота
     */
    updateSlotDisplay(slotNumber) {
        const slot = this.skillElements[slotNumber];
        if (!slot) return;
        
        const skillName = this.hotkeys[slotNumber];
        const icon = slot.querySelector('.skill-icon');
        
        if (skillName && this.character.skills[skillName]) {
            const skill = this.character.skills[skillName];
            
            // Обновляем внешний вид иконки в зависимости от навыка
            this.updateSkillIcon(icon, skillName);
            
            // Показываем название навыка в тултипе
            slot.title = `${skill.name} (Уровень: ${skill.level})\nГорячая клавиша: ${slotNumber}`;
        } else {
            // Если навык не назначен, показываем пустой слот
            icon.style.backgroundColor = '#555';
            slot.title = `Пустой слот\nГорячая клавиша: ${slotNumber}`;
        }
    }
    
    /**
     * Обновление иконки навыка
     * @param {HTMLElement} icon - элемент иконки
     * @param {string} skillName - название навыка
     */
    updateSkillIcon(icon, skillName) {
        // В реальной игре здесь будут настоящие иконки
        // Пока что используем цветовую кодировку
        switch(skillName) {
            case 'fireball':
                icon.style.backgroundColor = '#ff5722'; // Оранжевый для огненного шара
                break;
            case 'heal':
                icon.style.backgroundColor = '#4caf50'; // Зеленый для лечения
                break;
            case 'melee_mastery':
                icon.style.backgroundColor = '#ff9800'; // Желтый для боевого мастерства
                break;
            case 'critical_strike':
                icon.style.backgroundColor = '#f44336'; // Красный для критического удара
                break;
            case 'life_leech':
                icon.style.backgroundColor = '#9c27b0'; // Фиолетовый для похищения жизни
                break;
            case 'iron_skin':
                icon.style.backgroundColor = '#795548'; // Коричневый для железной кожи
                break;
            case 'dodge':
                icon.style.backgroundColor = '#2196f3'; // Синий для уклонения
                break;
            default:
                icon.style.backgroundColor = '#607d8b'; // Серый для других навыков
        }
    }
    
    /**
     * Использование навыка в слоте
     * @param {number} slotNumber - номер слота
     */
    useSkillInSlot(slotNumber) {
        const skillName = this.hotkeys[slotNumber];
        if (skillName) {
            // Сначала проверяем, есть ли прямая ссылка на игру
            if (this.game && this.game.useSkillOnNearbyEnemies) {
                this.game.useSkillOnNearbyEnemies(skillName);
            }
            // Если нет, используем глобальную переменную
            else if (window.game && window.game.useSkillOnNearbyEnemies) {
                window.game.useSkillOnNearbyEnemies(skillName);
            }
        }
    }
    
    /**
     * Установка ссылки на игру
     * @param {Game} game - объект игры
     */
    setGame(game) {
        this.game = game;
    }
    
    /**
     * Обновление состояния панели навыков
     */
    update() {
        // Обновляем отображение всех слотов
        for (let i = 1; i <= 9; i++) {
            this.updateSlotDisplay(i);
        }
    }
}