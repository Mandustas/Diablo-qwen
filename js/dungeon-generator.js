class DungeonGenerator {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.map = [];
        this.rooms = [];
        this.corridors = [];
    }

    /**
     * Генерация подземелья
     * @param {number} roomCount - количество комнат для генерации
     * @param {number} minRoomSize - минимальный размер комнаты
     * @param {number} maxRoomSize - максимальный размер комнаты
     * @returns {Array<Array<number>>} - сгенерированная карта
     */
    generateDungeon(roomCount = 8, minRoomSize = 4, maxRoomSize = 10) {
        // Инициализируем карту стенами
        this.initializeMap();

        // Создаем комнаты
        this.createRooms(roomCount, minRoomSize, maxRoomSize);

        // Соединяем комнаты коридорами
        this.connectRooms();

        // Возвращаем сгенерированную карту
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
                // Создаем границы из стен
                if (x === 0 || y === 0 || x === this.width - 1 || y === this.height - 1) {
                    this.map[y][x] = 1; // Стена
                } else {
                    this.map[y][x] = 1; // Сначала все стены
                }
            }
        }
    }

    /**
     * Создание комнат
     * @param {number} count - количество комнат
     * @param {number} minSize - минимальный размер комнаты
     * @param {number} maxSize - максимальный размер комнаты
     */
    createRooms(count, minSize, maxSize) {
        this.rooms = [];

        for (let i = 0; i < count; i++) {
            let attempts = 0;
            let room;
            let overlapping = true;

            // Пытаемся создать комнату, которая не пересекается с другими
            while (overlapping && attempts < 100) {
                const w = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;
                const h = Math.floor(Math.random() * (maxSize - minSize + 1)) + minSize;

                // Убедимся, что комната не выходит за границы
                const x = Math.floor(Math.random() * (this.width - w - 2)) + 1;
                const y = Math.floor(Math.random() * (this.height - h - 2)) + 1;

                room = { x, y, width: w, height: h };

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

        // Соединяем каждую комнату со следующей
        for (let i = 0; i < this.rooms.length - 1; i++) {
            this.createCorridor(this.rooms[i], this.rooms[i + 1]);
        }
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

        // Горизонтальный участок коридора
        let x = centerA.x;
        let y = centerA.y;

        // Прокладываем путь по X
        while (x !== centerB.x) {
            if (x < centerB.x) x++;
            else x--;

            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.map[y][x] = 0;
            }
        }

        // Прокладываем путь по Y
        while (y !== centerB.y) {
            if (y < centerB.y) y++;
            else y--;

            if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
                this.map[y][x] = 0;
            }
        }
    }

    /**
     * Добавление случайных элементов декорации
     */
    addDecorations() {
        // Добавляем случайные колонны в коридорах
        for (let y = 1; y < this.height - 1; y++) {
            for (let x = 1; x < this.width - 1; x++) {
                // Если это пол и рядом есть стены, добавляем шанс на колонну
                if (this.map[y][x] === 0 && 
                    (this.map[y-1][x] === 1 || this.map[y+1][x] === 1 || 
                     this.map[y][x-1] === 1 || this.map[y][x+1] === 1) &&
                    Math.random() < 0.02) { // 2% шанс
                    this.map[y][x] = 2; // Колонна или другой элемент декорации
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

            if (this.map[y][x] === 0) { // Если это пол
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