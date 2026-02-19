/**
 * UI System - масштабируемая система UI на PIXI
 * 
 * Использование:
 * 1. Создать UIManager в игре
 * 2. Зарегистрировать UI компоненты
 * 3. Использовать компоненты через менеджер
 * 
 * Пример:
 * const uiManager = new UIManager(renderer);
 * uiManager.register('skillBar', new UISkillBar(character));
 * uiManager.register('inventory', new UIInventory(character));
 */

// Базовые классы
if (typeof window !== 'undefined') {
    // Конфигурация
    window.UISystem = {
        Config: UIConfig
    };
    
    // Базовые классы
    window.UISystem.UIComponent = UIComponent;
    window.UISystem.UIContainer = UIContainer;
    
    // Элементы
    window.UISystem.UIButton = UIButton;
    window.UISystem.UILabel = UILabel;
    window.UISystem.UIImage = UIImage;
    window.UISystem.UIProgressBar = UIProgressBar;
    window.UISystem.UISlot = UISlot;
    window.UISystem.UITooltip = UITooltip;
    window.UISystem.UICircularBar = UICircularBar;
    window.UISystem.UIGrid = UIGrid;
    
    // Рендерер и менеджер
    window.UISystem.UIRenderer = UIRenderer;
    window.UISystem.UIManager = UIManager;
    
    // Готовые компоненты
    window.UISystem.UISkillBar = UISkillBar;
    window.UISystem.UISkillTree = UISkillTree;
    window.UISystem.UIInventory = UIInventory;
    window.UISystem.UIStatsWindow = UIStatsWindow;
    window.UISystem.UIActionLog = UIActionLog;
}

// Экспорт для Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Config: UIConfig,
        UIComponent,
        UIContainer,
        UIButton,
        UILabel,
        UIImage,
        UIProgressBar,
        UISlot,
        UITooltip,
        UICircularBar,
        UIGrid,
        UIRenderer,
        UIManager,
        UISkillBar,
        UISkillTree,
        UIInventory,
        UIStatsWindow
    };
}
