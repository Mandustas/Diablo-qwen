/**
 * UIManager - центральный менеджер для системы UI
 * Управляет регистрацией, обновлением и обработкой ввода для всех UI компонентов
 */
class UIManager {
    constructor(pixiRenderer, config = {}) {
        this.pixiRenderer = pixiRenderer;
        this.config = config;

        // Создаём UIRenderer для работы с UI компонентами
        this.uiRenderer = new UIRenderer(pixiRenderer);
        this.uiRenderer.init();
        
        // Устанавливаем ссылку на UIManager в uiRenderer
        this.uiRenderer.uiManager = this;

        // Зарегистрированные компоненты
        this.components = new Map();

        // PIXI контейнер для UI
        this.uiContainer = null;

        // Активный тултип
        this.activeTooltip = null;
        this.tooltipContainer = null;

        // Состояние ввода
        this.inputState = {
            x: 0,
            y: 0,
            keys: new Map()
        };

        // Обработчики событий
        this.eventHandlers = {};

        // Инициализация
        this.init();
    }
    
    /**
     * Инициализация менеджера UI
     */
    init() {
        // Создаем основной контейнер для UI
        this.uiContainer = new PIXI.Container();
        this.uiContainer.zIndex = UIConfig.zIndices.windows;
        this.pixiRenderer.app.stage.addChild(this.uiContainer);

        // Создаем контейнер для тултипов (над всем)
        this.tooltipContainer = new PIXI.Container();
        this.tooltipContainer.zIndex = UIConfig.zIndices.tooltips;
        this.pixiRenderer.app.stage.addChild(this.tooltipContainer);

        // Настраиваем обработку ввода
        this.setupInputHandlers();

        // Запускаем цикл обновления
        this.lastTime = performance.now();
        this.updateLoop();
    }
    
    /**
     * Настройка обработчиков ввода
     */
    setupInputHandlers() {
        const canvas = this.pixiRenderer.app.view;

        // Обработка движения мыши
        this.eventHandlers.mousemove = (e) => {
            const rect = canvas.getBoundingClientRect();
            this.inputState.x = e.clientX - rect.left;
            this.inputState.y = e.clientY - rect.top;

            // Обновляем позицию тултипа
            if (this.activeTooltip) {
                this.updateTooltipPosition(e.clientX, e.clientY);
            }

            // Передаем событие компонентам
            this.handleInput('mousemove', this.inputState);
        };

        // Обработка кликов мыши
        this.eventHandlers.mousedown = (e) => {
            const rect = canvas.getBoundingClientRect();
            const data = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                button: e.button
            };

            this.handleInput('mousedown', data);
        };

        this.eventHandlers.mouseup = (e) => {
            const rect = canvas.getBoundingClientRect();
            const data = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
                button: e.button
            };

            this.handleInput('mouseup', data);
        };

        // Обработка клавиатуры
        this.eventHandlers.keydown = (e) => {
            this.inputState.keys.set(e.key.toLowerCase(), true);
            this.handleInput('keydown', { key: e.key, code: e.code });
        };

        this.eventHandlers.keyup = (e) => {
            this.inputState.keys.set(e.key.toLowerCase(), false);
            this.handleInput('keyup', { key: e.key, code: e.code });
        };

        // Регистрируем обработчики
        canvas.addEventListener('mousemove', this.eventHandlers.mousemove);
        canvas.addEventListener('mousedown', this.eventHandlers.mousedown);
        canvas.addEventListener('mouseup', this.eventHandlers.mouseup);
        window.addEventListener('keydown', this.eventHandlers.keydown);
        window.addEventListener('keyup', this.eventHandlers.keyup);

        // Обработчик изменения размера окна
        window.addEventListener('resize', () => {
            const width = this.pixiRenderer.app.screen.width;
            const height = this.pixiRenderer.app.screen.height;
            this.handleResize(width, height);
        });

        // Вызываем handleResize при инициализации для установки начальных позиций
        const width = this.pixiRenderer.app.screen.width;
        const height = this.pixiRenderer.app.screen.height;
        this.handleResize(width, height);
    }
    
    /**
     * Обработка ввода
     */
    handleInput(type, data) {
        // Проходим по всем компонентам в обратном порядке (сверху вниз)
        const components = Array.from(this.components.values());
        for (let i = components.length - 1; i >= 0; i--) {
            const component = components[i];
            if (component.handleInput && component.handleInput(type, data)) {
                break; // Событие обработано
            }
        }
    }
    
    /**
     * Цикл обновления
     */
    updateLoop() {
        requestAnimationFrame(() => this.updateLoop());
        
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
    }
    
    /**
     * Обновление всех компонентов
     */
    update(deltaTime) {
        // Обновляем каждый компонент
        for (const component of this.components.values()) {
            if (component.update) {
                component.update(deltaTime);
            }
        }
        
        // Сортируем контейнеры по z-index
        this.uiContainer.sortChildren();
    }
    
    /**
     * Регистрация компонента
     * @param {string} name - имя компонента
     * @param {UIComponent} component - компонент
     */
    register(name, component) {
        if (this.components.has(name)) {
            console.warn(`UI компонент '${name}' уже зарегистрирован`);
        }

        // Устанавливаем anchor из конфигурации позиций если есть positionKey
        if (component.config.positionKey && UIConfig.positions[component.config.positionKey]) {
            const posConfig = UIConfig.positions[component.config.positionKey];
            if (posConfig.anchor) {
                component.anchor = posConfig.anchor;
            }
        }

        // Инициализируем компонент с uiRenderer
        component.init(this.uiRenderer, this.uiContainer);
        
        // Центрируем окно после инициализации
        const width = this.pixiRenderer.app.screen.width;
        const height = this.pixiRenderer.app.screen.height;
        this.updateComponentPosition(component, width, height);

        // Сохраняем компонент
        this.components.set(name, component);

        return component;
    }
    
    /**
     * Получение компонента по имени
     * @param {string} name - имя компонента
     * @returns {UIComponent|null}
     */
    get(name) {
        return this.components.get(name) || null;
    }
    
    /**
     * Удаление компонента
     * @param {string} name - имя компонента
     */
    unregister(name) {
        const component = this.components.get(name);
        if (component) {
            component.destroy();
            this.components.delete(name);
        }
    }
    
    /**
     * Открытие компонента
     * @param {string} name - имя компонента
     */
    open(name) {
        const component = this.get(name);
        if (component) {
            component.open();
        }
    }
    
    /**
     * Закрытие компонента
     * @param {string} name - имя компонента
     */
    close(name) {
        const component = this.get(name);
        if (component) {
            component.close();
        }
    }
    
    /**
     * Переключение компонента
     * @param {string} name - имя компонента
     */
    toggle(name) {
        const component = this.get(name);
        if (component) {
            // Если окно сейчас закрыто, закрываем другие перед открытием
            if (!component.isOpen) {
                this.closeOthers(name);
            }
            component.toggle();
        }
    }
    
    /**
     * Закрыть все окна кроме указанного
     * @param {string} excludeName - имя окна, которое не нужно закрывать
     */
    closeOthers(excludeName) {
        for (const [name, component] of this.components.entries()) {
            if (name !== excludeName && component.isOpen) {
                component.close();
            }
        }
    }

    /**
     * Проверка наличия открытых окон (кроме постоянных панелей)
     * @returns {boolean} - есть ли открытые окна
     */
    hasOpenWindows() {
        const excludeKeys = ['panelButtons', 'skillBar', 'minimap'];
        for (const component of this.components.values()) {
            if (component.isOpen && !excludeKeys.includes(component.config.positionKey)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Закрыть все окна (кроме постоянных панелей)
     */
    closeAllWindows() {
        const excludeKeys = ['panelButtons', 'skillBar', 'minimap'];
        for (const component of this.components.values()) {
            if (component.isOpen && !excludeKeys.includes(component.config.positionKey)) {
                component.close();
            }
        }
    }

    /**
     * Показ тултипа
     * @param {string} title - заголовок
     * @param {string} description - описание
     * @param {number} x - координата X
     * @param {number} y - координата Y
     */
    showTooltip(title, description, x, y) {
        if (!this.activeTooltip) {
            this.activeTooltip = new UITooltip({
                title: title,
                description: description
            });
            this.activeTooltip.init(this.uiRenderer, this.tooltipContainer);
        } else {
            this.activeTooltip.setContent(title, description);
            this.activeTooltip.visible = true;
        }

        this.updateTooltipPosition(x, y);
    }

    /**
     * Обновление позиции тултипа
     */
    updateTooltipPosition(screenX, screenY) {
        if (!this.activeTooltip) return;

        // Получаем координаты относительно канваса
        const rect = this.pixiRenderer.app.view.getBoundingClientRect();
        const x = screenX - rect.left + 15;
        const y = screenY - rect.top + 15;

        this.activeTooltip.x = x;
        this.activeTooltip.y = y;
        this.activeTooltip.updatePosition();
    }

    /**
     * Скрытие тултипа
     */
    hideTooltip() {
        if (this.activeTooltip) {
            this.activeTooltip.visible = false;
        }
    }
    
    /**
     * Обновление всех компонентов UI
     */
    updateAll() {
        for (const component of this.components.values()) {
            if (component.updateDisplay) {
                component.updateDisplay();
            } else if (component.markForUpdate) {
                component.markForUpdate();
            }
        }
    }
    
    /**
     * Очистка всех компонентов
     */
    destroy() {
        // Удаляем обработчики событий
        const canvas = this.pixiRenderer.app.view;
        if (canvas) {
            canvas.removeEventListener('mousemove', this.eventHandlers.mousemove);
            canvas.removeEventListener('mousedown', this.eventHandlers.mousedown);
            canvas.removeEventListener('mouseup', this.eventHandlers.mouseup);
        }
        window.removeEventListener('keydown', this.eventHandlers.keydown);
        window.removeEventListener('keyup', this.eventHandlers.keyup);

        // Уничтожаем компоненты
        for (const component of this.components.values()) {
            component.destroy();
        }
        this.components.clear();

        // Уничтожаем контейнеры
        if (this.uiContainer) {
            this.uiContainer.removeChildren();
            this.pixiRenderer.app.stage.removeChild(this.uiContainer);
            this.uiContainer.destroy({ children: false });
        }

        if (this.tooltipContainer) {
            this.tooltipContainer.removeChildren();
            this.pixiRenderer.app.stage.removeChild(this.tooltipContainer);
            this.tooltipContainer.destroy({ children: false });
        }

        this.activeTooltip = null;
    }
    
    /**
     * Обработка изменения размера экрана
     */
    handleResize(width, height) {
        // Обновляем позиции компонентов с относительным позиционированием
        for (const component of this.components.values()) {
            if (component.config.positionKey || component.config.position) {
                this.updateComponentPosition(component, width, height);
            }
        }
    }
    
    /**
     * Обновление позиции компонента
     */
    updateComponentPosition(component, screenWidth, screenHeight) {
        const pos = UIConfig.positions[component.config.positionKey] || component.config.position;
        if (!pos) return;

        // Вычисляем позицию на основе anchor
        if (pos.x === '50%') {
            component.x = screenWidth / 2;
        } else if (pos.x === 'left') {
            component.x = pos.leftOffset || 0;
        } else if (pos.x === 'right') {
            component.x = screenWidth - (pos.rightOffset || 0);
        }

        if (pos.y === '50%') {
            component.y = screenHeight / 2;
        } else if (pos.y === 'top') {
            component.y = pos.topOffset || 0;
        } else if (pos.y === 'bottom') {
            component.y = screenHeight - (pos.bottomOffset || 0);
        }

        // Принудительно обновляем позицию контейнера
        component.updatePosition();
    }
}

// Экспортируем класс
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIManager;
} else if (typeof window !== 'undefined') {
    window.UIManager = UIManager;
}
