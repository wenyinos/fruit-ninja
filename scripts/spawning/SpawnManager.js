/**
 * Spawn Manager
 * Handles the spawning of fruits and bombs with difficulty scaling
 * Manages spawn timing, patterns, and progressive challenge increases
 */

class SpawnManager {
  constructor() {
    // Spawn timing state
    this.lastSpawnTime = 0;
    this.spawnTimer = 0;
    
    // Difficulty progression
    this.baseSpawnRate = GameConstants.INITIAL_SPAWN_INTERVAL;
    this.currentSpawnRate = this.baseSpawnRate;
    
    // Spawn pattern state
    this.spawnPatternIndex = 0;
    this.burstSpawnActive = false;
    this.burstSpawnCount = 0;
    this.burstSpawnMax = 3;

    this._spawnAccumulator = 0; // for pattern staggering without setTimeout
  }

  /**
   * Updates the spawn manager and handles fruit/bomb spawning
   * @param {number} deltaTime - Time elapsed since last update (in seconds)
   */
  update(deltaTime) {
    // Exit early if game is over
    if (gameState.gameOver) return;

    // Adaptive throttling: if too many objects/effects, slow down spawns
    const activeEffects = effectsManager.getActiveEffectCount();
    const activeFruits = gameState.fruits.length;
    const pressure = activeFruits * 2 + activeEffects * 0.25; // weight fruits more
    const pressureFactor = pressure > 150 ? 2.0 : pressure > 100 ? 1.5 : pressure > 60 ? 1.25 : 1.0;

    // Update spawn timer
    this.spawnTimer += deltaTime * 1000 * (1 / pressureFactor); // slow timer under pressure
    
    // Update difficulty and spawn rate
    this.updateDifficulty();
    
    // Check if it's time to spawn
    if (this.spawnTimer >= this.currentSpawnRate && this.currentSpawnRate > 0) {
      this.spawnItem();
      this.spawnTimer = 0;
      this.lastSpawnTime = performance.now();
    }
    
    // Handle special spawn patterns occasionally (kept disabled for stability)
    this.handleSpecialSpawnPatterns(deltaTime);
  }

  /**
   * Updates the difficulty-based spawn rate
   */
  updateDifficulty() {
    // Use the same logic as the original: subtract elapsed time * 10 from base interval
    this.currentSpawnRate = Math.max(
      GameConstants.MIN_SPAWN_INTERVAL,
      this.baseSpawnRate - (gameState.elapsedTime * GameConstants.DIFFICULTY_INCREASE_RATE)
    );
    
    // Store the calculated spawn rate in game state for reference
    gameState.spawnInterval = this.currentSpawnRate;
  }

  /**
   * Spawns a single fruit or bomb
   */
  spawnItem() {
    // Prevent spawning too many fruits at once (lag prevention)
    const fruitCap = 18; // hard cap
    if (gameState.fruits.length >= fruitCap) {
      return;
    }
    
    const canvas = document.getElementById("gameCanvas");
    const fruit = Fruit.createRandom(canvas.width, canvas.height);
    
    gameState.fruits.push(fruit);
  }

  /**
   * Handles special spawn patterns for variety
   * @param {number} deltaTime - Time elapsed since last update
   */
  handleSpecialSpawnPatterns(deltaTime) {
    // Disable burst spawns for now to prevent lag
    // TODO: Re-enable with proper controls later
    return;
    
    // Occasionally trigger burst spawns for excitement
    if (!this.burstSpawnActive && Math.random() < 0.001 * deltaTime * 1000) {
      this.startBurstSpawn();
    }
    
    // Handle active burst spawn
    if (this.burstSpawnActive) {
      this.updateBurstSpawn(deltaTime);
    }
  }

  /**
   * Starts a burst spawn sequence
   */
  startBurstSpawn() {
    this.burstSpawnActive = true;
    this.burstSpawnCount = 0;
    this.burstSpawnMax = GeometryUtils.randomInt(3, 6);
  }

  /**
   * Updates burst spawn sequence
   * @param {number} deltaTime - Time elapsed since last update
   */
  updateBurstSpawn(deltaTime) {
    // Spawn fruits rapidly during burst
    if (this.burstSpawnCount < this.burstSpawnMax) {
      if (Math.random() < 0.8 * deltaTime * 10) { // High probability per frame
        this.spawnItem();
        this.burstSpawnCount++;
      }
    } else {
      this.burstSpawnActive = false;
    }
  }

  /**
   * Spawns a specific type of fruit at a given position
   * @param {string} fruitType - Type of fruit to spawn
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} vx - X velocity
   * @param {number} vy - Y velocity
   */
  spawnSpecificFruit(fruitType, x, y, vx, vy) {
    const emoji = fruitType === "bomb" ? 
      GameConstants.BOMB_EMOJI : 
      GameConstants.FRUIT_EMOJIS[Math.floor(Math.random() * GameConstants.FRUIT_EMOJIS.length)];
    
    const fruit = new Fruit(x, y, vx, vy, fruitType, emoji);
    gameState.fruits.push(fruit);
  }

  /**
   * Creates a fruit rain effect (many fruits at once)
   * @param {number} count - Number of fruits to spawn
   */
  createFruitRain(count = 10) {
    const canvas = document.getElementById("gameCanvas");
    
    for (let i = 0; i < count; i++) {
      // Stagger spawn times slightly
      setTimeout(() => {
        const fruit = Fruit.createRandom(canvas.width, canvas.height);
        gameState.fruits.push(fruit);
      }, i * 100);
    }
  }

  /**
   * Creates a bomb wave (multiple bombs for challenge)
   * @param {number} count - Number of bombs to spawn
   */
  createBombWave(count = 3) {
    const canvas = document.getElementById("gameCanvas");
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        this.spawnSpecificFruit(
          "bomb",
          canvas.width / 2 + (Math.random() - 0.5) * 400,
          canvas.height + 50,
          (Math.random() - 0.5) * 200,
          -(800 + Math.random() * 200)
        );
      }, i * 200);
    }
  }

  /**
   * Spawns fruits in a specific pattern
   * @param {string} pattern - Pattern type ("line", "circle", "wave")
   * @param {number} count - Number of fruits in pattern
   */
  spawnPattern(pattern, count = 5) {
    const canvas = document.getElementById("gameCanvas");
    const centerX = canvas.width / 2;
    const baseY = canvas.height + 50;
    
    switch (pattern) {
      case "line":
        this.spawnLinePattern(centerX, baseY, count);
        break;
      case "circle":
        this.spawnCirclePattern(centerX, baseY, count);
        break;
      case "wave":
        this.spawnWavePattern(centerX, baseY, count);
        break;
    }
  }

  /**
   * Spawns fruits in a horizontal line
   * @param {number} centerX - Center X position
   * @param {number} y - Y position
   * @param {number} count - Number of fruits
   */
  spawnLinePattern(centerX, y, count) {
    const step = count <= 1 ? 0 : 1 / (count - 1);
    this._spawnAccumulator = 0;
    for (let i = 0; i < count; i++) {
      // stagger over frames using accumulator rather than setTimeout
      this._spawnAccumulator += 60; // ms between fruits
      const x = centerX + (i - (count - 1) / 2) * 60;
      const delay = this._spawnAccumulator;
      const spawn = () => this.spawnSpecificFruit(
        "fruit",
        x,
        y,
        GeometryUtils.randomRange(-50, 50),
        -(850 + Math.random() * 150)
      );
      // enqueue lightweight delay using a tiny timer once in a while
      setTimeout(spawn, delay);
    }
  }

  /**
   * Spawns fruits in a circular pattern
   * @param {number} centerX - Center X position
   * @param {number} centerY - Center Y position
   * @param {number} count - Number of fruits
   */
  spawnCirclePattern(centerX, centerY, count) {
    this._spawnAccumulator = 0;
    for (let i = 0; i < count; i++) {
      this._spawnAccumulator += 60;
      const angle = (i / count) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * 120;
      const y = centerY + Math.sin(angle) * 40;
      setTimeout(() => {
        this.spawnSpecificFruit(
          "fruit",
          x,
          y,
          Math.cos(angle) * 30,
          -(800 + Math.random() * 120)
        );
      }, this._spawnAccumulator);
    }
  }

  /**
   * Spawns fruits in a wave pattern
   * @param {number} centerX - Center X position
   * @param {number} y - Y position
   * @param {number} count - Number of fruits
   */
  spawnWavePattern(centerX, y, count) {
    const waveWidth = 300;
    this._spawnAccumulator = 0;
    for (let i = 0; i < count; i++) {
      this._spawnAccumulator += 60;
      const progress = i / Math.max(1, (count - 1));
      const x = centerX + (progress - 0.5) * waveWidth;
      const waveY = y + Math.sin(progress * Math.PI * 2) * 50;

      setTimeout(() => {
        this.spawnSpecificFruit(
          "fruit",
          x,
          waveY,
          0,
          -(850 + Math.random() * 150)
        );
      }, this._spawnAccumulator);
    }
  }

  /**
   * Gets the current spawn rate for display/debugging
   * @returns {number} Current spawn rate in milliseconds
   */
  getCurrentSpawnRate() {
    return this.currentSpawnRate;
  }

  /**
   * Gets the current difficulty multiplier
   * @returns {number} Difficulty multiplier (1.0 = normal, higher = harder)
   */
  getDifficultyMultiplier() {
    return 1 + (gameState.elapsedTime * 0.02);
  }

  /**
   * Resets spawn manager state for new game
   */
  reset() {
    this.lastSpawnTime = performance.now();
    this.spawnTimer = 0; // Reset timer to 0 so we wait the full interval before first spawn
    this.currentSpawnRate = this.baseSpawnRate;
    this.spawnPatternIndex = 0;
    this.burstSpawnActive = false;
    this.burstSpawnCount = 0;
  }

  /**
   * Forces an immediate spawn (for testing or special events)
   */
  forceSpawn() {
    this.spawnItem();
    this.spawnTimer = 0;
  }

  /**
   * Sets a custom spawn rate temporarily
   * @param {number} rate - New spawn rate in milliseconds
   * @param {number} duration - Duration to maintain this rate (seconds)
   */
  setTemporarySpawnRate(rate, duration) {
    this.currentSpawnRate = rate;
    setTimeout(() => {
      this.updateDifficulty(); // Reset to normal difficulty-based rate
    }, duration * 1000);
  }
}

// Create global spawn manager instance
const spawnManager = new SpawnManager();
