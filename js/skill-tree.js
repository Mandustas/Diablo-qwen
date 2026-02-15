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
        this.container.style.top = GAME_CONFIG.UI.SKILL_TREE.POSITION_TOP;
        this.container.style.left = GAME_CONFIG.UI.SKILL_TREE.POSITION_LEFT;
        this.container.style.transform = 'translate(-50%, -50%)';
        this.container.style.background = 'linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%)';
        this.container.style.border = GAME_CONFIG.UI.SKILL_TREE.BORDER_WIDTH + 'px solid #3a2a1a';
        this.container.style.borderRadius = '3px';
        this.container.style.padding = GAME_CONFIG.UI.SKILL_TREE.PADDING + 'px';
        this.container.style.zIndex = '100';
        this.container.style.display = 'none'; // Скрыто по умолчанию
        this.container.style.color = '#c9b896';
        this.container.style.fontFamily = "'MedievalSharp', Georgia, serif";
        this.container.style.minWidth = GAME_CONFIG.UI.SKILL_TREE.WIDTH + 'px';
        this.container.style.boxShadow = '0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(74,58,42,0.3)';
        this.container.style.textShadow = '1px 1px 2px #000';

        // Заголовок
        const title = document.createElement('h2');
        title.textContent = 'ДЕРЕВО НАВЫКОВ';
        title.style.textAlign = 'center';
        title.style.marginTop = '0';
        title.style.marginBottom = '15px';
        title.style.color = '#c9b896';
        title.style.fontFamily = "'MedievalSharp', Georgia, serif";
        title.style.textTransform = 'uppercase';
        title.style.letterSpacing = '2px';
        title.style.textShadow = '2px 2px 4px #000';
        title.style.borderBottom = '1px solid #3a2a1a';
        title.style.paddingBottom = '8px';
        this.container.appendChild(title);

        // Отображение доступных очков навыков
        this.pointsDisplay = document.createElement('p');
        this.pointsDisplay.id = 'skillPointsDisplay';
        this.pointsDisplay.style.textAlign = 'center';
        this.pointsDisplay.style.fontSize = '18px';
        this.pointsDisplay.style.marginBottom = '15px';
        this.pointsDisplay.style.color = '#9C27B0';
        this.pointsDisplay.style.fontWeight = 'bold';
        this.container.appendChild(this.pointsDisplay);

        // Полоска опыта
        this.createExperienceBar();

        // Кнопка закрытия
        const closeButton = document.createElement('button');
        closeButton.textContent = 'ЗАКРЫТЬ';
        closeButton.className = 'fantasy-btn';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '10px';
        closeButton.style.right = '10px';
        closeButton.style.textTransform = 'uppercase';
        closeButton.style.letterSpacing = '1px';
        closeButton.onclick = () => this.close();
        this.container.appendChild(closeButton);

        // Контейнер для навыков
        this.skillsContainer = document.createElement('div');
        this.skillsContainer.style.display = 'grid';
        this.skillsContainer.style.gridTemplateColumns = 'repeat(' + GAME_CONFIG.UI.SKILL_TREE.SKILL_GRID_COLUMNS + ', 1fr)'; // Две колонки
        this.skillsContainer.style.gap = '10px';
        this.container.appendChild(this.skillsContainer);

        // Добавляем в документ
        document.body.appendChild(this.container);

        // Обновляем отображение
        this.updateDisplay();
    }

    /**
     * Создание полоски опыта
     */
    createExperienceBar() {
        // Контейнер для полоски опыта
        this.expBarContainer = document.createElement('div');
        this.expBarContainer.style.marginBottom = '15px';
        this.expBarContainer.style.textAlign = 'center';

        // Текст с уровнем
        this.levelText = document.createElement('div');
        this.levelText.id = 'expLevelText';
        this.levelText.style.marginBottom = '5px';
        this.levelText.style.fontWeight = 'bold';
        this.levelText.style.color = '#FFD700'; // Золотой цвет для уровня
        this.levelText.style.fontFamily = "'MedievalSharp', Georgia, serif";
        this.levelText.style.fontSize = '16px';
        this.levelText.style.textShadow = '2px 2px 4px #000';
        this.expBarContainer.appendChild(this.levelText);

        // Основной контейнер полоски опыта (внешняя рамка в стиле Diablo)
        this.expBarOuter = document.createElement('div');
        this.expBarOuter.style.width = '100%';
        this.expBarOuter.style.height = '24px';
        this.expBarOuter.style.backgroundColor = '#0d0a0a'; // Темный фон как в Diablo
        this.expBarOuter.style.border = '2px solid #3a2a1a'; // Темно-коричневая рамка
        this.expBarOuter.style.borderRadius = '3px';
        this.expBarOuter.style.position = 'relative';
        this.expBarOuter.style.overflow = 'hidden';
        this.expBarOuter.style.boxShadow = 'inset 0 0 8px rgba(0,0,0,0.7)';

        // Внутренняя рамка полоски опыта
        this.expBarInnerFrame = document.createElement('div');
        this.expBarInnerFrame.style.width = 'calc(100% - 4px)';
        this.expBarInnerFrame.style.height = 'calc(100% - 4px)';
        this.expBarInnerFrame.style.margin = '2px';
        this.expBarInnerFrame.style.backgroundColor = '#1a1414'; // Ещё темнее внутри
        this.expBarInnerFrame.style.border = '1px solid #2a2424';
        this.expBarInnerFrame.style.borderRadius = '2px';
        this.expBarInnerFrame.style.position = 'relative';
        this.expBarInnerFrame.style.overflow = 'hidden';

        // Внутренняя часть полоски опыта (сам прогресс)
        this.expBarInner = document.createElement('div');
        this.expBarInner.style.height = '100%';
        this.expBarInner.style.width = '0%';
        this.expBarInner.style.backgroundColor = 'linear-gradient(to right, #4CAF50, #8BC34A)'; // Временный, будет обновляться
        this.expBarInner.style.borderRadius = '1px';
        this.expBarInner.style.transition = 'width 0.3s ease';
        this.expBarInner.style.background = 'linear-gradient(to bottom, #5d9c5d 0%, #4CAF50 50%, #3d8b3d 100%)'; // Зеленый градиент как в Diablo

        // Текст с процентом опыта
        this.expText = document.createElement('div');
        this.expText.id = 'expText';
        this.expText.style.position = 'absolute';
        this.expText.style.top = '50%';
        this.expText.style.left = '50%';
        this.expText.style.transform = 'translate(-50%, -50%)';
        this.expText.style.color = '#f0e6d2';
        this.expText.style.fontSize = '11px';
        this.expText.style.fontWeight = 'bold';
        this.expText.style.textShadow = '1px 1px 1px #000';
        this.expText.style.fontFamily = "'MedievalSharp', Georgia, serif";
        this.expText.style.pointerEvents = 'none'; // Чтобы не мешал кликам

        this.expBarInnerFrame.appendChild(this.expBarInner);
        this.expBarInnerFrame.appendChild(this.expText);
        this.expBarOuter.appendChild(this.expBarInnerFrame);
        this.expBarContainer.appendChild(this.expBarOuter);

        // Вставляем перед контейнером навыков
        this.container.insertBefore(this.expBarContainer, this.skillsContainer);
    }

    /**
     * Обновление полоски опыта
     */
    updateExperienceBar() {
        if (!this.expBarInner) return;

        // Рассчитываем процент опыта до следующего уровня
        const percent = this.character.experienceForNextLevel > 0 
            ? (this.character.experience / this.character.experienceForNextLevel) * 100 
            : 0;

        // Обновляем ширину внутренней части полоски
        this.expBarInner.style.width = percent.toFixed(1) + '%';

        // Обновляем текст
        this.levelText.textContent = `Уровень: ${this.character.level}`;
        this.expText.textContent = `${this.character.experience} / ${this.character.experienceForNextLevel} (${percent.toFixed(1)}%)`;

        // Изменяем цвет полоски и градиент в зависимости от заполнения
        if (percent < 30) {
            // Зеленый градиент для низкого уровня опыта
            this.expBarInner.style.background = 'linear-gradient(to bottom, #5d9c5d 0%, #4CAF50 50%, #3d8b3d 100%)';
        } else if (percent < 60) {
            // Желто-зеленый градиент
            this.expBarInner.style.background = 'linear-gradient(to bottom, #9ccc65 0%, #8bc34a 50%, #7cb342 100%)';
        } else if (percent < 85) {
            // Желтый градиент
            this.expBarInner.style.background = 'linear-gradient(to bottom, #ffd54f 0%, #ffca28 50%, #ffc107 100%)';
        } else {
            // Оранжевый градиент при приближении к следующему уровню
            this.expBarInner.style.background = 'linear-gradient(to bottom, #ffb74d 0%, #ffa726 50%, #ff9800 100%)';
        }
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

        // Обновляем полоску опыта
        this.updateExperienceBar();

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
        element.style.background = 'linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 100%)';
        element.style.border = '1px solid #3a2a1a';
        element.style.borderRadius = '3px';
        element.style.padding = '10px';
        element.style.cursor = 'pointer';
        element.style.boxShadow = 'inset 0 1px 0 rgba(201,184,150,0.1)';
        element.style.transition = 'border-color 0.2s ease';

        // Название навыка и уровень
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.justifyContent = 'space-between';
        header.style.alignItems = 'center';
        header.style.marginBottom = '5px';

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${skill.name} (${skill.level}/${skill.maxLevel})`;
        nameSpan.style.fontWeight = 'bold';
        nameSpan.style.color = '#c9b896';

        const upgradeBtn = document.createElement('button');
        upgradeBtn.textContent = '+';
        upgradeBtn.className = 'fantasy-btn';
        upgradeBtn.style.width = '25px';
        upgradeBtn.style.height = '25px';
        upgradeBtn.style.cursor = 'not-allowed';
        upgradeBtn.style.textAlign = 'center';
        upgradeBtn.style.padding = '0';
        upgradeBtn.style.fontSize = '14px';
        upgradeBtn.style.fontWeight = 'bold';
        upgradeBtn.disabled = true;

        // Функция обновления состояния кнопки
        const updateButtonState = () => {
            const canUpgrade = this.character.skillPoints >= skill.cost && skill.level < skill.maxLevel;
            if (canUpgrade) {
                upgradeBtn.style.background = 'linear-gradient(to bottom, #4CAF50 0%, #3d8b40 100%)';
                upgradeBtn.style.borderColor = '#2E7D32';
                upgradeBtn.style.color = '#fff';
                upgradeBtn.style.cursor = 'pointer';
                upgradeBtn.disabled = false;
                element.style.opacity = '1';
                element.style.border = '1px solid #2E7D32';
            } else {
                upgradeBtn.style.background = 'linear-gradient(to bottom, #6a5a4a 0%, #5a4a3a 100%)';
                upgradeBtn.style.borderColor = '#4a3a2a';
                upgradeBtn.style.color = '#c9b896';
                upgradeBtn.style.cursor = 'not-allowed';
                upgradeBtn.disabled = true;
                element.style.opacity = canUpgrade ? '1' : '0.6';
                element.style.border = '1px solid #3a2a1a';
            }
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
        desc.style.marginTop = '5px';
        desc.style.lineHeight = '1.3';

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
        } else {
            // Даже если дерево навыков закрыто, обновляем полоску опыта
            this.updateExperienceBar();
        }
    }
}