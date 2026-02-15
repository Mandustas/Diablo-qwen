// Конфигурационный файл для игры Diablo

const GAME_CONFIG = {
    // Настройки игры
    INITIAL_CHUNK_SIZE: 16,
    PLAYER_SPEED: 8,
    ENEMY_SPAWN_ATTEMPTS: 1000,
    CHUNK_LOAD_RADIUS: 5,
    CHUNK_UNLOAD_RADIUS: 7,
    
    // Настройки камеры
    CAMERA: {
        DEFAULT_ZOOM: 4.0,
        MIN_ZOOM: 0.5,
        MAX_ZOOM: 5.0,
        ZOOM_SPEED: 0.15,
        ZOOM_DELTA_ON_WHEEL: 0.3
    },
    
    // Настройки тайла
    TILE: {
        BASE_SIZE: 64
    },
    
    // Настройки персонажа
    CHARACTER: {
        INITIAL_HEALTH: 100,
        INITIAL_MANA: 50,
        INITIAL_LEVEL: 1,
        INITIAL_EXPERIENCE: 0,
        EXPERIENCE_PER_LEVEL: 100,
        EXPERIENCE_MULTIPLIER: 1.5,
        
        // Статы
        INITIAL_STRENGTH: 10,
        INITIAL_DEXTERITY: 10,
        INITIAL_VITALITY: 10,
        INITIAL_ENERGY: 10,
        
        // Прирост характеристик при повышении уровня
        LEVEL_UP_HEALTH_INCREASE: 20,
        LEVEL_UP_MANA_INCREASE: 10,
        LEVEL_UP_STAT_INCREASE: 2,
        LEVEL_UP_ENERGY_INCREASE: 1,
        
        // Навыки
        SKILL_POINT_PER_LEVEL: 1,
        MELEE_MASTERY_BONUS: 0.1, // 10% урона за уровень
        CRITICAL_STRIKE_BONUS: 5, // 5% шанс крита за уровень
        LIFE_LEECH_BONUS: 2, // 2% похищения за уровень
        IRON_SKIN_BONUS: 0.1, // 10% брони за уровень
        DODGE_BONUS: 3, // 3% уклонения за уровень
        FIREBALL_DAMAGE_BONUS: 10, // +10 урона за уровень
        HEAL_PERCENT_BONUS: 0.05, // 5% хила за уровень
        
        // Стоимость маны для навыков
        SKILL_MANA_COST: {
            fireball: { base: 10, per_level: 2 },
            heal: { base: 8, per_level: 1.5 },
            default: { base: 5, per_level: 1 }
        },
        
        // Значения характеристик
        VITALITY_HP_MULTIPLIER: 10, // Каждая единица живучести даёт 10 хп
        ENERGY_MANA_MULTIPLIER: 5, // Каждая единица энергии даёт 5 маны
        STRENGTH_DAMAGE_MULTIPLIER: 1.5, // Каждая единица силы даёт 1.5 урона
        VITALITY_ARMOR_MULTIPLIER: 0.5, // Каждая единица живучести даёт 0.5 брони
        DEXTERITY_ACCURACY_BASE: 80, // Базовый шанс попадания
        DEXTERITY_ACCURACY_MULTIPLIER: 0.5, // Ловкость влияет на шанс попадания
        DEXTERITY_DODGE_MULTIPLIER: 0.3, // Ловкость влияет на уклонение
        DEXTERITY_CRITICAL_MULTIPLIER: 0.2, // Ловкость влияет на крит. шанс
        
        // Восстановление маны
        BASE_MANA_REGEN: 1,
        ENERGY_MANA_REGEN_MULTIPLIER: 0.1,
        FPS_FOR_MANA_REGEN: 60, // Предполагаем 60 FPS
        
        // Хитбоксы
        HITBOX_RADIUS: 16,
        
        // Инвентарь
        INVENTORY_SIZE: 20
    },
    
    // Настройки врагов
    ENEMY: {
        TYPES: {
            BASIC: {
                maxHealth: 50,
                speed: 1,
                damage: 10,
                detectionRange: 100,
                attackRange: 30
            },
            WEAK: {
                maxHealth: 30,
                speed: 1.2,
                damage: 8,
                detectionRange: 80,
                attackRange: 25
            },
            STRONG: {
                maxHealth: 80,
                speed: 0.8,
                damage: 15,
                detectionRange: 120,
                attackRange: 35
            },
            FAST: {
                maxHealth: 40,
                speed: 1.8,
                damage: 12,
                detectionRange: 150,
                attackRange: 30
            },
            TANK: {
                maxHealth: 120,
                speed: 0.5,
                damage: 20,
                detectionRange: 70,
                attackRange: 40
            }
        },
        
        // Настройки атаки
        ATTACK_COOLDOWN: 45,
        
        // Хитбоксы
        HITBOX_RADIUS: 15,
        
        // Блуждание
        WANDER_INTERVAL_MIN: 120,
        WANDER_INTERVAL_MAX: 300,
        WANDER_DISTANCE_MIN: 30,
        WANDER_DISTANCE_MAX: 100,
        WANDER_SPEED_MULTIPLIER: 0.5
    },
    
    // Настройки боевой системы
    COMBAT: {
        MIN_DAMAGE: 1,
        DAMAGE_VARIATION_MIN: 0.8, // 80% от базового урона
        DAMAGE_VARIATION_MAX: 1.2, // 120% от базового урона
        CRITICAL_DAMAGE_MULTIPLIER: 1.5, // 150% урона при критическом ударе
        BASE_ACCURACY: 80,
        ACCURACY_PER_DEXTERITY: 0.5,
        DODGE_PER_DEXTERITY: 0.3,
        CRITICAL_CHANCE_PER_DEXTERITY: 0.2
    },
    
    // Настройки рендеринга
    RENDERER: {
        COLORS: {
            PLAYER: '#4a9eff',
            PLAYER_HIGHLIGHT: '#8ecfff',
            PLAYER_SHADOW: '#2a5a8f',
            ENEMY: '#ff4a4a',
            ENEMY_WEAK: '#a0a0a0',
            ENEMY_STRONG: '#ff6600',
            ENEMY_FAST: '#ffff00',
            ENEMY_TANK: '#8b0000',
            WALL: '#8b7355',
            WALL_DARK: '#6b5b47',
            FLOOR: '#3a2d1f',
            FLOOR_LIGHT: '#5a4b3c',
            GRID: '#5a4b3c',
            TREE_TRUNK: '#5d4037',
            TREE_LEAVES: '#388e3c',
            ROCK: '#795548',
            WATER: '#1976d2',
            ICE: '#bbdefb',
            DECORATION: '#8bc34a'
        },
        HEALTH_BAR: {
            WIDTH: 40,
            HEIGHT: 6,
            OFFSET_Y: -5,
            HEALTH_COLOR_THRESHOLD_HIGH: 0.5,
            HEALTH_COLOR_THRESHOLD_MEDIUM: 0.25
        }
    },
    
    // Настройки системы чанков
    CHUNK_SYSTEM: {
        DEFAULT_SIZE: 16,
        LOAD_RADIUS: 5,
        UNLOAD_RADIUS: 7
    },
    
    // Настройки генерации подземелья
    DUNGEON_GENERATOR: {
        DEFAULT_ROOM_COUNT: 8,
        DEFAULT_MIN_ROOM_SIZE: 6,
        DEFAULT_MAX_ROOM_SIZE: 14,
        DEFAULT_BIOME_COUNT: 3,
        MAX_GENERATION_ATTEMPTS: 10,
        ROOM_OVERLAP_ATTEMPTS: 100,
        BIOME_DENSITY_MIN: 0.3,
        BIOME_DENSITY_MAX: 0.8,
        OBSTACLE_CHANCE_BASE: 0.05,
        CORRIDOR_OBSTACLE_MULTIPLIER: 1.5,
        DECORATION_CHANCE_BASE: 0.03,
        FOREST_TREE_CHANCE: 0.15,
        DESERT_ROCK_CHANCE: 0.1,
        MOUNTAIN_ROCK_CHANCE: 0.3,
        SWAMP_WATER_CHANCE: 0.2,
        ICE_ICE_CHANCE: 0.1,
        DEFAULT_DECORATION_CHANCE: 0.02
    },
    
    // Настройки атаки
    ATTACK: {
        RANGE: 50,
        SKILL_RANGE: 80
    },
    
    // Настройки спауна врагов
    SPAWN: {
        ENEMIES_PER_CHUNK: 0.5, // Количество врагов на чанк
        MIN_ENEMIES: 2,
        MIN_ENEMIES_UPDATE: 3,
        PLAYER_SPAWN_DISTANCE_MIN: 80,
        PLAYER_SPAWN_DISTANCE_MAX: 300,
        PLAYER_SPAWN_DISTANCE_DEFAULT: 200,
        CHUNK_RANGE_FOR_SPAWN: 3
    },
    
    // Настройки движения
    MOVEMENT: {
        MIN_DISTANCE_TO_TARGET: 5,
        SPEED_INCREASE_FACTOR: 2
    },
    
    // Настройки обновления
    UPDATE: {
        ENEMY_SPAWN_INTERVAL: 60 // Обновление спауна врагов раз в 60 кадров
    },
    
    // Настройки UI компонентов
    UI: {
        INVENTORY_WINDOW: {
            WIDTH: 400,
            HEIGHT: 300,
            SLOT_SIZE: 60,
            SLOT_GAP: 5,
            GRID_COLUMNS: 5,
            PADDING: 20,
            BORDER_WIDTH: 2,
            POSITION_TOP: '50%',
            POSITION_LEFT: '50%'
        },
        STATS_WINDOW: {
            WIDTH: 400,
            PADDING: 20,
            BORDER_WIDTH: 2,
            POSITION_TOP: '50%',
            POSITION_LEFT: '50%'
        },
        SKILL_TREE: {
            WIDTH: 400,
            PADDING: 20,
            BORDER_WIDTH: 2,
            POSITION_TOP: '50%',
            POSITION_LEFT: '50%',
            SKILL_SLOT_WIDTH: 50,
            SKILL_SLOT_HEIGHT: 50,
            SKILL_SLOT_GAP: 5,
            SKILL_GRID_COLUMNS: 2
        },
        SKILL_BAR: {
            SLOT_WIDTH: 50,
            SLOT_HEIGHT: 50,
            SLOT_GAP: 5,
            BAR_PADDING: 8,
            HEALTH_MANA_WIDTH: 60,
            HEALTH_MANA_HEIGHT: 60,
            HEALTH_MANA_BORDER_WIDTH: 3,
            HEALTH_MANA_CIRCLE_RADIUS: 26,
            HEALTH_MANA_CIRCLE_CIRCUMFERENCE: 163.36
        },
        MINIMAP: {
            WIDTH: 250,
            HEIGHT: 250,
            SCALE: 1.2,
            PADDING: 8,
            BORDER_WIDTH: 2,
            PLAYER_DOT_RADIUS: 4,
            ENEMY_DOT_RADIUS: 3,
            POSITION_BOTTOM: 20,
            POSITION_LEFT: 20
        }
    },
    
    // Настройки изометрической проекции
    ISOMETRIC: {
        ANGLE: Math.atan(0.5), // Угол для изометрической проекции
        TILE_WIDTH: 64,  // Ширина тайла
        TILE_HEIGHT: 32  // Высота тайла
    },
    
    // Настройки сохранения
    SAVE: {
        KEY: 'diablo_rpg_save'
    },
    
    // Настройки предметов
    ITEMS: {
        RARITY_CHANCES: {
            COMMON: 0.5,      // 50% шанс на обычный
            UNCOMMON: 0.8,    // 30% шанс на необычный (0.8 - 0.5 = 0.3)
            RARE: 0.95,       // 15% шанс на редкий (0.95 - 0.8 = 0.15)
            EPIC: 1.0         // 5% шанс на эпический (1.0 - 0.95 = 0.05)
        },
        BASE_VALUE: 10,
        VALUE_MULTIPLIERS: {
            UNCOMMON: 2,
            RARE: 5,
            EPIC: 10
        },
        STAT_VALUE_MULTIPLIER: 5
    },
    
    // Настройки генерации мира
    WORLD_MAP: {
        SEED_MULTIPLIER: 10000,
        ROOM_DENSITY: 0.015, // Плотность комнат на тайл
        MIN_ROOM_SIZE: 5,
        MAX_ROOM_SIZE: 10,
        CORRIDOR_WIDTH: 2,
        CHUNK_SIZE: 16,
        LOAD_RADIUS: 4,
        UNLOAD_RADIUS: 6,
        EXTRA_CONNECTIONS_PERCENTAGE: 0.3, // 30% дополнительных связей
        BIOME_CHANCES: {
            FOREST: 0.2,
            DESERT: 0.4,
            MOUNTAIN: 0.6,
            SWAMP: 0.8
        },
        ELEMENT_CHANCES: {
            ICE: 0.05,      // 5% шанс льда
            TREE: 0.06,     // 6% шанс дерева
            ROCK: 0.04,     // 4% шанс скалы
            ROCK_ALT: 0.12, // 12% шанс скалы (альтернативный)
            WATER: 0.08     // 8% шанс воды
        },
        PASSAGE_BLOCK_CHECK_TYPES: [3, 4, 5], // Типы тайлов, которые могут блокировать проход
        CONNECTED_PASSABLE_TILES: [0, 6, 7], // Проходимые тайлы для проверки связности
        MIN_RENDER_RADIUS: 3,
        RENDER_RADIUS_EXTRA: 2
    },
    
    // Дополнительные настройки тайлов
    TILE_DIMENSIONS: {
        WIDTH: 64,
        HEIGHT: 32
    },
    
    // Настройки поиска позиций
    POSITION_SEARCH: {
        MAX_RADIUS: 10
    }
};

// Делаем конфигурацию глобально доступной
if (typeof window !== 'undefined') {
    window.GAME_CONFIG = GAME_CONFIG;
}