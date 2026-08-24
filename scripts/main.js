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

      // Wire Enter Fullscreen
      // 容器内全屏由容器统一管理，此处仅切换界面
      const enterBtn = document.getElementById('enterFullscreenBtn');
      if (enterBtn) {
        enterBtn.addEventListener('click', () => {
          // 尝试锁定横屏（用户手势内调用，WebView 支持则生效；失败回退 CSS 旋转）
          try { screen.orientation?.lock?.('landscape'); } catch(_) {}
          document.getElementById('fullscreenGate').style.display = 'none';
          document.getElementById('mainMenu').style.display = 'flex';
          applyLandscape();
        });
      }
    } catch (error) {
      console.error("游戏初始化失败：", error);
      showErrorMessage("游戏初始化失败，请刷新页面重试。");
    }
  }

  /**
   * Sets up menu handlers
   */
  function setupMenuHandlers() {
    const mainMenu = document.getElementById('mainMenu');
    const newGameBtn = document.getElementById('newGameBtn');
    const highScoresBtn = document.getElementById('highScoresBtn');

    newGameBtn.addEventListener('click', () => {
      mainMenu.style.display = 'none';
      gameEngine.showReadyScreen();
    });

    highScoresBtn.addEventListener('click', () => uiManager.showHighScores());
  }

  /**
   * 发布到笔记：截图当前画面（空画布时合成展示图）→ postNote
   */
  async function handlePublishNote() {
    if (!window.xhs || !window.xhs.miniTool || !window.xhs.miniTool.postNote) {
      showToast("当前环境不支持发布笔记", "#ff6b6b");
      return;
    }
    try {
      showToast("正在生成图片…", "#ffd166");
      const dataUrl = await captureGameImage();
      const best = gameState.bestScore || 0;
      await window.xhs.miniTool.postNote({
        title: "切水果上瘾小工具，来挑战最高分🍎",
        content: `刚用小工具玩了几把水果忍者，根本停不下来 🍎\n\n✨ 玩法：\n- 手指一划就能切开飞起来的水果，超解压\n- 连续切开有连击加成，「疯狂连击」出现的时候特别爽\n- 红色炸弹千万别碰，一刀就游戏结束 💣\n\n📱 小亮点：\n- 手机上打开就是街机手感，竖屏自动转横屏\n- 最高分存在本地，随时回来挑战自己\n\n🎯 我现在的最高分是 ${best} 分，评论区交出你们的成绩！`,
        pageType: "photo_publish",
        tags: "#水果忍者 #解压小游戏 #摸鱼神器",
        mediaInfo: {
          image_resources: [{ url: dataUrl }]
        }
      });
      showToast("已发起发布笔记", "#4cd964");
    } catch (error) {
      console.error("发布笔记失败:", error);
      showToast("发布失败：" + (error && error.errMsg ? error.errMsg : "请重试"), "#ff6b6b");
    }
  }

  /**
   * 截取发布用图片：canvas 有画面时直接截屏，否则合成深色背景+标题展示图
   * @returns {Promise<string>} data:image/png 的 data:uri
   */
  function captureGameImage() {
    return new Promise((resolve) => {
      const canvas = document.getElementById('gameCanvas');
      // 画布已有内容（游戏画面）时直接截屏
      if (!canvasIsEmpty(canvas)) {
        resolve(canvas.toDataURL('image/png'));
        return;
      }
      // 空画布：合成展示图（背景 + 遮罩 + 标题 + 最佳分）
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(canvas.width / 6)}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText('🍎 水果忍者', canvas.width / 2, canvas.height / 2 - canvas.height / 8);
        ctx.fillStyle = '#ffd166';
        ctx.font = `${Math.round(canvas.width / 14)}px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
        ctx.fillText(`最佳成绩：${gameState.bestScore || 0}`, canvas.width / 2, canvas.height / 2 + canvas.height / 8);
        resolve(canvas.toDataURL('image/png'));
      };
      // 背景加载失败时退回原画布截图
      img.onerror = () => resolve(canvas.toDataURL('image/png'));
      img.src = 'gamebg.webp';
    });
  }

  /** 判断画布是否全透明（无任何内容） */
  function canvasIsEmpty(canvas) {
    try {
      const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < data.length; i += 4000) {
        if (data[i] !== 0) return false;
      }
    } catch (_) {}
    return true;
  }

  /** 轻量提示 toast */
  function showToast(msg, color) {
    const el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = `position: fixed; top: 20%; left: 50%; transform: translateX(-50%); z-index: 6000; background: rgba(0,0,0,0.8); color: ${color || '#fff'}; padding: 12px 20px; border-radius: 10px; font-size: 16px; pointer-events: none; transition: opacity .4s;`;
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; }, 2000);
    setTimeout(() => el.remove(), 2500);
  }

  /**
   * 强制横屏：竖屏时给 body 加旋转类并交换 canvas 尺寸
   */
  function applyLandscape() {
    document.body.classList.toggle('force-landscape', window.innerHeight > window.innerWidth);
    gameEngine.handleResize();
  }

  /**
   * Sets up global event handlers for the application
   */
  function setupGlobalEventHandlers() {
    // Window resize handler (resize 也会在模拟器/视口变化时触发，统一走强制横屏逻辑)
    window.addEventListener('resize', applyLandscape);

    // Orientation change handler (强制横屏)
    window.addEventListener('orientationchange', applyLandscape);
    applyLandscape();

    // Visibility change handler (pause when tab is hidden)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (gameEngine.isRunning && !gameEngine.isPaused) gameEngine.pauseGame(); }
      else { if (gameEngine.isRunning && gameEngine.isPaused) gameEngine.resumeGame(); }
    });
    
    const canvas = document.getElementById('gameCanvas');
    if (canvas) canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // 暂停按钮（游戏进行中点击打开暂停界面，内含"退出到菜单"）
    const pauseBtn = document.getElementById('pauseBtn');
    if (pauseBtn) pauseBtn.addEventListener('click', () => {
      if (gameEngine.isRunning && !gameEngine.isPaused && !gameState.gameOver) {
        gameEngine.pauseGame();
      }
    });

    // 发布到笔记按钮（JSBridge: postNote）
    const publishBtn = document.getElementById('publishBtn');
    if (publishBtn) publishBtn.addEventListener('click', handlePublishNote);

    document.addEventListener('keydown', (event) => { handleGlobalKeyPress(event); });

    window.addEventListener('error', (event) => { console.error('Global error:', event.error || event.message || 'Unknown error'); });

    window.addEventListener('beforeunload', () => { gameEngine.destroy(); });
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
    
    // Full screen is managed by the container, no toggle here
    // (removed: F11/F fullscreen toggle - 容器内全屏由容器统一管理)
  }

  /**
   * Sets up development and debugging helpers
   */
  function setupDevelopmentHelpers() {
    // Make game objects available globally for debugging
    window.GameDebug = {
      gameEngine, gameState, effectsManager, spawnManager, collisionDetector, uiManager,
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
      font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
      text-align: center;
      z-index: 1000;
      max-width: 400px;
    `;
    errorDiv.innerHTML = `
      <h3>错误</h3>
      <p>${message}</p>
      <button id="reloadBtn"
              style="margin-top: 10px; padding: 10px 20px; background: #fff; border: none; border-radius: 5px; cursor: pointer;">
        关闭
      </button>
    `;

    const reloadBtn = errorDiv.querySelector('#reloadBtn');
    reloadBtn.addEventListener('click', () => { errorDiv.remove(); });

    document.body.appendChild(errorDiv);
  }

  /**
   * Checks if the browser supports required features
   * @returns {boolean} True if all required features are supported
   */
  function checkBrowserSupport() {
    const required = {
      canvas: !!document.createElement('canvas').getContext,
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
