/**
 * Visual Effects — Screen shake, flash, storm overlay, rebirth particles
 */
import { Container, Graphics, Sprite, Assets, Texture } from 'pixi.js';
import { CANVAS_W, CANVAS_H } from './setup.js';

// ============================================================
// SCREEN SHAKE — Sinusoidal position offset on a sprite
// ============================================================
const shakeTargets = new Map(); // eid → { sprite, intensity, elapsed, duration }

export function startShake(eid, sprite, intensity = 4, duration = 0.3) {
  shakeTargets.set(eid, {
    sprite,
    intensity,
    elapsed: 0,
    duration,
    origX: sprite.x,
    origY: sprite.y,
  });
}

export function updateShakes(delta) {
  for (const [eid, shake] of shakeTargets) {
    shake.elapsed += delta;
    if (shake.elapsed >= shake.duration) {
      shake.sprite.x = shake.origX;
      shake.sprite.y = shake.origY;
      shakeTargets.delete(eid);
      continue;
    }
    const t = shake.elapsed / shake.duration;
    const decay = 1 - t;
    shake.sprite.x = shake.origX + Math.sin(shake.elapsed * 40) * shake.intensity * decay;
    shake.sprite.y = shake.origY + Math.cos(shake.elapsed * 35) * shake.intensity * decay * 0.5;
  }
}

// ============================================================
// FLASH OVERLAY — Brief white/red flash on heal
// ============================================================
let flashGraphics = null;
let flashAlpha = 0;
let flashDecayRate = 0;

export function initFlash(overlayLayer) {
  flashGraphics = new Graphics();
  flashGraphics.rect(0, 0, CANVAS_W, CANVAS_H);
  flashGraphics.fill({ color: 0xffffff });
  flashGraphics.alpha = 0;
  overlayLayer.addChild(flashGraphics);
}

export function triggerFlash(intensity = 0.3) {
  flashAlpha = intensity;
  flashDecayRate = intensity * 3; // fade out in ~0.33s
}

export function updateFlash(delta) {
  if (!flashGraphics) return;
  flashAlpha = Math.max(0, flashAlpha - flashDecayRate * delta);
  flashGraphics.alpha = flashAlpha;
}

// ============================================================
// STORM OVERLAY — Rain particles + dark vignette
// ============================================================
let stormContainer = null;
let rainDrops = [];
const NUM_RAIN_DROPS = 300;

export function initStorm(overlayLayer) {
  stormContainer = new Container();
  stormContainer.alpha = 0;
  overlayLayer.addChild(stormContainer);

  // Dark background
  const darkBg = new Graphics();
  darkBg.rect(0, 0, CANVAS_W, CANVAS_H);
  darkBg.fill({ color: 0x000000 });
  darkBg.alpha = 0.6;
  stormContainer.addChild(darkBg);

  // Rain drops
  for (let i = 0; i < NUM_RAIN_DROPS; i++) {
    const drop = new Graphics();
    drop.rect(0, 0, 1.5, 12 + Math.random() * 18);
    drop.fill({ color: 0x8899aa });
    drop.alpha = 0.3 + Math.random() * 0.5;
    drop.x = Math.random() * CANVAS_W;
    drop.y = Math.random() * CANVAS_H;
    drop.rotation = 0.1 + Math.random() * 0.1; // slight angle
    stormContainer.addChild(drop);
    rainDrops.push({
      gfx: drop,
      speed: 600 + Math.random() * 400,
      windSpeed: 50 + Math.random() * 80,
    });
  }
}

export function updateStorm(delta, stormProgress, isActive) {
  if (!stormContainer) return;

  // Fade in/out
  const targetAlpha = isActive ? Math.min(1, stormProgress / 2) : Math.max(0, stormContainer.alpha - delta);
  stormContainer.alpha += (targetAlpha - stormContainer.alpha) * delta * 2;

  if (stormContainer.alpha < 0.01) return;

  // Animate rain
  for (const drop of rainDrops) {
    drop.gfx.y += drop.speed * delta;
    drop.gfx.x += drop.windSpeed * delta;
    if (drop.gfx.y > CANVAS_H) {
      drop.gfx.y = -20;
      drop.gfx.x = Math.random() * CANVAS_W;
    }
    if (drop.gfx.x > CANVAS_W) {
      drop.gfx.x = -10;
    }
  }
}

// ============================================================
// REBIRTH PARTICLES — Soft petals and leaves drifting
// ============================================================
let rebirthContainer = null;
let petals = [];
const NUM_PETALS = 40;

export function initRebirth(overlayLayer) {
  rebirthContainer = new Container();
  rebirthContainer.alpha = 0;
  overlayLayer.addChild(rebirthContainer);

  for (let i = 0; i < NUM_PETALS; i++) {
    const petal = new Graphics();
    // Small elliptical petal shape
    const size = 3 + Math.random() * 5;
    petal.ellipse(0, 0, size, size * 0.6);
    // Soft pastel colors — pinks, whites, light greens
    const colors = [0xf5c6d0, 0xffeef2, 0xd4e5d0, 0xfff5e6, 0xe8d5e0];
    petal.fill({ color: colors[Math.floor(Math.random() * colors.length)] });
    petal.alpha = 0.4 + Math.random() * 0.4;
    petal.x = Math.random() * CANVAS_W;
    petal.y = -20 - Math.random() * CANVAS_H;
    rebirthContainer.addChild(petal);
    petals.push({
      gfx: petal,
      speedY: 20 + Math.random() * 40,
      speedX: -15 + Math.random() * 30,
      rotSpeed: (Math.random() - 0.5) * 2,
      swayAmp: 20 + Math.random() * 40,
      swayFreq: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    });
  }
}

export function updateRebirth(delta, rebirthProgress, isActive) {
  if (!rebirthContainer) return;

  const targetAlpha = isActive ? Math.min(1, rebirthProgress / 3) : 0;
  rebirthContainer.alpha += (targetAlpha - rebirthContainer.alpha) * delta;

  if (rebirthContainer.alpha < 0.01) return;

  for (const p of petals) {
    p.gfx.y += p.speedY * delta;
    p.gfx.x += p.speedX * delta + Math.sin(p.phase + rebirthProgress * p.swayFreq) * p.swayAmp * delta;
    p.gfx.rotation += p.rotSpeed * delta;

    if (p.gfx.y > CANVAS_H + 20) {
      p.gfx.y = -20;
      p.gfx.x = Math.random() * CANVAS_W;
    }
  }
}

// ============================================================
// WILD FLORA SPAWNER — Procedural rebirth vegetation
// ============================================================
let floraContainer = null;
let floraSprites = [];

export function initFloraContainer(entityLayer) {
  floraContainer = new Container();
  floraContainer.alpha = 0;
  entityLayer.addChild(floraContainer);
}

const REBIRTH_TEXTURES = [
  'wild_vines', 'moss_stone', 'wild_flowers',
  'bamboo_shoots', 'fern', 'mushrooms',
];

/**
 * Spawn wild flora at the given positions (ruined entity locations)
 * @param {Array<{x, y}>} positions
 */
export function spawnWildFlora(positions) {
  if (!floraContainer) return;

  for (const pos of positions) {
    // 2-4 flora sprites per position
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const texName = REBIRTH_TEXTURES[Math.floor(Math.random() * REBIRTH_TEXTURES.length)];
      const texture = Assets.get(texName);
      if (!texture) continue;

      const sprite = new Sprite(texture);
      sprite.anchor.set(0.5);
      sprite.x = pos.x + (Math.random() - 0.5) * 120;
      sprite.y = pos.y + (Math.random() - 0.5) * 80;
      sprite.scale.set(0.15 + Math.random() * 0.2);
      sprite.rotation = (Math.random() - 0.5) * 0.4;
      sprite.alpha = 0; // will fade in

      floraContainer.addChild(sprite);
      floraSprites.push({
        sprite,
        targetAlpha: 0.6 + Math.random() * 0.4,
        fadeDelay: Math.random() * 8, // stagger fade-in
        fadeStarted: false,
      });
    }
  }
}

/** Also spawn a bird flying across the sky */
export function spawnWildBird() {
  const texture = Assets.get('wild_bird');
  if (!texture || !floraContainer) return;

  const bird = new Sprite(texture);
  bird.anchor.set(0.5);
  bird.scale.set(0.12);
  bird.x = -100;
  bird.y = 80 + Math.random() * 120;
  bird.alpha = 0;
  floraContainer.addChild(bird);

  floraSprites.push({
    sprite: bird,
    targetAlpha: 0.8,
    fadeDelay: 5,
    fadeStarted: false,
    isBird: true,
    birdSpeed: 30 + Math.random() * 20,
    birdBob: 0,
  });
}

export function updateFlora(delta, rebirthProgress) {
  if (!floraContainer) return;

  // Fade in the container
  floraContainer.alpha = Math.min(1, floraContainer.alpha + delta * 0.3);

  for (const f of floraSprites) {
    if (rebirthProgress > f.fadeDelay) {
      if (!f.fadeStarted) f.fadeStarted = true;
      f.sprite.alpha = Math.min(f.targetAlpha, f.sprite.alpha + delta * 0.3);
    }

    // Bird movement
    if (f.isBird && f.fadeStarted) {
      f.sprite.x += f.birdSpeed * delta;
      f.birdBob += delta;
      f.sprite.y += Math.sin(f.birdBob * 1.5) * 0.5;

      // Loop bird
      if (f.sprite.x > CANVAS_W + 200) {
        f.sprite.x = -200;
        f.sprite.y = 60 + Math.random() * 140;
      }
    }
  }
}
