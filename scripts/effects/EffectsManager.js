/**
 * Effects Manager
 * Centralized system for creating and managing all visual effects
 * Handles particle systems, explosions, and other visual feedback
 */

class EffectsManager {
  constructor() {
    // This manager doesn't store effects directly - they're stored in gameState
    // It provides convenient methods for creating and spawning effects

    this._maxJuice = 250;
    this._maxExplosions = 120;
    this._maxSlices = 60;
    this._maxWallSplashes = 80;
    this._maxComboSplashes = 6;
  }

  /**
   * Creates juice splatter effect when a fruit is sliced
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} particleCount - Number of juice particles to create
   */
  createJuiceSplatter(x, y, particleCount = GameConstants.JUICE_PARTICLE_COUNT) {
    // Adaptive downscale when many effects are active
    const active = this.getActiveEffectCount();
    const scale = active > 150 ? 0.4 : active > 100 ? 0.6 : active > 60 ? 0.8 : 1.0;
    const count = Math.max(2, Math.floor(particleCount * scale));

    const particles = Particle.createJuiceParticles(x, y, count);
    gameState.juiceParticles.push(...particles);

    // Cap array to avoid unbounded growth
    if (gameState.juiceParticles.length > this._maxJuice) {
      gameState.juiceParticles.splice(0, gameState.juiceParticles.length - this._maxJuice);
    }

    // Also create a wall splash effect (but rate-limit under pressure)
    if (scale >= 0.6 || Math.random() < 0.3) {
      const wallSplash = Particle.createWallSplash(x, y);
      gameState.wallSplashes.push(wallSplash);
      if (gameState.wallSplashes.length > this._maxWallSplashes) {
        gameState.wallSplashes.splice(0, gameState.wallSplashes.length - this._maxWallSplashes);
      }
    }
  }

  /**
   * Creates bomb explosion effect when a bomb is hit
   * @param {number} x - Center X coordinate
   * @param {number} y - Center Y coordinate
   * @param {number} particleCount - Number of explosion particles to create
   */
  createBombExplosion(x, y, particleCount = GameConstants.BOMB_EXPLOSION_COUNT) {
    const active = this.getActiveEffectCount();
    const scale = active > 150 ? 0.5 : active > 100 ? 0.7 : 1.0;
    const count = Math.max(4, Math.floor(particleCount * scale));

    const particles = Particle.createBombExplosion(x, y, count);
    gameState.bombExplosions.push(...particles);
    if (gameState.bombExplosions.length > this._maxExplosions) {
      gameState.bombExplosions.splice(0, gameState.bombExplosions.length - this._maxExplosions);
    }
  }

  /**
   * Creates fruit slice halves when a fruit is cut
   * @param {Fruit} fruit - The fruit that was sliced
   */
  createFruitSlices(fruit) {
    const slices = FruitSlice.createFromFruit(fruit);
    gameState.slices.push(...slices);
    if (gameState.slices.length > this._maxSlices) {
      gameState.slices.splice(0, gameState.slices.length - this._maxSlices);
    }
  }

  /**
   * Creates combo splash text effect
   * @param {number} comboCount - Number of consecutive hits
   * @param {number} canvasWidth - Canvas width for positioning
   */
  createComboSplash(comboCount, canvasWidth) {
    // Avoid stacking too many combo texts
    if (gameState.comboSplashes.length >= this._maxComboSplashes) {
      gameState.comboSplashes.shift();
    }

    let splash;

    // Use special styling for milestone combos
    if (comboCount >= 5) {
      splash = ComboSplash.createSpecialComboSplash(comboCount, canvasWidth);
    } else {
      splash = ComboSplash.createComboSplash(comboCount, canvasWidth);
    }

    gameState.comboSplashes.push(splash);
  }

  /**
   * Creates a complete fruit slice effect package
   * Includes slices, juice, wall splash, and combo check
   * @param {Fruit} fruit - The fruit that was sliced
   * @param {number} canvasWidth - Canvas width for combo positioning
   */
  createFruitSliceEffect(fruit, canvasWidth) {
    // Create the visual slices
    this.createFruitSlices(fruit);

    // Create juice splatter effect
    this.createJuiceSplatter(fruit.x, fruit.y);

    // Check for combo and create splash if applicable
    const comboCount = gameState.getDisplayCombo();
    if (comboCount) {
      this.createComboSplash(comboCount, canvasWidth);
      // Show a score popup at slice location equal to combo points awarded
      try { uiManager.createScorePopup?.(comboCount, fruit.x, fruit.y); } catch(_) {}
    }
  }

  /**
   * Updates all effects managed by this system
   * @param {number} deltaTime - Time elapsed since last update
   * @param {number} canvasWidth - Canvas width for boundary checking
   * @param {number} canvasHeight - Canvas height for boundary checking
   */
  updateEffects(deltaTime, canvasWidth, canvasHeight) {
    // Update juice particles
    this.updateParticleArray(gameState.juiceParticles, deltaTime, canvasWidth, canvasHeight);

    // Update bomb explosions
    this.updateParticleArray(gameState.bombExplosions, deltaTime, canvasWidth, canvasHeight);

    // Update wall splashes
    this.updateParticleArray(gameState.wallSplashes, deltaTime, canvasWidth, canvasHeight);

    // Update fruit slices
    this.updateGameObjectArray(gameState.slices, deltaTime, canvasWidth, canvasHeight);

    // Update combo splashes
    this.updateGameObjectArray(gameState.comboSplashes, deltaTime, canvasWidth, canvasHeight);
  }

  /**
   * Updates an array of particles and removes expired ones
   * @param {Array} particleArray - Array of particles to update
   * @param {number} deltaTime - Time elapsed since last update
   * @param {number} canvasWidth - Canvas width for boundary checking
   * @param {number} canvasHeight - Canvas height for boundary checking
   */
  updateParticleArray(particleArray, deltaTime, canvasWidth, canvasHeight) {
    for (let i = particleArray.length - 1; i >= 0; i--) {
      const particle = particleArray[i];
      particle.update(deltaTime);

      if (particle.shouldRemove(canvasWidth, canvasHeight)) {
        particleArray.splice(i, 1);
      }
    }
  }

  /**
   * Updates an array of game objects and removes expired ones
   * @param {Array} objectArray - Array of game objects to update
   * @param {number} deltaTime - Time elapsed since last update
   * @param {number} canvasWidth - Canvas width for boundary checking
   * @param {number} canvasHeight - Canvas height for boundary checking
   */
  updateGameObjectArray(objectArray, deltaTime, canvasWidth, canvasHeight) {
    for (let i = objectArray.length - 1; i >= 0; i--) {
      const obj = objectArray[i];
      obj.update(deltaTime);

      if (obj.shouldRemove(canvasWidth, canvasHeight)) {
        objectArray.splice(i, 1);
      }
    }
  }

  /**
   * Renders all effects managed by this system
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  renderEffects(ctx) {
    // Render wall splashes first (background layer)
    this.renderParticleArray(gameState.wallSplashes, ctx);

    // Render fruit slices
    this.renderGameObjectArray(gameState.slices, ctx);

    // Render juice particles
    this.renderParticleArray(gameState.juiceParticles, ctx);

    // Render bomb explosions
    this.renderParticleArray(gameState.bombExplosions, ctx);

    // Render combo splashes (foreground layer)
    this.renderGameObjectArray(gameState.comboSplashes, ctx);
  }

  /**
   * Renders an array of particles
   * @param {Array} particleArray - Array of particles to render
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  renderParticleArray(particleArray, ctx) {
    for (const particle of particleArray) {
      particle.render(ctx);
    }
  }

  /**
   * Renders an array of game objects
   * @param {Array} objectArray - Array of game objects to render
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  renderGameObjectArray(objectArray, ctx) {
    for (const obj of objectArray) {
      obj.render(ctx);
    }
  }

  /**
   * Clears all effects (useful for game restart)
   */
  clearAllEffects() {
    gameState.juiceParticles.length = 0;
    gameState.bombExplosions.length = 0;
    gameState.wallSplashes.length = 0;
    gameState.slices.length = 0;
    gameState.comboSplashes.length = 0;
  }

  /**
   * Gets the total number of active effects
   * @returns {number} Total count of all active effects
   */
  getActiveEffectCount() {
    return gameState.juiceParticles.length +
           gameState.bombExplosions.length +
           gameState.wallSplashes.length +
           gameState.slices.length +
           gameState.comboSplashes.length;
  }

  /**
   * Creates a screen shake effect (to be implemented by renderer)
   * @param {number} intensity - Shake intensity
   * @param {number} duration - Shake duration in seconds
   */
  createScreenShake(intensity = 10, duration = 0.5) {
    // This would be implemented by the renderer
    // For now, we just store the shake data
    gameState.screenShake = {
      intensity: intensity,
      duration: duration,
      timeRemaining: duration
    };
  }

  /**
   * Creates a color flash effect for the screen
   * @param {string} color - Flash color
   * @param {number} intensity - Flash intensity (0-1)
   * @param {number} duration - Flash duration in seconds
   */
  createScreenFlash(color = "rgba(255,255,255,0.5)", intensity = 0.5, duration = 0.3) {
    gameState.screenFlash = {
      color: color,
      intensity: intensity,
      duration: duration,
      timeRemaining: duration
    };
  }
}

// Create global effects manager instance
const effectsManager = new EffectsManager();
