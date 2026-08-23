/**
 * Fruit Class
 * Represents fruits and bombs that can be sliced by the player
 * Extends GameObject with fruit-specific properties and behaviors
 */

class Fruit extends GameObject {
  /**
   * Creates a new Fruit object
   * @param {number} x - Initial X coordinate
   * @param {number} y - Initial Y coordinate
   * @param {number} vx - Initial X velocity
   * @param {number} vy - Initial Y velocity
   * @param {string} type - Type of fruit ("fruit" or "bomb")
   * @param {string} emoji - Emoji representation of the fruit
   */
  constructor(x, y, vx, vy, type = "fruit", emoji = "🍎") {
    super(x, y, vx, vy);
    
    // Fruit-specific properties
    this.type = type;
    this.emoji = emoji;
    this.radius = GameConstants.FRUIT_BASE_RADIUS + 
                  Math.random() * GameConstants.FRUIT_RADIUS_VARIATION;
    this.sliced = false;
    
    // Visual properties
    this.shadowColor = type === "bomb" ? "red" : GameConstants.COLORS.NEON_CYAN;
    this.shadowBlur = type === "bomb" ? 
                      GameConstants.BOMB_SHADOW_BLUR : 
                      GameConstants.FRUIT_SHADOW_BLUR;
  }

  /**
   * Creates a random fruit with physics properties
   * @param {number} canvasWidth - Canvas width for positioning
   * @param {number} canvasHeight - Canvas height for positioning
   * @returns {Fruit} New fruit instance
   */
  static createRandom(canvasWidth, canvasHeight) {
    // Determine if this should be a bomb
    const isBomb = Math.random() < GameConstants.BOMB_CHANCE;
    
    // Select emoji based on type
    const emoji = isBomb 
      ? GameConstants.BOMB_EMOJI
      : GameConstants.FRUIT_EMOJIS[Math.floor(Math.random() * GameConstants.FRUIT_EMOJIS.length)];
    
    // Set spawn position (bottom center with horizontal variation)
    const x = canvasWidth / 2 + 
              GeometryUtils.randomRange(-GameConstants.SPAWN_CENTER_OFFSET, GameConstants.SPAWN_CENTER_OFFSET);
    const y = canvasHeight + GameConstants.FRUIT_BASE_RADIUS + GameConstants.FRUIT_RADIUS_VARIATION;
    
    // Set initial velocity with difficulty scaling
    const difficultyBonus = gameState.getDifficultySpeedBonus();
    const vx = GeometryUtils.randomRange(-GameConstants.SPAWN_VELOCITY_RANGE / 2, GameConstants.SPAWN_VELOCITY_RANGE / 2);
    const vy = -(GameConstants.SPAWN_VELOCITY_MIN + 
                 Math.random() * GameConstants.SPAWN_VELOCITY_VARIATION + 
                 difficultyBonus);
    
    return new Fruit(x, y, vx, vy, isBomb ? "bomb" : "fruit", emoji);
  }

  /**
   * Updates the fruit's position and physics
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // Fruits don't have limited lifespan, so reset life to prevent auto-destruction
    this.life = this.maxLife;
    this.isAlive = true;
  }

  /**
   * Renders the fruit to the canvas with rotation and shadow effects
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  render(ctx) {
    if (this.sliced) return; // Don't render if already sliced

    ctx.save();
    ctx.globalAlpha = 1.0;

    // Shadow effect
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;

    // Transform
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    // Draw cached emoji
    const size = this.radius * 2;
    EmojiCache.draw(ctx, this.emoji, size, 0, 0);

    ctx.restore();
  }

  /**
   * Slices the fruit, triggering appropriate effects
   * @returns {Object} Information about the slice result
   */
  slice() {
    if (this.sliced) return null; // Already sliced
    
    this.sliced = true;
    gameState.registerSlice();
    
    if (this.type === "bomb") {
      // Handle bomb explosion
      gameState.triggerGameOver();
      return {
        type: "bomb",
        position: { x: this.x, y: this.y },
        success: false
      };
    } else {
      // Handle fruit slice
      return {
        type: "fruit",
        position: { x: this.x, y: this.y },
        fruit: this,
        success: true
      };
    }
  }

  /**
   * Checks if the fruit should be removed (off-screen)
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @returns {boolean} True if fruit should be removed
   */
  shouldRemove(canvasWidth, canvasHeight) {
    return GeometryUtils.isCircleOutsideCanvas(
      this.x, this.y, this.radius,
      canvasWidth, canvasHeight,
      GameConstants.CANVAS_OVERFLOW_THRESHOLD
    );
  }

  /**
   * Checks if a point is within the fruit's bounds
   * @param {number} px - Point X coordinate
   * @param {number} py - Point Y coordinate
   * @returns {boolean} True if point is within fruit
   */
  containsPoint(px, py) {
    return GeometryUtils.distance(this.x, this.y, px, py) <= this.radius;
  }

  /**
   * Checks if the fruit intersects with a line segment (for swipe detection)
   * @param {number} x1 - Line start X
   * @param {number} y1 - Line start Y
   * @param {number} x2 - Line end X
   * @param {number} y2 - Line end Y
   * @returns {boolean} True if line intersects fruit
   */
  intersectsLine(x1, y1, x2, y2) {
    return GeometryUtils.lineIntersectsCircle(x1, y1, x2, y2, this.x, this.y, this.radius);
  }

  /**
   * Gets the fruit's bounding box
   * @returns {Object} Bounding box with left, right, top, bottom properties
   */
  getBounds() {
    return {
      left: this.x - this.radius,
      right: this.x + this.radius,
      top: this.y - this.radius,
      bottom: this.y + this.radius
    };
  }
}
