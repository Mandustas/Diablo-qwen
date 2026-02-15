class AdvancedDungeonGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.map = [];
        this.rooms = [];
        this.corridors = [];
        this.biomes = [];
    }

    /**
     * Генерация подземелья с разными биомами
     * @param {number} roomCount - количество комнат для генерации
     * @param {number} minRoomSize - минимальный размер комнаты
     * @param {number} maxRoomSize - максимальный размер комнаты
     * @param {number} biomeCount - количество биомов
     * @returns {Array<Array<number>>} - сгенерированная карта
     */
    generateDungeon(roomCount = GAME_CONFIG.DUNGEON_GENERATOR.DEFAULT_ROOM_COUNT, minRoomSize = GAME_CONFIG.DUNGEON_GENERATOR.DEFAULT_MIN_ROOM_SIZE, maxRoomSize = GAME_CONFIG.DUNGEON_GENERATOR.DEFAULT_MAX_ROOM_SIZE, biomeCount = GAME_CONFIG.DUNGEON_GENERATOR.DEFAULT_BIOME_COUNT) {
        let attempts = 0;
        const maxAttempts = GAME_CONFIG.DUNGEON_GENERATOR.MAX_GENERATION_ATTEMPTS; // Максимальное количество попыток генерации

        // Рассчитываем количество биомов пропорционально размеру карты
        const calculatedBiomeCount = Math.max(Math.floor((this.width * this.height) / 400), 3);

        while (attempts < maxAttempts) {
            // Инициализируем карту стенами
            this.initializeMap();

            // Создаем комнаты
            this.createRooms(roomCount, minRoomSize, maxRoomSize);

            // Соединяем комнаты коридорами
            this.connectRooms();

            // Улучшаем связность между комнатами
            this.improveConnectivity();

            // Проверяем, все ли комнаты связаны
            if (this.areAllRoomsConnected()) {
                // Генерируем биомы
                this.generateBiomes(calculatedBiomeCount);

                // Добавляем препятствия в зависимости от биома
                this.addObstacles();

                // Проверяем, все ли области по-прежнему связаны после добавления препятствий
                if (this.isMapFullyConnected()) {
                    // Возвращаем сгенерированную карту
                    return this.map;
                }
            }

            attempts++;
        }

        // Если не удалось создать связанную карту за указанное число попыток,
        // возвращаем последнюю попытку, но с предупреждением
        console.warn("Не удалось создать полностью связанную карту за " + maxAttempts + " попыток");
        return this.map;
    }

    /**
     * Инициализация карты (все стены)
     */
    initializeMap() {
        this.map = [];
        for (let y = 0; y < this.height; y++) {
            this.map[y] = [];
            for (let x = 0; x < this.width; x++) {
                // Для бесконечной генерации не создаем границы
                this.map[y][x] = 1; // Стена
            }
        }
    }
    
    /**
     * Проверка, все ли комнаты связаны между собой
     * @returns {boolean} - связаны ли все комнаты
     */
    areAllRoomsConnected() {
        if (this.rooms.length <= 1) return true;
        
        // Используем BFS для проверки связности комнат
        const visited = new Set();
        const queue = [0]; // Начинаем с первой комнаты
        visited.add(0);
        
        while (queue.length > 0) {
            const roomId = queue.shift();
            const currentRoom = this.rooms[roomId];
            
            // Находим все комнаты, которые связаны с текущей
            for (let i = 0; i < this.rooms.length; i++) {
                if (visited.has(i)) continue;
                
                const otherRoom = this.rooms[i];
                
                // Проверяем, есть ли путь между комнатами через коридоры
                if (this.isConnectedTo(currentRoom, otherRoom)) {
                    visited.add(i);
                    queue.push(i);
                }
            }
        }
        
        // Все ли комнаты были посещены?
        return visited.size === this.rooms.length;
    }
    
    /**
     * Проверка, связана ли одна комната с другой (через коридоры)
     * @param {Object} room1 - первая комната
     * @param {Object} room2 - вторая комната
     * @returns {boolean} - связаны ли комнаты
     */
    isConnectedTo(room1, room2) {
        // Упрощенная проверка: если между комнатами есть коридор, они связаны
        // В реальности нужно проверить, есть ли проход между комнатами
        // Для этого можно использовать поиск пути
        
        // Проверим, есть ли путь между центрами комнат
        const start = {
            x: Math.floor(room1.x + room1.width / 2),
            y: Math.floor(room1.y + room1.height / 2)
        };
        
        const end = {
            x: Math.floor(room2.x + room2.width / 2),
            y: Math.floor(room2.y + room2.height / 2)
        };
        
        // Проверим, можно ли добраться от одной комнаты до другой
        return this.pathExists(start, end);
    }
    
    /**
     * Проверка, существует ли путь между двумя точками
     * @param {Object} start - начальная точка {x, y}
     * @param {Object} end - конечная точка {x, y}
     * @returns {boolean} - существует ли путь
     */
    pathExists(start, end) {
        // Используем BFS для проверки существования пути
        const queue = [{x: start.x, y: start.y}];
        const visited = new Set();
        visited.add(`${start.x},${start.y}`);
        
        // Возможные направления движения
        const directions = [
            {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}
        ];
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // Проверяем, достигли ли конечной точки
            if (current.x === end.x && current.y === end.y) {
                return true;
            }
            
            // Исследуем соседние клетки
            for (const dir of directions) {
                const nextX = current.x + dir.x;
                const nextY = current.y + dir.y;
                const key = `${nextX},${nextY}`;
                
                // Проверяем, в пределах ли границ
                if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
                    continue;
                }
                
                // Проверяем, посещали ли мы эту клетку
                if (visited.has(key)) {
                    continue;
                }
                
                // Проверяем, проходима ли клетка (0 - пол, 6 - лед, 7 - декорация)
                const tileType = this.map[nextY][nextX];
                if (tileType === 0 || tileType === 6 || tileType === 7) {
                    visited.add(key);
                    queue.push({x: nextX, y: nextY});
                }
            }
        }
        
        return false;
    }
    
    /**
     * Проверка, вся ли карта связана (нет изолированных областей)
     * @returns {boolean} - связана ли вся карта
     */
    isMapFullyConnected() {
        // Найдем первую проходимую клетку
        let startX = -1, startY = -1;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileType = this.map[y][x];
                if (tileType === 0 || tileType === 6 || tileType === 7) {
                    startX = x;
                    startY = y;
                    break;
                }
            }
            if (startX !== -1) break;
        }
        
        // Если не нашли проходимую клетку, карта не связана
        if (startX === -1) return false;
        
        // Используем BFS для проверки, можно ли достичь всех проходимых клеток
        const queue = [{x: startX, y: startY}];
        const visited = new Set();
        visited.add(`${startX},${startY}`);
        
        // Подсчитаем общее количество проходимых клеток
        let totalPassable = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const tileType = this.map[y][x];
                if (tileType === 0 || tileType === 6 || tileType === 7) {
                    totalPassable++;
                }
            }
        }
        
        // Возможные направления движения
        const directions = [
            {x: 0, y: -1}, {x: 1, y: 0}, {x: 0, y: 1}, {x: -1, y: 0}
        ];
        
        let visitedCount = 1; // Уже посетили стартовую клетку
        
        while (queue.length > 0) {
            const current = queue.shift();
            
            // Исследуем соседние клетки
            for (const dir of directions) {
                const nextX = current.x + dir.x;
                const nextY = current.y + dir.y;
                const key = `${nextX},${nextY}`;
                
                // Проверяем, в пределах ли границ
                if (nextX < 0 || nextX >= this.width || nextY < 0 || nextY >= this.height) {
                    continue;
                }
                
                // Проверяем, посещали ли мы эту клетку
                if (visited.has(key)) {
                    continue;
                }
                
                // Проверяем, проходима ли клетка (0 - пол, 6 - лед, 7 - декорация)
                const tileType = this.map[nextY][nextX];
                if (tileType === 0 || tileType === 6 || tileType === 7) {
                    visited.add(key);
                    queue.push({x: nextX, y: nextY});
                    visitedCount++;
                }
            }
        }
        
        // Карта связана, если мы смогли посетить все проходимые клетки
        return visitedCount === totalPassable;
    }

    /**
     * Создание комнат
     * @param {number} count - количество комнат
     * @param {number} minSize - минимальный размер комнаты
     * @param {number} maxSize - максимальный размер комнаты
     */
    createRooms(count, minSize, maxSize) {
        this.rooms = [];

        // Разбиваем карту на сетку для более равномерного распределения комнат
        const gridSize = Math.ceil(Math.sqrt(count));
        const cellWidth = Math.floor(this.width / gridSize);
        const cellHeight = Math.floor(this.height / gridSize);

        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let room;
            let overlapping = true;

            // Пытаемся создать комнату, которая не пересекается с другими
            while (overlapping && attempts < 100) {
                // Определяем, в какую ячейку сетки помещать комнату
                const gridX = i % gridSize;
                const gridY = Math.floor(i / gridSize);
                
                // Ограничиваем область поиска в пределах ячейки сетки
                const minX = gridX * cellWidth + 1;
                const maxX = Math.min((gridX + 1) * cellWidth - minSize - 1, this.width - minSize - 1);
                const minY = gridY * cellHeight + 1;
                const maxY = Math.min((gridY + 1) * cellHeight - minSize - 1, this.height - minSize - 1);

                if (minX >= maxX || minY >= maxY) {
                    // Если ячейка слишком мала, используем случайное размещение
                    const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
                    const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;

                    const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
                    const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

                    room = { x, y, width: w, height: h };
                } else {
                    // Используем ограниченную область для размещения комнаты
                    const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
                    const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;

                    const x = Math.floor(Math.random() * (maxX - minX - w)) + minX;
                    const y = Math.floor(Math.random() * (maxY - minY - h)) + minY;

                    room = { x, y, width: w, height: h };
                }

                overlapping = false;
                // Проверяем пересечение с существующими комнатами
                for (const existingRoom of this.rooms) {
                    if (
                        room.x < existingRoom.x + existingRoom.width + 1 &&
                        room.x + room.width + 1 > existingRoom.x &&
                        room.y < existingRoom.y + existingRoom.height + 1 &&
                        room.y + room.height + 1 > existingRoom.y
                    ) {
                        overlapping = true;
                        break;
                    }
                }

                attempts++;
            }

            if (!overlapping && room) {
                // Добавляем комнату на карту
                this.carveRoom(room);
                this.rooms.push(room);
            }
        }
    }

    /**
     * Вырезание комнаты в карте
     * @param {Object} room - объект комнаты
     */
    carveRoom(room) {
        for (let y = room.y; y < room.y + room.height; y++) {
            for (let x = room.x; x < room.x + room.width; x++) {
                if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                    this.map[y][x] = 0; // 0 - пол
                }
            }
        }
    }

    /**
     * Соединение комнат коридорами
     */
    connectRooms() {
        if (this.rooms.length < 2) return;

        // Создаем минимальное остовное дерево для соединения всех комнат
        this.createMinimumSpanningTree();
    }
    
    /**
     * Создание минимального остовного дерева для соединения комнат
     */
    createMinimumSpanningTree() {
        if (this.rooms.length < 2) return;

        // Используем алгоритм Прима для создания минимального остовного дерева
        const visited = new Set([0]); // Начинаем с первой комнаты
        const unvisited = new Set();

        // Добавляем все комнаты в непосещенные
        for (let i = 1; i < this.rooms.length; i++) {
            unvisited.add(i);
        }

        // Пока есть непосещенные комнаты
        while (unvisited.size > 0) {
            let minDistance = Infinity;
            let closestUnvisited = null;
            let closestVisited = null;

            // Находим ближайшую непосещенную комнату к посещенным
            for (const visitedIdx of visited) {
                for (const unvisitedIdx of unvisited) {
                    const dist = this.getRoomDistance(this.rooms[visitedIdx], this.rooms[unvisitedIdx]);

                    if (dist < minDistance) {
                        minDistance = dist;
                        closestUnvisited = unvisitedIdx;
                        closestVisited = visitedIdx;
                    }
                }
            }

            // Соединяем ближайшие комнаты
            if (closestUnvisited !== null && closestVisited !== null) {
                this.createCorridor(this.rooms[closestVisited], this.rooms[closestUnvisited]);
                visited.add(closestUnvisited);
                unvisited.delete(closestUnvisited);
            }
        }
    }

    /**
     * Улучшение связности между комнатами
     */
    improveConnectivity() {
        // Добавляем дополнительные соединения между комнатами для лучшей связности
        const extraConnections = Math.floor(this.rooms.length * 0.3); // 30% от количества комнат

        for (let i = 0; i < extraConnections; i++) {
            // Выбираем две случайные комнаты
            const roomAIndex = Math.floor(Math.random() * this.rooms.length);
            let roomBIndex = Math.floor(Math.random() * this.rooms.length);

            // Убедимся, что это разные комнаты
            while (roomBIndex === roomAIndex) {
                roomBIndex = Math.floor(Math.random() * this.rooms.length);
            }

            const roomA = this.rooms[roomAIndex];
            const roomB = this.rooms[roomBIndex];

            // Создаем дополнительный коридор между комнатами
            this.createWiderCorridor(roomA, roomB);
        }
    }

    /**
     * Создание более широкого коридора между двумя комнатами
     * @param {Object} roomA - первая комната
     * @param {Object} roomB - вторая комната
     */
    createWiderCorridor(roomA, roomB) {
        const centerA = {
            x: Math.floor(roomA.x + roomA.width / 2),
            y: Math.floor(roomA.y + roomA.height / 2)
        };

        const centerB = {
            x: Math.floor(roomB.x + roomB.width / 2),
            y: Math.floor(roomB.y + roomB.height / 2)
        };

        // Используем Z-образный путь для более естественного соединения
        const cornerX = centerA.x;
        const cornerY = centerB.y;

        // Прокладываем более широкий путь от комнаты A к углу
        this.drawWiderLine(centerA.x, centerA.y, cornerX, cornerY, 2); // Ширина коридора 2

        // Прокладываем более широкий путь от угла к комнате B
        this.drawWiderLine(cornerX, cornerY, centerB.x, centerB.y, 2); // Ширина коридора 2
    }

    /**
     * Рисование широкой линии на карте
     * @param {number} x1 - начальная координата X
     * @param {number} y1 - начальная координата Y
     * @param {number} x2 - конечная координата X
     * @param {number} y2 - конечная координата Y
     * @param {number} width - ширина линии
     */
    drawWiderLine(x1, y1, x2, y2, width = 1) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = (x1 < x2) ? 1 : -1;
        const sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            // Устанавливаем тайл как проходимый, с учетом ширины
            for (let wx = -Math.floor(width/2); wx <= Math.floor(width/2); wx++) {
                for (let wy = -Math.floor(width/2); wy <= Math.floor(width/2); wy++) {
                    const nx = x + wx;
                    const ny = y + wy;

                    if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                        this.map[ny][nx] = 0; // Устанавливаем как пол
                    }
                }
            }

            if (x === x2 && y === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }
    
    /**
     * Получение расстояния между двумя комнатами
     * @param {Object} roomA - первая комната
     * @param {Object} roomB - вторая комната
     * @returns {number} - евклидово расстояние между центрами комнат
     */
    getRoomDistance(roomA, roomB) {
        const centerA = {
            x: roomA.x + roomA.width / 2,
            y: roomA.y + roomA.height / 2
        };
        
        const centerB = {
            x: roomB.x + roomB.width / 2,
            y: roomB.y + roomB.height / 2
        };
        
        const dx = centerA.x - centerB.x;
        const dy = centerA.y - centerB.y;
        
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Создание коридора между двумя комнатами
     * @param {Object} roomA - первая комната
     * @param {Object} roomB - вторая комната
     */
    createCorridor(roomA, roomB) {
        const centerA = {
            x: Math.floor(roomA.x + roomA.width / 2),
            y: Math.floor(roomA.y + roomA.height / 2)
        };

        const centerB = {
            x: Math.floor(roomB.x + roomB.width / 2),
            y: Math.floor(roomB.y + roomB.height / 2)
        };

        // Используем Z-образный путь для более естественного соединения
        const cornerX = centerA.x;
        const cornerY = centerB.y;

        // Прокладываем путь от комнаты A к углу
        this.drawStraightLine(centerA.x, centerA.y, cornerX, cornerY);

        // Прокладываем путь от угла к комнате B
        this.drawStraightLine(cornerX, cornerY, centerB.x, centerB.y);
    }
    
    /**
     * Рисование прямой линии на карте
     * @param {number} x1 - начальная координата X
     * @param {number} y1 - начальная координата Y
     * @param {number} x2 - конечная координата X
     * @param {number} y2 - конечная координата Y
     */
    drawStraightLine(x1, y1, x2, y2) {
        const dx = Math.abs(x2 - x1);
        const dy = Math.abs(y2 - y1);
        const sx = (x1 < x2) ? 1 : -1;
        const sy = (y1 < y2) ? 1 : -1;
        let err = dx - dy;

        let x = x1;
        let y = y1;

        while (true) {
            // Устанавливаем тайл как проходимый
            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.map[y][x] = 0;
            }

            if (x === x2 && y === y2) break;
            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x += sx;
            }
            if (e2 < dx) {
                err += dx;
                y += sy;
            }
        }
    }

    /**
     * Генерация биомов на карте
     * @param {number} count - количество биомов
     */
    generateBiomes(count) {
        this.biomes = [];
        
        // Создаем области для разных биомов
        for (let i = 0; i < count; i++) {
            const biome = {
                id: i,
                type: this.getRandomBiomeType(),
                centerX: Math.floor(Math.random() * (this.width - 20)) + 10,
                centerY: Math.floor(Math.random() * (this.height - 20)) + 10,
                radius: Math.floor(Math.random() * (this.width / 4)) + 10, // Радиус теперь зависит от размера карты
                density: Math.random() * 0.5 + 0.3 // 30-80% плотность
            };
            
            this.biomes.push(biome);
        }
        
        // Применяем биомы к карте
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[y][x] === 0) { // Только на проходимых тайлах
                    const biome = this.getBiomeAt(x, y);
                    if (biome) {
                        this.applyBiomeToTile(x, y, biome);
                    }
                }
            }
        }
    }

    /**
     * Получение типа биома в заданной точке
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @returns {Object|null} - объект биома или null
     */
    getBiomeAt(x, y) {
        let closestBiome = null;
        let minDistance = Infinity;
        
        for (const biome of this.biomes) {
            const dx = x - biome.centerX;
            const dy = y - biome.centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= biome.radius && distance < minDistance) {
                minDistance = distance;
                closestBiome = biome;
            }
        }
        
        return closestBiome;
    }

    /**
     * Получение случайного типа биома
     * @returns {string} - тип биома
     */
    getRandomBiomeType() {
        const biomes = ['forest', 'desert', 'mountain', 'swamp', 'ice'];
        return biomes[Math.floor(Math.random() * biomes.length)];
    }

    /**
     * Применение характеристик биома к тайлу
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @param {Object} biome - объект биома
     */
    applyBiomeToTile(x, y, biome) {
        // В зависимости от типа биома добавляем различные элементы
        switch (biome.type) {
            case 'forest':
                // Шанс на дерево
                if (Math.random() < GAME_CONFIG.DUNGEON_GENERATOR.FOREST_TREE_CHANCE * biome.density) {
                    // Временно добавляем дерево
                    const originalType = this.map[y][x];
                    this.map[y][x] = 3; // Дерево (непроходимое)

                    // Проверяем, не нарушили ли мы связность карты
                    if (!this.isMapFullyConnected()) {
                        // Если нарушили, откатываем изменение
                        this.map[y][x] = originalType;
                    }
                }
                break;

            case 'desert':
                // Шанс на скалу или кактус
                if (Math.random() < GAME_CONFIG.DUNGEON_GENERATOR.DESERT_ROCK_CHANCE * biome.density) {
                    // Временно добавляем скалу
                    const originalType = this.map[y][x];
                    this.map[y][x] = 4; // Скала (непроходимая)

                    // Проверяем, не нарушили ли мы связность карты
                    if (!this.isMapFullyConnected()) {
                        // Если нарушили, откатываем изменение
                        this.map[y][x] = originalType;
                    }
                }
                break;

            case 'mountain':
                // Высокая вероятность скал
                if (Math.random() < GAME_CONFIG.DUNGEON_GENERATOR.MOUNTAIN_ROCK_CHANCE * biome.density) {
                    // Временно добавляем скалу
                    const originalType = this.map[y][x];
                    this.map[y][x] = 4; // Скала (непроходимая)

                    // Проверяем, не нарушили ли мы связность карты
                    if (!this.isMapFullyConnected()) {
                        // Если нарушили, откатываем изменение
                        this.map[y][x] = originalType;
                    }
                }
                break;

            case 'swamp':
                // Шанс на воду или грязь
                if (Math.random() < GAME_CONFIG.DUNGEON_GENERATOR.SWAMP_WATER_CHANCE * biome.density) {
                    // Временно добавляем воду
                    const originalType = this.map[y][x];
                    this.map[y][x] = 5; // Вода (непроходимая)

                    // Проверяем, не нарушили ли мы связность карты
                    if (!this.isMapFullyConnected()) {
                        // Если нарушили, откатываем изменение
                        this.map[y][x] = originalType;
                    }
                }
                break;

            case 'ice':
                // Шанс на лед (скользкий, но проходимый)
                if (Math.random() < GAME_CONFIG.DUNGEON_GENERATOR.ICE_ICE_CHANCE * biome.density) {
                    this.map[y][x] = 6; // Лед (проходимый, но с эффектом)
                }
                break;
        }
    }

    /**
     * Добавление препятствий на карту
     */
    addObstacles() {
        // Рассчитываем шанс появления препятствий в зависимости от размера карты
        const baseObstacleChance = GAME_CONFIG.DUNGEON_GENERATOR.OBSTACLE_CHANCE_BASE;
        const sizeFactor = Math.min((this.width * this.height) / (20 * 20), 2); // Множитель от размера карты
        const obstacleChance = baseObstacleChance * sizeFactor;

        // Добавляем случайные препятствия в коридорах и на свободных тайлах
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                // Если это пол и вокруг есть стены, добавляем шанс на препятствие
                if (this.map[y][x] === 0) {
                    // Slightly increase chance of obstacles in corridors
                    const isCorridor = this.isCorridor(x, y);
                    const localObstacleChance = isCorridor ? obstacleChance * GAME_CONFIG.DUNGEON_GENERATOR.CORRIDOR_OBSTACLE_MULTIPLIER : obstacleChance;

                    if (Math.random() < localObstacleChance) {
                        // Случайный тип препятствия
                        const obstacleType = Math.random() < 0.7 ? 3 : 4; // 70% деревья, 30% скалы

                        // Временно добавляем препятствие
                        const originalType = this.map[y][x];
                        this.map[y][x] = obstacleType;

                        // Проверяем, не нарушили ли мы связность карты
                        if (!this.isMapFullyConnected()) {
                            // Если нарушили, откатываем изменение
                            this.map[y][x] = originalType;
                        }
                    }
                }
            }
        }
    }

    /**
     * Проверка, является ли тайл коридором
     * @param {number} x - координата X
     * @param {number} y - координата Y
     * @returns {boolean} - является ли тайл коридором
     */
    isCorridor(x, y) {
        // Подсчитываем количество соседних стен
        let wallCount = 0;
        
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                
                const nx = x + dx;
                const ny = y + dy;
                
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    if (this.map[ny][nx] === 1) { // Стена
                        wallCount++;
                    }
                }
            }
        }
        
        // Если больше 4 стен вокруг, считаем тайл коридором
        return wallCount >= 4;
    }

    /**
     * Добавление случайных элементов декорации
     */
    addDecorations() {
        // Рассчитываем шанс появления декораций в зависимости от размера карты
        const baseDecorationChance = GAME_CONFIG.DUNGEON_GENERATOR.DECORATION_CHANCE_BASE;
        const sizeFactor = Math.min((this.width * this.height) / (20 * 20), 1.5); // Множитель от размера карты
        const decorationChance = baseDecorationChance * sizeFactor;

        // Добавляем случайные элементы декорации
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                if (this.map[y][x] === 0 && Math.random() < decorationChance) { // Шанс на декорацию зависит от размера карты
                    // Временно добавляем декорацию
                    const originalType = this.map[y][x];
                    this.map[y][x] = 7; // Декоративный элемент (проходимый)

                    // Проверяем, не нарушили ли мы связность карты
                    if (!this.isMapFullyConnected()) {
                        // Если нарушили, откатываем изменение
                        this.map[y][x] = originalType;
                    }
                }
            }
        }
    }

    /**
     * Получение случайной свободной позиции на карте
     * @returns {Object} - координаты {x, y}
     */
    getRandomFloorPosition() {
        let attempts = 0;
        const maxAttempts = 1000;

        while (attempts < maxAttempts) {
            const x = Math.floor(Math.random() * (this.width - 2)) + 1;
            const y = Math.floor(Math.random() * (this.height - 2)) + 1;

            if (this.map[y][x] === 0) { // Если это проходимый тайл
                return { x, y };
            }

            attempts++;
        }

        // Если не нашли свободное место, возвращаем центр первой комнаты
        if (this.rooms.length > 0) {
            const firstRoom = this.rooms[0];
            return {
                x: Math.floor(firstRoom.x + firstRoom.width / 2),
                y: Math.floor(firstRoom.y + firstRoom.height / 2)
            };
        }

        // По умолчанию возвращаем центр карты
        return {
            x: Math.floor(this.width / 2),
            y: Math.floor(this.height / 2)
        };
    }
}