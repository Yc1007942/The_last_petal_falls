/**
 * Sprite Cropping Script
 * Extracts individual sprites from the composite interactable_assets PNGs
 * and copies backgrounds/audio to public/
 */
import sharp from 'sharp';
import { mkdir, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const ASSETS = join(ROOT, 'assets');
const PUBLIC = join(ROOT, 'public');

// Sprite definitions from interactable_assets.png (2752×1536)
// Format: { name, x, y, w, h }
// Coordinates refined to exclude text labels by starting below label area
const SHEET1_SPRITES = [
  // Row 1 — top half (labels at ~y:20-55, sprites start around y:70+)
  // Push y-start down past label text
  { name: 'tree_bloom',    x: 5,    y: 110,  w: 510,  h: 610 },
  { name: 'tree_dead',     x: 530,  y: 110,  w: 500,  h: 610 },
  { name: 'caged_bird',    x: 1070, y: 110,  w: 420,  h: 650 },
  { name: 'cat',           x: 1530, y: 120,  w: 380,  h: 560 },
  // Row 2 — bottom half (labels at ~y:755-800)
  { name: 'flowers_bloom', x: 5,    y: 890,  w: 500,  h: 560 },
  { name: 'flowers_dead',  x: 530,  y: 890,  w: 500,  h: 560 },
  { name: 'fish_frame1',   x: 1530, y: 975,  w: 580,  h: 485 },
  { name: 'fish_frame2',   x: 2130, y: 975,  w: 600,  h: 485 },
];

// Sprite definitions from interactable_assets-2.png (2752×1536)
// This has the same base sprites plus feeding/care items
const SHEET2_SPRITES = [
  // Care items — top right area (koi pond supplies, labels at top)
  { name: 'pond_fertilizer',  x: 1130, y: 80,   w: 280, h: 320 },
  { name: 'pellets',          x: 1450, y: 120,  w: 240, h: 230 },
  { name: 'nutrient_block',   x: 1720, y: 80,   w: 240, h: 260 },
  // Care items — mid right area (cat food, labels at top)
  { name: 'catnip_snack',     x: 1130, y: 510,  w: 300, h: 240 },
  { name: 'wet_food_spoon',   x: 1450, y: 510,  w: 260, h: 230 },
  { name: 'dried_fish',       x: 1720, y: 510,  w: 310, h: 230 },
];

// Background files to copy
const BACKGROUNDS = [
  { src: 'background_garden_normal.png',   dest: 'garden_normal.png' },
  { src: 'background_garden_withered.png', dest: 'garden_withered.png' },
  { src: 'background_garden_climax.png',   dest: 'garden_climax.png' },
];

// Audio files to copy
const AUDIO = [
  { src: 'music_normal_state-1.mp3', dest: 'music_normal_1.mp3' },
  { src: 'music_normal_state-2.mp3', dest: 'music_normal_2.mp3' },
  { src: 'music_decaying.mp3',       dest: 'music_decaying.mp3' },
];

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function cropSprites(sheetPath, sprites, outputDir) {
  const image = sharp(sheetPath);
  const metadata = await image.metadata();
  console.log(`  Sheet: ${sheetPath} (${metadata.width}×${metadata.height})`);

  for (const sprite of sprites) {
    // Clamp to image bounds
    const x = Math.max(0, sprite.x);
    const y = Math.max(0, sprite.y);
    const w = Math.min(sprite.w, metadata.width - x);
    const h = Math.min(sprite.h, metadata.height - y);

    const outPath = join(outputDir, `${sprite.name}.png`);
    await sharp(sheetPath)
      .extract({ left: x, top: y, width: w, height: h })
      .png()
      .toFile(outPath);
    console.log(`  ✓ ${sprite.name} (${w}×${h})`);
  }
}

async function main() {
  console.log('🌸 Asset Pipeline — The Last Petal Falls\n');

  // Create output directories
  const spritesDir = join(PUBLIC, 'sprites');
  const bgDir = join(PUBLIC, 'backgrounds');
  const audioDir = join(PUBLIC, 'audio');
  await ensureDir(spritesDir);
  await ensureDir(bgDir);
  await ensureDir(audioDir);

  // Crop sprites from sheet 1
  console.log('Cropping interactable_assets.png...');
  await cropSprites(
    join(ASSETS, 'interactable_assets.png'),
    SHEET1_SPRITES,
    spritesDir
  );

  // Crop sprites from sheet 2 (care items only)
  console.log('\nCropping interactable_assets-2.png (care items)...');
  await cropSprites(
    join(ASSETS, 'interactable_assets-2.png'),
    SHEET2_SPRITES,
    spritesDir
  );

  // Copy backgrounds
  console.log('\nCopying backgrounds...');
  for (const bg of BACKGROUNDS) {
    await copyFile(join(ASSETS, bg.src), join(bgDir, bg.dest));
    console.log(`  ✓ ${bg.dest}`);
  }

  // Copy audio
  console.log('\nCopying audio...');
  for (const a of AUDIO) {
    await copyFile(join(ASSETS, a.src), join(audioDir, a.dest));
    console.log(`  ✓ ${a.dest}`);
  }

  console.log('\n✅ Asset pipeline complete!');
}

main().catch(err => {
  console.error('❌ Asset pipeline failed:', err);
  process.exit(1);
});
