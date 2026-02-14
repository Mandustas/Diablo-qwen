// Константы для изометрической проекции
const ISO_ANGLE = Math.atan(0.5); // Угол для изометрической проекции
const TILE_WIDTH = 64;  // Ширина тайла
const TILE_HEIGHT = 32; // Высота тайла

/**
 * Преобразование изометрических координат в 2D координаты
 * @param {number} isoX - X координата в изометрической системе
 * @param {number} isoY - Y координата в изометрической системе
 * @returns {{x: number, y: number}} - 2D координаты
 */
function isoTo2D(isoX, isoY) {
    const x = (isoX - isoY) * Math.cos(ISO_ANGLE) * TILE_WIDTH / 2;
    const y = (isoX + isoY) * Math.sin(ISO_ANGLE) * TILE_HEIGHT / 2;
    return { x, y };
}

/**
 * Преобразование 2D координат в изометрические
 * @param {number} x - X координата в 2D системе
 * @param {number} y - Y координата в 2D системе
 * @returns {{isoX: number, isoY: number}} - Изометрические координаты
 */
function coordToIso(x, y) {
    const tempX = x / (Math.cos(ISO_ANGLE) * TILE_WIDTH / 2);
    const tempY = y / (Math.sin(ISO_ANGLE) * TILE_HEIGHT / 2);
    
    const isoX = (tempX + tempY) / 2;
    const isoY = (tempY - tempX) / 2;
    
    return { isoX, isoY };
}

/**
 * Получение индекса тайла по 2D координатам
 * @param {number} x - X координата в 2D системе
 * @param {number} y - Y координата в 2D системе
 * @returns {{tileX: number, tileY: number}} - Индексы тайла
 */
function getTileIndex(x, y) {
    const isoCoords = coordToIso(x, y);
    const tileX = Math.floor(isoCoords.isoX);
    const tileY = Math.floor(isoCoords.isoY);
    return { tileX, tileY };
}