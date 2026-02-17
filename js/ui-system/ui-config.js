/**
 * UIConfig - центральная конфигурация для системы UI
 * Содержит все стили, цвета, шрифты и размеры для UI элементов
 * Соответствует стилям из index.html и ui-components.js
 */
const UIConfig = {
    // Цветовая палитра в стиле Diablo (из index.html и ui-components.js)
    colors: {
        // Основные цвета фона (из CSS: background: linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%))
        background: {
            dark: '#0d0a0a',      // нижний цвет градиента
            medium: '#1a1414',    // верхний цвет градиента
            light: '#2a1a1a',
            slotTop: '#2a1a1a',   // для слотов инвентаря
            slotBottom: '#1a0f0f' // для слотов инвентаря
        },

        // Цвета рамок
        border: {
            dark: '#3a2a1a',
            medium: '#4a3a2a',
            light: '#6a5a4a'
        },

        // Цвета текста (из CSS: color: '#c9b896')
        text: {
            primary: '#c9b896',
            secondary: '#aaa',
            highlight: '#e8d9b8',
            gold: '#FFD700',
            purple: '#9C27B0',
            green: '#4CAF50',
            blue: '#2196F3',
            orange: '#FF9800',
            red: '#FF5722'
        },

        // Цвета редкости предметов
        rarity: {
            common: '#9d9d9d',
            uncommon: '#4CAF50',
            rare: '#2196F3',
            epic: '#9C27B0'
        },

        // Цвета прогресс-баров
        progress: {
            health: '#ff0000',
            healthLow: '#ff3333',
            mana: '#0000ff',
            experience: {
                low: '#4CAF50',
                medium: '#8bc34a',
                high: '#ffc107',
                nearlyFull: '#ff9800'
            }
        },

        // Цвета кнопок (из CSS .fantasy-btn)
        button: {
            normal: { 
                bg: '#2a1a1a', 
                border: '#4a3a2a', 
                text: '#c9b896',
                bgGradient: ['#2a1a1a', '#1a0f0f', '#0d0808']
            },
            hover: { 
                bg: '#3a2a2a', 
                border: '#6a5a4a', 
                text: '#e8d9b8',
                bgGradient: ['#3a2a2a', '#2a1a1a', '#1a0f0f']
            },
            active: { 
                bg: '#1a0f0f', 
                border: '#3a2a1a', 
                text: '#c9b896',
                bgGradient: ['#1a0f0f', '#0d0808', '#0a0808']
            },
            disabled: { 
                bg: '#1a1a1a', 
                border: '#2a2a2a', 
                text: '#6a6a6a',
                bgGradient: ['#1a1a1a', '#1a1a1a', '#0a0a0a']
            }
        }
    },

    // Градиенты (из CSS)
    gradients: {
        // Окна: linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%)
        window: {
            colors: ['#1a1414', '#0d0a0a'],
            type: 'vertical'
        },
        // Слоты: linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 100%)
        slot: {
            colors: ['#2a1a1a', '#1a0f0f'],
            type: 'vertical'
        },
        // Кнопки: linear-gradient(to bottom, #2a1a1a 0%, #1a0f0f 50%, #0d0808 100%)
        button: {
            colors: ['#2a1a1a', '#1a0f0f', '#0d0808'],
            type: 'vertical'
        },
        // Панель навыков: linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%)
        skillBar: {
            colors: ['#1a1414', '#0d0a0a'],
            type: 'vertical'
        },
        // Опыт - зеленый (низкий)
        experienceLow: {
            colors: ['#5d9c5d', '#4CAF50', '#3d8b3d'],
            type: 'vertical'
        },
        // Опыт - желто-зеленый
        experienceMedium: {
            colors: ['#9ccc65', '#8bc34a', '#7cb342'],
            type: 'vertical'
        },
        // Опыт - желтый
        experienceHigh: {
            colors: ['#ffd54f', '#ffca28', '#ffc107'],
            type: 'vertical'
        },
        // Опыт - оранжевый
        experienceNearlyFull: {
            colors: ['#ffb74d', '#ffa726', '#ff9800'],
            type: 'vertical'
        }
    },

    // Тени (из CSS)
    shadows: {
        // box-shadow: 0 0 20px rgba(0,0,0,0.8), inset 0 0 10px rgba(74,58,42,0.3)
        window: {
            outer: { color: 0x000000, alpha: 0.8, blur: 20 },
            inner: { color: 0x4a3a2a, alpha: 0.3, blur: 10 }
        },
        // text-shadow: 1px 1px 2px #000
        text: {
            color: 0x000000,
            offset: { x: 1, y: 1 },
            blur: 2
        },
        // text-shadow: 2px 2px 4px #000 (для заголовков)
        title: {
            color: 0x000000,
            offset: { x: 2, y: 2 },
            blur: 4
        },
        // box-shadow: 0 2px 4px rgba(0,0,0,0.5)
        button: {
            outer: { color: 0x000000, alpha: 0.5, blur: 4, offset: { x: 0, y: 2 } }
        },
        // box-shadow: inset 0 1px 0 rgba(201,184,150,0.1)
        slot: {
            inner: { color: 0xc9b896, alpha: 0.1, offset: { x: 0, y: 1 } }
        }
    },

    // Шрифты (из CSS: font-family: 'MedievalSharp', Georgia, serif)
    fonts: {
        family: "'MedievalSharp', Georgia, serif",
        sizes: {
            xs: 10,
            sm: 12,
            md: 14,
            lg: 16,
            xl: 18,
            xxl: 24,
            xxxl: 28
        }
    },

    // Размеры и отступы
    spacing: {
        xs: 4,
        sm: 8,
        md: 12,
        lg: 16,
        xl: 20,
        xxl: 30,
        xxxl: 40
    },

    // Размеры UI компонентов
    components: {
        // Окна (из GAME_CONFIG.UI)
        window: {
            minWidth: 400,
            minHeight: 300,
            padding: 20,
            borderWidth: 2,
            borderRadius: 3
        },

        // Кнопки
        button: {
            minWidth: 80,
            minHeight: 30,
            paddingX: 16,
            paddingY: 10,
            fontSize: 14
        },

        // Слоты (из GAME_CONFIG.UI.INVENTORY_WINDOW)
        slot: {
            size: 60,
            iconSize: 32,
            borderWidth: 2
        },

        // Прогресс-бары
        progressBar: {
            height: 20,
            borderWidth: 2,
            borderRadius: 2
        },

        // Круглые бары (health/mana орбы)
        circularBar: {
            size: 60,
            radius: 26,
            borderWidth: 3
        },

        // Сетка инвентаря (из GAME_CONFIG.UI.INVENTORY_WINDOW)
        grid: {
            slotGap: 5,
            defaultColumns: 5
        },

        // Тултипы
        tooltip: {
            padding: 10,
            maxWidth: 300,
            fontSize: 12
        }
    },

    // Позиции окон
    positions: {
        skillTree: { x: '50%', y: '50%', anchor: { x: 0.5, y: 0.5 } },
        inventory: { x: '50%', y: '50%', anchor: { x: 0.5, y: 0.5 } },
        stats: { x: '50%', y: '50%', anchor: { x: 0.5, y: 0.5 } },
        skillBar: { x: '50%', y: 'bottom', anchor: { x: 0.487, y: 1 }, bottomOffset: 10 },
        minimap: { x: 'left', y: 'bottom', anchor: { x: 0, y: 1 }, leftOffset: 20, bottomOffset: 20 },
        panelButtons: { x: 'right', y: 'top', anchor: { x: 1, y: 0 }, rightOffset: 20, topOffset: 20 },
        pauseMenu: { x: '50%', y: '50%', anchor: { x: 0.5, y: 0.5 } }
    },

    // Анимации
    animations: {
        defaultDuration: 200,
        fadeIn: { duration: 200, ease: 'easeOut' },
        fadeOut: { duration: 200, ease: 'easeIn' },
        slideIn: { duration: 300, ease: 'easeOut' },
        slideOut: { duration: 300, ease: 'easeIn' },
        scale: { duration: 150, ease: 'easeInOut' }
    },

    // Z-индексы для слоев
    zIndices: {
        background: 0,
        items: 10,
        windows: 20,
        tooltips: 100,
        overlays: 200
    }
};

// Делаем конфигурацию глобально доступной
if (typeof window !== 'undefined') {
    window.UIConfig = UIConfig;
}
