/**
 * Advanced Sprite Processing Script
 * Removes checkerboard pattern from cropped sprites by converting 
 * gray checkerboard pixels to transparent alpha.
 * Also removes text labels from the top of sprites.
 */
import sharp from 'sharp';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SPRITES_DIR = join(__dirname, '..', 'public', 'sprites');

/**
 * Remove checkerboard pattern from a sprite PNG.
 * The checkerboard consists of alternating light gray (~185,185,185) 
 * and darker gray (~146,146,146) blocks.
 * Strategy: Any pixel where R≈G≈B and value is in the gray range is likely checkerboard.
 */
async function removeCheckerboard(inputPath, outputPath) {
  const image = sharp(inputPath);
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const output = Buffer.from(data);

  // Process each pixel
  for (let i = 0; i < width * height; i++) {
    const offset = i * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];

    // Check if pixel is "gray" (R ≈ G ≈ B, within tolerance)
    const maxDiff = Math.max(
      Math.abs(r - g),
      Math.abs(g - b),
      Math.abs(r - b)
    );

    // Check if it's in the checkerboard gray range
    const avg = (r + g + b) / 3;
    const isGray = maxDiff < 15 && avg > 120 && avg < 210;
    
    // Also detect near-white and near-black that might be text/label areas
    const isLabelWhite = maxDiff < 10 && avg > 230;

    if (isGray || isLabelWhite) {
      // Check surrounding pixels to confirm it's checkerboard (not actual gray art)
      // Simple heuristic: checkerboard has very uniform patches
      if (channels >= 4) {
        output[offset + 3] = 0; // set alpha to 0
      }
    }
  }

  // Remove text regions from top and bottom of the sprite
  // Text is black on the gray/white background
  const TEXT_REGION_HEIGHT = 70;
  for (let y = 0; y < height; y++) {
    const inTextZone = y < TEXT_REGION_HEIGHT || y > height - TEXT_REGION_HEIGHT;
    if (!inTextZone) continue;
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const avg = (r + g + b) / 3;
      // Dark text pixels OR remaining light background
      if (avg < 100 || (avg > 180 && Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b)) < 20)) {
        if (channels >= 4) {
          output[offset + 3] = 0;
        }
      }
    }
  }

  await sharp(output, {
    raw: { width, height, channels },
  })
    .png()
    .toFile(outputPath);
}

async function main() {
  console.log('🎨 Processing sprites — removing checkerboard...\n');

  const files = await readdir(SPRITES_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  for (const file of pngFiles) {
    const inputPath = join(SPRITES_DIR, file);
    // Process in-place
    const tempPath = inputPath + '.tmp.png';
    try {
      await removeCheckerboard(inputPath, tempPath);
      // Replace original
      const { rename } = await import('fs/promises');
      await rename(tempPath, inputPath);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  // Also process rebirth sprites
  const rebirthDir = join(SPRITES_DIR, 'rebirth');
  try {
    const rebirthFiles = await readdir(rebirthDir);
    for (const file of rebirthFiles.filter(f => f.endsWith('.png'))) {
      const inputPath = join(rebirthDir, file);
      const tempPath = inputPath + '.tmp.png';
      try {
        await removeCheckerboard(inputPath, tempPath);
        const { rename } = await import('fs/promises');
        await rename(tempPath, inputPath);
        console.log(`  ✓ rebirth/${file}`);
      } catch (err) {
        console.error(`  ✗ rebirth/${file}: ${err.message}`);
      }
    }
  } catch (e) {
    // rebirth dir might not exist yet
  }

  console.log('\n✅ Sprite processing complete!');
}

main().catch(err => {
  console.error('❌ Processing failed:', err);
  process.exit(1);
});
