/**
 * Core Game Engine Hook for GRADIUS COSMIC FORCE
 * Handles loop, physics, collisions, weapon systems, option clones, boss AI, and scoring
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Player,
  Bullet,
  Enemy,
  Boss,
  ItemCapsule,
  Particle,
  FloatingText,
  Star,
  Nebula,
  TerrainSegment,
  TrailPoint,
  PowerUpSlot,
  PowerUpSlotType,
  GameState,
  GameStats,
} from '../types/game';
import { audioEngine } from '../utils/audio';
import {
  drawItemCapsule,
  drawBullet,
  drawEnemy,
  drawBoss,
  drawPlayerShip,
  drawOptionClone,
  drawParticle,
} from '../utils/sprites';

// Internal logical resolution (scaled cleanly to fit any screen)
export const CANVAS_WIDTH = 640;
export const CANVAS_HEIGHT = 360;

const DEFAULT_POWER_SLOTS: PowerUpSlot[] = [
  { id: 'SPEED', label: 'SPEED', jpLabel: 'スピード', costSteps: 1, currentLevel: 0, maxLevel: 4, active: false },
  { id: 'MISSILE', label: 'MISSILE', jpLabel: 'ミサイル', costSteps: 2, currentLevel: 0, maxLevel: 1, active: false },
  { id: 'DOUBLE', label: 'DOUBLE', jpLabel: 'ダブル', costSteps: 3, currentLevel: 0, maxLevel: 1, active: false },
  { id: 'LASER', label: 'LASER', jpLabel: 'レーザー', costSteps: 4, currentLevel: 0, maxLevel: 1, active: false },
  { id: 'OPTION', label: 'OPTION', jpLabel: 'オプション(分身)', costSteps: 5, currentLevel: 0, maxLevel: 4, active: false },
  { id: 'SHIELD', label: 'SHIELD', jpLabel: 'シールド', costSteps: 6, currentLevel: 0, maxLevel: 1, active: false },
];

export function useGameEngine() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // High-level React States for HUD
  const [gameState, setGameState] = useState<GameState>('TITLE');
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('gradius_highscore');
      return saved ? parseInt(saved, 10) : 10000;
    } catch {
      return 10000;
    }
  });
  const [lives, setLives] = useState<number>(7);
  const [stage, setStage] = useState<number>(1);
  const [powerMeterIndex, setPowerMeterIndex] = useState<number>(0); // 0 = none, 1-6
  const [powerSlots, setPowerSlots] = useState<PowerUpSlot[]>(DEFAULT_POWER_SLOTS);
  const [bossActive, setBossActive] = useState<boolean>(false);
  const [bossHpRatio, setBossHpRatio] = useState<number>(1);
  const [isWarningActive, setIsWarningActive] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [crtEnabled, setCrtEnabled] = useState<boolean>(true);
  const [optionsCount, setOptionsCount] = useState<number>(0);
  const [playerHp, setPlayerHp] = useState<number>(1);
  const [playerMaxHp] = useState<number>(1);
  const [isTerrainTransitioning, setIsTerrainTransitioning] = useState<boolean>(false);

  // Engine references (mutable for 60fps performance without state lag)
  const engineRef = useRef({
    gameState: 'TITLE' as GameState,
    frame: 0,
    stats: {
      score: 0,
      highScore: 10000,
      stage: 1,
      distance: 0,
      bossAppeared: false,
      bossDefeated: false,
      enemiesKilled: 0,
      powerMeterIndex: 0,
      rankDifficulty: 1,
    } as GameStats,
    player: {
      x: 60,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      width: 24,
      height: 12,
      speedLevel: 0,
      weapon: 'NORMAL',
      missileLevel: 0,
      optionsCount: 0,
      shieldHp: 0,
      maxShieldHp: 8,
      shieldActive: false,
      hp: 1,
      maxHp: 1,
      damageFlashTimer: 0,
      lives: 7,
      invincibleTimer: 60,
      isAlive: true,
      respawnTimer: 0,
      shootCooldown: 0,
      missileCooldown: 0,
      rollAngle: 0,
    } as Player,
    powerSlots: JSON.parse(JSON.stringify(DEFAULT_POWER_SLOTS)) as PowerUpSlot[],
    trailHistory: [] as TrailPoint[], // Max 120 positions
    bullets: [] as Bullet[],
    enemies: [] as Enemy[],
    capsules: [] as ItemCapsule[],
    particles: [] as Particle[],
    floatingTexts: [] as FloatingText[],
    stars: [] as Star[],
    nebulae: [] as Nebula[],
    terrain: [] as TerrainSegment[],
    boss: null as Boss | null,
    screenShake: 0,
    warningTimer: 0,
    squadronsTracker: {} as Record<string, { total: number; killed: number }>,
    keys: {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
      missile: false,
      powerUp: false,
    },
    spawnTimer: 0,
    waveStep: 0,
    stageDistanceToBoss: 3200,
  });

  // Toggle Mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      audioEngine.setMuted(next);
      return next;
    });
  }, []);

  // Toggle CRT filter
  const toggleCrt = useCallback(() => {
    setCrtEnabled((prev) => !prev);
  }, []);

  // Initialize Background Starfield
  const initStarfield = useCallback(() => {
    const stars: Star[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        speed: 0.5 + Math.random() * 2.5,
        size: Math.random() > 0.85 ? 2 : 1,
        color: Math.random() > 0.6 ? '#93c5fd' : Math.random() > 0.3 ? '#ffffff' : '#fef08a',
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }

    const nebulae: Nebula[] = [
      { x: 120, y: 80, radius: 90, color: 'rgba(59, 130, 246, 0.07)', speed: 0.2 },
      { x: 450, y: 240, radius: 110, color: 'rgba(168, 85, 247, 0.08)', speed: 0.15 },
      { x: 750, y: 150, radius: 130, color: 'rgba(236, 72, 153, 0.06)', speed: 0.25 },
    ];

    engineRef.current.stars = stars;
    engineRef.current.nebulae = nebulae;
  }, []);

  // Generate / Scroll Terrain (Smooth gradual transition with no collision during shifts)
  const updateTerrain = useCallback((dist: number, isBossFight: boolean) => {
    const e = engineRef.current;
    if (e.gameState === 'TITLE') return;

    // Scroll existing terrain left smoothly
    const scrollSpeed = isBossFight ? 0.3 : 1.0;
    for (let i = e.terrain.length - 1; i >= 0; i--) {
      e.terrain[i].x -= scrollSpeed;
      if (e.terrain[i].x + e.terrain[i].width < 0) {
        e.terrain.splice(i, 1);
      }
    }

    const lastSeg = e.terrain[e.terrain.length - 1];
    const rightEdge = lastSeg ? lastSeg.x + lastSeg.width : 0;

    // Cavern zone parameters
    const cavernStart = 750;
    const cavernEnd = e.stageDistanceToBoss - 300;
    const inCavernZone = dist >= cavernStart && dist <= cavernEnd;

    // Transition lengths: 400 distance units to ease in/out very gradually
    const transitionInDuration = 400;
    const transitionOutDuration = 400;
    const isEntering = dist >= cavernStart && dist < cavernStart + transitionInDuration;
    const isExiting = dist > cavernEnd - transitionOutDuration && dist <= cavernEnd;
    const isTransitioning = isEntering || isExiting;

    setIsTerrainTransitioning(isTransitioning);

    if (rightEdge < CANVAS_WIDTH + 80 && !isBossFight && inCavernZone) {
      const segWidth = 32;

      // Ease factor 0.0 -> 1.0 for seamless, gentle emergence
      let easeFactor = 1.0;
      if (isEntering) {
        easeFactor = Math.min(1.0, Math.max(0.04, (dist - cavernStart) / transitionInDuration));
      } else if (isExiting) {
        easeFactor = Math.min(1.0, Math.max(0.04, (cavernEnd - dist) / transitionOutDuration));
      }

      // Much slower, gentler wave (frequency 0.003 is 5x slower than previous 0.015)
      const wave = Math.sin((dist + rightEdge) * 0.003);
      // Gentle heights: 22px base + wave * 10px, scaled by easeFactor
      const topH = Math.max(6, (22 + wave * 10) * easeFactor);
      const botH = Math.max(6, (22 - wave * 10) * easeFactor);

      // Disable collision during transition as requested!
      const collisionActive = !isTransitioning && easeFactor >= 0.95;

      // More active enemy defenses right from the start
      const hasTurretTop = !isTransitioning && Math.random() < 0.14;
      const hasTurretBottom = !isTransitioning && !hasTurretTop && Math.random() < 0.14;

      e.terrain.push({
        x: rightEdge,
        width: segWidth,
        topHeight: topH,
        bottomHeight: botH,
        hasTurretTop,
        hasTurretBottom,
        isTransitioning,
        collisionActive,
      });

      // Spawn turrets (Stronger HP: 6, faster firing, reduced capsule drop rate: 10%)
      if (hasTurretTop) {
        e.enemies.push({
          id: `turret_${Date.now()}_${Math.random()}`,
          x: rightEdge + segWidth / 2,
          y: topH,
          vx: -scrollSpeed,
          vy: 0,
          type: 'TURRET',
          hp: 6,
          maxHp: 6,
          width: 20,
          height: 14,
          score: 300,
          shootTimer: 45 + Math.random() * 45,
          shootInterval: 100,
          dropCapsule: Math.random() < 0.18, // Slightly increased drop rate
          age: 0,
          isCeiling: true,
        });
      } else if (hasTurretBottom) {
        e.enemies.push({
          id: `turret_${Date.now()}_${Math.random()}`,
          x: rightEdge + segWidth / 2,
          y: CANVAS_HEIGHT - botH,
          vx: -scrollSpeed,
          vy: 0,
          type: 'TURRET',
          hp: 6,
          maxHp: 6,
          width: 20,
          height: 14,
          score: 300,
          shootTimer: 45 + Math.random() * 45,
          shootInterval: 100,
          dropCapsule: Math.random() < 0.18, // Slightly increased drop rate
          age: 0,
          isCeiling: false,
        });
      }
    }
  }, []);

  // Activate Power-Up Slot
  const activatePowerUp = useCallback((slotTypeOverride?: PowerUpSlotType) => {
    const e = engineRef.current;
    if (!e.player.isAlive || e.gameState !== 'PLAYING') return;

    let targetSlotIndex = e.stats.powerMeterIndex;
    if (slotTypeOverride) {
      const idx = e.powerSlots.findIndex((s) => s.id === slotTypeOverride);
      if (idx !== -1) targetSlotIndex = idx + 1;
    }

    if (targetSlotIndex <= 0 || targetSlotIndex > 6) return;

    const slot = e.powerSlots[targetSlotIndex - 1];

    switch (slot.id) {
      case 'SPEED': {
        if (e.player.speedLevel < 4) {
          e.player.speedLevel++;
          slot.currentLevel = e.player.speedLevel;
          slot.active = true;
          audioEngine.playPowerUpActivate();
          e.floatingTexts.push({
            id: Math.random().toString(),
            x: e.player.x,
            y: e.player.y - 18,
            text: `SPEED UP LV.${e.player.speedLevel}`,
            color: '#38bdf8',
            life: 45,
            maxLife: 45,
          });
        }
        break;
      }
      case 'MISSILE': {
        if (e.player.missileLevel < 1) {
          e.player.missileLevel = 1;
          slot.currentLevel = 1;
          slot.active = true;
          audioEngine.playPowerUpActivate();
          e.floatingTexts.push({
            id: Math.random().toString(),
            x: e.player.x,
            y: e.player.y - 18,
            text: 'MISSILE EQUIPPED!',
            color: '#ef4444',
            life: 45,
            maxLife: 45,
          });
        }
        break;
      }
      case 'DOUBLE': {
        e.player.weapon = 'DOUBLE';
        slot.active = true;
        // Deactivate Laser slot since they are mutually exclusive in Gradius
        const laserSlot = e.powerSlots.find((s) => s.id === 'LASER');
        if (laserSlot) {
          laserSlot.active = false;
          laserSlot.currentLevel = 0;
        }
        audioEngine.playPowerUpActivate();
        e.floatingTexts.push({
          id: Math.random().toString(),
          x: e.player.x,
          y: e.player.y - 18,
          text: 'DOUBLE CANNON!',
          color: '#fbbf24',
          life: 45,
          maxLife: 45,
        });
        break;
      }
      case 'LASER': {
        e.player.weapon = 'LASER';
        slot.active = true;
        // Deactivate Double slot
        const doubleSlot = e.powerSlots.find((s) => s.id === 'DOUBLE');
        if (doubleSlot) {
          doubleSlot.active = false;
          doubleSlot.currentLevel = 0;
        }
        audioEngine.playPowerUpActivate();
        e.floatingTexts.push({
          id: Math.random().toString(),
          x: e.player.x,
          y: e.player.y - 18,
          text: 'CYCLONE LASER!',
          color: '#06b6d4',
          life: 45,
          maxLife: 45,
        });
        break;
      }
      case 'OPTION': {
        // Iconic Gradius Option Clone!
        if (e.player.optionsCount < 4) {
          e.player.optionsCount++;
          slot.currentLevel = e.player.optionsCount;
          slot.active = true;
          audioEngine.playOptionSpawn();
          setOptionsCount(e.player.optionsCount);
          e.floatingTexts.push({
            id: Math.random().toString(),
            x: e.player.x,
            y: e.player.y - 18,
            text: `OPTION x${e.player.optionsCount} (分身)!`,
            color: '#f97316',
            life: 50,
            maxLife: 50,
          });
        }
        break;
      }
      case 'SHIELD': {
        e.player.shieldHp = e.player.maxShieldHp;
        e.player.shieldActive = true;
        slot.active = true;
        slot.currentLevel = 1;
        audioEngine.playPowerUpActivate();
        e.floatingTexts.push({
          id: Math.random().toString(),
          x: e.player.x,
          y: e.player.y - 18,
          text: 'FORCE FIELD!',
          color: '#38bdf8',
          life: 45,
          maxLife: 45,
        });
        break;
      }
    }

    // Reset cursor on meter after activation
    e.stats.powerMeterIndex = 0;
    setPowerMeterIndex(0);
    setPowerSlots([...e.powerSlots]);
  }, []);

  // Collect Power Capsule (Automatically grants random power-up slot - no number keys needed!)
  const collectCapsule = useCallback((item: ItemCapsule) => {
    const e = engineRef.current;
    audioEngine.playCapsuleGet();

    // Score bonus
    e.stats.score += 500;
    setScore(e.stats.score);

    // Pick candidates based on what's available and fun
    const candidates: PowerUpSlotType[] = [];

    // Speed (if < 4)
    if (e.player.speedLevel < 4) {
      candidates.push('SPEED', 'SPEED');
    }
    // Missile (if not equipped)
    if (e.player.missileLevel < 1) {
      candidates.push('MISSILE', 'MISSILE');
    }
    // Double & Laser (cycle weapons)
    if (e.player.weapon !== 'LASER') {
      candidates.push('LASER', 'LASER');
    }
    if (e.player.weapon !== 'DOUBLE') {
      candidates.push('DOUBLE');
    }
    // Option Clones (分身) - generous weighting so players get awesome clone fleets!
    if (e.player.optionsCount < 4) {
      candidates.push('OPTION', 'OPTION', 'OPTION');
    }
    // Shield (if degraded or inactive)
    if (!e.player.shieldActive || e.player.shieldHp < e.player.maxShieldHp) {
      candidates.push('SHIELD', 'SHIELD');
    }

    // Fallback if fully maxed
    if (candidates.length === 0) {
      candidates.push('OPTION', 'SHIELD', 'LASER', 'SPEED');
    }

    // Pick random slot
    const chosenSlot = candidates[Math.floor(Math.random() * candidates.length)];

    // Highlight slot in power meter
    const slotIndex = e.powerSlots.findIndex((s) => s.id === chosenSlot);
    if (slotIndex !== -1) {
      e.stats.powerMeterIndex = slotIndex + 1;
      setPowerMeterIndex(slotIndex + 1);
    }

    // Automatically activate the selected power-up immediately!
    activatePowerUp(chosenSlot);
  }, [activatePowerUp]);

  // Spawn The Giant Boss ("SUPER BIG CORE")
  const spawnBoss = useCallback(() => {
    const e = engineRef.current;
    if (e.boss || e.stats.bossAppeared) return;

    e.stats.bossAppeared = true;
    setBossActive(true);
    setIsWarningActive(true);
    e.warningTimer = 160; // siren warning frames

    audioEngine.playWarningSiren();
    audioEngine.startBossBgm();

    // Big Core Structure (More than doubled boss HP from 42 -> 110 as requested)
    const maxHp = 110 + (e.stats.stage - 1) * 45;
    const shieldPlates = [
      { id: 1, xOffset: -12, yOffset: -16, width: 10, height: 14, hp: 9, maxHp: 9, destroyed: false },
      { id: 2, xOffset: -12, yOffset: 0, width: 10, height: 14, hp: 10, maxHp: 10, destroyed: false },
      { id: 3, xOffset: -12, yOffset: 16, width: 10, height: 14, hp: 9, maxHp: 9, destroyed: false },
    ];

    e.boss = {
      x: CANVAS_WIDTH + 140,
      y: CANVAS_HEIGHT / 2,
      vx: -1.0,
      vy: 0,
      width: 150,
      height: 120,
      hp: maxHp,
      maxHp,
      state: 'WARPING_IN',
      stateTimer: 0,
      attackPatternTimer: 0,
      currentPhase: 1,
      shieldPlates,
      beamChargeTimer: 0,
      beamFiring: false,
      coreGlowPhase: 0,
      floatOffset: 0,
    };
  }, []);

  // Fire Player Weapons (Player + All Options!)
  const firePlayerWeapons = useCallback(() => {
    const e = engineRef.current;
    if (!e.player.isAlive || e.player.shootCooldown > 0) return;

    // Cooldown based on weapon
    e.player.shootCooldown = e.player.weapon === 'LASER' ? 14 : 9;

    // Positions that will fire: Player + each active Option
    const firingOrigins: { x: number; y: number }[] = [
      { x: e.player.x + 18, y: e.player.y },
    ];

    // Add positions of options from trailHistory
    for (let i = 0; i < e.player.optionsCount; i++) {
      const delay = (i + 1) * 14;
      const historyIndex = e.trailHistory.length - 1 - delay;
      if (historyIndex >= 0 && e.trailHistory[historyIndex]) {
        firingOrigins.push({
          x: e.trailHistory[historyIndex].x,
          y: e.trailHistory[historyIndex].y,
        });
      } else {
        // Fallback offset behind player
        firingOrigins.push({
          x: e.player.x - (i + 1) * 22,
          y: e.player.y,
        });
      }
    }

    // Play corresponding sound
    if (e.player.weapon === 'LASER') {
      audioEngine.playLaser();
    } else if (e.player.weapon === 'DOUBLE') {
      audioEngine.playDoubleShot();
    } else {
      audioEngine.playShoot();
    }

    // Spawn bullets from all origins
    firingOrigins.forEach((origin) => {
      switch (e.player.weapon) {
        case 'NORMAL': {
          e.bullets.push({
            id: Math.random().toString(),
            x: origin.x,
            y: origin.y,
            vx: 11,
            vy: 0,
            type: 'PLAYER_VULCAN',
            width: 12,
            height: 4,
            damage: 2,
            isPlayer: true,
            lifeTimer: 80,
          });
          break;
        }
        case 'DOUBLE': {
          // Forward shot
          e.bullets.push({
            id: Math.random().toString(),
            x: origin.x,
            y: origin.y,
            vx: 11,
            vy: 0,
            type: 'PLAYER_VULCAN',
            width: 12,
            height: 4,
            damage: 2,
            isPlayer: true,
            lifeTimer: 80,
          });
          // 45-degree upward shot
          e.bullets.push({
            id: Math.random().toString(),
            x: origin.x,
            y: origin.y - 2,
            vx: 8,
            vy: -8,
            type: 'PLAYER_DOUBLE_UP',
            width: 8,
            height: 8,
            damage: 2,
            isPlayer: true,
            lifeTimer: 80,
          });
          break;
        }
        case 'LASER': {
          // Piercing long beam
          e.bullets.push({
            id: Math.random().toString(),
            x: origin.x + 20,
            y: origin.y,
            vx: 14,
            vy: 0,
            type: 'PLAYER_LASER',
            width: 44,
            height: 6,
            damage: 4,
            isPiercing: true,
            isPlayer: true,
            lifeTimer: 60,
          });
          break;
        }
      }
    });

    // Sub-weapon: Missile (drops downward towards terrain)
    if (e.player.missileLevel > 0 && e.player.missileCooldown <= 0) {
      e.player.missileCooldown = 28;
      audioEngine.playMissile();

      firingOrigins.forEach((origin) => {
        e.bullets.push({
          id: Math.random().toString(),
          x: origin.x,
          y: origin.y + 6,
          vx: 3.5,
          vy: 3.5,
          type: 'PLAYER_MISSILE',
          width: 10,
          height: 6,
          damage: 5,
          isPlayer: true,
          lifeTimer: 120,
          groundTrack: true,
        });
      });
    }
  }, []);

  // Player Death Handling
  const killPlayer = useCallback(() => {
    const e = engineRef.current;
    if (!e.player.isAlive) return;

    audioEngine.playPlayerDie();
    e.player.isAlive = false;
    e.player.lives--;
    setLives(e.player.lives);
    e.screenShake = 18;

    // Death explosion particles
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      e.particles.push({
        x: e.player.x,
        y: e.player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: ['#f97316', '#ef4444', '#fef08a', '#ffffff'][Math.floor(Math.random() * 4)],
        size: 3 + Math.random() * 5,
        life: 40 + Math.random() * 20,
        maxLife: 60,
      });
    }

    if (e.player.lives <= 0) {
      // Game Over
      setTimeout(() => {
        e.gameState = 'GAME_OVER';
        setGameState('GAME_OVER');
        audioEngine.stopBgm();
      }, 1000);
    } else {
      // Respawn after short delay
      e.player.respawnTimer = 70;
    }
  }, []);

  // Player Damage Handling (HP system abolished: taking a direct hit immediately reduces 1 life, unless protected by Force Field Shield)
  const damagePlayer = useCallback((_amount: number = 1) => {
    const e = engineRef.current;
    if (!e.player.isAlive || e.player.invincibleTimer > 0) return;

    // Check Force Field Shield first
    if (e.player.shieldActive && e.player.shieldHp > 0) {
      e.player.shieldHp -= 1;
      audioEngine.playShieldHit();
      if (e.player.shieldHp <= 0) {
        e.player.shieldActive = false;
        const shSlot = e.powerSlots.find((s) => s.id === 'SHIELD');
        if (shSlot) {
          shSlot.active = false;
          shSlot.currentLevel = 0;
        }
        setPowerSlots([...e.powerSlots]);
      }
      return;
    }

    // Direct hit immediately destroys the ship and reduces 1 life!
    killPlayer();
  }, [killPlayer]);

  // Start / Restart Game
  const startGame = useCallback(() => {
    const e = engineRef.current;
    e.gameState = 'PLAYING';
    setGameState('PLAYING');

    e.stats = {
      score: 0,
      highScore: e.stats.highScore,
      stage: 1,
      distance: 0,
      bossAppeared: false,
      bossDefeated: false,
      enemiesKilled: 0,
      powerMeterIndex: 0,
      rankDifficulty: 1,
    };
    setScore(0);
    setStage(1);
    setLives(7);
    setPlayerHp(1);
    setPowerMeterIndex(0);
    setBossActive(false);
    setOptionsCount(0);

    e.player = {
      x: 70,
      y: CANVAS_HEIGHT / 2,
      vx: 0,
      vy: 0,
      width: 24,
      height: 12,
      speedLevel: 0,
      weapon: 'NORMAL',
      missileLevel: 0,
      optionsCount: 0,
      shieldHp: 0,
      maxShieldHp: 8,
      shieldActive: false,
      hp: 1,
      maxHp: 1,
      damageFlashTimer: 0,
      lives: 7,
      invincibleTimer: 100,
      isAlive: true,
      respawnTimer: 0,
      shootCooldown: 0,
      missileCooldown: 0,
      rollAngle: 0,
    };

    e.powerSlots = JSON.parse(JSON.stringify(DEFAULT_POWER_SLOTS));
    setPowerSlots([...e.powerSlots]);

    e.bullets = [];
    e.enemies = [];
    e.capsules = [];
    e.particles = [];
    e.floatingTexts = [];
    e.terrain = [];
    e.trailHistory = [];
    e.boss = null;
    e.waveStep = 0;
    e.spawnTimer = 0;

    initStarfield();
    audioEngine.startStageBgm();
  }, [initStarfield]);

  // Main 60 FPS Engine Tick
  useEffect(() => {
    let animId: number;
    initStarfield();

    const loop = () => {
      const e = engineRef.current;
      e.frame++;

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        // --- 1. UPDATE PHYSICS & LOGIC ---

        // Screen Shake decay
        if (e.screenShake > 0) {
          e.screenShake *= 0.88;
          if (e.screenShake < 0.2) e.screenShake = 0;
        }

        // Starfield & Nebulae parallax
        const bgSpeed = e.boss ? 0.3 : 1.2;
        e.stars.forEach((star) => {
          star.x -= star.speed * bgSpeed;
          if (star.x < 0) {
            star.x = CANVAS_WIDTH;
            star.y = Math.random() * CANVAS_HEIGHT;
          }
        });
        e.nebulae.forEach((neb) => {
          neb.x -= neb.speed * bgSpeed;
          if (neb.x < -neb.radius) {
            neb.x = CANVAS_WIDTH + neb.radius;
          }
        });

        if (e.gameState === 'PLAYING') {
          e.stats.distance += 1;

          // Check if Boss should appear
          if (e.stats.distance >= e.stageDistanceToBoss && !e.stats.bossAppeared) {
            spawnBoss();
          }

          // Warning timer countdown
          if (e.warningTimer > 0) {
            e.warningTimer--;
            if (e.warningTimer % 30 === 0) {
              audioEngine.playWarningSiren();
            }
            if (e.warningTimer === 0) {
              setIsWarningActive(false);
            }
          }

          // Respawn check
          if (!e.player.isAlive && e.player.lives > 0) {
            e.player.respawnTimer--;
            if (e.player.respawnTimer <= 0) {
              e.player.isAlive = true;
              e.player.x = 60;
              e.player.y = CANVAS_HEIGHT / 2;
              e.player.invincibleTimer = 90;
              e.player.hp = e.player.maxHp;
              setPlayerHp(e.player.hp);
              e.player.damageFlashTimer = 0;
              // Reset speed or weapons on death like classic Gradius (Options are lost on death!)
              e.player.speedLevel = 0;
              e.player.weapon = 'NORMAL';
              e.player.missileLevel = 0;
              e.player.optionsCount = 0;
              e.player.shieldActive = false;
              e.player.shieldHp = 0;
              e.stats.powerMeterIndex = 0;
              setPowerMeterIndex(0);
              setOptionsCount(0);
              e.powerSlots = JSON.parse(JSON.stringify(DEFAULT_POWER_SLOTS));
              setPowerSlots([...e.powerSlots]);
              e.trailHistory = [];
            }
          }

          // Player Movement & Trail
          if (e.player.isAlive) {
            if (e.player.invincibleTimer > 0) e.player.invincibleTimer--;
            if (e.player.damageFlashTimer > 0) e.player.damageFlashTimer--;
            if (e.player.shootCooldown > 0) e.player.shootCooldown--;
            if (e.player.missileCooldown > 0) e.player.missileCooldown--;

            // Auto-fire or button hold
            if (e.keys.shoot) {
              firePlayerWeapons();
            }

            const baseSpeed = 2.4 + e.player.speedLevel * 0.7;
            let moveX = 0;
            let moveY = 0;
            if (e.keys.left) moveX -= 1;
            if (e.keys.right) moveX += 1;
            if (e.keys.up) moveY -= 1;
            if (e.keys.down) moveY += 1;

            // Diagonal normalization
            if (moveX !== 0 && moveY !== 0) {
              moveX *= 0.7071;
              moveY *= 0.7071;
            }

            // Boost leftward movement speed by 1.45x for swift evasion and repositioning
            const speedX = moveX < 0 ? baseSpeed * 1.45 : baseSpeed;
            e.player.x += moveX * speedX;
            e.player.y += moveY * baseSpeed;

            // Banking angle
            if (moveY < 0) e.player.rollAngle = Math.max(-1, e.player.rollAngle - 0.2);
            else if (moveY > 0) e.player.rollAngle = Math.min(1, e.player.rollAngle + 0.2);
            else e.player.rollAngle *= 0.75;

            // Boundary constraints
            e.player.x = Math.max(20, Math.min(CANVAS_WIDTH - 40, e.player.x));
            e.player.y = Math.max(16, Math.min(CANVAS_HEIGHT - 20, e.player.y));

            // Record trail position for Option Clones
            e.trailHistory.push({
              x: e.player.x,
              y: e.player.y,
              rollAngle: e.player.rollAngle,
            });
            if (e.trailHistory.length > 120) {
              e.trailHistory.shift();
            }

            // Power-up activation key triggered
            if (e.keys.powerUp) {
              e.keys.powerUp = false;
              activatePowerUp();
            }
          }

          // Update Terrain
          updateTerrain(e.stats.distance, !!e.boss);

          // Check Terrain collision with player (Collision is completely disabled while transitioning!)
          if (e.player.isAlive && e.player.invincibleTimer <= 0) {
            for (const seg of e.terrain) {
              if (seg.collisionActive !== false && !seg.isTransitioning) {
                if (
                  e.player.x + 10 > seg.x &&
                  e.player.x - 10 < seg.x + seg.width
                ) {
                  if (e.player.y - 6 < seg.topHeight || e.player.y + 6 > CANVAS_HEIGHT - seg.bottomHeight) {
                    damagePlayer(1);
                    break;
                  }
                }
              }
            }
          }

          // Enemy Wave Spawning (Stronger enemies and faster waves right from early stage)
          if (!e.boss) {
            e.spawnTimer++;
            const spawnInterval = Math.max(30, 52 - e.stats.stage * 6);
            if (e.spawnTimer >= spawnInterval) {
              e.spawnTimer = 0;
              e.waveStep++;

              // Alternating wave types
              const waveMod = e.waveStep % 5;
              if (waveMod === 0) {
                // Red Squadron (6 interceptors flying in sine wave formation, tougher HP: 4)
                const squadId = `squad_${Date.now()}`;
                e.squadronsTracker[squadId] = { total: 6, killed: 0 };
                const squadBaseY = 55 + Math.random() * (CANVAS_HEIGHT - 130);
                for (let i = 0; i < 6; i++) {
                  e.enemies.push({
                    id: `red_${squadId}_${i}`,
                    x: CANVAS_WIDTH + 30 + i * 34,
                    y: squadBaseY,
                    vx: -3.2,
                    vy: 0,
                    type: 'RED_INTERCEPTOR',
                    hp: 4,
                    maxHp: 4,
                    width: 20,
                    height: 14,
                    score: 150,
                    shootTimer: 45 + Math.random() * 30,
                    shootInterval: 65,
                    dropCapsule: false,
                    squadId,
                    isSquadLeader: i === 5,
                    age: i * 8,
                    baseY: squadBaseY,
                    phase: i * 0.4,
                  });
                }
              } else if (waveMod === 1) {
                // Blue Rushers darting across (4 ships, tougher HP: 5, lower drop rate: 10%)
                for (let i = 0; i < 4; i++) {
                  e.enemies.push({
                    id: `blue_${Date.now()}_${i}`,
                    x: CANVAS_WIDTH + 20 + i * 36,
                    y: 35 + Math.random() * (CANVAS_HEIGHT - 70),
                    vx: -4.5,
                    vy: 0,
                    type: 'BLUE_RUSHER',
                    hp: 5,
                    maxHp: 5,
                    width: 22,
                    height: 12,
                    score: 200,
                    shootTimer: 25,
                    shootInterval: 50,
                    dropCapsule: Math.random() < 0.18, // Slightly increased drop chance
                    age: 0,
                  });
                }
              } else if (waveMod === 2) {
                // Moai Head (Ancient space statue, tough HP: 28+, drop rate: 60%)
                const moaiY = 50 + Math.random() * (CANVAS_HEIGHT - 100);
                e.enemies.push({
                  id: `moai_${Date.now()}`,
                  x: CANVAS_WIDTH + 30,
                  y: moaiY,
                  vx: -1.2,
                  vy: 0,
                  type: 'MOAI',
                  hp: 28 + e.stats.stage * 8,
                  maxHp: 28 + e.stats.stage * 8,
                  width: 28,
                  height: 38,
                  score: 800,
                  shootTimer: 45,
                  shootInterval: 65,
                  dropCapsule: Math.random() < 0.6, // Slightly increased drop rate (60%)
                  age: 0,
                  mouthOpenTimer: 0,
                });
              } else if (waveMod === 3) {
                // Duckers (Walkers on ceiling and floor, HP: 5, drop rate: 18%)
                for (let d = 0; d < 2; d++) {
                  const isCeil = d === 0;
                  e.enemies.push({
                    id: `ducker_${Date.now()}_${d}`,
                    x: CANVAS_WIDTH + 20 + d * 30,
                    y: isCeil ? 24 : CANVAS_HEIGHT - 24,
                    vx: -1.9,
                    vy: 0,
                    type: 'DUCKER',
                    hp: 5,
                    maxHp: 5,
                    width: 18,
                    height: 16,
                    score: 250,
                    shootTimer: 40 + d * 20,
                    shootInterval: 55,
                    dropCapsule: Math.random() < 0.18, // Slightly increased drop rate
                    age: 0,
                    isCeiling: isCeil,
                  });
                }
              } else {
                // Drifting Asteroid cluster (3 asteroids, HP: 10)
                for (let i = 0; i < 3; i++) {
                  e.enemies.push({
                    id: `ast_${Date.now()}_${i}`,
                    x: CANVAS_WIDTH + 20 + i * 45,
                    y: 50 + Math.random() * (CANVAS_HEIGHT - 100),
                    vx: -1.0 - Math.random() * 1.5,
                    vy: (Math.random() - 0.5) * 0.8,
                    type: 'ASTEROID',
                    hp: 10,
                    maxHp: 10,
                    width: 24,
                    height: 24,
                    score: 100,
                    shootTimer: 9999,
                    shootInterval: 9999,
                    dropCapsule: false,
                    age: 0,
                  });
                }
              }
            }
          }

          // Update Enemies
          for (let i = e.enemies.length - 1; i >= 0; i--) {
            const enemy = e.enemies[i];
            enemy.age++;
            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            // Specialized movements
            if (enemy.type === 'RED_INTERCEPTOR' && enemy.baseY !== undefined) {
              enemy.y = enemy.baseY + Math.sin(enemy.age * 0.08 + (enemy.phase || 0)) * 36;
            }

            // Enemy Shooting (Reduced bullet speed for fair dodging reaction time)
            enemy.shootTimer--;
            if (enemy.shootTimer <= 0 && enemy.x < CANVAS_WIDTH - 20 && enemy.x > 30) {
              enemy.shootTimer = enemy.shootInterval;

              if (enemy.type === 'MOAI') {
                // Moai opens mouth and fires expanding ring laser!
                enemy.mouthOpenTimer = 25;
                audioEngine.playLaser();
                e.bullets.push({
                  id: Math.random().toString(),
                  x: enemy.x - 16,
                  y: enemy.y + 4,
                  vx: -2.0, // Slowed down from -4.5
                  vy: 0,
                  type: 'ENEMY_RING',
                  width: 14,
                  height: 10,
                  damage: 1,
                  isPlayer: false,
                  lifeTimer: 240,
                });
              } else if (enemy.type === 'TURRET' || enemy.type === 'DUCKER') {
                // Aimed bullet towards player
                const dx = e.player.x - enemy.x;
                const dy = e.player.y - enemy.y;
                const dist = Math.hypot(dx, dy) || 1;
                const bulletSpeed = 1.8 + Math.min(1.0, (e.stats.stage - 1) * 0.2); // Slowed down from 3.6+
                e.bullets.push({
                  id: Math.random().toString(),
                  x: enemy.x - 8,
                  y: enemy.y,
                  vx: (dx / dist) * bulletSpeed,
                  vy: (dy / dist) * bulletSpeed,
                  type: 'ENEMY_AIMED',
                  width: 7,
                  height: 7,
                  damage: 1,
                  isPlayer: false,
                  lifeTimer: 200,
                });
              } else if (enemy.type === 'RED_INTERCEPTOR' || enemy.type === 'BLUE_RUSHER') {
                // Straight forward bullet
                e.bullets.push({
                  id: Math.random().toString(),
                  x: enemy.x - 8,
                  y: enemy.y,
                  vx: -2.2, // Slowed down from -4.5
                  vy: 0,
                  type: 'ENEMY_BULLET',
                  width: 6,
                  height: 6,
                  damage: 1,
                  isPlayer: false,
                  lifeTimer: 180,
                });
              }
            }

            if (enemy.mouthOpenTimer && enemy.mouthOpenTimer > 0) {
              enemy.mouthOpenTimer--;
            }

            // Remove off-screen enemies
            if (enemy.x < -60) {
              e.enemies.splice(i, 1);
            }
          }

          // Update Boss AI ("SUPER BIG CORE")
          if (e.boss) {
            const b = e.boss;
            b.stateTimer++;
            b.floatOffset = Math.sin(e.frame * 0.04) * 24;

            // Entrance state
            if (b.state === 'WARPING_IN') {
              if (b.x > CANVAS_WIDTH - 110) {
                b.x += b.vx;
              } else {
                b.state = 'ACTIVE';
                b.vx = 0;
              }
            } else if (b.state === 'ACTIVE') {
              // Boss attack patterns
              b.attackPatternTimer++;
              const patternCycle = b.attackPatternTimer % 240;

              // Phase 1: Charge and fire 4 gigantic forward laser beams!
              if (patternCycle > 70 && patternCycle < 110) {
                b.beamChargeTimer = 110 - patternCycle;
              } else if (patternCycle === 110) {
                // FIRING 4 MAIN BEAMS
                b.beamFiring = true;
                audioEngine.playLaser();
                [-50, -32, 32, 50].forEach((yOff) => {
                  e.bullets.push({
                    id: Math.random().toString(),
                    x: b.x - 100,
                    y: b.y + b.floatOffset + yOff,
                    vx: -5.0, // Slowed down from -9
                    vy: 0,
                    type: 'BOSS_CORE_BEAM',
                    width: 70,
                    height: 10,
                    damage: 1,
                    isPlayer: false,
                    lifeTimer: 110,
                  });
                });
              } else if (patternCycle > 140 && patternCycle % 45 === 0) {
                // Secondary aimed plasma orbs (slow and dodgeable)
                const dx = e.player.x - (b.x - 20);
                const dy = e.player.y - (b.y + b.floatOffset);
                const dist = Math.hypot(dx, dy) || 1;
                e.bullets.push({
                  id: Math.random().toString(),
                  x: b.x - 30,
                  y: b.y + b.floatOffset,
                  vx: (dx / dist) * 2.0, // Slowed down from 4.0
                  vy: (dy / dist) * 2.0,
                  type: 'BOSS_ORB',
                  width: 12,
                  height: 12,
                  damage: 1,
                  isPlayer: false,
                  lifeTimer: 200,
                });
              }

              // Barrier shields slide up and down to deflect player shots
              b.shieldPlates.forEach((plate, pIdx) => {
                if (!plate.destroyed) {
                  plate.yOffset = (pIdx - 1) * 20 + Math.sin(e.frame * 0.08 + pIdx) * 12;
                }
              });

              // Check if all shield plates destroyed
              const allShieldsGone = b.shieldPlates.every((p) => p.destroyed);
              if (allShieldsGone && b.currentPhase === 1) {
                b.currentPhase = 2; // Aggressive core phase
              }
            } else if (b.state === 'DYING') {
              // Boss death sequence
              e.screenShake = 12;
              if (b.stateTimer % 12 === 0) {
                const rx = b.x + (Math.random() - 0.5) * b.width * 0.8;
                const ry = b.y + b.floatOffset + (Math.random() - 0.5) * b.height * 0.8;
                for (let k = 0; k < 15; k++) {
                  const angle = Math.random() * Math.PI * 2;
                  const spd = 2 + Math.random() * 5;
                  e.particles.push({
                    x: rx,
                    y: ry,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd,
                    color: ['#f97316', '#ef4444', '#fef08a', '#ffffff'][Math.floor(Math.random() * 4)],
                    size: 3 + Math.random() * 6,
                    life: 30 + Math.random() * 20,
                    maxLife: 50,
                  });
                }
              }

              if (b.stateTimer > 150) {
                // Boss completely destroyed!
                e.boss = null;
                setBossActive(false);
                e.stats.bossDefeated = true;
                e.stats.score += 10000;
                setScore(e.stats.score);
                audioEngine.playStageClearFanfare();

                // Stage Clear State!
                e.gameState = 'STAGE_CLEAR';
                setGameState('STAGE_CLEAR');
              }
            }

            // Sync boss HP to HUD
            if (e.boss) {
              setBossHpRatio(Math.max(0, e.boss.hp / e.boss.maxHp));
            }
          }

          // Update Bullets & Collision Detection
          for (let i = e.bullets.length - 1; i >= 0; i--) {
            const b = e.bullets[i];
            b.lifeTimer--;

            // Ground tracking missile
            if (b.groundTrack) {
              b.x += b.vx;
              b.y += b.vy;
              // Check collision with bottom terrain
              let hitTerrain = false;
              for (const seg of e.terrain) {
                if (b.x >= seg.x && b.x <= seg.x + seg.width) {
                  const groundY = CANVAS_HEIGHT - seg.bottomHeight;
                  if (b.y >= groundY) {
                    b.y = groundY - 4;
                    b.vy = 0;
                    b.vx = 6.0; // Crawl forward along the ground!
                    hitTerrain = true;
                    break;
                  }
                }
              }
              if (!hitTerrain && b.y > CANVAS_HEIGHT - 10) {
                b.y = CANVAS_HEIGHT - 10;
                b.vy = 0;
                b.vx = 6.0;
              }
            } else {
              b.x += b.vx;
              b.y += b.vy;
            }

            // Remove expired or out-of-screen bullets
            if (b.lifeTimer <= 0 || b.x < -30 || b.x > CANVAS_WIDTH + 50 || b.y < -30 || b.y > CANVAS_HEIGHT + 30) {
              e.bullets.splice(i, 1);
              continue;
            }

            // 1) Player bullets hitting enemies
            if (b.isPlayer) {
              let bulletConsumed = false;

              // Check vs Regular Enemies
              for (let j = e.enemies.length - 1; j >= 0; j--) {
                const en = e.enemies[j];
                const dx = Math.abs(b.x - en.x);
                const dy = Math.abs(b.y - en.y);
                if (dx < (b.width + en.width) / 2 && dy < (b.height + en.height) / 2) {
                  // Hit!
                  en.hp -= b.damage;
                  audioEngine.playSmallExplosion();

                  // Sparks
                  for (let s = 0; s < 4; s++) {
                    e.particles.push({
                      x: b.x,
                      y: b.y,
                      vx: (Math.random() - 0.5) * 3,
                      vy: (Math.random() - 0.5) * 3,
                      color: '#fbbf24',
                      size: 2,
                      life: 15,
                      maxLife: 15,
                    });
                  }

                  if (!b.isPiercing) {
                    bulletConsumed = true;
                  }

                  // Enemy death check
                  if (en.hp <= 0) {
                    audioEngine.playExplosion();
                    e.stats.score += en.score;
                    setScore(e.stats.score);
                    e.stats.enemiesKilled++;

                    // Squadron clear check (e.g. red interceptors in a row)
                    if (en.squadId && e.squadronsTracker[en.squadId]) {
                      e.squadronsTracker[en.squadId].killed++;
                      if (e.squadronsTracker[en.squadId].killed >= e.squadronsTracker[en.squadId].total) {
                        // Squadron clear reward capsule (80% chance)
                        if (Math.random() < 0.8) {
                          e.capsules.push({
                            id: Math.random().toString(),
                            x: en.x,
                            y: en.y,
                            vx: -0.8,
                            vy: 0,
                            type: 'POWER_CAPSULE',
                            width: 16,
                            height: 16,
                            animTimer: Math.random() * 20,
                          });
                        }
                      }
                    } else if (en.dropCapsule) {
                      e.capsules.push({
                        id: Math.random().toString(),
                        x: en.x,
                        y: en.y,
                        vx: -0.8,
                        vy: 0,
                        type: 'POWER_CAPSULE',
                        width: 16,
                        height: 16,
                        animTimer: Math.random() * 20,
                      });
                    }

                    // Enemy death explosion
                    for (let p = 0; p < 12; p++) {
                      const ang = Math.random() * Math.PI * 2;
                      const sp = 1 + Math.random() * 3.5;
                      e.particles.push({
                        x: en.x,
                        y: en.y,
                        vx: Math.cos(ang) * sp,
                        vy: Math.sin(ang) * sp,
                        color: ['#f97316', '#ef4444', '#fef08a'][Math.floor(Math.random() * 3)],
                        size: 3 + Math.random() * 3,
                        life: 25,
                        maxLife: 25,
                      });
                    }

                    e.enemies.splice(j, 1);
                  }

                  if (bulletConsumed) break;
                }
              }

              // Check vs Boss Dreadnought (Generous weak point hit detection & chip damage)
              if (!bulletConsumed && e.boss && e.boss.state === 'ACTIVE') {
                const boss = e.boss;
                const bossX = boss.x;
                const bossY = boss.y + boss.floatOffset;

                const relX = b.x - bossX;
                const relY = b.y - bossY;

                // Central Corridor: horizontal passage leading to the core (Y between -26 and +26)
                const inCentralCorridor = Math.abs(relY) <= 26 && relX >= -80 && relX <= 55;
                let hitShieldPlate = false;

                // 1) First check Shield Barrier Plates
                for (const plate of boss.shieldPlates) {
                  if (plate.destroyed) continue;
                  const px = bossX + plate.xOffset;
                  const py = bossY + plate.yOffset;
                  if (
                    Math.abs(b.x - px) < (b.width + plate.width) / 2 + 3 &&
                    Math.abs(b.y - py) < (b.height + plate.height) / 2 + 3
                  ) {
                    plate.hp -= b.damage;
                    audioEngine.playBossHit();
                    hitShieldPlate = true;
                    if (!b.isPiercing) bulletConsumed = true;

                    if (plate.hp <= 0) {
                      plate.destroyed = true;
                      audioEngine.playExplosion();
                      for (let k = 0; k < 12; k++) {
                        e.particles.push({
                          x: px,
                          y: py,
                          vx: (Math.random() - 0.5) * 5,
                          vy: (Math.random() - 0.5) * 5,
                          color: '#38bdf8',
                          size: 3,
                          life: 25,
                          maxLife: 25,
                        });
                      }
                    }
                    break;
                  }
                }

                // 2) Core Hit Check:
                // Piercing laser penetrates through shields, or any shot in corridor / near core
                const distToCore = Math.hypot(b.x - (bossX + 10), b.y - bossY);
                const isCoreHit =
                  (!hitShieldPlate || b.isPiercing) &&
                  (distToCore < 36 || (inCentralCorridor && relX >= -35));

                if (isCoreHit) {
                  // Direct CRITICAL hit on vulnerable core!
                  const damageDealt = b.damage;
                  boss.hp -= damageDealt;
                  audioEngine.playBossHit();
                  e.screenShake = 4;
                  if (!b.isPiercing) bulletConsumed = true;

                  // Core hit sparks
                  for (let s = 0; s < 7; s++) {
                    e.particles.push({
                      x: b.x,
                      y: b.y,
                      vx: (Math.random() - 0.5) * 5,
                      vy: (Math.random() - 0.5) * 5,
                      color: boss.hp < boss.maxHp * 0.3 ? '#ef4444' : '#38bdf8',
                      size: 3 + Math.random() * 2,
                      life: 22,
                      maxLife: 22,
                    });
                  }

                  // Floating feedback text
                  if (Math.random() < 0.45) {
                    e.floatingTexts.push({
                      id: Math.random().toString(),
                      x: bossX - 25,
                      y: bossY - 25,
                      text: 'CORE HIT!',
                      color: '#fde047',
                      life: 25,
                      maxLife: 25,
                    });
                  }

                  if (boss.hp <= 0) {
                    boss.state = 'DYING';
                    boss.stateTimer = 0;
                    audioEngine.playBossDefeat();
                  }
                }
                // 3) Hull armor hit (upper/lower wings):
                // Deal chip damage so all attacks contribute, rewarding direct core aim with critical damage
                else if (!bulletConsumed && Math.abs(relX) < boss.width / 2 && Math.abs(relY) < boss.height / 2) {
                  const chipDamage = Math.max(1, Math.floor(b.damage * 0.5));
                  boss.hp -= chipDamage;
                  audioEngine.playShieldHit();
                  bulletConsumed = true;

                  for (let s = 0; s < 3; s++) {
                    e.particles.push({
                      x: b.x,
                      y: b.y,
                      vx: (Math.random() - 0.5) * 3,
                      vy: (Math.random() - 0.5) * 3,
                      color: '#94a3b8',
                      size: 2,
                      life: 15,
                      maxLife: 15,
                    });
                  }

                  if (boss.hp <= 0) {
                    boss.state = 'DYING';
                    boss.stateTimer = 0;
                    audioEngine.playBossDefeat();
                  }
                }
              }

              if (bulletConsumed) {
                e.bullets.splice(i, 1);
              }
            }
            // 2) Enemy bullets hitting Player or Force Field Shield
            else if (!b.isPlayer && e.player.isAlive && e.player.invincibleTimer <= 0) {
              const dx = Math.abs(b.x - e.player.x);
              const dy = Math.abs(b.y - e.player.y);

              // Force Field Shield check (absorbs bullets in front of nose)
              if (e.player.shieldActive && e.player.shieldHp > 0) {
                const shieldX = e.player.x + 28;
                const distToShield = Math.hypot(b.x - shieldX, b.y - e.player.y);
                if (distToShield < 18) {
                  e.player.shieldHp--;
                  audioEngine.playShieldHit();
                  e.bullets.splice(i, 1);

                  // Shield impact spark
                  for (let s = 0; s < 4; s++) {
                    e.particles.push({
                      x: b.x,
                      y: b.y,
                      vx: (Math.random() - 0.5) * 3,
                      vy: (Math.random() - 0.5) * 3,
                      color: '#38bdf8',
                      size: 2,
                      life: 15,
                      maxLife: 15,
                    });
                  }

                  if (e.player.shieldHp <= 0) {
                    e.player.shieldActive = false;
                    const shSlot = e.powerSlots.find((s) => s.id === 'SHIELD');
                    if (shSlot) {
                      shSlot.active = false;
                      shSlot.currentLevel = 0;
                    }
                    setPowerSlots([...e.powerSlots]);
                  }
                  continue;
                }
              }

              // Direct hit on Player Hull (Takes damage with durability)
              if (dx < (b.width + e.player.width) / 2 - 4 && dy < (b.height + e.player.height) / 2 - 3) {
                e.bullets.splice(i, 1);
                damagePlayer(1);
              }
            }
          }

          // Check direct Player collision with enemies or Boss
          if (e.player.isAlive && e.player.invincibleTimer <= 0) {
            for (const en of e.enemies) {
              if (
                Math.abs(e.player.x - en.x) < (e.player.width + en.width) / 2 - 4 &&
                Math.abs(e.player.y - en.y) < (e.player.height + en.height) / 2 - 4
              ) {
                damagePlayer(1);
                break;
              }
            }

            if (e.boss && e.boss.state === 'ACTIVE') {
              const b = e.boss;
              if (
                Math.abs(e.player.x - b.x) < (e.player.width + b.width) / 2 - 8 &&
                Math.abs(e.player.y - (b.y + b.floatOffset)) < (e.player.height + b.height) / 2 - 8
              ) {
                damagePlayer(2);
              }
            }
          }

          // Update Capsules & Collection
          for (let i = e.capsules.length - 1; i >= 0; i--) {
            const cap = e.capsules[i];
            cap.x += cap.vx;
            cap.y += cap.vy;

            // Player pickup
            if (e.player.isAlive) {
              const dist = Math.hypot(e.player.x - cap.x, e.player.y - cap.y);
              if (dist < 24) {
                collectCapsule(cap);
                e.capsules.splice(i, 1);
                continue;
              }
            }

            // Remove offscreen
            if (cap.x < -30) {
              e.capsules.splice(i, 1);
            }
          }

          // Update Particles
          for (let i = e.particles.length - 1; i >= 0; i--) {
            const p = e.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
              e.particles.splice(i, 1);
            }
          }

          // Update Floating Texts
          for (let i = e.floatingTexts.length - 1; i >= 0; i--) {
            const ft = e.floatingTexts[i];
            ft.y -= 0.6;
            ft.life--;
            if (ft.life <= 0) {
              e.floatingTexts.splice(i, 1);
            }
          }

          // Update High Score
          if (e.stats.score > e.stats.highScore) {
            e.stats.highScore = e.stats.score;
            setHighScore(e.stats.score);
            try {
              localStorage.setItem('gradius_highscore', e.stats.score.toString());
            } catch {
              // ignore
            }
          }
        }

        // --- 2. RENDER CANVAS (Retro Arcade Aesthetics) ---
        ctx.save();

        // Apply Screen Shake
        if (e.screenShake > 0) {
          const shakeX = (Math.random() - 0.5) * e.screenShake;
          const shakeY = (Math.random() - 0.5) * e.screenShake;
          ctx.translate(shakeX, shakeY);
        }

        // Background Cosmos (Deep Void)
        ctx.fillStyle = '#030712';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Render Nebulae
        e.nebulae.forEach((neb) => {
          const grad = ctx.createRadialGradient(neb.x, neb.y, 10, neb.x, neb.y, neb.radius);
          grad.addColorStop(0, neb.color);
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(neb.x, neb.y, neb.radius, 0, Math.PI * 2);
          ctx.fill();
        });

        // Render Stars
        e.stars.forEach((star) => {
          ctx.fillStyle = star.color;
          const alpha = 0.5 + Math.sin(e.frame * 0.1 + star.twinklePhase) * 0.4;
          ctx.globalAlpha = alpha;
          ctx.fillRect(Math.floor(star.x), Math.floor(star.y), star.size, star.size);
        });
        ctx.globalAlpha = 1.0;

        // Render Cavern Terrain (Upper and Lower Asteroid Walls)
        if (e.terrain.length > 0) {
          const isTransitionActive = e.terrain.some((s) => s.collisionActive === false || s.isTransitioning);

          ctx.fillStyle = '#1e293b'; // Slate 800 rock base
          // During transition, display bright cyan energy border showing pass-through safety
          ctx.strokeStyle = isTransitionActive ? '#38bdf8' : '#475569';
          ctx.lineWidth = isTransitionActive ? 2.0 : 1.5;

          // Upper Cavern
          ctx.beginPath();
          ctx.moveTo(e.terrain[0].x, 0);
          e.terrain.forEach((seg) => {
            ctx.lineTo(seg.x, seg.topHeight);
            ctx.lineTo(seg.x + seg.width, seg.topHeight);
          });
          const lastSeg = e.terrain[e.terrain.length - 1];
          ctx.lineTo(lastSeg.x + lastSeg.width, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Lower Cavern
          ctx.beginPath();
          ctx.moveTo(e.terrain[0].x, CANVAS_HEIGHT);
          e.terrain.forEach((seg) => {
            ctx.lineTo(seg.x, CANVAS_HEIGHT - seg.bottomHeight);
            ctx.lineTo(seg.x + seg.width, CANVAS_HEIGHT - seg.bottomHeight);
          });
          ctx.lineTo(lastSeg.x + lastSeg.width, CANVAS_HEIGHT);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Transition Notice overlay
          if (isTransitionActive && e.stats.distance > 700 && e.stats.distance < e.stageDistanceToBoss - 250) {
            ctx.fillStyle = e.frame % 16 < 8 ? '#38bdf8' : '#7dd3fc';
            ctx.font = '7px "Press Start 2P", monospace';
            ctx.textAlign = 'center';
            ctx.fillText('⚡ SECTOR TRANSITION: PASS-THROUGH (地形当たり判定OFF) ⚡', CANVAS_WIDTH / 2, 24);
          }
        }

        // Render Power-Up Capsules
        e.capsules.forEach((cap) => {
          drawItemCapsule(ctx, cap, e.frame);
        });

        // Render Option Clones (分身)
        for (let i = 0; i < e.player.optionsCount; i++) {
          const delay = (i + 1) * 14;
          const historyIndex = e.trailHistory.length - 1 - delay;
          if (historyIndex >= 0 && e.trailHistory[historyIndex]) {
            const pt = e.trailHistory[historyIndex];
            drawOptionClone(ctx, pt.x, pt.y, e.frame, i);
          } else {
            drawOptionClone(ctx, e.player.x - (i + 1) * 22, e.player.y, e.frame, i);
          }
        }

        // Render Player Ship
        if (e.player.isAlive) {
          drawPlayerShip(ctx, e.player, e.frame);
        }

        // Render Enemies
        e.enemies.forEach((enemy) => {
          drawEnemy(ctx, enemy, e.frame);
        });

        // Render Boss ("SUPER BIG CORE")
        if (e.boss) {
          drawBoss(ctx, e.boss, e.frame);
        }

        // Render Bullets & Lasers
        e.bullets.forEach((bullet) => {
          drawBullet(ctx, bullet, e.frame);
        });

        // Render Particles
        e.particles.forEach((p) => {
          drawParticle(ctx, p);
        });

        // Render Floating Pop-up Text
        e.floatingTexts.forEach((ft) => {
          ctx.fillStyle = ft.color;
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText(ft.text, ft.x, ft.y);
        });

        // Warning Overlay Banner when Boss Approaching
        if (e.warningTimer > 0) {
          ctx.fillStyle = e.frame % 10 < 5 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(0, 0, 0, 0.2)';
          ctx.fillRect(0, CANVAS_HEIGHT / 2 - 32, CANVAS_WIDTH, 64);

          ctx.fillStyle = '#ef4444';
          ctx.fillRect(0, CANVAS_HEIGHT / 2 - 32, CANVAS_WIDTH, 3);
          ctx.fillRect(0, CANVAS_HEIGHT / 2 + 29, CANVAS_WIDTH, 3);

          ctx.fillStyle = '#ffffff';
          ctx.font = '12px "Press Start 2P", monospace';
          ctx.textAlign = 'center';
          ctx.fillText('WARNING!!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 6);

          ctx.fillStyle = '#fbbf24';
          ctx.font = '8px "Press Start 2P", monospace';
          ctx.fillText('A HUGE BATTLESHIP IS APPROACHING RAPIDLY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 16);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [initStarfield, updateTerrain, spawnBoss, firePlayerWeapons, killPlayer, collectCapsule, activatePowerUp]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      const k = ev.key.toLowerCase();

      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        ev.preventDefault();
      }

      if (k === 'arrowup' || k === 'w') e.keys.up = true;
      if (k === 'arrowdown' || k === 's') e.keys.down = true;
      if (k === 'arrowleft' || k === 'a') e.keys.left = true;
      if (k === 'arrowright' || k === 'd') e.keys.right = true;

      // Shoot: Space, Z, or J
      if (k === ' ' || k === 'z' || k === 'j') {
        e.keys.shoot = true;
      }

      // Missile / Subweapon: X or K
      if (k === 'x' || k === 'k') {
        e.keys.missile = true;
      }

      // Activate Power Meter: C, Enter, Shift, or L
      if (k === 'c' || k === 'enter' || k === 'shift' || k === 'l') {
        e.keys.powerUp = true;
        activatePowerUp();
      }

      // Direct Power-Up slot hotkeys 1-6
      if (['1', '2', '3', '4', '5', '6'].includes(k)) {
        const slotIdx = parseInt(k, 10);
        const slot = e.powerSlots[slotIdx - 1];
        if (slot) {
          activatePowerUp(slot.id);
        }
      }

      // Pause: P or Escape
      if (k === 'p' || k === 'escape') {
        if (e.gameState === 'PLAYING') {
          e.gameState = 'PAUSED';
          setGameState('PAUSED');
          audioEngine.stopBgm();
        } else if (e.gameState === 'PAUSED') {
          e.gameState = 'PLAYING';
          setGameState('PLAYING');
          if (e.boss) audioEngine.startBossBgm();
          else audioEngine.startStageBgm();
        }
      }
    };

    const handleKeyUp = (ev: KeyboardEvent) => {
      const e = engineRef.current;
      const k = ev.key.toLowerCase();

      if (k === 'arrowup' || k === 'w') e.keys.up = false;
      if (k === 'arrowdown' || k === 's') e.keys.down = false;
      if (k === 'arrowleft' || k === 'a') e.keys.left = false;
      if (k === 'arrowright' || k === 'd') e.keys.right = false;
      if (k === ' ' || k === 'z' || k === 'j') e.keys.shoot = false;
      if (k === 'x' || k === 'k') e.keys.missile = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [activatePowerUp]);

  // Next Stage / Continue handler
  const advanceToNextStage = useCallback(() => {
    const e = engineRef.current;
    e.stats.stage++;
    setStage(e.stats.stage);
    e.stats.distance = 0;
    e.stats.bossAppeared = false;
    e.stats.bossDefeated = false;
    e.boss = null;
    setBossActive(false);
    e.player.hp = e.player.maxHp;
    setPlayerHp(e.player.hp);
    e.terrain = [];
    e.bullets = [];
    e.enemies = [];
    e.capsules = [];
    e.gameState = 'PLAYING';
    setGameState('PLAYING');
    audioEngine.startStageBgm();
  }, []);

  return {
    canvasRef,
    gameState,
    score,
    highScore,
    lives,
    stage,
    playerHp,
    playerMaxHp,
    isTerrainTransitioning,
    powerMeterIndex,
    powerSlots,
    bossActive,
    bossHpRatio,
    isWarningActive,
    isMuted,
    crtEnabled,
    optionsCount,
    toggleMute,
    toggleCrt,
    startGame,
    advanceToNextStage,
    activatePowerUp,
    setKeys: (keys: Partial<typeof engineRef.current.keys>) => {
      Object.assign(engineRef.current.keys, keys);
    },
  };
}
