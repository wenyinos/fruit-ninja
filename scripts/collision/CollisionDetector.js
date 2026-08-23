/**
 * Collision Detection System
 * Handles all collision detection between swipes and game objects
 * Manages fruit slicing, bomb detection, and interactive feedback
 */

class CollisionDetector {
  constructor() {
    // Collision detection state
    this.processedCollisions = new Set();
    this.lastCollisionTime = 0;
  }

  /**
   * Main collision detection update - checks swipe against all fruits
   */
  update() {
    // Clear processed collisions for this frame
    this.processedCollisions.clear();
    
    // Only check collisions if user is actively swiping
    if (!gameState.isSwiping || gameState.swipePoints.length < 2) {
      return;
    }
    
    // Check collisions for each swipe segment
    this.checkSwipeCollisions();
  }

  /**
   * Checks swipe trail against all fruits for collisions
   */
  checkSwipeCollisions() {
    const swipePoints = gameState.swipePoints;
    if (swipePoints.length < 2) return;

    // Only check last K segments to avoid quadratic cost on long trails
    const K = 6;
    const start = Math.max(0, swipePoints.length - (K + 1));

    // Build a quick bounding box of the tested segments for early rejection
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = start; i < swipePoints.length; i++) {
      const p = swipePoints[i];
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    const inflate = 80; // expand bbox
    minX -= inflate; minY -= inflate; maxX += inflate; maxY += inflate;

    // Pre-filter fruits by bbox overlap
    const candidates = [];
    for (let i = 0; i < gameState.fruits.length; i++) {
      const f = gameState.fruits[i];
      if (f.sliced) continue;
      const b = f.getBounds();
      if (b.right < minX || b.left > maxX || b.bottom < minY || b.top > maxY) continue;
      candidates.push({ f, i });
    }

    // Now test the last K segments against candidates only
    for (let s = start; s < swipePoints.length - 1; s++) {
      const p1 = swipePoints[s];
      const p2 = swipePoints[s + 1];
      this.checkLineSegmentCollisionsForCandidates(p1.x, p1.y, p2.x, p2.y, candidates);
    }
  }

  checkLineSegmentCollisionsForCandidates(x1, y1, x2, y2, candidates) {
    for (let c = 0; c < candidates.length; c++) {
      const fruit = candidates[c].f;
      if (fruit.sliced || this.processedCollisions.has(fruit)) continue;
      if (fruit.intersectsLine(x1, y1, x2, y2)) {
        this.handleFruitCollision(fruit, c);
      }
    }
  }

  /**
   * Handles collision with a fruit or bomb
   * @param {Fruit} fruit - The fruit that was hit
   * @param {number} fruitIndex - Index of the fruit in the array
   */
  handleFruitCollision(fruit, fruitIndex) {
    // Mark as processed to avoid duplicate hits
    this.processedCollisions.add(fruit);
    
    // Process the slice
    const sliceResult = fruit.slice();
    
    if (sliceResult) {
      if (sliceResult.type === "bomb") {
        // Handle bomb explosion
        this.handleBombExplosion(fruit);
      } else {
        // Handle fruit slice
        this.handleFruitSlice(fruit);
      }
    }
    
    this.lastCollisionTime = performance.now();
  }

  /**
   * Handles bomb explosion effects and game over
   * @param {Fruit} bomb - The bomb that was hit
   */
  handleBombExplosion(bomb) {
    // Create explosion effects
    effectsManager.createBombExplosion(bomb.x, bomb.y);
    
    // Create screen shake effect
    effectsManager.createScreenShake(15, 0.8);
    
    // Create red screen flash
    effectsManager.createScreenFlash("rgba(255,0,0,0.6)", 0.8, 0.5);
    
    // Note: triggerGameOver() is called in Fruit.slice() method, not here
  }

  /**
   * Handles fruit slicing effects
   * @param {Fruit} fruit - The fruit that was sliced
   */
  handleFruitSlice(fruit) {
    const canvas = document.getElementById("gameCanvas");

    // Create all slice effects
    effectsManager.createFruitSliceEffect(fruit, canvas.width);

    // Create subtle screen flash for juice effect
    effectsManager.createScreenFlash("rgba(255,50,50,0.2)", 0.3, 0.2);
  }

  /**
   * Checks collision between a point and a fruit (for touch/click detection)
   * @param {number} x - Point X coordinate
   * @param {number} y - Point Y coordinate
   * @returns {Fruit|null} The fruit at the point, or null if none
   */
  getFruitAtPoint(x, y) {
    for (const fruit of gameState.fruits) {
      if (!fruit.sliced && fruit.containsPoint(x, y)) {
        return fruit;
      }
    }
    return null;
  }

  /**
   * Checks collision between a circle and fruits (for area effects)
   * @param {number} x - Circle center X
   * @param {number} y - Circle center Y
   * @param {number} radius - Circle radius
   * @returns {Array<Fruit>} Array of fruits within the circle
   */
  getFruitsInCircle(x, y, radius) {
    const fruitsInRange = [];
    
    for (const fruit of gameState.fruits) {
      if (fruit.sliced) continue;
      
      const distance = GeometryUtils.distance(x, y, fruit.x, fruit.y);
      if (distance <= radius + fruit.radius) {
        fruitsInRange.push(fruit);
      }
    }
    
    return fruitsInRange;
  }

  /**
   * Performs a raycast to find the first fruit hit by a line
   * @param {number} startX - Ray start X
   * @param {number} startY - Ray start Y
   * @param {number} endX - Ray end X
   * @param {number} endY - Ray end Y
   * @returns {Object|null} Hit information or null if no hit
   */
  raycastFruits(startX, startY, endX, endY) {
    let closestHit = null;
    let closestDistance = Infinity;
    
    for (const fruit of gameState.fruits) {
      if (fruit.sliced) continue;
      
      if (fruit.intersectsLine(startX, startY, endX, endY)) {
        const distance = GeometryUtils.distance(startX, startY, fruit.x, fruit.y);
        if (distance < closestDistance) {
          closestDistance = distance;
          closestHit = {
            fruit: fruit,
            distance: distance,
            point: { x: fruit.x, y: fruit.y }
          };
        }
      }
    }
    
    return closestHit;
  }

  /**
   * Checks if two fruits are overlapping (for collision between fruits)
   * @param {Fruit} fruit1 - First fruit
   * @param {Fruit} fruit2 - Second fruit
   * @returns {boolean} True if fruits are overlapping
   */
  checkFruitOverlap(fruit1, fruit2) {
    const distance = fruit1.distanceTo(fruit2);
    return distance < (fruit1.radius + fruit2.radius);
  }

  /**
   * Gets all fruits within a rectangular area
   * @param {number} left - Left boundary
   * @param {number} top - Top boundary
   * @param {number} right - Right boundary
   * @param {number} bottom - Bottom boundary
   * @returns {Array<Fruit>} Fruits within the rectangle
   */
  getFruitsInRectangle(left, top, right, bottom) {
    const fruitsInRect = [];
    
    for (const fruit of gameState.fruits) {
      if (fruit.sliced) continue;
      
      if (fruit.x >= left && fruit.x <= right && 
          fruit.y >= top && fruit.y <= bottom) {
        fruitsInRect.push(fruit);
      }
    }
    
    return fruitsInRect;
  }

  /**
   * Gets the velocity of the swipe at the point of collision
   * @param {Fruit} fruit - The fruit that was hit
   * @returns {Object|null} Velocity vector {x, y} or null
   */
  getSwipeVelocityAtCollision(fruit) {
    const swipePoints = gameState.swipePoints;
    if (swipePoints.length < 2) return null;
    
    // Find the closest swipe point to the fruit
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    for (let i = 0; i < swipePoints.length; i++) {
      const point = swipePoints[i];
      const distance = GeometryUtils.distance(point.x, point.y, fruit.x, fruit.y);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = i;
      }
    }
    
    // Calculate velocity from nearby points
    if (closestIndex > 0) {
      const p1 = swipePoints[closestIndex - 1];
      const p2 = swipePoints[closestIndex];
      const deltaTime = (p2.t - p1.t) / 1000; // Convert to seconds
      
      if (deltaTime > 0) {
        return {
          x: (p2.x - p1.x) / deltaTime,
          y: (p2.y - p1.y) / deltaTime
        };
      }
    }
    
    return null;
  }

  /**
   * Resets collision detection state
   */
  reset() {
    this.processedCollisions.clear();
    this.lastCollisionTime = 0;
  }

  /**
   * Gets debug information about current collision state
   * @returns {Object} Debug information
   */
  getDebugInfo() {
    return {
      processedCollisionsCount: this.processedCollisions.size,
      lastCollisionTime: this.lastCollisionTime,
      swipePointCount: gameState.swipePoints.length,
      activeFruitCount: gameState.fruits.filter(f => !f.sliced).length
    };
  }

  /**
   * Enables or disables collision detection
   * @param {boolean} enabled - Whether collision detection should be active
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.processedCollisions.clear();
    }
  }

  /**
   * Checks if collision detection is currently enabled
   * @returns {boolean} True if collision detection is enabled
   */
  isEnabled() {
    return this.enabled !== false; // Default to enabled
  }
}

// Create global collision detector instance
const collisionDetector = new CollisionDetector();
