/**
 * Renderer Class
 * Handles all rendering operations for the game
 * Manages canvas drawing, visual effects, and screen overlays
 */

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    
    // Rendering state
    this.screenShake = { x: 0, y: 0 };
    
    // Set up canvas resize handling
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  /**
   * Resizes the canvas to match the window size
   * 强制横屏：竖屏时内容旋转 90°，canvas 宽高交换
   */
  resizeCanvas() {
    const portrait = window.innerHeight > window.innerWidth;
    this.canvas.width = portrait ? window.innerHeight : window.innerWidth;
    this.canvas.height = portrait ? window.innerWidth : window.innerHeight;
  }

  /**
   * Main render method - draws the complete game frame
   */
  render() {
    // Clear the canvas (preserves background image)
    this.clearCanvas();
    
    // Apply screen shake if active
    this.applyScreenEffects();
    
    // Render all game elements in order
    this.renderBackground();
    this.renderWallSplashes();
    this.renderFruits();
    this.renderSlices();
    this.renderParticles();
    this.renderBombExplosions();
    this.renderComboSplashes();
    this.renderSwipeTrail();
    this.renderScreenOverlays();
    
    // Reset any transformations
    this.resetTransforms();
  }

  /**
   * Clears the canvas for the next frame
   */
  clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Applies screen effects like shake and flash
   */
  applyScreenEffects() {
    this.ctx.save();
    
    // Apply screen shake
    if (gameState.screenShake && gameState.screenShake.timeRemaining > 0) {
      const shake = gameState.screenShake;
      const intensity = shake.intensity * (shake.timeRemaining / shake.duration);
      this.screenShake.x = (Math.random() - 0.5) * intensity;
      this.screenShake.y = (Math.random() - 0.5) * intensity;
      this.ctx.translate(this.screenShake.x, this.screenShake.y);
    }
  }

  /**
   * Renders background elements (currently none, but placeholder for future)
   */
  renderBackground() {
    // Background is handled by CSS, but we could add dynamic elements here
  }

  /**
   * Renders wall splash effects
   */
  renderWallSplashes() {
    for (const splash of gameState.wallSplashes) {
      splash.render(this.ctx);
    }
  }

  /**
   * Renders all fruits and bombs
   */
  renderFruits() {
    for (const fruit of gameState.fruits) {
      if (!fruit.sliced) {
        fruit.render(this.ctx);
      }
    }
  }

  /**
   * Renders fruit slice halves
   */
  renderSlices() {
    for (const slice of gameState.slices) {
      slice.render(this.ctx);
    }
  }

  /**
   * Renders juice particles
   */
  renderParticles() {
    const w = this.canvas.width, h = this.canvas.height;
    for (const particle of gameState.juiceParticles) {
      // Quick reject if far off screen
      if (particle.x < -100 || particle.x > w + 100 || particle.y < -100 || particle.y > h + 100) continue;
      particle.render(this.ctx);
    }
  }

  /**
   * Renders bomb explosion effects
   */
  renderBombExplosions() {
    const w = this.canvas.width, h = this.canvas.height;
    for (const explosion of gameState.bombExplosions) {
      if (explosion.x < -120 || explosion.x > w + 120 || explosion.y < -120 || explosion.y > h + 120) continue;
      explosion.render(this.ctx);
    }
  }

  /**
   * Renders combo splash text effects
   */
  renderComboSplashes() {
    for (const combo of gameState.comboSplashes) {
      combo.render(this.ctx);
    }
  }

  /**
   * Renders the swipe trail effect
   */
  renderSwipeTrail() {
    const swipePoints = gameState.swipePoints;
    if (swipePoints.length < 2) return;
    
    this.ctx.save();
    this.ctx.lineWidth = GameConstants.SWIPE_TRAIL_WIDTH;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    
    const now = performance.now();
    
    // Draw each segment of the swipe trail with fading alpha
    for (let i = 0; i < swipePoints.length - 1; i++) {
      const p1 = swipePoints[i];
      const p2 = swipePoints[i + 1];
      
      // Calculate alpha based on age of the trail point
      const age = now - p1.t;
      const alpha = Math.max(0, 1 - age / GameConstants.SWIPE_TRAIL_DURATION);
      
      if (alpha > 0) {
        this.ctx.strokeStyle = GameConstants.COLORS.SWIPE_TRAIL.replace("{alpha}", alpha);
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      }
    }
    
    this.ctx.restore();
  }

  /**
   * Renders screen overlays like flashes
   */
  renderScreenOverlays() {
    // Render screen flash effect
    if (gameState.screenFlash && gameState.screenFlash.timeRemaining > 0) {
      const flash = gameState.screenFlash;
      const alpha = flash.intensity * (flash.timeRemaining / flash.duration);
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = flash.color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }

  /**
   * Resets all canvas transformations
   */
  resetTransforms() {
    try { this.ctx.restore(); } catch(_) { /* ignore */ }
  }

  /**
   * Renders debug information (for development)
   * @param {boolean} showDebug - Whether to show debug info
   */
  renderDebugInfo(showDebug = false) {
    if (!showDebug) return;
    
    this.ctx.save();
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    this.ctx.fillRect(10, 10, 200, 150);
    
    this.ctx.fillStyle = "#0ff";
    this.ctx.font = "12px monospace";
    this.ctx.textAlign = "left";
    
    let y = 25;
    const lineHeight = 15;
    
    this.ctx.fillText(`FPS: ${this.getFPS()}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Fruits: ${gameState.fruits.length}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Particles: ${gameState.juiceParticles.length}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Explosions: ${gameState.bombExplosions.length}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Slices: ${gameState.slices.length}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Score: ${gameState.score}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Combo: ${gameState.comboCount}`, 15, y); y += lineHeight;
    this.ctx.fillText(`Time: ${gameState.elapsedTime.toFixed(1)}s`, 15, y); y += lineHeight;
    
    this.ctx.restore();
  }

  /**
   * Gets the current frames per second (simplified calculation)
   * @returns {number} Approximate FPS
   */
  getFPS() {
    if (!this.lastFrameTime) {
      this.lastFrameTime = performance.now();
      return 60;
    }
    
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.lastFrameTime = now;
    
    return Math.round(1000 / delta);
  }

  /**
   * Takes a screenshot of the current canvas
   * @returns {string} Data URL of the canvas image
   */
  takeScreenshot() {
    return this.canvas.toDataURL("image/png");
  }

  /**
   * Sets the canvas background color (for special effects)
   * @param {string} color - CSS color string
   */
  setBackgroundColor(color) {
    this.canvas.style.backgroundColor = color;
  }

  /**
   * Resets the canvas background to default (transparent)
   */
  resetBackgroundColor() {
    this.canvas.style.backgroundColor = "transparent";
  }

  /**
   * Creates a custom gradient for effects
   * @param {number} x0 - Starting X coordinate
   * @param {number} y0 - Starting Y coordinate
   * @param {number} x1 - Ending X coordinate
   * @param {number} y1 - Ending Y coordinate
   * @param {Array} colorStops - Array of {position, color} objects
   * @returns {CanvasGradient} Canvas gradient object
   */
  createGradient(x0, y0, x1, y1, colorStops) {
    const gradient = this.ctx.createLinearGradient(x0, y0, x1, y1);
    colorStops.forEach(stop => {
      gradient.addColorStop(stop.position, stop.color);
    });
    return gradient;
  }

  /**
   * Creates a radial gradient for circular effects
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} innerRadius - Inner radius
   * @param {number} outerRadius - Outer radius
   * @param {Array} colorStops - Array of {position, color} objects
   * @returns {CanvasGradient} Canvas radial gradient object
   */
  createRadialGradient(x, y, innerRadius, outerRadius, colorStops) {
    const gradient = this.ctx.createRadialGradient(x, y, innerRadius, x, y, outerRadius);
    colorStops.forEach(stop => {
      gradient.addColorStop(stop.position, stop.color);
    });
    return gradient;
  }

  /**
   * Gets the canvas dimensions
   * @returns {Object} Object with width and height properties
   */
  getDimensions() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  }
}
