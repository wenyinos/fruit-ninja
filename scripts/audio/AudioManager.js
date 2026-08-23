/**
 * Audio Management System
 * Handles all game audio including sound effects and background music
 * Provides organized sound groups and playback functionality
 */

class AudioManager {
  constructor() {
    // Sound file collections organized by type
    this.soundGroups = {
      fruitSpawn: [
        "Sound/Throw-fruit.mp3",
        "Sound/Impact-Apple.mp3",
        "Sound/Impact-Banana.mp3",
        "Sound/Impact-Orange.mp3",
        "Sound/Impact-Pineapple.mp3",
        "Sound/Impact-Strawberry.mp3",
        "Sound/Impact-Watermelon.mp3",
        "Sound/dragonfruit.mp3"
      ],
      
      bombSpawn: [
        "Sound/player-bomb-launch.mp3",
        "Sound/menu-bomb.mp3"
      ],
      
      fruitCut: [
        "Sound/Clean-Slice-1.mp3",
        "Sound/Clean-Slice-2.mp3",
        "Sound/Clean-Slice-3.mp3",
        "Sound/blade-cherry-blossom-1-1.mp3",
        "Sound/blade-cherry-blossom-1-2.mp3",
        "Sound/pome-slice-1.mp3",
        "Sound/pome-slice-2.mp3",
        "Sound/pome-slice-3.mp3"
      ],
      
      bombCut: [
        "Sound/Bomb-explode.mp3",
        "Sound/Throw-bomb.mp3",
        "Sound/Bomb-Fuse.mp3"
      ],
      
      swipe: [
        "Sound/bamboo-swipe-1.mp3",
        "Sound/bamboo-swipe-2.mp3",
        "Sound/bamboo-swipe-3.mp3",
        "Sound/bamboo-swipe-4.mp3",
        "Sound/Sword-swipe-1.mp3",
        "Sound/Sword-swipe-2.mp3",
        "Sound/Sword-swipe-3.mp3",
        "Sound/Sword-swipe-4.mp3",
        "Sound/Sword-swipe-5.mp3",
        "Sound/Sword-swipe-6.mp3",
        "Sound/Sword-swipe-7.mp3"
      ],
      
      combo: [
        "Sound/combo-1.mp3",
        "Sound/combo-2.mp3",
        "Sound/combo-3.mp3",
        "Sound/combo-4.mp3",
        "Sound/combo-5.mp3",
        "Sound/Combo-6.mp3",
        "Sound/Combo-7.mp3",
        "Sound/Combo-8.mp3",
        "Sound/combo-blitz-1.mp3",
        "Sound/combo-blitz-2.mp3",
        "Sound/combo-blitz-3.mp3",
        "Sound/combo-blitz-4.mp3",
        "Sound/combo-blitz-5.mp3",
        "Sound/combo-blitz-6.mp3",
        "Sound/Combo.mp3",
        "Sound/angel-combo-1.mp3",
        "Sound/angel-combo-2.mp3",
        "Sound/angel-combo-3.mp3",
        "Sound/angel-combo-4.mp3",
        "Sound/angel-combo-5.mp3",
        "Sound/Combo-Blitz-Backing.mp3",
        "Sound/Combo-Blitz-Backing-Light.mp3",
        "Sound/Combo-Blitz-Backing-End.mp3"
      ]
    };

    // Special audio files
    this.specialSounds = {
      gameStart: "Sound/Game-start.mp3",
      gameOver: "Sound/Game-over.mp3",
      uiHover: "Sound/bamboo-swipe-2.mp3",
      uiClick: "Sound/Clean-Slice-1.mp3"
    };

    // Menu music 
    this.menuMusicFile = "Sound/menu-music.mp3";
    this.menuMusic = null;
    this._menuReady = false;
    try {
      this.menuMusic = this.createAudioElement(this.menuMusicFile);
      this.menuMusic.loop = true;
      this.menuMusic.volume = 0.35;
      this.menuMusic.addEventListener('canplaythrough', () => { this._menuReady = true; });
      this.menuMusic.addEventListener('error', () => { this._menuReady = false; });
    } catch(_) {}

    // Remove in-game looping music 
    this.bgMusic = null;

    // Initialize SFX volume
    this.sfxVolume = 1.0;

    // Mute state
    this.isMuted = false;
    this._musicVolume = 0.35; // 正常音量，静音时归零、恢复时还原

    // Simple audio pool per filename to prevent creating many Audio objects
    this._audioPools = new Map(); // filename -> { list: Audio[], index: number }
    this._maxChannelsPerSound = 8; // allow overlapping plays without GC churn

    // Simple preloading of top sounds to reduce first-play lag
    this._preloaded = false;
    this.preload();

    this._groupIndices = new Map(); // for round-robin selection per group
  }

  /**
   * Creates a new Audio element with error handling
   * @param {string} filename - Path to the audio file
   * @returns {Audio} Audio element instance
   */
  createAudioElement(filename) {
    const audio = new Audio(filename);
    audio.preload = "auto";
    audio.addEventListener('error', (e) => {
      console.warn(`Audio file could not be loaded: ${filename}`);
    });
    return audio;
  }

  /**
   * Gets an audio instance from pool for a given filename
   * Creates pool lazily and reuses audio elements to minimize allocations
   */
  _getPooledAudio(filename) {
    let pool = this._audioPools.get(filename);
    if (!pool) {
      // Lazy-create a small pool
      const list = Array.from({ length: 3 }, () => this.createAudioElement(filename));
      pool = { list, index: 0 };
      this._audioPools.set(filename, pool);
    }

    // Try to find a free channel (paused or ended)
    for (let i = 0; i < pool.list.length; i++) {
      const a = pool.list[i];
      if (a.ended || a.paused) return a;
    }

    // If all busy and under cap, add one more channel
    if (pool.list.length < this._maxChannelsPerSound) {
      const a = this.createAudioElement(filename);
      pool.list.push(a);
      return a;
    }

    // Fallback: rotate through pool and interrupt the oldest
    const a = pool.list[pool.index % pool.list.length];
    pool.index = (pool.index + 1) % pool.list.length;
    return a;
  }

  /**
   * Plays a specific sound file
   * @param {string} filename - Path to the audio file to play
   */
  playSoundFile(filename) {
    if (this.isMuted) return; // 静音时跳过播放
    try {
      const audio = this._getPooledAudio(filename);
      // Reset and play
      audio.currentTime = 0;
      // Slightly boost combo volume for clarity
      const isCombo = filename.toLowerCase().includes('combo');
      audio.volume = Math.max(0, Math.min(1, this.sfxVolume * (isCombo ? 1.0 : 1.0)));
      audio.play().catch(e => {
        console.warn(`Could not play audio: ${filename}`, e);
      });
    } catch (error) {
      console.warn(`Error playing sound: ${filename}`, error);
    }
  }

  /**
   * Plays a random sound from a specified sound group
   * @param {string} groupName - Name of the sound group to play from
   */
  playRandomSound(groupName) {
    const soundGroup = this.soundGroups[groupName];
    if (!soundGroup || soundGroup.length === 0) {
      console.warn(`Sound group not found: ${groupName}`);
      return;
    }
    
    const randomIndex = Math.floor(Math.random() * soundGroup.length);
    const selectedSound = soundGroup[randomIndex];
    this.playSoundFile(selectedSound);
  }

  /**
   * Plays fruit spawn sound
   */
  playFruitSpawnSound() {
    this.playRandomSound('fruitSpawn');
  }

  /**
   * Plays bomb spawn sound
   */
  playBombSpawnSound() {
    this.playRandomSound('bombSpawn');
  }

  /**
   * Plays fruit cutting sound
   */
  playFruitCutSound() {
    this.playRandomSound('fruitCut');
  }

  /**
   * Plays bomb explosion sound
   */
  playBombCutSound() {
    this.playRandomSound('bombCut');
  }

  /**
   * Plays swipe sound with cooldown to prevent audio spam
   */
  playSwipeSound() {
    const now = Date.now();
    if (now - gameState.lastSwipeSoundTime > GameConstants.SWIPE_SOUND_COOLDOWN) {
      this.playRandomSound('swipe');
      gameState.lastSwipeSoundTime = now;
    }
  }

  /**
   * Plays combo sound
   */
  playComboSound() {
    const list = this.soundGroups && this.soundGroups.combo;
    if (!list || !list.length) return;
    let i = this._groupIndices.get('combo') || 0;
    const filename = list[i % list.length];
    this._groupIndices.set('combo', (i + 1) % list.length);
    this.playSoundFile(filename);
  }

  /**
   * Plays game start sound
   */
  playGameStartSound() {
    this.playSoundFile(this.specialSounds.gameStart);
  }

  /**
   * Plays game over sound
   */
  playGameOverSound() {
    this.playSoundFile(this.specialSounds.gameOver);
  }

  /** Smooth fade utility */
  _fadeAudio(audio, target, durationMs = 600) {
    if (!audio) return;
    const start = audio.volume;
    const delta = target - start;
    const steps = Math.max(1, Math.floor(durationMs / 30));
    let i = 0;
    const tick = () => {
      i++;
      const t = i/steps;
      audio.volume = this.isMuted ? 0 : Math.max(0, Math.min(1, start + delta * t));
      if (i < steps) setTimeout(tick, 30);
    };
    tick();
  }

  playMenuMusic() {
    if (!this.menuMusic) return;
    const doPlay = () => {
      try {
        this.menuMusic.currentTime = 0;
        this.menuMusic.play().catch(() => {});
      } catch(_) {}
      this._fadeAudio(this.menuMusic, 0.35, 600);
    };
    if (this._menuReady) {
      doPlay();
    } else {
      this.menuMusic.addEventListener('canplaythrough', () => {
        this._menuReady = true;
        doPlay();
      }, { once: true });
      try { this.menuMusic.load(); } catch(_) {}
    }
  }
  stopMenuMusic(fade = true) {
    if (!this.menuMusic) return;
    if (fade) {
      this._fadeAudio(this.menuMusic, 0, 400);
      setTimeout(() => { this.menuMusic.pause(); }, 420);
    } else { this.menuMusic.pause(); }
  }

  // Background music methods kept as no-ops unless implemented later
  startBackgroundMusic() { /* no-op */ }
  stopBackgroundMusic() { /* no-op */ }

  /**
   * Sets background music volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setBackgroundMusicVolume(volume) {
    this.bgMusic.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Sets the volume for music.
   * @param {number} volume - The volume level (0-1).
   */
  setMusicVolume(volume) {
    this.bgMusic.volume = volume;
  }

  /**
   * Sets the volume for sound effects.
   * @param {number} volume - The volume level (0-1).
   */
  setSfxVolume(volume) {
    this.sfxVolume = volume;
  }

  /**
   * Toggles mute state (音效 + 音乐一起静音)
   * @returns {boolean} 静音后的状态，true 表示已静音
   */
  toggleMute() {
    return this.setMuted(!this.isMuted);
  }

  /**
   * Sets the mute state
   * @param {boolean} muted - 是否静音
   * @returns {boolean} 静音后的状态
   */
  setMuted(muted) {
    this.isMuted = !!muted;
    if (this.menuMusic) {
      this.menuMusic.volume = this.isMuted ? 0 : this._musicVolume;
    }
    return this.isMuted;
  }

  /** UI hover/click helpers */
  playUiHover() { this.playSoundFile(this.specialSounds.uiHover); }
  playUiClick() { this.playSoundFile(this.specialSounds.uiClick); }

  /** Preload a subset of sounds for better first-hit latency */
  preload() {
    if (this._preloaded) return;
    this._preloaded = true;
    const groups = ['fruitCut', 'swipe', 'bombCut', 'fruitSpawn', 'bombSpawn', 'combo'];
    for (const g of groups) {
      const list = this.soundGroups[g] || [];
      for (let i = 0; i < Math.min(3, list.length); i++) {
        this._getPooledAudio(list[i]);
      }
    }
    // Prime UI and try loading menu track
    this._getPooledAudio(this.specialSounds.gameStart);
    this._getPooledAudio(this.specialSounds.gameOver);
    this._getPooledAudio(this.specialSounds.uiHover);
    this._getPooledAudio(this.specialSounds.uiClick);
    try { this.menuMusic?.load(); } catch(_) {}
  }
}

// Create global audio manager instance
const audioManager = new AudioManager();
