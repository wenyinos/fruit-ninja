/**
 * Input Manager
 * Handles all user input including mouse, touch, and keyboard interactions
 * Manages swipe detection and input state for the game
 */

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    
    // Input state tracking
    this.isInputActive = false;
    this.lastInputPosition = { x: 0, y: 0 };
    
    // Bind event handlers to maintain proper 'this' context
    this.handleStart = this.handleStart.bind(this);
    this.handleMove = this.handleMove.bind(this);
    this.handleEnd = this.handleEnd.bind(this);
    this.handleLeave = this.handleLeave.bind(this);

    // Also bind touch handlers and keep references for add/remove
    this._onTouchStart = this.handleTouchStart.bind(this);
    this._onTouchMove = this.handleTouchMove.bind(this);
    this._onTouchEnd = this.handleTouchEnd.bind(this);
    
    // Initialize input event listeners
    this.initializeEventListeners();
  }

  /**
   * Sets up all input event listeners for mouse and touch
   */
  initializeEventListeners() {
    // Mouse event listeners
    this.canvas.addEventListener("mousedown", this.handleStart);
    this.canvas.addEventListener("mousemove", this.handleMove);
    this.canvas.addEventListener("mouseup", this.handleEnd);
    this.canvas.addEventListener("mouseleave", this.handleEnd);
    
    // Touch event listeners (use stored bound refs)
    this.canvas.addEventListener("touchstart", this._onTouchStart, { passive: false });
    this.canvas.addEventListener("touchmove", this._onTouchMove, { passive: false });
    this.canvas.addEventListener("touchend", this._onTouchEnd, { passive: false });
    this.canvas.addEventListener("touchcancel", this._onTouchEnd, { passive: false });
    
    // Prevent context menu on right click
    this.canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  /**
   * 强制横屏坐标换算：竖屏旋转 90° 时，把视口坐标转为 canvas 内容坐标
   * 内容顺时针旋转 90° 后：内容 x = 内容宽 - 视口 y，内容 y = 视口 x
   * @returns {boolean} 是否处于竖屏旋转模式
   */
  isRotated() {
    return window.innerHeight > window.innerWidth;
  }

  toCanvasX(clientX, clientY) {
    return this.isRotated() ? this.canvas.width - clientY : clientX;
  }

  toCanvasY(clientX, clientY) {
    return this.isRotated() ? clientX : clientY;
  }

  /**
   * Handles the start of an input interaction (mouse down or touch start)
   * @param {MouseEvent} event - Mouse event object
   */
  handleStart(event) {
    // Clear existing swipe points and start new swipe
    gameState.swipePoints.length = 0;
    this.addSwipePoint(this.toCanvasX(event.clientX, event.clientY), this.toCanvasY(event.clientX, event.clientY));
    gameState.isSwiping = true;
    this.isInputActive = true;

    this.lastInputPosition = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handles input movement (mouse move or touch move)
   * @param {MouseEvent} event - Mouse event object
   */
  handleMove(event) {
    if (!gameState.isSwiping) return;

    this.addSwipePoint(this.toCanvasX(event.clientX, event.clientY), this.toCanvasY(event.clientX, event.clientY));

    this.lastInputPosition = { x: event.clientX, y: event.clientY };
  }

  /**
   * Handles the end of an input interaction (mouse up or touch end)
   */
  handleEnd() {
    gameState.isSwiping = false;
    this.isInputActive = false;
    gameState.swipePoints.length = 0;
  }

  /**
   * Handles mouse leaving the canvas area
   */
  handleLeave() {
    this.handleEnd();
  }

  /**
   * Handles touch start events
   * @param {TouchEvent} event - Touch event object
   */
  handleTouchStart(event) {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      this.handleStart({ 
        clientX: touch.clientX, 
        clientY: touch.clientY 
      });
    }
  }

  /**
   * Handles touch move events
   * @param {TouchEvent} event - Touch event object
   */
  handleTouchMove(event) {
    event.preventDefault();
    const touch = event.touches[0];
    if (touch) {
      this.handleMove({ 
        clientX: touch.clientX, 
        clientY: touch.clientY 
      });
    }
  }

  /**
   * Handles touch end events
   * @param {TouchEvent} event - Touch event object
   */
  handleTouchEnd(event) {
    event.preventDefault();
    this.handleEnd();
  }

  /**
   * Adds a point to the swipe trail with timestamp
   * @param {number} x - X coordinate (screen coordinates)
   * @param {number} y - Y coordinate (screen coordinates)
   */
  addSwipePoint(x, y) {
    const now = performance.now();
    gameState.swipePoints.push({ x, y, t: now });
    
    // Remove old swipe points to maintain trail length
    gameState.swipePoints = gameState.swipePoints.filter(
      point => now - point.t < GameConstants.SWIPE_TRAIL_DURATION
    );
  }

  /**
   * Gets the current swipe trail points
   * @returns {Array} Array of swipe points with {x, y, t} properties
   */
  getSwipePoints() {
    return gameState.swipePoints;
  }

  /**
   * Checks if user is currently swiping
   * @returns {boolean} True if actively swiping
   */
  isSwiping() {
    return gameState.isSwiping;
  }

  /**
   * Gets the last known input position
   * @returns {Object} Object with x and y coordinates
   */
  getLastInputPosition() {
    return { ...this.lastInputPosition };
  }

  /**
   * Converts screen coordinates to canvas coordinates
   * @param {number} screenX - Screen X coordinate
   * @param {number} screenY - Screen Y coordinate
   * @returns {Object} Canvas coordinates {x, y}
   */
  screenToCanvas(screenX, screenY) {
    const rect = this.canvas.getBoundingClientRect();
    // 横屏旋转模式下画布相对视口有 90° 旋转，用统一换算函数
    return {
      x: this.toCanvasX(screenX, screenY),
      y: this.toCanvasY(screenX, screenY)
    };
  }

  /**
   * Gets swipe velocity based on recent points
   * @returns {Object} Velocity vector {x, y} or null if insufficient data
   */
  getSwipeVelocity() {
    const points = gameState.swipePoints;
    if (points.length < 2) return null;
    
    const recent = points.slice(-2);
    const deltaTime = (recent[1].t - recent[0].t) / 1000; // Convert to seconds
    
    if (deltaTime === 0) return null;
    
    return {
      x: (recent[1].x - recent[0].x) / deltaTime,
      y: (recent[1].y - recent[0].y) / deltaTime
    };
  }

  /**
   * Gets the length of the current swipe
   * @returns {number} Total length of swipe trail in pixels
   */
  getSwipeLength() {
    const points = gameState.swipePoints;
    if (points.length < 2) return 0;
    
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += GeometryUtils.distance(
        points[i-1].x, points[i-1].y,
        points[i].x, points[i].y
      );
    }
    
    return totalLength;
  }

  /**
   * Clears all input state (useful for game restart)
   */
  reset() {
    gameState.swipePoints.length = 0;
    gameState.isSwiping = false;
    this.isInputActive = false;
    this.lastInputPosition = { x: 0, y: 0 };
  }

  /**
   * Removes all event listeners (cleanup)
   */
  destroy() {
    this.canvas.removeEventListener("mousedown", this.handleStart);
    this.canvas.removeEventListener("mousemove", this.handleMove);
    this.canvas.removeEventListener("mouseup", this.handleEnd);
    this.canvas.removeEventListener("mouseleave", this.handleEnd);
    
    // Remove touch listeners using the same bound refs
    this.canvas.removeEventListener("touchstart", this._onTouchStart);
    this.canvas.removeEventListener("touchmove", this._onTouchMove);
    this.canvas.removeEventListener("touchend", this._onTouchEnd);
    this.canvas.removeEventListener("touchcancel", this._onTouchEnd);
  }

  /**
   * Enables or disables input processing
   * @param {boolean} enabled - Whether input should be processed
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.handleEnd(); // End any current input
    }
  }

  /**
   * Checks if input is currently enabled
   * @returns {boolean} True if input is enabled
   */
  isEnabled() {
    return this.enabled !== false; // Default to enabled
  }
}
