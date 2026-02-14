class SkillTree {
    constructor(character) {
        this.character = character;
        this.isOpen = false;
        
        // Создаем UI для дерева навыков
        this.createSkillTreeUI();
    }
    
    /**
     * Создание UI для дерева навыков
     */
    createSkillTreeUI() {
        // Создаем контейнер для дерева навыков
        this.container = document.createElement('div');
        this.container.id = 'skillTree';
        this.container.style.position = 'absolute';
        this.container.style.top = '50%';
        this.container.style.left = '50%';
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        this.container.style.border = '2px solid #4a4a4a';
        this.container.style.borderRadius = '10px';
        this.container.style.padding = '20px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none'; // Скрыто по умолчанию
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.minWidth = '400px';
        
        // Заголовок
        const title = document.createElement('h2');
        title.textContent = 'Дерево навыков';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        this.container.appendChild(title);
        
        // Отображение доступных очков навыков
        this.pointsDisplay = document.createElement('p');
        this.pointsDisplay.id = 'skillPointsDisplay';
        this.pointsDisplay.style.textAlign = 'center';
        this.pointsDisplay.style.fontSize = '18px';
        this.pointsDisplay.style.marginBottom = '15px';
        this.container.appendChild(this.pointsDisplay);
        
        // Кнопка закрытия
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Закрыть';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.background = '#555';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '3px';
        closeButton.style.cursor = 'pointer';
        closeButton.onclick = () => this.close();
        this.container.appendChild(closeButton);
        
        // Контейнер для навыков
        this.skillsContainer = document.createElement('div');
        this.skillsContainer.style.display = 'grid';
        this.skillsContainer.style.gridTemplateColumns = '1fr 1fr'; // Две колонки
        this.skillsContainer.style.gap = '10px';
        this.container.appendChild(this.skillsContainer);
        
        // Добавляем в документ
        document.body.appendChild(this.container);
        
        // Обновляем отображение
        this.updateDisplay();
    }
    
    /**
     * Открытие дерева навыков
     */
    open() {
        this.isOpen = true;
        this.container.style.display = 'block';
        this.updateDisplay();
    }
    
    /**
     * Закрытие дерева навыков
     */
    close() {
        this.isOpen = false;
        this.container.style.display = 'none';
    }
    
    /**
     * Переключение видимости дерева навыков
     */
    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }
    
    /**
     * Обновление отображения дерева навыков
     */
    updateDisplay() {
        // Обновляем количество очков навыков
        this.pointsDisplay.textContent = `Доступные очки навыков: ${this.character.skillPoints}`;

        // Очищаем контейнер с навыками
        this.skillsContainer.innerHTML = '';

        // Создаем элементы для каждого навыка
        for (const skillName in this.character.skills) {
            const skill = this.character.skills[skillName];
            const skillElement = this.createSkillElement(skillName, skill);
            this.skillsContainer.appendChild(skillElement);
        }
    }
    
    /**
     * Создание элемента для отображения навыка
     */
    createSkillElement(skillName, skill) {
        const element = document.createElement('div');
        element.className = 'skill-item';
        element.style.backgroundColor = '#222';
        element.style.border = '1px solid #444';
        element.style.borderRadius = '5px';
        element.style.padding = '10px';
        element.style.cursor = 'pointer';

        // Название навыка и уровень
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '5px';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${skill.name} (${skill.level}/${skill.maxLevel})`;
        nameSpan.style.fontWeight = 'bold';

        const upgradeBtn = document.createElement('button');
        upgradeBtn.textContent = '+';
        upgradeBtn.style.background = '#666';
        upgradeBtn.style.color = 'white';
        upgradeBtn.style.border = 'none';
        upgradeBtn.style.borderRadius = '3px';
        upgradeBtn.style.width = '25px';
        upgradeBtn.style.height = '25px';
        upgradeBtn.style.cursor = 'not-allowed';
        upgradeBtn.disabled = true;

        // Функция обновления состояния кнопки
        const updateButtonState = () => {
            const canUpgrade = this.character.skillPoints >= skill.cost && skill.level < skill.maxLevel;
            upgradeBtn.style.background = canUpgrade ? '#4CAF50' : '#666';
            upgradeBtn.style.cursor = canUpgrade ? 'pointer' : 'not-allowed';
            upgradeBtn.disabled = !canUpgrade;
            element.style.opacity = canUpgrade ? '1' : '0.6';
            nameSpan.textContent = `${skill.name} (${skill.level}/${skill.maxLevel})`;
        };

        // Обновляем состояние кнопки
        updateButtonState();

        // Обработчик прокачки навыка
        upgradeBtn.onclick = (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события
            const canUpgrade = this.character.skillPoints >= skill.cost && skill.level < skill.maxLevel;
            if (canUpgrade) {
                this.character.upgradeSkill(skillName);
                updateButtonState(); // Обновляем состояние кнопки после прокачки
                this.updateDisplay(); // Обновляем всё дерево навыков для отражения изменений
            }
        };

        header.appendChild(nameSpan);
        header.appendChild(upgradeBtn);

        // Описание навыка
        const desc = document.createElement('div');
        desc.textContent = skill.description;
        desc.style.fontSize = '12px';
        desc.style.color = '#aaa';

        element.appendChild(header);
        element.appendChild(desc);

        // Обработчик клика на весь элемент (для удобства)
        element.onclick = (e) => {
            // Проверяем, не был ли клик по кнопке (чтобы не дублировать действие)
            if (e.target !== upgradeBtn) {
                const canUpgrade = this.character.skillPoints >= skill.cost && skill.level < skill.maxLevel;
                if (canUpgrade) {
                    this.character.upgradeSkill(skillName);
                    this.updateDisplay();
                }
            }
        };

        return element;
    }
    
    /**
     * Обновление при изменении состояния персонажа
     */
    onCharacterUpdate() {
        if (this.isOpen) {
            this.updateDisplay();
        }
    }
}