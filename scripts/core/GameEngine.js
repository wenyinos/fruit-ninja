/**
 * Game Engine Core
 * Central orchestrator for the entire game system
 * Manages the main game loop, coordinates all subsystems, and handles state transitions
 */

class GameEngine {
  constructor() {
    // Core components
    this.canvas = null;
    this.renderer = null;
    this.inputManager = null;
    
    // Game loop state
    this.isRunning = false;
    this.isPaused = false;
    this.lastFrameTime = null;
    this.frameCount = 0;
    this.debugMode = false;
    this.gameOverLogged = false;
    
    // Performance tracking
    this.fps = 60;
    this.frameTimeHistory = [];
    this.maxFrameHistory = 60; // Track last 60 frames for FPS calculation

    // Fixed timestep for physics updates
    this._accumulator = 0;
    this._fixedDelta = 1/120; // 120 Hz

    // Cursor and fullscreen settings
    this.showCursor = true;
    this.autoFullscreen = false; // can be toggled by user setting
  }

  /**
   * Initializes the game engine and all subsystems
   */
  initialize() {
    // Get canvas element
    this.canvas = document.getElementById("gameCanvas");
    if (!this.canvas) {
      throw new Error("未找到 Canvas 元素 'gameCanvas'");
    }
    
    // Initialize core components
    this.renderer = new Renderer(this.canvas);
    this.inputManager = new InputManager(this.canvas);
    
    // Initialize game state
    gameState.reset();
    
    // Reset the gameOverLogged flag
    this.gameOverLogged = false;
  }

  /**
   * Starts the main game loop
   */
  startGame() {
    if (this.isRunning) {
      return;
    }

    // (Re)create InputManager if it was destroyed previously
    if (!this.inputManager && this.canvas) {
      this.inputManager = new InputManager(this.canvas);
    }
    
    // Reset all systems
    this.resetAllSystems();

    // Reset timing accumulators
    this._accumulator = 0;
    
    // Mark as running
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = null;
    
    // Hide cursor while playing
    if (this.canvas && !this.showCursor) {
      this.canvas.style.cursor = 'none';
    }

    // Note: fullscreen is managed by the container in the tool runtime;
    // the autoFullscreen option is a no-op there.

    // Start the game loop
    requestAnimationFrame((timestamp) => this.gameLoop(timestamp));
  }

  /**
   * Stops the game loop
   */
  stopGame() {
    this.isRunning = false;
    this.isPaused = false;
  }

  /**
   * Pauses the game (keeps loop running but stops updates)
   */
  pauseGame() {
    if (!this.isRunning) return;
    
    this.isPaused = true;
    uiManager.showPauseOverlay?.();
    // Restore cursor
    if (this.canvas) this.canvas.style.cursor = 'default';
  }

  /**
   * Resumes the game from pause
   */
  resumeGame() {
    if (!this.isRunning) return;
    
    this.isPaused = false;
    this.lastFrameTime = null;
    uiManager.hidePauseOverlay?.();
    // Hide cursor again if desired
    if (this.canvas && !this.showCursor) this.canvas.style.cursor = 'none';
    console.log("游戏已恢复");
  }

  /**
   * Main game loop - runs every frame
   * @param {number} timestamp - High-resolution timestamp from requestAnimationFrame
   */
  gameLoop(timestamp) {
    // Continue loop if still running
    if (this.isRunning) {
      requestAnimationFrame((ts) => this.gameLoop(ts));
    }
    
    // Skip processing if paused
    if (this.isPaused) {
      return;
    }
    
    // Calculate delta time
    if (!this.lastFrameTime) {
      this.lastFrameTime = timestamp;
      return;
    }
    
    let deltaTime = (timestamp - this.lastFrameTime) / 1000; // seconds
    this.lastFrameTime = timestamp;
    
    // Track frame performance
    this.updatePerformanceMetrics(deltaTime);
    
    // Clamp to avoid spiral of death
    deltaTime = Math.min(deltaTime, 1/15);
    
    // Fixed timestep loop for stable physics
    this._accumulator += deltaTime;
    const step = this._fixedDelta;
    let iterations = 0;
    const maxIterations = 8; // safety cap
    while (this._accumulator >= step && iterations < maxIterations) {
      this.update(step);
      this._accumulator -= step;
      iterations++;
    }
    
    // Render once per frame
    this.render();
    
    // Check for game over
    if (gameState.gameOver && this.isRunning) {
      this.handleGameOver();
    }
    
    this.frameCount++;
  }

  /**
   * Updates all game systems
   * @param {number} deltaTime - Time elapsed since last frame in seconds
   */
  update(deltaTime) {
    // Before heavy work: constrain swipe trail points count to keep collisions cheap
    if (gameState.swipePoints.length > 20) {
      // keep only youngest N points
      gameState.swipePoints.splice(0, gameState.swipePoints.length - 20);
    }

    // Update core game state
    this.updateGameState(deltaTime);
    
    // Update all game systems in order
    spawnManager.update(deltaTime);
    this.updateFruits(deltaTime);
    effectsManager.updateEffects(deltaTime, this.canvas.width, this.canvas.height);
    collisionDetector.update();
    uiManager.update();
    
    // Update game difficulty
    gameState.updateDifficulty();
    gameState.updateComboStatus();
  }

  /**
   * Updates core game state variables
   * @param {number} deltaTime - Time elapsed since last frame
   */
  updateGameState(deltaTime) {
    // Update elapsed time
    gameState.elapsedTime += deltaTime;
  }

  /**
   * Updates all fruits in the game
   * @param {number} deltaTime - Time elapsed since last frame
   */
  updateFruits(deltaTime) {
    // Update and clean up fruits
    for (let i = gameState.fruits.length - 1; i >= 0; i--) {
      const fruit = gameState.fruits[i];
      fruit.update(deltaTime);
      
      // Remove fruits that are off-screen
      if (fruit.shouldRemove(this.canvas.width, this.canvas.height)) {
        gameState.fruits.splice(i, 1);
      }
    }
  }

  /**
   * Renders the complete game frame
   */
  render() {
    this.renderer.render();
    
    // Render debug information if enabled
    if (this.debugMode) {
      this.renderer.renderDebugInfo(true);
    }
  }

  /**
   * Handles game over state transition
   */
  handleGameOver() {
    // Only log once when transitioning to game over
    if (!this.gameOverLogged) {
      console.log(`游戏结束！最终分数：${gameState.score}`);
      this.gameOverLogged = true;
    }
    
    // Stop spawning new fruits
    // (spawn manager will handle this based on gameState.gameOver)
    
    // Create final explosion effects if hit bomb
    const lastBomb = gameState.fruits.find(f => f.type === "bomb" && f.sliced);
    if (lastBomb) {
      effectsManager.createScreenShake(20, 1.0);
    }
    
    // Stop the game loop to halt updates and rendering
    this.stopGame();
    // UI Manager will handle showing the game over screen and restart
  }

  /**
   * Resets all game systems for a new game
   */
  resetAllSystems() {
    gameState.reset();
    spawnManager.reset();
    collisionDetector.reset();
    effectsManager.clearAllEffects();
    
    // Reset engine state
    this.gameOverLogged = false;
    
    if (this.inputManager) {
      this.inputManager.reset();
    }
  }

  /**
   * Return to main menu from gameplay (safe alternative to destroy during session)
   */
  returnToMenu() {
    // Stop and unpause
    this.stopGame();
    // Clear entities/effects
    effectsManager.clearAllEffects();
    gameState.fruits.length = 0;
    gameState.swipePoints.length = 0;
    this._accumulator = 0;
    this.lastFrameTime = null;
    // Restore cursor
    if (this.canvas) this.canvas.style.cursor = 'default';
    // Show menu
    uiManager.showMainMenu?.();
  }

  /**
   * Updates performance metrics for FPS tracking
   * @param {number} deltaTime - Time elapsed since last frame
   */
  updatePerformanceMetrics(deltaTime) {
    // Add to frame time history
    this.frameTimeHistory.push(deltaTime);
    
    // Keep only recent history
    if (this.frameTimeHistory.length > this.maxFrameHistory) {
      this.frameTimeHistory.shift();
    }
    
    // Calculate average FPS
    if (this.frameTimeHistory.length > 0) {
      const averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
      this.fps = Math.round(1 / averageFrameTime);
    }
  }

  /**
   * Toggles debug mode display
   */
  toggleDebugMode() {
    this.debugMode = !this.debugMode;
    console.log(`调试模式${this.debugMode ? '已开启' : '已关闭'}`);
  }

  /**
   * Gets current performance statistics
   * @returns {Object} Performance data
   */
  getPerformanceStats() {
    return {
      fps: this.fps,
      frameCount: this.frameCount,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      activeFruits: gameState.fruits.length,
      activeParticles: effectsManager.getActiveEffectCount(),
      gameTime: gameState.elapsedTime,
      score: gameState.score
    };
  }

  /**
   * Forces a specific frame rate (for testing)
   * @param {number} targetFps - Target frames per second
   */
  setTargetFrameRate(targetFps) {
    // This would require modifying the game loop to use setTimeout
    // instead of requestAnimationFrame for precise timing
    console.warn("自定义帧率未实现 - 使用 requestAnimationFrame");
  }

  /**
   * Saves the current game state (could be extended for save/load)
   * @returns {Object} Serializable game state
   */
  saveGameState() {
    return {
      score: gameState.score,
      elapsedTime: gameState.elapsedTime,
      difficulty: spawnManager.getDifficultyMultiplier(),
      timestamp: Date.now()
    };
  }

  /**
   * Loads a previously saved game state
   * @param {Object} savedState - Previously saved state
   */
  loadGameState(savedState) {
    if (savedState) {
      gameState.score = savedState.score || 0;
      gameState.elapsedTime = savedState.elapsedTime || 0;
      // Note: This is simplified - a full implementation would restore all state
    }
  }

  /**
   * Handles window resize events
   */
  handleResize() {
    if (this.renderer) {
      this.renderer.resizeCanvas();
    }
  }

  /**
   * Utility to expose ready screen from engine for menus
   */
  showReadyScreen() {
    if (uiManager) {
      uiManager.showReadyScreen();
    }
  }

  /**
   * Cleans up resources and stops the game engine
   */
  destroy() {
    this.stopGame();
    
    if (this.inputManager) {
      this.inputManager.destroy();
      // Ensure a fresh InputManager will be created on next start
      this.inputManager = null;
    }
    
    // Clear any remaining effects
    effectsManager.clearAllEffects();
    
    // Restore cursor on destroy
    if (this.canvas) this.canvas.style.cursor = 'default';
    
    console.log("游戏引擎已销毁");
  }

  /**
   * Gets the current engine state
   * @returns {Object} Engine state information
   */
  getEngineState() {
    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      debugMode: this.debugMode,
      frameCount: this.frameCount,
      performance: this.getPerformanceStats()
    };
  }
}

// Create global game engine instance
const gameEngine = new GameEngine();
