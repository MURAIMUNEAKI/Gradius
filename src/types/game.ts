export type WeaponType = 'NORMAL' | 'DOUBLE' | 'LASER';

export type PowerUpSlotType = 'SPEED' | 'MISSILE' | 'DOUBLE' | 'LASER' | 'OPTION' | 'SHIELD';

export interface PowerUpSlot {
  id: PowerUpSlotType;
  label: string;
  jpLabel: string;
  costSteps: number; // position on meter 1 to 6
  currentLevel: number;
  maxLevel: number;
  active: boolean;
}

export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  speedLevel: number; // 0 to 4
  weapon: WeaponType;
  missileLevel: number; // 0 or 1
  optionsCount: number; // 0 to 4
  shieldHp: number; // 0 to 10
  maxShieldHp: number;
  shieldActive: boolean;
  hp: number; // Current hull integrity (can take multiple hits)
  maxHp: number; // Maximum hull integrity (e.g. 4 HP)
  damageFlashTimer: number; // Red hit flash
  lives: number;
  invincibleTimer: number; // frames of invulnerability
  isAlive: boolean;
  respawnTimer: number;
  shootCooldown: number;
  missileCooldown: number;
  rollAngle: number; // for banking animation (-1 up, 0 neutral, 1 down)
}

export interface OptionClone {
  x: number;
  y: number;
  trailDelayIndex: number;
  pulseTimer: number;
}

export interface TrailPoint {
  x: number;
  y: number;
  rollAngle: number;
}

export type BulletType =
  | 'PLAYER_VULCAN'
  | 'PLAYER_DOUBLE_UP'
  | 'PLAYER_LASER'
  | 'PLAYER_MISSILE'
  | 'ENEMY_BULLET'
  | 'ENEMY_AIMED'
  | 'ENEMY_RING'
  | 'ENEMY_LASER'
  | 'BOSS_CORE_BEAM'
  | 'BOSS_ORB';

export interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: BulletType;
  width: number;
  height: number;
  damage: number;
  isPiercing?: boolean;
  isPlayer: boolean;
  lifeTimer: number;
  color?: string;
  groundTrack?: boolean; // For missiles crawling along terrain
}

export type EnemyType =
  | 'RED_INTERCEPTOR' // Flies in sine waves, drops power capsule if whole squad killed
  | 'BLUE_RUSHER'      // Fast darting attack craft
  | 'DUCKER'           // Walker droid on cavern ceiling/floor
  | 'MOAI'             // Moai head emitting ring lasers
  | 'TURRET'           // Aimed gun battery mounted on rocks
  | 'ASTEROID'         // Floating space rock
  | 'HATCH';           // Space fortress hangar spawner

export interface Enemy {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: EnemyType;
  hp: number;
  maxHp: number;
  width: number;
  height: number;
  score: number;
  shootTimer: number;
  shootInterval: number;
  dropCapsule: boolean;
  squadId?: string;
  isSquadLeader?: boolean;
  age: number;
  baseY?: number;
  phase?: number;
  groundY?: number;
  isCeiling?: boolean;
  mouthOpenTimer?: number;
}

export interface BossShieldPlate {
  id: number;
  yOffset: number; // Offset from boss center
  xOffset: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  destroyed: boolean;
}

export type BossState = 'WARPING_IN' | 'ENTERING' | 'ACTIVE' | 'DYING' | 'DESTROYED';

export interface Boss {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  state: BossState;
  stateTimer: number;
  attackPatternTimer: number;
  currentPhase: number;
  shieldPlates: BossShieldPlate[];
  beamChargeTimer: number;
  beamFiring: boolean;
  coreGlowPhase: number;
  floatOffset: number;
}

export type ItemType = 'POWER_CAPSULE' | 'BONUS_ORB';

export interface ItemCapsule {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ItemType;
  width: number;
  height: number;
  animTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  shape?: 'RECT' | 'CIRCLE' | 'RING';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

export interface TerrainSegment {
  x: number;
  width: number;
  topHeight: number;
  bottomHeight: number;
  hasTurretTop?: boolean;
  hasTurretBottom?: boolean;
  isTransitioning?: boolean;
  collisionActive?: boolean;
}

export interface Star {
  x: number;
  y: number;
  speed: number;
  size: number;
  color: string;
  twinklePhase: number;
}

export interface Nebula {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
}

export type GameState = 'TITLE' | 'PLAYING' | 'PAUSED' | 'STAGE_CLEAR' | 'GAME_OVER';

export interface GameStats {
  score: number;
  highScore: number;
  stage: number;
  distance: number;
  bossAppeared: boolean;
  bossDefeated: boolean;
  enemiesKilled: number;
  powerMeterIndex: number; // 0 = none selected, 1 to 6
  rankDifficulty: number;  // scales with distance and kills
}
