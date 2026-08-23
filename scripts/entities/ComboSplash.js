/**
 * ComboSplash Class
 * Represents the visual feedback for combo achievements
 * Displays animated text when players achieve consecutive fruit slices
 */

class ComboSplash extends GameObject {
  /**
   * Creates a new ComboSplash object
   * @param {string} text - The combo text to display (e.g., "Combo 3!")
   * @param {number} x - X coordinate for display
   * @param {number} y - Y coordinate for display
   */
  constructor(text, x, y) {
    super(x, y, 0, 0); // Combo splashes don't move
    
    // Combo-specific properties
    this.text = text;
    this.scale = 1.0;
    this.targetScale = 1.5; // Scale animation target
    this.color = GameConstants.COLORS.NEON_YELLOW;
    this.shadowColor = GameConstants.COLORS.NEON_YELLOW;
    this.shadowBlur = 20;
    
    // Set lifecycle
    this.life = GameConstants.COMBO_SPLASH_LIFE;
    this.maxLife = GameConstants.COMBO_SPLASH_LIFE;
    
    // Animation properties
    this.scaleSpeed = 2.0; // How fast the scale animation happens
    this.pulseIntensity = 0.1; // Intensity of the pulsing effect
  }

  /**
   * Creates a combo splash for a specific combo count
   * @param {number} comboCount - Number of consecutive hits
   * @param {number} canvasWidth - Canvas width for positioning
   * @returns {ComboSplash} New combo splash instance
   */
  static createComboSplash(comboCount, canvasWidth) {
    const text = `连击 ${comboCount}!`;
    const x = canvasWidth / 2;
    const y = GameConstants.COMBO_SPLASH_Y_POSITION;

    return new ComboSplash(text, x, y);
  }

  /**
   * Creates special combo splashes for milestone achievements
   * @param {number} comboCount - Number of consecutive hits
   * @param {number} canvasWidth - Canvas width for positioning
   * @returns {ComboSplash} New combo splash with special styling
   */
  static createSpecialComboSplash(comboCount, canvasWidth) {
    let text;
    let color = GameConstants.COLORS.NEON_YELLOW;
    
    // Special text and colors for milestone combos
    if (comboCount >= 10) {
      text = `疯狂连击 ${comboCount}!`;
      color = "#ff00ff"; // Magenta for insane combos
    } else if (comboCount >= 7) {
      text = `超级连击 ${comboCount}!`;
      color = "#ff4400"; // Orange-red for mega combos
    } else if (comboCount >= 5) {
      text = `大连击 ${comboCount}!`;
      color = "#00ff00"; // Green for super combos
    } else {
      text = `连击 ${comboCount}!`;
    }
    
    const splash = new ComboSplash(text, canvasWidth / 2, GameConstants.COMBO_SPLASH_Y_POSITION);
    splash.color = color;
    splash.shadowColor = color;
    
    // Special combos have enhanced effects
    if (comboCount >= 5) {
      splash.targetScale = 2.0;
      splash.shadowBlur = 30;
      splash.life *= 1.5; // Last longer
      splash.maxLife = splash.life;
    }
    
    return splash;
  }

  /**
   * Updates the combo splash animation
   * @param {number} deltaTime - Time elapsed since last update
   */
  update(deltaTime) {
    super.update(deltaTime);
    
    // Calculate animation progress (0 to 1)
    const progress = 1 - (this.life / this.maxLife);
    
    // Scale animation - grows then shrinks
    if (progress < 0.3) {
      // Growing phase
      this.scale = GeometryUtils.lerp(1.0, this.targetScale, progress / 0.3);
    } else if (progress < 0.7) {
      // Stable phase with slight pulsing
      const pulseTime = (progress - 0.3) / 0.4;
      const pulse = Math.sin(pulseTime * Math.PI * 4) * this.pulseIntensity;
      this.scale = this.targetScale + pulse;
    } else {
      // Shrinking phase
      const shrinkProgress = (progress - 0.7) / 0.3;
      this.scale = GeometryUtils.lerp(this.targetScale, 0.5, shrinkProgress);
    }
  }

  /**
   * Renders the combo splash text with scaling and glow effects
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  render(ctx) {
    const alpha = this.getAlpha();
    if (alpha <= 0) return;
    
    ctx.save();
    
    // Set transparency
    ctx.globalAlpha = alpha;
    
    // Apply shadow/glow effect
    ctx.shadowColor = this.shadowColor;
    ctx.shadowBlur = this.shadowBlur;
    
    // Set font properties with scaling
    const fontSize = 64 * this.scale;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = this.color;
    
    // Draw the text
    ctx.fillText(this.text, this.x, this.y);
    
    // Optional: Add stroke for better visibility
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.lineWidth = 2;
    ctx.strokeText(this.text, this.x, this.y);
    
    ctx.restore();
  }

  /**
   * Combo splashes should never be removed due to position
   * @param {number} canvasWidth - Canvas width
   * @param {number} canvasHeight - Canvas height
   * @returns {boolean} True only if life expired
   */
  shouldRemove(canvasWidth, canvasHeight) {
    return !this.isAlive;
  }

  /**
   * Sets a custom color for the combo splash
   * @param {string} color - CSS color string
   */
  setColor(color) {
    this.color = color;
    this.shadowColor = color;
  }

  /**
   * Sets custom scale animation properties
   * @param {number} targetScale - Target scale for animation
   * @param {number} scaleSpeed - Speed of scale animation
   */
  setScaleAnimation(targetScale, scaleSpeed) {
    this.targetScale = targetScale;
    this.scaleSpeed = scaleSpeed;
  }

  /**
   * Gets the current visual bounds of the text
   * This is approximate since text measurement in canvas is complex
   * @returns {Object} Approximate bounding box
   */
  getBounds() {
    const fontSize = 64 * this.scale;
    const approxWidth = this.text.length * fontSize * 0.6; // Rough estimate
    const approxHeight = fontSize;
    
    return {
      left: this.x - approxWidth / 2,
      right: this.x + approxWidth / 2,
      top: this.y - approxHeight / 2,
      bottom: this.y + approxHeight / 2
    };
  }

  /**
   * Triggers an immediate scale pulse effect
   */
  pulse() {
    this.scale = Math.min(this.scale * 1.2, this.targetScale * 1.5);
  }
}
