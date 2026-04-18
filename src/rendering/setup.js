/**
 * Rendering Setup — PixiJS application initialization and layer management
 */
import { Application, Container, Sprite, Texture, Assets, Graphics } from 'pixi.js';

/** Logical canvas dimensions (half the asset resolution) */
export const CANVAS_W = 1376;
export const CANVAS_H = 768;

/**
 * Initialize the PixiJS application
 * @returns {Promise<{app: Application, layers: object}>}
 */
export async function initRenderer() {
  const app = new Application();
  
  await app.init({
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: 0x0a0a0a,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
    resizeTo: window,
  });

  // Mount to DOM
  const container = document.getElementById('game-canvas');
  container.appendChild(app.canvas);

  // Scale canvas to fit viewport while maintaining aspect ratio
  function resize() {
    const scaleX = window.innerWidth / CANVAS_W;
    const scaleY = window.innerHeight / CANVAS_H;
    const scale = Math.min(scaleX, scaleY);
    app.stage.scale.set(scale);
    app.stage.x = (window.innerWidth - CANVAS_W * scale) / 2;
    app.stage.y = (window.innerHeight - CANVAS_H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  // Create layer hierarchy
  const layers = {
    background: new Container(),
    entities: new Container(),
    overlay: new Container(),
    ui: new Container(),
  };

  // The UI layer should not be affected by the stage transform for mouse coords
  // but we keep it in the stage for simplicity
  app.stage.addChild(layers.background);
  app.stage.addChild(layers.entities);
  app.stage.addChild(layers.overlay);
  app.stage.addChild(layers.ui);

  return { app, layers, resize };
}

/**
 * Load all game assets using PixiJS Assets system
 * @param {Function} onProgress - callback with progress 0-1
 */
export async function loadAssets(onProgress) {
  // Define asset bundles
  const manifest = {
    bundles: [
      {
        name: 'backgrounds',
        assets: [
          { alias: 'bg_normal', src: '/backgrounds/garden_normal.png' },
          { alias: 'bg_withered', src: '/backgrounds/garden_withered.png' },
          { alias: 'bg_climax', src: '/backgrounds/garden_climax.png' },
        ],
      },
      {
        name: 'sprites',
        assets: [
          { alias: 'tree_bloom', src: '/sprites/tree_bloom.png' },
          { alias: 'tree_dead', src: '/sprites/tree_dead.png' },
          { alias: 'flowers_bloom', src: '/sprites/flowers_bloom.png' },
          { alias: 'flowers_dead', src: '/sprites/flowers_dead.png' },
          { alias: 'fish_frame1', src: '/sprites/fish_frame1.png' },
          { alias: 'fish_frame2', src: '/sprites/fish_frame2.png' },
          { alias: 'caged_bird', src: '/sprites/caged_bird.png' },
          { alias: 'cat', src: '/sprites/cat.png' },
        ],
      },
      {
        name: 'tools',
        assets: [
          { alias: 'pond_fertilizer', src: '/sprites/pond_fertilizer.png' },
          { alias: 'pellets', src: '/sprites/pellets.png' },
          { alias: 'nutrient_block', src: '/sprites/nutrient_block.png' },
          { alias: 'catnip_snack', src: '/sprites/catnip_snack.png' },
          { alias: 'wet_food_spoon', src: '/sprites/wet_food_spoon.png' },
          { alias: 'dried_fish', src: '/sprites/dried_fish.png' },
        ],
      },
      {
        name: 'rebirth',
        assets: [
          { alias: 'wild_vines', src: '/sprites/rebirth/wild_vines.png' },
          { alias: 'moss_stone', src: '/sprites/rebirth/moss_stone.png' },
          { alias: 'wild_flowers', src: '/sprites/rebirth/wild_flowers.png' },
          { alias: 'bamboo_shoots', src: '/sprites/rebirth/bamboo_shoots.png' },
          { alias: 'fern', src: '/sprites/rebirth/fern.png' },
          { alias: 'mushrooms', src: '/sprites/rebirth/mushrooms.png' },
          { alias: 'wild_bird', src: '/sprites/rebirth/wild_bird.png' },
        ],
      },
    ],
  };

  await Assets.init({ manifest });

  // Load bundles with progress tracking
  const bundleNames = ['backgrounds', 'sprites', 'tools', 'rebirth'];
  let loaded = 0;
  for (const name of bundleNames) {
    await Assets.loadBundle(name);
    loaded++;
    if (onProgress) onProgress(loaded / bundleNames.length);
  }
}
