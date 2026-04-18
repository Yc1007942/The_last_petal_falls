/**
 * Input Handler — Mouse tracking and coordinate transform
 */
import { CANVAS_W, CANVAS_H } from '../rendering/setup.js';

/**
 * Initialize input listeners and bind to the world's input state
 * @param {object} app - PIXI Application
 * @param {object} world - bitECS world
 */
export function initInput(app, world) {
  const canvas = app.canvas;

  function getGameCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (rect.width - CANVAS_W * scale) / 2;
    const offsetY = (rect.height - CANVAS_H * scale) / 2;

    return {
      x: (e.clientX - rect.left - offsetX) / scale,
      y: (e.clientY - rect.top - offsetY) / scale,
    };
  }

  canvas.addEventListener('mousemove', (e) => {
    const pos = getGameCoords(e);
    world.input.mouseX = pos.x;
    world.input.mouseY = pos.y;
  });

  canvas.addEventListener('mousedown', (e) => {
    world.input.mouseDown = true;
    // Unlock audio on first interaction
    if (world._audioUnlockNeeded) {
      world._audioUnlockNeeded = false;
      if (world._audioUnlock) world._audioUnlock();
    }
  });

  canvas.addEventListener('mouseup', () => {
    world.input.mouseDown = false;
    world.input.dragItem = null;
  });

  canvas.addEventListener('mouseleave', () => {
    world.input.mouseDown = false;
    world.input.dragItem = null;
  });

  // Touch support
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getGameCoords(touch);
    world.input.mouseX = pos.x;
    world.input.mouseY = pos.y;
    world.input.mouseDown = true;
    if (world._audioUnlockNeeded) {
      world._audioUnlockNeeded = false;
      if (world._audioUnlock) world._audioUnlock();
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getGameCoords(touch);
    world.input.mouseX = pos.x;
    world.input.mouseY = pos.y;
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    world.input.mouseDown = false;
    world.input.dragItem = null;
  });
}
