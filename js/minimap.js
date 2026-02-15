/**
 * Миникарта для отображения игрового мира
 */
class Minimap {
    constructor(game) {
        this.game = game;
        this.width = 250;
        this.height = 250;
        this.scale = 1.2; // Уменьшенный масштаб для отображения большей области
        
        // Создаем canvas для миникарты
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');
        
        // Добавляем контейнер миникарты в DOM
        this.createMinimapElement();
        
        // Цвета для миникарты
        this.colors = {
            background: '#1a1414',
            border: '#3a2a1a',
            floor: '#3a2d1f',
            wall: '#2a1a0a',
            player: '#4a9eff',
            enemy: '#ff4a4a',
            enemyStrong: '#ff6600',
            enemyFast: '#ffff00',
            enemyTank: '#8b0000',
            room: '#2d2a1f'
        };
    }
    
    /**
     * Создание HTML элемента миникарты
     */
    createMinimapElement() {
        const container = document.createElement('div');
        container.id = 'minimapContainer';
        container.style.cssText = `
            position: absolute;
            bottom: 20px;
            left: 20px;
            z-index: 15;
            background: linear-gradient(to bottom, #1a1414 0%, #0d0a0a 100%);
            border: 2px solid #3a2a1a;
            padding: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.6), inset 0 0 10px rgba(74,58,42,0.2);
        `;
        
        // Заголовок
        const title = document.createElement('div');
        title.textContent = 'Миникарта';
        title.style.cssText = `
            color: #c9b896;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 8px;
            text-align: center;
            border-bottom: 1px solid #3a2a1a;
            padding-bottom: 5px;
        `;
        
        // Canvas миникарты
        this.canvas.style.cssText = `
            display: block;
            border: 1px solid #2a1a0a;
        `;
        
        container.appendChild(title);
        container.appendChild(this.canvas);
        
        document.getElementById('gameContainer').appendChild(container);
    }
    
    /**
     * Обновление миникарты
     */
    update() {
        const ctx = this.ctx;
        
        // Очищаем миникарту
        ctx.fillStyle = this.colors.background;
        ctx.fillRect(0, 0, this.width, this.height);
        
        // Получаем позицию игрока в тайлах
        const playerTilePos = getTileIndex(this.game.character.x, this.game.character.y);
        
        // Рисуем активные чанки
        this.drawActiveChunks(ctx, playerTilePos.tileX, playerTilePos.tileY);
        
        // Рисуем врагов
        this.drawEnemiesIso(ctx, playerTilePos.tileX, playerTilePos.tileY);
        
        // Рисуем игрока в центре
        ctx.fillStyle = this.colors.player;
        ctx.beginPath();
        ctx.arc(this.width / 2, this.height / 2, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Обводка игрока
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    
    /**
     * Преобразование изометрических координат тайла в координаты миникарты
     */
    tileToMinimapIso(tileX, tileY, playerTileX, playerTileY) {
        // Изометрическое преобразование
        const isoX = (tileX - tileY) * this.scale;
        const isoY = (tileX + tileY) * this.scale * 0.5;
        
        // Смещение относительно игрока
        const playerIsoX = (playerTileX - playerTileY) * this.scale;
        const playerIsoY = (playerTileX + playerTileY) * this.scale * 0.5;
        
        // Позиция на миникарте
        const mapX = this.width / 2 + (isoX - playerIsoX);
        const mapY = this.height / 2 + (isoY - playerIsoY);
        
        return { x: mapX, y: mapY };
    }
    
    /**
     * Рисование активных чанков на миникарте
     */
    drawActiveChunks(ctx, playerTileX, playerTileY) {
        const chunkSystem = this.game.chunkSystem;
        
        // Проходим по всем активным чанкам
        for (const chunkKey of chunkSystem.activeChunks) {
            const chunk = chunkSystem.chunks.get(chunkKey);
            if (!chunk || !chunk.tiles) continue;
            
            const chunkX = chunk.chunkX;
            const chunkY = chunk.chunkY;
            const chunkSize = chunk.size;
            
            // Рисуем каждый тайл чанка
            for (let y = 0; y < chunk.tiles.length; y++) {
                for (let x = 0; x < chunk.tiles[y].length; x++) {
                    const worldTileX = chunkX * chunkSize + x;
                    const worldTileY = chunkY * chunkSize + y;
                    
                    // Получаем позицию на миникарте
                    const pos = this.tileToMinimapIso(worldTileX, worldTileY, playerTileX, playerTileY);
                    
                    // Проверяем границы миникарты
                    if (pos.x < -10 || pos.x > this.width + 10 || pos.y < -10 || pos.y > this.height + 10) {
                        continue;
                    }
                    
                    const tileType = chunk.tiles[y][x];
                    
                    // Определяем цвет тайла
                    let color = null;
                    if (tileType === 0) { // Пол
                        color = this.colors.floor;
                    } else if (tileType === 1) { // Стена
                        color = this.colors.wall;
                    } else if (tileType === 3) { // Дерево
                        color = '#1a3a1a';
                    } else if (tileType === 4) { // Скала
                        color = '#3a3a3a';
                    } else if (tileType === 5) { // Вода
                        color = '#1a3a5a';
                    } else if (tileType === 6) { // Лед
                        color = '#8ab4d4';
                    } else if (tileType === 7) { // Декорация
                        color = '#3a4a2a';
                    }
                    
                    if (color) {
                        ctx.fillStyle = color;
                        // Рисуем изометрический ромб
                        this.drawIsoTile(ctx, pos.x, pos.y, this.scale * 0.9);
                    }
                }
            }
        }
    }
    
    /**
     * Рисование изометрического тайла на миникарте
     */
    drawIsoTile(ctx, x, y, size) {
        ctx.beginPath();
        ctx.moveTo(x, y - size * 0.5);
        ctx.lineTo(x + size, y);
        ctx.lineTo(x, y + size * 0.5);
        ctx.lineTo(x - size, y);
        ctx.closePath();
        ctx.fill();
    }
    
    /**
     * Рисование врагов на миникарте с изометрической проекцией
     */
    drawEnemiesIso(ctx, playerTileX, playerTileY) {
        for (const enemy of this.game.enemies) {
            const enemyTilePos = getTileIndex(enemy.x, enemy.y);
            
            // Получаем позицию на миникарте
            const pos = this.tileToMinimapIso(enemyTilePos.tileX, enemyTilePos.tileY, playerTileX, playerTileY);
            
            // Проверяем границы миникарты
            if (pos.x < 0 || pos.x > this.width || pos.y < 0 || pos.y > this.height) {
                continue;
            }
            
            // Определяем цвет врага
            let enemyColor = this.colors.enemy;
            if (enemy.type === 'strong') {
                enemyColor = this.colors.enemyStrong;
            } else if (enemy.type === 'fast') {
                enemyColor = this.colors.enemyFast;
            } else if (enemy.type === 'tank') {
                enemyColor = this.colors.enemyTank;
            }
            
            ctx.fillStyle = enemyColor;
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}
