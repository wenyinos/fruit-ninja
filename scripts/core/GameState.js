/**
 * Global Game State Manager
 * Maintains all game state variables and provides centralized access
 * Handles state transitions and game data persistence during gameplay
 */

class GameState {
  constructor() {
    // Core Game State
    this.score = 0;
    this.gameOver = false;
    this.elapsedTime = 0;
    
    // Entity Collections - Arrays that hold all active game objects
    this.fruits = [];           // Active fruits and bombs
    this.slices = [];           // Sliced fruit halves
    this.bombExplosions = [];   // Bomb explosion particles
    this.juiceParticles = [];   // Juice splatter particles
    this.wallSplashes = [];     // Wall splash decals
    this.comboSplashes = [];    // Combo text displays
    
    // Timing State
    this.lastTime = null;
    this.lastSpawnTime = performance.now();
    this.lastSliceTime = 0;

    // Gameplay State
    this.comboCount = 0;
    this.spawnInterval = GameConstants.INITIAL_SPAWN_INTERVAL;
    
    // Input State
    this.swipePoints = [];      // Array of recent swipe trail points
    this.isSwiping = false;

    // High score
    this.bestScore = Number(localStorage.getItem('bestScore') || 0);
    this.highScores = [];
    try {
      this.highScores = JSON.parse(localStorage.getItem('highScores') || '[]');
      if (!Array.isArray(this.highScores)) this.highScores = [];
    } catch(_) { this.highScores = []; }
  }

  /**
   * Resets all game state to initial values for a new game
   * Called when starting a new game or restarting after game over
   */
  reset() {
    this.score = 0;
    this.gameOver = false;
    this.elapsedTime = 0;

    // Clear all entity arrays
    this.fruits.length = 0;
    this.slices.length = 0;
    this.bombExplosions.length = 0;
    this.juiceParticles.length = 0;
    this.wallSplashes.length = 0;
    this.comboSplashes.length = 0;
    
    // Reset timing
    this.lastTime = null;
    this.lastSpawnTime = performance.now();
    this.lastSliceTime = 0;

    // Reset gameplay state
    this.comboCount = 0;
    this.spawnInterval = GameConstants.INITIAL_SPAWN_INTERVAL;
    
    // Reset input state
    this.swipePoints.length = 0;
    this.isSwiping = false;
  }

  /**
   * Updates the spawn interval based on elapsed time for progressive difficulty
   * Makes the game progressively more challenging as time passes
   */
  updateDifficulty() {
    this.spawnInterval = Math.max(
      GameConstants.MIN_SPAWN_INTERVAL,
      GameConstants.INITIAL_SPAWN_INTERVAL - this.elapsedTime * GameConstants.DIFFICULTY_INCREASE_RATE
    );
  }

  /**
   * Calculates additional speed to add to spawned items based on difficulty
   * @returns {number} Extra speed to add to item velocities
   */
  getDifficultySpeedBonus() {
    return this.elapsedTime * GameConstants.SPEED_INCREASE_RATE;
  }

  /**
   * Checks if enough time has passed since last slice to break combo
   * Resets combo count if the combo threshold has been exceeded
   */
  updateComboStatus() {
    if (performance.now() - this.lastSliceTime > GameConstants.COMBO_THRESHOLD) {
      this.comboCount = 0;
    }
  }

  /**
   * Registers a new fruit slice and updates combo status
   * Handles combo counting logic and timing
   */
  registerSlice() {
    const now = performance.now();
    
    // Check if this slice continues a combo
    if (now - this.lastSliceTime < GameConstants.COMBO_THRESHOLD) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    
    this.lastSliceTime = now;
    // Award points equal to the current combo count
    this.score += this.comboCount;
  }

  /** Save a score into the high scores table (top 10) */
  saveHighScore(score) {
    try {
      const entry = { score: Number(score)||0, date: Date.now() };
      this.highScores.push(entry);
      this.highScores.sort((a,b) => b.score - a.score);
      this.highScores = this.highScores.slice(0, 10);
      localStorage.setItem('highScores', JSON.stringify(this.highScores));
    } catch(_) {}
  }

  /**
   * Triggers game over state
   * Sets game over flag and stops gameplay
   */
  triggerGameOver() {
    this.gameOver = true;
    // Save best score
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try { localStorage.setItem('bestScore', String(this.bestScore)); } catch(_) {}
    }
    // Save high score entry
    this.saveHighScore(this.score);
  }

  /**
   * Gets the current combo count (minimum 2 for display purposes)
   * @returns {number|null} Combo count if >= 2, null otherwise
   */
  getDisplayCombo() {
    return this.comboCount >= 2 ? this.comboCount : null;
  }
}

// Create global game state instance
const gameState = new GameState();
