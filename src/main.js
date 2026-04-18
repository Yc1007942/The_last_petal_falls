/**
 * The Last Petal Falls — Main Entry Point
 * 最後一瓣落下
 *
 * An interactive artefact exploring the tension between
 * preservation and decay in a traditional Chinese scholar's garden.
 */
import { Sprite, Assets, Container, Text, Graphics } from 'pixi.js';
import { initRenderer, loadAssets, CANVAS_W, CANVAS_H } from './rendering/setup.js';
import { DesaturationFilter, GlitchFilter, VignetteFilter } from './rendering/shaders.js';
import {
  initFlash, triggerFlash, updateFlash,
  initStorm, updateStorm,
  initRebirth, updateRebirth,
  initFloraContainer, spawnWildFlora, spawnWildBird, updateFlora,
  startShake, updateShakes,
} from './rendering/effects.js';
import { createGameWorld, populateGarden } from './ecs/world.js';
import {
  Health, Position, SpriteRef, Interactable,
  EntityState, DecayMultiplier,
  ENTITY_STATE, ENTITY_TYPE, TOOL_TYPE,
} from './ecs/components.js';
import {
  decaySystem, interactionSystem,
  effortTrackingSystem, gameStateSystem,
} from './ecs/systems.js';
import { initInput } from './interaction/input.js';
import { Toolbar } from './ui/toolbar.js';
import { audioManager } from './audio/manager.js';

// ============================================================
// BOOT
// ============================================================

const loadingBar = document.getElementById('loading-bar-inner');
const loadingText = document.getElementById('loading-text');
const loadingScreen = document.getElementById('loading-screen');

async function boot() {
  // Initialize renderer
  loadingText.textContent = 'Preparing canvas…';
  const { app, layers } = await initRenderer();

  // Load assets
  loadingText.textContent = 'Loading assets…';
  await loadAssets((progress) => {
    loadingBar.style.width = `${progress * 100}%`;
    loadingText.textContent = `Loading… ${Math.round(progress * 100)}%`;
  });

  // Initialize audio
  loadingText.textContent = 'Initializing audio…';
  audioManager.init();

  // Create game world
  loadingText.textContent = 'Creating garden…';
  const world = createGameWorld();
  populateGarden(world);

  // Setup input
  initInput(app, world);
  world._audioUnlockNeeded = true;
  world._audioUnlock = () => audioManager.unlock();

  // Build the scene
  const scene = buildScene(layers, world);

  // Initialize effects
  initFlash(layers.overlay);
  initStorm(layers.overlay);
  initRebirth(layers.overlay);
  initFloraContainer(layers.entities);

  // Create toolbar
  const toolbar = new Toolbar(layers.ui, world);

  // Add instructional text
  const instructionText = createInstructionText(layers.ui);

  // Fade out loading screen
  loadingBar.style.width = '100%';
  loadingText.textContent = 'Enter the garden…';
  await new Promise(r => setTimeout(r, 600));
  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
  }, 1600);

  // ============================================================
  // GAME LOOP
  // ============================================================
  let lastGameState = -1;
  let stormTriggered = false;
  let rebirthSpawned = false;
  let lastGlitchTime = 0;
  let fishAnimTimer = 0;
  let windChimeTimer = 0;

  app.ticker.add((ticker) => {
    const delta = ticker.deltaMS / 1000; // actual seconds elapsed since last frame
    world.time.delta = delta;
    world.time.elapsed += delta;

    // Run ECS systems
    decaySystem(world);
    interactionSystem(world);
    effortTrackingSystem(world);
    gameStateSystem(world);

    // === GAME STATE TRANSITIONS ===
    if (world.gameState !== lastGameState) {
      onStateChange(world.gameState, lastGameState, world);
      lastGameState = world.gameState;
    }

    // === SPRITE VISUAL UPDATES ===
    updateEntityVisuals(world, scene, delta);

    // === FISH ANIMATION ===
    fishAnimTimer += delta;
    if (fishAnimTimer > 0.5) {
      fishAnimTimer = 0;
      toggleFishFrame(world, scene);
    }

    // === HEALING EFFECTS ===
    if (world._healingActive >= 0) {
      const eid = world._healingActive;
      const spriteIdx = SpriteRef.index[eid];
      const sprite = world.sprites[spriteIdx];

      // Glitch shader
      if (scene.glitchFilters[spriteIdx]) {
        scene.glitchFilters[spriteIdx].intensity = 1.0;
        scene.glitchFilters[spriteIdx].time = world.time.elapsed;
      }

      // Screen shake on the sprite
      startShake(eid, sprite, 3 + world.gameState * 2, 0.1);

      // Glitch SFX — throttle to avoid stacking
      if (world.time.elapsed - lastGlitchTime > 0.12) {
        audioManager.playGlitchSFX();
        audioManager.duckBGM(0.15);
        lastGlitchTime = world.time.elapsed;
      }

      // Flash
      triggerFlash(0.1 + world.gameState * 0.05);
    } else {
      // Fade out glitch filters
      for (const gf of scene.glitchFilters) {
        if (gf) gf.intensity *= 0.85;
      }
    }

    // === EFFECTS UPDATES ===
    updateShakes(delta);
    updateFlash(delta);
    updateStorm(delta, world.stormProgress, world.gameState === 2);
    updateRebirth(delta, world.rebirthProgress, world.gameState === 3);
    updateFlora(delta, world.rebirthProgress);

    // Storm vignette
    if (scene.vignetteFilter) {
      if (world.gameState === 2) {
        scene.vignetteFilter.darkness = Math.min(1, world.stormProgress / 3);
      } else if (world.gameState === 3) {
        scene.vignetteFilter.darkness = Math.max(0, scene.vignetteFilter.darkness - delta * 0.2);
      }
    }

    // === BACKGROUND CROSSFADE ===
    updateBackgroundCrossfade(scene, world);

    // === TOOLBAR UPDATE ===
    toolbar.update(delta, world.gameState);

    // === INSTRUCTIONS FADE ===
    if (world.time.elapsed > 8) {
      instructionText.alpha = Math.max(0, instructionText.alpha - delta * 0.3);
    }

    // === WIND CHIMES IN REBIRTH ===
    if (world.gameState === 3) {
      windChimeTimer += delta;
      if (windChimeTimer > 6 + Math.random() * 8) {
        windChimeTimer = 0;
        audioManager.playWindChime();
      }
    }
  });

  // ============================================================
  // STATE CHANGE HANDLERS
  // ============================================================
  function onStateChange(newState, oldState, world) {
    console.log(`🌸 State: ${['ILLUSION', 'STRUGGLE', 'CLIMAX', 'REBIRTH'][newState]}`);

    switch (newState) {
      case 0: // ILLUSION
        audioManager.playBGM('illusion', 2);
        break;

      case 1: // STRUGGLE
        audioManager.playBGM('struggle', 3);
        break;

      case 2: // CLIMAX
        if (!stormTriggered) {
          stormTriggered = true;
          audioManager.playThunder();
          audioManager.playBGM('storm', 1);
        }
        break;

      case 3: // REBIRTH
        audioManager.playBGM('rebirth', 4);
        if (!rebirthSpawned) {
          rebirthSpawned = true;
          // Gather ruined entity positions
          const positions = [];
          for (const eid of world.entities) {
            positions.push({
              x: Position.x[eid],
              y: Position.y[eid],
            });
          }
          spawnWildFlora(positions);
          spawnWildBird();
        }
        break;
    }
  }

  // Start BGM
  audioManager.playBGM('illusion', 3);
}

// ============================================================
// SCENE BUILDER — Create sprites for each entity
// ============================================================
function buildScene(layers, world) {
  const scene = {
    backgrounds: {},
    entitySprites: [],
    desatFilters: [],
    glitchFilters: [],
    vignetteFilter: null,
    deadTextures: {},
    aliveTextures: {},
  };

  // === Backgrounds ===
  const bgNormal = new Sprite(Assets.get('bg_normal'));
  bgNormal.width = CANVAS_W;
  bgNormal.height = CANVAS_H;
  layers.background.addChild(bgNormal);
  scene.backgrounds.normal = bgNormal;

  const bgWithered = new Sprite(Assets.get('bg_withered'));
  bgWithered.width = CANVAS_W;
  bgWithered.height = CANVAS_H;
  bgWithered.alpha = 0;
  layers.background.addChild(bgWithered);
  scene.backgrounds.withered = bgWithered;

  const bgClimax = new Sprite(Assets.get('bg_climax'));
  bgClimax.width = CANVAS_W;
  bgClimax.height = CANVAS_H;
  bgClimax.alpha = 0;
  layers.background.addChild(bgClimax);
  scene.backgrounds.climax = bgClimax;

  // Vignette filter on background layer
  scene.vignetteFilter = new VignetteFilter();
  layers.background.filters = [scene.vignetteFilter];

  // === Store texture references ===
  scene.aliveTextures = {
    [ENTITY_TYPE.TREE]: Assets.get('tree_bloom'),
    [ENTITY_TYPE.FLOWER]: Assets.get('flowers_bloom'),
    [ENTITY_TYPE.FISH]: Assets.get('fish_frame1'),
    [ENTITY_TYPE.BIRD]: Assets.get('caged_bird'),
    [ENTITY_TYPE.CAT]: Assets.get('cat'),
  };
  scene.deadTextures = {
    [ENTITY_TYPE.TREE]: Assets.get('tree_dead'),
    [ENTITY_TYPE.FLOWER]: Assets.get('flowers_dead'),
    [ENTITY_TYPE.FISH]: Assets.get('fish_frame2'), // reuse as "dying" frame
    [ENTITY_TYPE.BIRD]: Assets.get('caged_bird'),  // stays same but desaturated
    [ENTITY_TYPE.CAT]: Assets.get('cat'),           // stays same but desaturated
  };
  scene.fishTextures = [Assets.get('fish_frame1'), Assets.get('fish_frame2')];

  // === Entity Sprites ===
  for (let i = 0; i < world.entities.length; i++) {
    const eid = world.entities[i];
    const type = Interactable.type[eid];
    const texture = scene.aliveTextures[type];

    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.x = Position.x[eid];
    sprite.y = Position.y[eid];

    // Scale sprites to fit the garden scene
    const scaleMap = {
      [ENTITY_TYPE.TREE]: 0.35,
      [ENTITY_TYPE.FLOWER]: 0.22,
      [ENTITY_TYPE.FISH]: 0.28,
      [ENTITY_TYPE.BIRD]: 0.2,
      [ENTITY_TYPE.CAT]: 0.22,
    };
    sprite.scale.set(scaleMap[type] || 0.25);

    // Interactive for hover detection
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';

    // Create filters for this sprite
    const desatFilter = new DesaturationFilter();
    const glitchFilter = new GlitchFilter();
    sprite.filters = [desatFilter, glitchFilter];

    layers.entities.addChild(sprite);
    scene.entitySprites.push(sprite);
    scene.desatFilters.push(desatFilter);
    scene.glitchFilters.push(glitchFilter);
    world.sprites.push(sprite);

    SpriteRef.index[eid] = i;
  }

  return scene;
}

// ============================================================
// ENTITY VISUAL UPDATE — Desaturation, texture swap, wobble
// ============================================================
function updateEntityVisuals(world, scene, delta) {
  for (let i = 0; i < world.entities.length; i++) {
    const eid = world.entities[i];
    const health = Health.current[eid];
    const maxHealth = Health.max[eid];
    const healthPct = health / maxHealth;
    const state = EntityState.value[eid];
    const type = Interactable.type[eid];
    const sprite = scene.entitySprites[i];
    const desatFilter = scene.desatFilters[i];

    // Desaturation based on health
    desatFilter.decay = 1.0 - healthPct;

    // Texture swap at death
    if (state === ENTITY_STATE.RUINED || state === ENTITY_STATE.RECLAIMED) {
      const deadTex = scene.deadTextures[type];
      if (deadTex && sprite.texture !== deadTex) {
        sprite.texture = deadTex;
      }
      desatFilter.decay = 1.0;
    } else if (healthPct > 0.5) {
      const aliveTex = scene.aliveTextures[type];
      if (aliveTex && sprite.texture !== aliveTex && type !== ENTITY_TYPE.FISH) {
        sprite.texture = aliveTex;
      }
    }

    // Gentle wobble when health is low
    if (healthPct < 0.3 && healthPct > 0) {
      const wobble = Math.sin(world.time.elapsed * 4 + i) * (0.3 - healthPct) * 5;
      sprite.x = Position.x[eid] + wobble;
    }

    // Scale pulse when being healed
    if (state === ENTITY_STATE.BEING_FORCED) {
      const pulse = 1 + Math.sin(world.time.elapsed * 12) * 0.03;
      const baseScale = getBaseScale(type);
      sprite.scale.set(baseScale * pulse);
    }
  }
}

function getBaseScale(type) {
  const map = {
    [ENTITY_TYPE.TREE]: 0.35,
    [ENTITY_TYPE.FLOWER]: 0.22,
    [ENTITY_TYPE.FISH]: 0.28,
    [ENTITY_TYPE.BIRD]: 0.2,
    [ENTITY_TYPE.CAT]: 0.22,
  };
  return map[type] || 0.25;
}

// ============================================================
// FISH ANIMATION — Toggle between two frames
// ============================================================
let fishFrame = 0;
function toggleFishFrame(world, scene) {
  fishFrame = 1 - fishFrame;
  for (let i = 0; i < world.entities.length; i++) {
    const eid = world.entities[i];
    if (Interactable.type[eid] === ENTITY_TYPE.FISH) {
      const state = EntityState.value[eid];
      if (state !== ENTITY_STATE.RUINED && state !== ENTITY_STATE.RECLAIMED) {
        scene.entitySprites[i].texture = scene.fishTextures[fishFrame];
      }
    }
  }
}

// ============================================================
// BACKGROUND CROSSFADE — Based on game state
// ============================================================
function updateBackgroundCrossfade(scene, world) {
  const delta = world.time.delta;
  const state = world.gameState;

  if (state === 0) {
    // ILLUSION — show normal
    scene.backgrounds.normal.alpha = 1;
    scene.backgrounds.withered.alpha = Math.max(0, scene.backgrounds.withered.alpha - delta * 0.5);
    scene.backgrounds.climax.alpha = 0;
  } else if (state === 1) {
    // STRUGGLE — start blending toward withered
    const progress = Math.min(1, (world.time.elapsed - 90) / 90);
    scene.backgrounds.withered.alpha = Math.min(progress * 0.5, scene.backgrounds.withered.alpha + delta * 0.1);
  } else if (state === 2) {
    // CLIMAX — full withered
    scene.backgrounds.withered.alpha = Math.min(1, scene.backgrounds.withered.alpha + delta * 0.3);
    scene.backgrounds.normal.alpha = Math.max(0, scene.backgrounds.normal.alpha - delta * 0.3);
  } else if (state === 3) {
    // REBIRTH — crossfade to climax (lush overgrown) background
    scene.backgrounds.climax.alpha = Math.min(1, scene.backgrounds.climax.alpha + delta * 0.15);
    scene.backgrounds.withered.alpha = Math.max(0, scene.backgrounds.withered.alpha - delta * 0.1);
    scene.backgrounds.normal.alpha = Math.max(0, scene.backgrounds.normal.alpha - delta * 0.2);
  }
}

// ============================================================
// INSTRUCTION TEXT
// ============================================================
function createInstructionText(uiLayer) {
  const container = new Container();
  container.x = CANVAS_W / 2;
  container.y = 50;

  const text = new Text({
    text: 'Select a tool below, then hold your cursor over a garden element to maintain it.',
    style: {
      fontSize: 14,
      fill: '#d4c5a9',
      fontFamily: 'Noto Serif SC, serif',
      align: 'center',
      dropShadow: true,
      dropShadowColor: '#000000',
      dropShadowBlur: 4,
      dropShadowDistance: 1,
    },
  });
  text.anchor.set(0.5);
  container.addChild(text);

  // Chinese subtitle
  const subtext = new Text({
    text: '选择下方工具，按住鼠标维护花园元素',
    style: {
      fontSize: 11,
      fill: '#8a7e6b',
      fontFamily: 'Noto Serif SC, serif',
      align: 'center',
    },
  });
  subtext.anchor.set(0.5);
  subtext.y = 22;
  container.addChild(subtext);

  uiLayer.addChild(container);
  return container;
}

// ============================================================
// START
// ============================================================
boot().catch(err => {
  console.error('🌸 Failed to start:', err);
  loadingText.textContent = `Error: ${err.message}`;
});
