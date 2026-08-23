/**
 * Main Entry Point for Cyberpunk Fruit Ninja Game
 * Initializes and starts the complete game system
 * Coordinates the startup sequence and handles global events
 */

(function() {
  'use strict';
  
  /**
   * Main application initialization
   * Called when all scripts have loaded and DOM is ready
   */
  function initializeGame() {
    
    try {
      // Initialize the game engine but don't start it yet
      gameEngine.initialize();
      
      // Set up UI handlers for menus
      setupMenuHandlers();

      // Set up global event handlers
      setupGlobalEventHandlers();

      // Set up development helpers
      setupDevelopmentHelpers();

      // Gate: show fullscreen overlay, hide main menu until entered
      document.getElementById('mainMenu').style.display = 'none';
      document.getElementById('fullscreenGate').style.display = 'flex';

      // Do not autoplay music here to avoid browser blocking; wait for user gesture.
      // audioManager.playMenuMusic();

      // Wire Enter Fullscreen
      const enterBtn = document.getElementById('enterFullscreenBtn');
      if (enterBtn) {
        enterBtn.addEventListener('click', () => {
          // 先切换界面，全屏请求并行进行（不阻塞 UI，避免 promise 挂起时卡在全屏门）
          audioManager.playMenuMusic();
          document.getElementById('fullscreenGate').style.display = 'none';
          document.getElementById('mainMenu').style.display = 'flex';
          requestFullscreen().catch(() => {});
        });
      }
    } catch (error) {
      console.error("游戏初始化失败：", error);
      showErrorMessage("游戏初始化失败，请刷新页面重试。");
    }
  }

  /**
   * Sets up menu and settings handlers
   */
  function setupMenuHandlers() {
    const mainMenu = document.getElementById('mainMenu');
    const settingsMenu = document.getElementById('settingsMenu');
    const newGameBtn = document.getElementById('newGameBtn');
    const settingsBtn = document.getElementById('settingsBtn');
    const highScoresBtn = document.getElementById('highScoresBtn');
    const backBtn = document.getElementById('backBtn');
    const musicVolume = document.getElementById('musicVolume');
    const sfxVolume = document.getElementById('sfxVolume');

    const attachUx = (el) => {
      if (!el) return;
      el.addEventListener('mouseenter', () => audioManager.playUiHover());
      el.addEventListener('focus', () => audioManager.playUiHover());
      el.addEventListener('click', () => audioManager.playUiClick());
    };

    [newGameBtn, settingsBtn, highScoresBtn, backBtn].forEach(attachUx);

    newGameBtn.addEventListener('click', async () => {
      // Fullscreen already entered by gate; proceed to Ready
      mainMenu.style.display = 'none';
      audioManager.stopMenuMusic(true);
      gameEngine.showReadyScreen();
    });

    settingsBtn.addEventListener('click', () => {
      mainMenu.style.display = 'none';
      settingsMenu.style.display = 'flex';
    });

    highScoresBtn.addEventListener('click', () => uiManager.showHighScores());

    backBtn.addEventListener('click', () => {
      settingsMenu.style.display = 'none';
      mainMenu.style.display = 'flex';
      audioManager.playMenuMusic();
    });

    musicVolume.addEventListener('input', (e) => { audioManager.menuMusic && (audioManager.menuMusic.volume = e.target.value); });
    sfxVolume.addEventListener('input', (e) => { audioManager.setSfxVolume(e.target.value); });
  }

  /**
   * Sets up global event handlers for the application
   */
  function setupGlobalEventHandlers() {
    // Window resize handler
    window.addEventListener('resize', () => { gameEngine.handleResize(); });
    
    // Visibility change handler (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (gameEngine.isRunning && !gameEngine.isPaused) gameEngine.pauseGame(); }
      else { if (gameEngine.isRunning && gameEngine.isPaused) gameEngine.resumeGame(); }
    });
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // 一键静音按钮
    const muteBtn = document.getElementById('muteBtn');
    if (muteBtn) muteBtn.addEventListener('click', toggleAudio);

    // 暂停按钮（游戏进行中点击打开暂停界面，内含"退出到菜单"）
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      if (gameEngine.isRunning && !gameEngine.isPaused && !gameState.gameOver) {
        gameEngine.pauseGame();
      }
    });

    document.addEventListener('keydown', (event) => { handleGlobalKeyPress(event); });

    window.addEventListener('error', (event) => { console.error('Global error:', event.error || event.message || 'Unknown error'); });

    window.addEventListener('beforeunload', () => { gameEngine.destroy(); });

    // Hold-ESC to exit fullscreen globally
    let escDownTime = 0;
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !escDownTime) escDownTime = Date.now(); });
    document.addEventListener('keyup', async (e) => {
      if (e.key === 'Escape') {
        const held = Date.now() - escDownTime; escDownTime = 0;
        if (held > 1800 && document.fullscreenElement) { // require hold
          try { await document.exitFullscreen(); } catch(_) {}
        }
      }
    });
  }

  /**
   * Handles global keyboard shortcuts
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleGlobalKeyPress(event) {
    // Debug mode toggle (Ctrl + D)
    if (event.ctrlKey && event.key === 'd') {
      event.preventDefault();
      gameEngine.toggleDebugMode();
    }
    
    // Performance stats (Ctrl + P)
    if (event.ctrlKey && event.key === 'p') {
      event.preventDefault();
      console.log('Performance Stats:', gameEngine.getPerformanceStats());
    }
    
    // Full screen toggle (F11 or F)
    if (event.key === 'F11' || event.key === 'f') {
      event.preventDefault();
      toggleFullscreen();
    }
    
    // Mute/unmute (M)
    if (event.key === 'm' || event.key === 'M') {
      toggleAudio();
    }
  }

  /**
   * Sets up development and debugging helpers
   */
  function setupDevelopmentHelpers() {
    // Make game objects available globally for debugging
    window.GameDebug = {
      gameEngine, gameState, audioManager, effectsManager, spawnManager, collisionDetector, uiManager,
      // Helper functions
      spawnFruit: () => spawnManager.forceSpawn(),
      spawnBomb: () => spawnManager.spawnSpecificFruit("bomb", canvas.width/2, canvas.height, 0, -800),
      createFruitRain: (count) => spawnManager.createFruitRain(count),
      getStats: () => gameEngine.getPerformanceStats(),
      toggleDebug: () => gameEngine.toggleDebugMode(),
      clearEffects: () => effectsManager.clearAllEffects()
    };
    
    // Log available debug commands
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.log("Debug tools available via 'GameDebug' object:");
      console.log("- GameDebug.spawnFruit() - Force spawn a fruit");
      console.log("- GameDebug.spawnBomb() - Spawn a bomb");
      console.log("- GameDebug.createFruitRain(10) - Spawn multiple fruits");
      console.log("- GameDebug.getStats() - Get performance stats");
      console.log("- GameDebug.toggleDebug() - Toggle debug display");
      console.log("- GameDebug.clearEffects() - Clear all effects");
    }
  }

  /**
   * Toggles fullscreen mode
   */
  function toggleFullscreen() {
    if (!document.fullscreenElement) { document.documentElement.requestFullscreen().catch(()=>{}); }
    else { document.exitFullscreen(); }
  }

  async function requestFullscreen() {
    if (!document.fullscreenElement) { try { await document.documentElement.requestFullscreen(); } catch(_) {} }
  }

  /**
   * Toggles audio on/off (一键静音)
   */
  function toggleAudio() {
    const muted = audioManager.toggleMute();
    updateMuteButton(muted);
    console.log(muted ? "已静音" : "已恢复声音");
  }

  /**
   * Updates the mute button icon
   * @param {boolean} muted - 是否静音
   */
  function updateMuteButton(muted) {
    const btn = document.getElementById('muteBtn');
    if (btn) btn.textContent = muted ? '🔇' : '🔊';
  }

  /**
   * Shows an error message to the user
   * @param {string} message - Error message to display
   */
  function showErrorMessage(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: 'Montserrat', sans-serif;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
    `;
    errorDiv.innerHTML = `
      <h3>错误</h3>
      <p>${message}</p>
      <button onclick="this.parentElement.remove(); location.reload();"
              style="margin-top: 10px; padding: 10px 20px; background: #fff; border: none; border-radius: 5px; cursor: pointer;">
        重新加载
      </button>
    `;
    
    document.body.appendChild(errorDiv);
  }

  /**
   * Checks if the browser supports required features
   * @returns {boolean} True if all required features are supported
   */
  function checkBrowserSupport() {
    const required = {
      canvas: !!document.createElement('canvas').getContext,
      audioContext: !!(window.AudioContext || window.webkitAudioContext),
      requestAnimationFrame: !!window.requestAnimationFrame,
      performance: !!window.performance
    };
    
    const unsupported = Object.entries(required)
      .filter(([key, supported]) => !supported)
      .map(([key]) => key);
    
    if (unsupported.length > 0) {
      console.warn('不支持的功能：', unsupported);
      showErrorMessage(`您的浏览器不支持：${unsupported.join('、')}`);
      return false;
    }
    
    return true;
  }

  /**
   * Application startup sequence
   */
  function startup() {
    console.log("正在启动水果忍者...");
    
    // Check browser support
    if (!checkBrowserSupport()) {
      return;
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initializeGame);
    } else {
      initializeGame();
    }
  }

  // Start the application
  startup();

})();
