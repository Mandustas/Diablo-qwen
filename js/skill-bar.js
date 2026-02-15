class SkillBar {
    constructor(character) {
        this.character = character;
        this.hotkeys = {}; // Сопоставление горячих клавиш с навыками
        this.skillElements = {}; // Элементы UI для каждого слота
        
        this.createHealthManaBars();
        this.createSkillBarUI();
    }
    
    /**
     * Создание полосок здоровья и маны в стиле Diablo (по бокам от панели навыков)
     */
    createHealthManaBars() {
        // Основной контейнер для всех элементов внизу экрана
        this.bottomContainer = document.createElement('div');
        this.bottomContainer.id = 'bottomUI';
        this.bottomContainer.style.position = 'absolute';
        this.bottomContainer.style.bottom = '10px';
        this.bottomContainer.style.left = '50%';
        this.bottomContainer.style.transform = 'translateX(-50%)';
        this.bottomContainer.style.display = 'flex';
        this.bottomContainer.style.alignItems = 'center';
        this.bottomContainer.style.gap = '15px';
        this.bottomContainer.style.zIndex = '30';
        
        // Левая панель - Здоровье (круг)
        this.healthPanel = document.createElement('div');
        this.healthPanel.style.position = 'relative';
        this.healthPanel.style.width = '60px';
        this.healthPanel.style.height = '60px';
        
        // Круглый контейнер здоровья
        this.healthBarContainer = document.createElement('div');
        this.healthBarContainer.style.width = '60px';
        this.healthBarContainer.style.height = '60px';
        this.healthBarContainer.style.borderRadius = '50%';
        this.healthBarContainer.style.backgroundColor = '#1a1a1a';
        this.healthBarContainer.style.border = '3px solid #3a2a1a';
        this.healthBarContainer.style.position = 'relative';
        this.healthBarContainer.style.overflow = 'hidden';
        this.healthBarContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(255,0,0,0.3)';
        
        // Круглая красная полоска здоровья (SVG circle)
        this.healthBarContainer.innerHTML = `
            <svg width="60" height="60" style="position: absolute; top: 0; left: 0; transform: rotate(-90deg);">
                <circle cx="30" cy="30" r="26" fill="none" stroke="#8b0000" stroke-width="4" />
                <circle id="healthCircle" cx="30" cy="30" r="26" fill="none" stroke="#ff0000" stroke-width="4" 
                        stroke-dasharray="163.36" stroke-dashoffset="0" 
                        stroke-linecap="round"
                        style="filter: drop-shadow(0 0 3px rgba(255,0,0,0.8)); transition: stroke-dashoffset 0.2s ease-out;" />
            </svg>
        `;
        
        this.healthPanel.appendChild(this.healthBarContainer);
        
        // Контейнер для панели навыков (центр)
        this.skillBarWrapper = document.createElement('div');
        this.skillBarWrapper.id = 'skillBarWrapper';
        this.skillBarWrapper.style.display = 'flex';
        this.skillBarWrapper.style.flexDirection = 'row';
        this.skillBarWrapper.style.gap = '5px';
        this.skillBarWrapper.style.background = 'linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%)';
        this.skillBarWrapper.style.border = '2px solid #3a2a1a';
        this.skillBarWrapper.style.padding = '8px';
        this.skillBarWrapper.style.borderRadius = '3px';
        this.skillBarWrapper.style.boxShadow = '0 0 10px rgba(0,0,0,0.5), inset 0 0 10px rgba(74,58,42,0.2)';
        
        // Правая панель - Мана (круг)
        this.manaPanel = document.createElement('div');
        this.manaPanel.style.position = 'relative';
        this.manaPanel.style.width = '60px';
        this.manaPanel.style.height = '60px';
        
        // Круглый контейнер маны
        this.manaBarContainer = document.createElement('div');
        this.manaBarContainer.style.width = '60px';
        this.manaBarContainer.style.height = '60px';
        this.manaBarContainer.style.borderRadius = '50%';
        this.manaBarContainer.style.backgroundColor = '#1a1a1a';
        this.manaBarContainer.style.border = '3px solid #3a2a1a';
        this.manaBarContainer.style.position = 'relative';
        this.manaBarContainer.style.overflow = 'hidden';
        this.manaBarContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.5), 0 0 5px rgba(0,0,255,0.3)';
        
        // Круглая синяя полоска маны (SVG circle)
        this.manaBarContainer.innerHTML = `
            <svg width="60" height="60" style="position: absolute; top: 0; left: 0; transform: rotate(-90deg);">
                <circle cx="30" cy="30" r="26" fill="none" stroke="#00008b" stroke-width="4" />
                <circle id="manaCircle" cx="30" cy="30" r="26" fill="none" stroke="#0000ff" stroke-width="4" 
                        stroke-dasharray="163.36" stroke-dashoffset="0" 
                        stroke-linecap="round"
                        style="filter: drop-shadow(0 0 3px rgba(0,0,255,0.8)); transition: stroke-dashoffset 0.2s ease-out;" />
            </svg>
        `;
        
        this.manaPanel.appendChild(this.manaBarContainer);
        
        // Собираем все вместе
        this.bottomContainer.appendChild(this.healthPanel);
        this.bottomContainer.appendChild(this.skillBarWrapper);
        this.bottomContainer.appendChild(this.manaPanel);
        
        document.body.appendChild(this.bottomContainer);
        
        // Сохраняем ссылки на SVG круги
        this.healthCircle = this.healthBarContainer.querySelector('#healthCircle');
        this.manaCircle = this.manaBarContainer.querySelector('#manaCircle');
        
        // Обновляем начальное отображение
        this.updateHealthManaDisplay();
    }
    
    /**
     * Обновление отображения здоровья и маны
     */
    updateHealthManaDisplay() {
        if (!this.character || !this.healthCircle || !this.manaCircle) return;
        
        // Обновляем круг здоровья ( circumference = 2 * PI * r = 2 * 3.14159 * 26 ≈ 163.36 )
        const healthPercent = (this.character.health / this.character.maxHealth);
        const healthOffset = 163.36 * (1 - healthPercent);
        this.healthCircle.style.strokeDashoffset = healthOffset;
        
        // Обновляем круг маны
        const manaPercent = (this.character.mana / this.character.maxMana);
        const manaOffset = 163.36 * (1 - manaPercent);
        this.manaCircle.style.strokeDashoffset = manaOffset;
        
        // Меняем цвет здоровья при низком уровне
        if (healthPercent < 0.3) {
            this.healthCircle.style.stroke = '#ff3333';
            this.healthCircle.style.filter = 'drop-shadow(0 0 5px rgba(255,51,51,0.9))';
        } else {
            this.healthCircle.style.stroke = '#ff0000';
            this.healthCircle.style.filter = 'drop-shadow(0 0 3px rgba(255,0,0,0.8))';
        }
    }
    
    /**
     * Создание UI панели навыков
     */
    createSkillBarUI() {
        // Создаем контейнер для панели навыков
        this.container = document.createElement('div');
        this.container.id = 'skillBar';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'row';
        this.container.style.gap = '5px';
        
        // Создаем 9 слотов для навыков (под горячие клавиши 1-9)
        for (let i = 1; i <= 9; i++) {
            const slot = this.createSkillSlot(i);
            this.container.appendChild(slot);
            this.skillElements[i] = slot;
        }
        
        // Добавляем в skillBarWrapper
        this.skillBarWrapper.appendChild(this.container);
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
        slot.style.border = '2px solid #3a2a1a';
        slot.style.borderRadius = '3px';
        slot.style.background = 'linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 100%)';
        slot.style.display = 'flex';
        slot.style.flexDirection = 'column';
        slot.style.justifyContent = 'center';
        slot.style.alignItems = 'center';
        slot.style.position = 'relative';
        slot.style.cursor = 'pointer';
        slot.style.boxShadow = 'inset 0 1px 0 rgba(201,184,150,0.1)';
        
        // Номер слота
        const numberLabel = document.createElement('div');
        numberLabel.textContent = slotNumber;
        numberLabel.style.position = 'absolute';
        numberLabel.style.top = '-12px';
        numberLabel.style.left = '2px';
        numberLabel.style.fontSize = '11px';
        numberLabel.style.color = '#c9b896';
        numberLabel.style.fontFamily = "'MedievalSharp', Georgia, serif";
        numberLabel.style.textShadow = '1px 1px 1px #000';
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
        
        // Обновляем отображение здоровья и маны
        this.updateHealthManaDisplay();
    }
}
