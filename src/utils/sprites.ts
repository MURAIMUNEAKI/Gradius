/**
 * Retro Pixel Art Sprite Drawing Utilities
 * Draws pixel-perfect arcade graphics using Canvas 2D
 */

import { Player, Bullet, Enemy, Boss, ItemCapsule, Particle } from '../types/game';

// Draw Player Vic-Viper style space fighter
export function drawPlayerShip(
  ctx: CanvasRenderingContext2D,
  player: Player,
  frame: number
) {
  ctx.save();
  ctx.translate(Math.floor(player.x), Math.floor(player.y));

  // Banking tilt when moving vertically
  const tilt = player.rollAngle * 0.12;
  ctx.rotate(tilt);

  // If in invincible / respawn blinking state
  if (player.invincibleTimer > 0 && Math.floor(frame / 4) % 2 === 0) {
    ctx.restore();
    return;
  }

  // Damage flash when taking a hit
  const isDamageFlash = player.damageFlashTimer > 0 && Math.floor(frame / 2) % 2 === 0;

  // Animated engine thruster flame
  const flameLength = 8 + (player.speedLevel * 2) + Math.sin(frame * 0.5) * 4;
  ctx.fillStyle = frame % 4 < 2 ? '#f97316' : '#38bdf8';
  ctx.beginPath();
  ctx.moveTo(-16, -3);
  ctx.lineTo(-16 - flameLength, 0);
  ctx.lineTo(-16, 3);
  ctx.closePath();
  ctx.fill();

  // Ship Main Hull (Classic Vic Viper shape: White, Blue, Red accents)
  // Rear hull
  ctx.fillStyle = isDamageFlash ? '#f87171' : '#94a3b8'; // Slate 400 or Flash Red
  ctx.fillRect(-16, -6, 8, 12);

  // Main body
  ctx.fillStyle = isDamageFlash ? '#ef4444' : '#f8fafc'; // Pure off-white or Red flash
  ctx.beginPath();
  ctx.moveTo(-8, -7);
  ctx.lineTo(16, -2);
  ctx.lineTo(24, 0);
  ctx.lineTo(16, 2);
  ctx.lineTo(-8, 7);
  ctx.closePath();
  ctx.fill();

  // Split front prongs (Iconic needle nose)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(8, -4, 14, 2);
  ctx.fillRect(8, 2, 14, 2);

  // Cockpit canopy (Cyan/Blue glass)
  ctx.fillStyle = '#06b6d4'; // Cyan 500
  ctx.fillRect(0, -2, 8, 4);
  ctx.fillStyle = '#cffafe'; // White highlight
  ctx.fillRect(2, -2, 4, 1);

  // Red wing tips / stripes
  ctx.fillStyle = '#ef4444'; // Red 500
  ctx.fillRect(-10, -11, 8, 4);
  ctx.fillRect(-10, 7, 8, 4);
  ctx.fillRect(-4, -13, 3, 2);
  ctx.fillRect(-4, 11, 3, 2);

  // Upper/lower small vertical fins
  ctx.fillStyle = '#3b82f6'; // Blue
  ctx.fillRect(-12, -10, 4, 2);
  ctx.fillRect(-12, 8, 4, 2);

  // Force Field Shield (if active)
  if (player.shieldActive && player.shieldHp > 0) {
    const shieldPulse = Math.sin(frame * 0.2) * 2;
    const shieldColor =
      player.shieldHp > 6 ? 'rgba(56, 189, 248, 0.75)' :
      player.shieldHp > 3 ? 'rgba(250, 204, 21, 0.75)' :
      'rgba(239, 68, 68, 0.85)';

    // Nose dual shields
    [-6, 6].forEach((yOff) => {
      ctx.beginPath();
      ctx.arc(28, yOff, 8 + shieldPulse, 0, Math.PI * 2);
      ctx.fillStyle = shieldColor;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Energy core dot
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(27, yOff - 1, 3, 3);
    });
  }

  ctx.restore();
}

// Draw Option (分身 - Shadow Clones)
export function drawOptionClone(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  frame: number,
  index: number
) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));

  // Gradius Options are glowing fiery orange-red energy orbs with pulsing rings
  const pulse = Math.sin((frame + index * 10) * 0.2) * 2;
  const radius = 7 + pulse;

  // Outer glow aura
  const gradient = ctx.createRadialGradient(0, 0, 2, 0, 0, radius + 5);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(0.3, '#f97316'); // Orange
  gradient.addColorStop(0.7, '#dc2626'); // Red
  gradient.addColorStop(1, 'rgba(220, 38, 38, 0)');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius + 5, 0, Math.PI * 2);
  ctx.fill();

  // Solid core orb
  ctx.fillStyle = '#fbbf24'; // Amber
  ctx.beginPath();
  ctx.arc(0, 0, radius - 1, 0, Math.PI * 2);
  ctx.fill();

  // Inner hot white core
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Orbiting energy spark
  const orbitAngle = (frame * 0.15 + (index * Math.PI) / 2);
  const orbX = Math.cos(orbitAngle) * (radius + 2);
  const orbY = Math.sin(orbitAngle) * (radius + 2);
  ctx.fillStyle = '#fde047';
  ctx.fillRect(orbX - 1, orbY - 1, 3, 3);

  ctx.restore();
}

// Draw Power-up Capsule
export function drawItemCapsule(
  ctx: CanvasRenderingContext2D,
  capsule: ItemCapsule,
  frame: number
) {
  ctx.save();
  ctx.translate(Math.floor(capsule.x), Math.floor(capsule.y));

  // Bobbing float animation
  const bob = Math.sin((frame + capsule.animTimer) * 0.15) * 2;
  ctx.translate(0, bob);

  // Rotating color cycle
  const colors = ['#f97316', '#ef4444', '#fbbf24', '#ffffff', '#e11d48'];
  const colorIndex = Math.floor((frame + capsule.animTimer * 2) / 6) % colors.length;
  const activeColor = colors[colorIndex];

  // Outer capsule shape (Octagon / Lozenge)
  ctx.fillStyle = activeColor;
  ctx.beginPath();
  ctx.moveTo(-8, -4);
  ctx.lineTo(-4, -8);
  ctx.lineTo(4, -8);
  ctx.lineTo(8, -4);
  ctx.lineTo(8, 4);
  ctx.lineTo(4, 8);
  ctx.lineTo(-4, 8);
  ctx.lineTo(-8, 4);
  ctx.closePath();
  ctx.fill();

  // Inner border
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Inner power symbol (P or glowing diamond)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-2, -3, 5, 2);
  ctx.fillRect(-2, -3, 2, 7);
  ctx.fillRect(-2, 0, 4, 2);

  // Subtle sparkle glow around capsule
  if (frame % 4 < 2) {
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(-10, -2, 2, 2);
    ctx.fillRect(8, 1, 2, 2);
    ctx.fillRect(-1, -10, 2, 2);
    ctx.fillRect(2, 9, 2, 2);
  }

  ctx.restore();
}

// Draw Bullets & Lasers
export function drawBullet(
  ctx: CanvasRenderingContext2D,
  bullet: Bullet,
  frame: number
) {
  ctx.save();
  ctx.translate(Math.floor(bullet.x), Math.floor(bullet.y));

  switch (bullet.type) {
    case 'PLAYER_VULCAN': {
      // Crisp twin yellow pellets
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bullet.width / 2 + 3, -bullet.height / 2 + 1, bullet.width - 6, bullet.height - 2);
      break;
    }
    case 'PLAYER_DOUBLE_UP': {
      // Angled pellet
      ctx.rotate(-Math.PI / 4);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bullet.width / 2 + 2, -bullet.height / 2 + 1, bullet.width - 4, bullet.height - 2);
      break;
    }
    case 'PLAYER_LASER': {
      // Iconic long cyan/blue piercing laser beam
      const length = bullet.width;
      const height = bullet.height;

      // Outer cyan aura
      ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.fillRect(-length / 2 - 4, -height / 2 - 2, length + 8, height + 4);

      // Core blue beam
      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(-length / 2, -height / 2, length, height);

      // Pure white hot center
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-length / 2 + 6, -1, length - 12, 2);
      break;
    }
    case 'PLAYER_MISSILE': {
      // Ground-hugging missile with rear exhaust spark
      ctx.fillStyle = '#ef4444'; // Red nose
      ctx.fillRect(0, -3, 6, 6);
      ctx.fillStyle = '#ffffff'; // White body
      ctx.fillRect(-8, -3, 8, 6);
      ctx.fillStyle = '#94a3b8'; // Tail fin
      ctx.fillRect(-10, -5, 3, 10);

      // Missile flame
      ctx.fillStyle = '#f97316';
      ctx.fillRect(-13, -1, 3, 3);
      break;
    }
    case 'ENEMY_BULLET':
    case 'ENEMY_AIMED': {
      // Glowing orange/red plasma pellet
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(0, 0, bullet.width / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, bullet.width / 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ENEMY_RING': {
      // Moai ion ring laser
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(0, 0, bullet.width / 2, bullet.height / 2, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(0, 0, bullet.width / 2.5, bullet.height / 2.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'ENEMY_LASER': {
      // Red enemy laser bolt
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-bullet.width / 2, -bullet.height / 2, bullet.width, bullet.height);
      ctx.fillStyle = '#fca5a5';
      ctx.fillRect(-bullet.width / 2 + 2, -1, bullet.width - 4, 2);
      break;
    }
    case 'BOSS_CORE_BEAM': {
      // Huge devastating Boss laser beam
      const bHeight = bullet.height;
      const bWidth = bullet.width;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.35)';
      ctx.fillRect(-bWidth / 2, -bHeight / 2 - 3, bWidth, bHeight + 6);

      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-bWidth / 2, -bHeight / 2, bWidth, bHeight);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-bWidth / 2, -2, bWidth, 4);
      break;
    }
    case 'BOSS_ORB': {
      // Pulsating boss plasma orb
      ctx.fillStyle = '#a855f7';
      ctx.beginPath();
      ctx.arc(0, 0, bullet.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fdf4ff';
      ctx.beginPath();
      ctx.arc(0, 0, bullet.width / 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  ctx.restore();
}

// Draw Enemies
export function drawEnemy(
  ctx: CanvasRenderingContext2D,
  enemy: Enemy,
  frame: number
) {
  ctx.save();
  ctx.translate(Math.floor(enemy.x), Math.floor(enemy.y));

  switch (enemy.type) {
    case 'RED_INTERCEPTOR': {
      // Red chevron squadron fighter
      ctx.fillStyle = '#dc2626'; // Deep Red
      ctx.beginPath();
      ctx.moveTo(12, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();

      // Wing highlight
      ctx.fillStyle = '#f87171';
      ctx.fillRect(-4, -6, 6, 2);
      ctx.fillRect(-4, 4, 6, 2);

      // Yellow cockpit
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(2, -2, 4, 4);

      // Thruster
      ctx.fillStyle = frame % 2 === 0 ? '#38bdf8' : '#fb923c';
      ctx.fillRect(-9, -2, 4, 4);
      break;
    }
    case 'BLUE_RUSHER': {
      // Speeding interceptor
      ctx.fillStyle = '#2563eb'; // Blue
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(-10, -7);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-10, 7);
      ctx.closePath();
      ctx.fill();

      // Cyan cockpit
      ctx.fillStyle = '#22d3ee';
      ctx.fillRect(1, -2, 5, 4);
      break;
    }
    case 'DUCKER': {
      // Two-legged walker droid along ceiling/floor
      const isCeiling = enemy.isCeiling;
      if (isCeiling) ctx.scale(1, -1);

      // Body dome
      ctx.fillStyle = '#ea580c'; // Orange-red
      ctx.beginPath();
      ctx.arc(0, -2, 9, Math.PI, 0);
      ctx.fill();

      // Eye sensor
      ctx.fillStyle = '#22c55e'; // Green optic
      ctx.fillRect(-2, -6, 5, 3);

      // Moving legs
      const legStep = Math.sin(frame * 0.4) * 4;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2.5;

      // Left leg
      ctx.beginPath();
      ctx.moveTo(-5, 0);
      ctx.lineTo(-6 + legStep, 8);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(5, 0);
      ctx.lineTo(6 - legStep, 8);
      ctx.stroke();
      break;
    }
    case 'MOAI': {
      // Iconic Moai head (facing left towards player)
      const mouthOpen = (enemy.mouthOpenTimer || 0) > 0;

      // Stone head base
      ctx.fillStyle = '#64748b'; // Slate gray
      ctx.beginPath();
      ctx.moveTo(12, -18);
      ctx.lineTo(-8, -18); // Forehead
      ctx.lineTo(-14, -6); // Brow
      ctx.lineTo(-8, -2);  // Bridge
      ctx.lineTo(-16, 2);  // Nose tip
      ctx.lineTo(-10, 6);  // Under nose

      if (mouthOpen) {
        // Mouth open wide!
        ctx.lineTo(-4, 6);
        ctx.lineTo(-4, 14);
        ctx.lineTo(-12, 14); // Lower jaw
        ctx.lineTo(-8, 20);  // Chin
      } else {
        ctx.lineTo(-12, 10); // Closed lip
        ctx.lineTo(-8, 16);  // Chin
      }

      ctx.lineTo(12, 18);   // Back of head
      ctx.closePath();
      ctx.fill();

      // Eyebrow and eye shadow
      ctx.fillStyle = '#334155';
      ctx.fillRect(-12, -10, 10, 4);

      // Glowing red eye when active!
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(-9, -8, 4, 3);

      // Mouth cavity glow when firing
      if (mouthOpen) {
        ctx.fillStyle = '#38bdf8'; // Glowing blue throat
        ctx.fillRect(-5, 7, 6, 6);
      }
      break;
    }
    case 'TURRET': {
      // Fixed ground/ceiling gun turret
      const isCeiling = enemy.isCeiling;
      if (isCeiling) ctx.scale(1, -1);

      // Base mount
      ctx.fillStyle = '#334155';
      ctx.fillRect(-12, 4, 24, 6);

      // Rotating dome
      ctx.fillStyle = '#64748b';
      ctx.beginPath();
      ctx.arc(0, 4, 10, Math.PI, 0);
      ctx.fill();

      // Gun barrel aiming left toward player
      ctx.fillStyle = '#94a3b8';
      ctx.save();
      ctx.translate(0, 0);
      ctx.rotate(0.2); // slight downward angle
      ctx.fillRect(-16, -2, 12, 4);
      ctx.restore();

      // Sensor light
      ctx.fillStyle = frame % 10 < 5 ? '#ef4444' : '#fbbf24';
      ctx.fillRect(-2, -1, 4, 4);
      break;
    }
    case 'ASTEROID': {
      // Craggy space rock
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.moveTo(-12, -8);
      ctx.lineTo(-4, -14);
      ctx.lineTo(8, -10);
      ctx.lineTo(14, -2);
      ctx.lineTo(10, 10);
      ctx.lineTo(-2, 14);
      ctx.lineTo(-14, 6);
      ctx.closePath();
      ctx.fill();

      // Craters
      ctx.fillStyle = '#334155';
      ctx.beginPath();
      ctx.arc(-2, -2, 4, 0, Math.PI * 2);
      ctx.arc(5, 5, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'HATCH': {
      // Techno hangar hatch
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-16, -14, 32, 28);
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(-16, -14, 32, 28);

      // Hatch doors
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(-10, -8, 20, 16);

      // Blinking red warning lights
      ctx.fillStyle = frame % 8 < 4 ? '#ef4444' : '#7f1d1d';
      ctx.fillRect(-14, -12, 4, 4);
      ctx.fillRect(10, -12, 4, 4);
      ctx.fillRect(-14, 8, 4, 4);
      ctx.fillRect(10, 8, 4, 4);
      break;
    }
  }

  // Draw HP bar for tough enemies
  if (enemy.maxHp > 1 && enemy.hp < enemy.maxHp) {
    const hpWidth = 24;
    const hpPct = Math.max(0, enemy.hp / enemy.maxHp);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-hpWidth / 2, -enemy.height / 2 - 8, hpWidth, 3);
    ctx.fillStyle = '#22c55e';
    ctx.fillRect(-hpWidth / 2, -enemy.height / 2 - 8, hpWidth * hpPct, 3);
  }

  ctx.restore();
}

// Draw The Giant Boss ("SUPER BIG CORE")
export function drawBoss(
  ctx: CanvasRenderingContext2D,
  boss: Boss,
  frame: number
) {
  ctx.save();
  ctx.translate(Math.floor(boss.x), Math.floor(boss.y + boss.floatOffset));

  const dying = boss.state === 'DYING';
  if (dying && frame % 4 < 2) {
    // Flashing white damage
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-boss.width / 2, -boss.height / 2, boss.width, boss.height);
    ctx.restore();
    return;
  }

  // --- BIG CORE DREADNOUGHT HULL ---
  // Outer armor plates: Dark Navy & Gunmetal Gray
  // Massive Upper Arm / Wing
  ctx.fillStyle = '#1e293b'; // Slate 800
  ctx.beginPath();
  ctx.moveTo(80, -25);
  ctx.lineTo(40, -65);
  ctx.lineTo(-45, -65);
  ctx.lineTo(-65, -35);
  ctx.lineTo(-10, -20);
  ctx.closePath();
  ctx.fill();

  // Massive Lower Arm / Wing
  ctx.beginPath();
  ctx.moveTo(80, 25);
  ctx.lineTo(40, 65);
  ctx.lineTo(-45, 65);
  ctx.lineTo(-65, 35);
  ctx.lineTo(-10, 20);
  ctx.closePath();
  ctx.fill();

  // Armor highlights / plating seams
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Arm front cannons (4 huge forward laser barrels)
  const barrelYPositions = [-50, -32, 32, 50];
  barrelYPositions.forEach((yPos) => {
    // Gun housing
    ctx.fillStyle = '#334155';
    ctx.fillRect(-75, yPos - 5, 20, 10);
    // Barrel
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-92, yPos - 3, 18, 6);
    // Muzzle glow if charging beam
    if (boss.beamChargeTimer > 0) {
      ctx.fillStyle = frame % 2 === 0 ? '#38bdf8' : '#ffffff';
      ctx.fillRect(-96, yPos - 5, 5, 10);
    }
  });

  // Rear Heavy Engine Thrusters
  const thrusterFlame = 15 + Math.sin(frame * 0.4) * 8;
  [-45, 45].forEach((yPos) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(75, yPos - 12, 12, 24);
    // Thruster flame
    ctx.fillStyle = frame % 4 < 2 ? '#38bdf8' : '#0284c7';
    ctx.beginPath();
    ctx.moveTo(87, yPos - 8);
    ctx.lineTo(87 + thrusterFlame, yPos);
    ctx.lineTo(87, yPos + 8);
    ctx.closePath();
    ctx.fill();
  });

  // Central Hull Structure & Corridor
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(-20, -22, 90, 44);

  // --- CENTRAL VULNERABLE CORE ---
  // The core changes color as Boss HP diminishes!
  const hpPct = Math.max(0, boss.hp / boss.maxHp);
  let coreColor = '#38bdf8'; // Blue (Healthy)
  let coreGlow = 'rgba(56, 189, 248, 0.4)';
  if (hpPct < 0.3) {
    // Critical: Flashing red!
    coreColor = frame % 6 < 3 ? '#ef4444' : '#fca5a5';
    coreGlow = 'rgba(239, 68, 68, 0.7)';
  } else if (hpPct < 0.65) {
    // Moderate: Yellow
    coreColor = '#fbbf24';
    coreGlow = 'rgba(251, 191, 36, 0.5)';
  }

  // Core chamber (x ~ 15, y = 0)
  const coreX = 15;
  const coreY = 0;
  const coreRadius = 14 + Math.sin(frame * 0.25) * 2;

  // Radial energy glow
  const coreGradient = ctx.createRadialGradient(coreX, coreY, 3, coreX, coreY, coreRadius + 8);
  coreGradient.addColorStop(0, '#ffffff');
  coreGradient.addColorStop(0.4, coreColor);
  coreGradient.addColorStop(1, coreGlow);

  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRadius + 8, 0, Math.PI * 2);
  ctx.fill();

  // Solid Core Sphere
  ctx.fillStyle = coreColor;
  ctx.beginPath();
  ctx.arc(coreX, coreY, coreRadius, 0, Math.PI * 2);
  ctx.fill();

  // Pure white center highlight
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(coreX - 2, coreY - 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // Targeting reticle & weak-point indicator
  const reticlePulse = 20 + Math.sin(frame * 0.2) * 3;
  ctx.strokeStyle = frame % 6 < 3 ? '#ef4444' : '#fde047';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(coreX, coreY, reticlePulse, 0, Math.PI * 2);
  ctx.stroke();

  // Crosshair ticks
  ctx.beginPath();
  ctx.moveTo(coreX - reticlePulse - 4, coreY);
  ctx.lineTo(coreX - reticlePulse + 2, coreY);
  ctx.moveTo(coreX + reticlePulse - 2, coreY);
  ctx.lineTo(coreX + reticlePulse + 4, coreY);
  ctx.moveTo(coreX, coreY - reticlePulse - 4);
  ctx.lineTo(coreX, coreY - reticlePulse + 2);
  ctx.moveTo(coreX, coreY + reticlePulse - 2);
  ctx.lineTo(coreX, coreY + reticlePulse + 4);
  ctx.stroke();

  // Weak Point Guide label
  if (frame % 8 < 6) {
    ctx.fillStyle = '#fde047';
    ctx.font = '6px "Press Start 2P", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('◄ WEAK POINT', -22, 2);
  }

  // --- ROTATING / SLIDING BARRIER SHIELD PLATES ---
  // These blue force shields protect the core from incoming leftward shots
  boss.shieldPlates.forEach((plate) => {
    if (plate.destroyed) return;

    const plateX = plate.xOffset;
    const plateY = plate.yOffset;

    // Glowing blue protective barrier blocks
    const shieldPct = Math.max(0, plate.hp / plate.maxHp);
    ctx.fillStyle = shieldPct > 0.4 ? '#0284c7' : '#ea580c';
    ctx.fillRect(plateX - plate.width / 2, plateY - plate.height / 2, plate.width, plate.height);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(plateX - plate.width / 2, plateY - plate.height / 2, plate.width, plate.height);

    // Energy grid lines inside barrier plate
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(plateX - 2, plateY - plate.height / 2 + 2, 4, plate.height - 4);
  });

  ctx.restore();
}

// Draw Particles (Sparks, debris, explosions, smoke)
export function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle
) {
  const alpha = Math.max(0, p.life / p.maxLife);
  ctx.save();
  ctx.globalAlpha = alpha;

  if (p.shape === 'CIRCLE') {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
    ctx.fill();
  } else if (p.shape === 'RING') {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, (p.maxLife - p.life) * 2, 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }

  ctx.restore();
}
