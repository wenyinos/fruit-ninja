/**
 * UI Manager
 * Handles all user interface elements and screen overlays
 * Manages score display, game over screen, ready screen, and UI interactions
 */

class UIManager {
  constructor() {
    // Get UI element references
    this.scoreElement = document.getElementById("score");
    this.gameOverElement = document.getElementById("gameOver");
    this.readyScreenElement = document.getElementById("readyScreen");
    
    // UI state
    this.gameStarted = false;
    this.readyScreenVisible = true;
    
    // Create pause overlay lazily
    this.pauseOverlay = null;
    this.highScoresPanel = null;

    // Set up UI event listeners
    this.initializeUIEvents();
  }

  /**
   * Initializes all UI event listeners
   */
  initializeUIEvents() {
    // Game over screen click handler
    if (this.gameOverElement) {
      this.gameOverElement.addEventListener("click", () => {
        this.handleRestartGame();
      });
    }
    
    // Ready screen click handler
    if (this.readyScreenElement) {
      this.readyScreenElement.addEventListener("click", () => {
        this.handleStartGame();
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      this.handleKeyPress(e);
    });
  }

  /**
   * Updates the UI elements every frame
   */
  update() {
    this.updateScore();
    this.updateGameOverScreen();
    this.updateScreenEffects();
  }

  /**
   * Updates the score display
   */
  updateScore() {
    if (this.scoreElement) {
      this.scoreElement.textContent = `分数：${gameState.score}`;
      
      // Add pulsing effect for score increases
      if (this.lastScore !== gameState.score) {
        this.pulseScoreDisplay();
        this.lastScore = gameState.score;
      }
    }
  }

  /**
   * Updates the game over screen visibility and state
   */
  updateGameOverScreen() {
    if (this.gameOverElement) {
      // Show game over screen once when game over state is reached
      if (gameState.gameOver && this.gameOverElement.style.display !== "flex") {
        this.showGameOverScreen();
      }
    }
  }

  /**
   * Updates screen effects like shake and flash
   */
  updateScreenEffects() {
    // Update screen shake
    if (gameState.screenShake && gameState.screenShake.timeRemaining > 0) {
      gameState.screenShake.timeRemaining -= 1/60; // Assuming 60 FPS
      if (gameState.screenShake.timeRemaining <= 0) {
        gameState.screenShake = null;
      }
    }
    
    // Update screen flash
    if (gameState.screenFlash && gameState.screenFlash.timeRemaining > 0) {
      gameState.screenFlash.timeRemaining -= 1/60; // Assuming 60 FPS
      if (gameState.screenFlash.timeRemaining <= 0) {
        gameState.screenFlash = null;
      }
    }
  }

  /**
   * Handles the start game button/screen click
   */
  handleStartGame() {
    if (!this.gameStarted) {
      // Play start sound
      audioManager.playGameStartSound();
      
      // Hide ready screen with fade effect
      this.hideReadyScreen();
      
      // Mark game as started
      this.gameStarted = true;
      this.readyScreenVisible = false;
      
      // Reset spawn timer to current time to prevent immediate fruit spawning
      spawnManager.lastSpawnTime = performance.now();
      
      // Start the game
      gameEngine.startGame();
    }
  }

  /**
   * Handles the restart game functionality
   */
  handleRestartGame() {
    // Ensure pause overlay is hidden and engine unpaused
    this.hidePauseOverlay?.();
    gameEngine.isPaused = false;
    gameEngine._accumulator = 0;
    gameEngine.lastFrameTime = null;

    // Hide game over screen
    this.hideGameOverScreen();
    
    // Reset game state
    gameState.reset();
    
    // Reset managers
    spawnManager.reset();
    collisionDetector.reset();
    effectsManager.clearAllEffects();
    
    // Play start sound
    audioManager.playGameStartSound();
    
    // Restart the game
    gameEngine.startGame();
  }

  /**
   * Handles keyboard input for shortcuts and controls
   * @param {KeyboardEvent} event - Keyboard event
   */
  handleKeyPress(event) {
    switch (event.key) {
      case " ": // Spacebar
        event.preventDefault();
        if (gameState.gameOver) {
          this.handleRestartGame();
        } else if (this.readyScreenVisible) {
          this.handleStartGame();
        }
        break;
      case "Escape":
        // Toggle pause during gameplay
        if (!gameState.gameOver && this.gameStarted) {
          if (gameEngine.isPaused) gameEngine.resumeGame(); else gameEngine.pauseGame();
        }
        break;
      case "r":
      case "R":
        if (gameState.gameOver) {
          this.handleRestartGame();
        }
        break;
    }
  }

  /**
   * Shows the game over screen with effects
   */
  showGameOverScreen() {
    if (this.gameOverElement) {
      this.gameOverElement.style.display = "flex";
      this.gameOverElement.style.opacity = "0";
      
      // Fade in effect
      setTimeout(() => {
        this.gameOverElement.style.transition = "opacity 0.5s ease";
        this.gameOverElement.style.opacity = "1";
      }, 100);
      
      // Play game over sound
      audioManager.playGameOverSound();
      
      // Update final score display
      this.updateFinalScore();
    }
  }

  /**
   * Hides the game over screen
   */
  hideGameOverScreen() {
    if (this.gameOverElement) {
      this.gameOverElement.style.display = "none";
    }
  }

  /**
   * Hides the ready screen with fade effect
   */
  hideReadyScreen() {
    if (this.readyScreenElement) {
      this.readyScreenElement.style.opacity = "0";
      
      setTimeout(() => {
        this.readyScreenElement.style.display = "none";
      }, 500);
    }
  }

  /**
   * Shows the ready screen (for restarting)
   */
  showReadyScreen() {
    if (this.readyScreenElement) {
      this.readyScreenElement.style.display = "flex";
      this.readyScreenElement.style.opacity = "1";
      this.readyScreenVisible = true;
      this.gameStarted = false;

      // Also show best score subtly
      const hintId = "ready-best-score";
      let hint = document.getElementById(hintId);
      if (!hint) {
        hint = document.createElement('div');
        hint.id = hintId;
        hint.style.cssText = `margin-top: 10px; font-size: 18px; color: #0ff; text-shadow: 0 0 10px #0ff;`;
        this.readyScreenElement.appendChild(hint);
      }
      hint.textContent = `最佳：${gameState.bestScore || 0}`;
    }
  }

  /**
   * Creates a pulsing effect on the score display
   */
  pulseScoreDisplay() {
    if (this.scoreElement) {
      this.scoreElement.style.transform = "scale(1.2)";
      this.scoreElement.style.transition = "transform 0.2s ease";
      
      setTimeout(() => {
        this.scoreElement.style.transform = "scale(1)";
      }, 200);
    }
  }

  /** Build (or update) a simple High Scores panel */
  showHighScores() {
    if (!this.highScoresPanel) {
      const panel = document.createElement('div');
      panel.style.cssText = `position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 2100; background: rgba(0,0,0,0.8);`;
      const inner = document.createElement('div');
      inner.style.cssText = `background: rgba(20,20,25,0.9); color: #e6edf3; padding: 24px 28px; width: 420px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.12);`;
      inner.innerHTML = `<div style="font-size:24px;font-weight:900;margin-bottom:12px;">最高分</div><div id="hsList"></div><div style="display:flex;gap:10px;margin-top:16px;"><button id="hsClose" class="menuButton">关闭</button></div>`;
      panel.appendChild(inner);
      document.body.appendChild(panel);
      this.highScoresPanel = panel;
      inner.querySelector('#hsClose').onclick = () => { this.highScoresPanel.style.display = 'none'; };
    }

    const list = this.highScoresPanel.querySelector('#hsList');
    const entries = gameState.highScores || [];
    const best = gameState.bestScore || 0;
    if (list) {
      list.innerHTML = `<div style="margin-bottom:10px;">最佳：<b>${best}</b></div>` +
        entries.map((e, i) => `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span>${i+1}.</span><span>${e.score}</span><span style="opacity:.7">${new Date(e.date).toLocaleDateString('zh-CN')}</span></div>`).join('') || '<div>暂无记录</div>';
    }

    this.highScoresPanel.style.display = 'flex';
  }

  /**
   * Updates the final score display on game over
   */
  updateFinalScore() {
    // Update the game over panel content with final score
    if (this.gameOverElement) {
      const panel = this.gameOverElement.querySelector('.gameOverPanel');
      if (panel) {
        const best = gameState.bestScore || 0;
        panel.innerHTML = `
          <div class="gameOverTitle">游戏结束</div>
          <div class="gameOverScore">最终分数：${gameState.score}</div>
          <div class="gameOverSubtext">最佳：${best}</div>
          <div class="gameOverSubtext">点击重新开始</div>
        `;
      }
    }
  }

  /**
   * Creates a temporary UI notification
   * @param {string} message - Message to display
   * @param {number} duration - Duration in seconds
   * @param {string} color - Text color
   */
  showNotification(message, duration = 2, color = "#0ff") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 100px;
      left: 50%;
      transform: translateX(-50%);
      color: ${color};
      font-size: 24px;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 10px ${color};
      z-index: 20;
      pointer-events: none;
      transition: opacity 0.5s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Fade out and remove
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 500);
    }, duration * 1000);
  }

  /**
   * Creates a score popup effect
   * @param {number} points - Points gained
   * @param {number} x - X position for popup
   * @param {number} y - Y position for popup
   */
  createScorePopup(points, x, y) {
    const popup = document.createElement("div");
    popup.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      color: #ff0;
      font-size: 20px;
      font-family: 'Orbitron', sans-serif;
      text-shadow: 0 0 10px #ff0;
      z-index: 15;
      pointer-events: none;
      transition: all 1s ease-out;
    `;
    popup.textContent = `+${points}`;
    
    document.body.appendChild(popup);
    
    // Animate upward and fade
    setTimeout(() => {
      popup.style.transform = "translateY(-50px)";
      popup.style.opacity = "0";
    }, 50);
    
    // Remove after animation
    setTimeout(() => {
      document.body.removeChild(popup);
    }, 1050);
  }

  /**
   * Updates combo display in UI
   * @param {number} comboCount - Current combo count
   */
  updateComboDisplay(comboCount) {
    if (comboCount >= 2) {
      this.showNotification(`Combo ${comboCount}!`, 1, "#ff0");
      audioManager.playComboSound?.();
      // Optional: popup for points gain equal to combo count near top-center
      try {
        const canvas = document.getElementById('gameCanvas');
        if (canvas && typeof this.createScorePopup === 'function') {
          this.createScorePopup(comboCount, canvas.width / 2, 90);
        }
      } catch(_) {}
    }
  }

  /**
   * Gets the current UI state
   * @returns {Object} UI state information
   */
  getUIState() {
    return {
      gameStarted: this.gameStarted,
      readyScreenVisible: this.readyScreenVisible,
      gameOverVisible: this.gameOverElement ? 
        this.gameOverElement.style.display === "block" : false
    };
  }

  /**
   * Resets UI to initial state
   */
  reset() {
    this.gameStarted = false;
    this.readyScreenVisible = true;
    this.lastScore = 0;
    
    // Reset displays
    if (this.scoreElement) {
      this.scoreElement.textContent = "分数：0";
    }
    
    this.hideGameOverScreen();
    this.showReadyScreen();
  }

  /**
   * Sets UI theme colors (for customization)
   * @param {Object} colors - Color scheme object
   */
  setTheme(colors) {
    // Could implement theme switching here
    document.documentElement.style.setProperty("--primary-color", colors.primary || "#0ff");
    document.documentElement.style.setProperty("--secondary-color", colors.secondary || "#ff0055");
    document.documentElement.style.setProperty("--accent-color", colors.accent || "#ff0");
  }

  // Pause overlay creation/show/hide
  _ensurePauseOverlay() {
    if (this.pauseOverlay) return;
    const overlay = document.createElement('div');
    overlay.id = 'pauseOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; display: none; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.7); z-index: 1800; font-family: 'Orbitron', sans-serif; color: #0ff;`;

    const panel = document.createElement('div');
    panel.style.cssText = `
      background: rgba(10,0,30,0.9); padding: 30px 40px; border-radius: 12px; border: 3px solid #ff0055;
      text-align: center; width: 90%; max-width: 420px; box-shadow: 0 0 25px #ff0055;`;

    const title = document.createElement('div');
    title.textContent = '已暂停';
    title.style.cssText = `font-size: 36px; color: #ff0055; text-shadow: 0 0 20px #ff0055; margin-bottom: 20px;`;

    const btn = (label, onClick) => {
      const b = document.createElement('button');
      b.textContent = label;
      b.className = 'menuButton';
      b.style.margin = '10px 0';
      b.onclick = onClick;
      return b;
    };

    const resumeBtn = btn('继续游戏', () => gameEngine.resumeGame());
    const restartBtn = btn('重新开始', () => { this.hidePauseOverlay(); this.handleRestartGame(); });
    const exitBtn = btn('退出到菜单', () => { this.hidePauseOverlay(); gameEngine.returnToMenu(); });

    panel.appendChild(title);
    panel.appendChild(resumeBtn);
    panel.appendChild(restartBtn);
    panel.appendChild(exitBtn);

    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    this.pauseOverlay = overlay;
  }

  showPauseOverlay() {
    this._ensurePauseOverlay();
    this.pauseOverlay.style.display = 'flex';
  }

  hidePauseOverlay() {
    if (this.pauseOverlay) this.pauseOverlay.style.display = 'none';
  }

  // Helper for menu navigation if main menu is present
  showMainMenu() {
    const mainMenu = document.getElementById('mainMenu');
    const settingsMenu = document.getElementById('settingsMenu');
    if (settingsMenu) settingsMenu.style.display = 'none';
    if (mainMenu) mainMenu.style.display = 'flex';
    // Reset ready screen too
    this.showReadyScreen();
    // Ensure menu music is playing when returning to the menu
    audioManager.playMenuMusic?.();
  }
}

// Create global UI manager instance
const uiManager = new UIManager();
