/**
 * Advanced Sprite Processing Script
 * Removes checkerboard pattern from cropped sprites by converting 
 * gray checkerboard pixels to transparent alpha.
 * Also removes white backgrounds from rebirth sprites.
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
  const image = sharp(inputPath).ensureAlpha(); // ensure 4 channels
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

    // Tighter checkerboard detection: the actual checkerboard uses
    // alternating ~(185,185,185) and ~(146,146,146) blocks.
    // R=G=B exactly (maxDiff < 5) distinguishes from fish water which has blue tint.
    const avg = (r + g + b) / 3;
    const isCheckerboard = maxDiff < 5 && avg > 140 && avg < 195;

    if (isCheckerboard) {
      if (channels >= 4) {
        output[offset + 3] = 0; // set alpha to 0
      }
    }
  }

  // Remove text regions from top of the sprite only
  // (crop coordinates already exclude bottom labels)
  const TEXT_REGION_HEIGHT = 50;
  for (let y = 0; y < TEXT_REGION_HEIGHT; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const avg = (r + g + b) / 3;
      const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
      // Only remove clearly non-art pixels: very dark text or very light bg
      if ((avg < 60 && maxDiff < 15) || (avg > 200 && maxDiff < 10)) {
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

/**
 * Remove white/light background from rebirth sprites using flood-fill from edges.
 * These sprites have solid white backgrounds with no alpha channel.
 * We flood-fill from all edge pixels that are "near-white" and mark them transparent.
 */
async function removeWhiteBackground(inputPath, outputPath) {
  const image = sharp(inputPath).ensureAlpha(); // force 4 channels
  const { data, info } = await image
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const output = Buffer.from(data);

  // Track visited pixels
  const visited = new Uint8Array(width * height);
  const isBackground = new Uint8Array(width * height);

  // Check if a pixel is "white-ish" (background)
  function isWhitish(idx) {
    const offset = idx * channels;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    const avg = (r + g + b) / 3;
    const maxDiff = Math.max(
      Math.abs(r - g),
      Math.abs(g - b),
      Math.abs(r - b)
    );
    // White/near-white: high luminance, low color variation
    // Also include very light grays that are part of the background texture
    return avg > 225 && maxDiff < 20;
  }

  // BFS flood fill from edges
  const queue = [];

  // Seed from all 4 edges
  for (let x = 0; x < width; x++) {
    // Top edge
    const topIdx = x;
    if (isWhitish(topIdx) && !visited[topIdx]) {
      visited[topIdx] = 1;
      isBackground[topIdx] = 1;
      queue.push(topIdx);
    }
    // Bottom edge
    const botIdx = (height - 1) * width + x;
    if (isWhitish(botIdx) && !visited[botIdx]) {
      visited[botIdx] = 1;
      isBackground[botIdx] = 1;
      queue.push(botIdx);
    }
  }
  for (let y = 0; y < height; y++) {
    // Left edge
    const leftIdx = y * width;
    if (isWhitish(leftIdx) && !visited[leftIdx]) {
      visited[leftIdx] = 1;
      isBackground[leftIdx] = 1;
      queue.push(leftIdx);
    }
    // Right edge
    const rightIdx = y * width + (width - 1);
    if (isWhitish(rightIdx) && !visited[rightIdx]) {
      visited[rightIdx] = 1;
      isBackground[rightIdx] = 1;
      queue.push(rightIdx);
    }
  }

  // BFS
  while (queue.length > 0) {
    const idx = queue.shift();
    const x = idx % width;
    const y = Math.floor(idx / width);

    // 4-connected neighbors
    const neighbors = [];
    if (x > 0) neighbors.push(idx - 1);
    if (x < width - 1) neighbors.push(idx + 1);
    if (y > 0) neighbors.push(idx - width);
    if (y < height - 1) neighbors.push(idx + width);

    for (const nIdx of neighbors) {
      if (!visited[nIdx] && isWhitish(nIdx)) {
        visited[nIdx] = 1;
        isBackground[nIdx] = 1;
        queue.push(nIdx);
      }
    }
  }

  // Apply: set background pixels to transparent
  for (let i = 0; i < width * height; i++) {
    if (isBackground[i]) {
      const offset = i * channels;
      output[offset + 3] = 0;
    }
  }

  // Edge softening: for pixels adjacent to background, apply partial alpha
  // to avoid harsh edges
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (isBackground[idx]) continue; // already transparent

      // Count how many neighbors are background
      let bgCount = 0;
      if (isBackground[idx - 1]) bgCount++;
      if (isBackground[idx + 1]) bgCount++;
      if (isBackground[idx - width]) bgCount++;
      if (isBackground[idx + width]) bgCount++;

      if (bgCount >= 2) {
        // Partially transparent edge pixel
        const offset = idx * channels;
        const currentAlpha = output[offset + 3];
        output[offset + 3] = Math.min(currentAlpha, Math.floor(255 * 0.5));
      } else if (bgCount === 1) {
        const offset = idx * channels;
        const currentAlpha = output[offset + 3];
        output[offset + 3] = Math.min(currentAlpha, Math.floor(255 * 0.8));
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
  console.log('🎨 Processing sprites — removing backgrounds...\n');

  // Process main sprites (checkerboard removal)
  console.log('=== Main sprites (checkerboard removal) ===');
  const files = await readdir(SPRITES_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  for (const file of pngFiles) {
    const inputPath = join(SPRITES_DIR, file);
    const tempPath = inputPath + '.tmp.png';
    try {
      await removeCheckerboard(inputPath, tempPath);
      const { rename } = await import('fs/promises');
      await rename(tempPath, inputPath);
      console.log(`  ✓ ${file}`);
    } catch (err) {
      console.error(`  ✗ ${file}: ${err.message}`);
    }
  }

  // Process rebirth sprites (white background removal)
  console.log('\n=== Rebirth sprites (white background removal) ===');
  const rebirthDir = join(SPRITES_DIR, 'rebirth');
  try {
    const rebirthFiles = await readdir(rebirthDir);
    for (const file of rebirthFiles.filter(f => f.endsWith('.png'))) {
      const inputPath = join(rebirthDir, file);
      const tempPath = inputPath + '.tmp.png';
      try {
        await removeWhiteBackground(inputPath, tempPath);
        const { rename } = await import('fs/promises');
        await rename(tempPath, inputPath);

        // Verify result
        const meta = await sharp(join(rebirthDir, file)).metadata();
        console.log(`  ✓ ${file} (${meta.width}×${meta.height}, channels: ${meta.channels}, hasAlpha: ${meta.hasAlpha})`);
      } catch (err) {
        console.error(`  ✗ ${file}: ${err.message}`);
      }
    }
  } catch (e) {
    console.error('  Rebirth directory not found:', e.message);
  }

  console.log('\n✅ Sprite processing complete!');
}

main().catch(err => {
  console.error('❌ Processing failed:', err);
  process.exit(1);
});
