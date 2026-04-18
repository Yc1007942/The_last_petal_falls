/**
 * UI Toolbar — Floating tool selection bar with drag-and-drop
 */
import { Container, Sprite, Graphics, Text, Assets } from 'pixi.js';
import { CANVAS_W, CANVAS_H } from '../rendering/setup.js';
import { TOOL_TYPE } from '../ecs/components.js';

/**
 * Tool definitions — each maps to an entity type it can heal
 */
const TOOLS = [
  { id: TOOL_TYPE.WATER,     label: '💧',  name: 'Water',      icon: null, desc: 'Water the flowers' },
  { id: TOOL_TYPE.FISH_FOOD, label: '🐟',  name: 'Fish Food',  icon: 'pellets', desc: 'Feed the koi' },
  { id: TOOL_TYPE.CAT_FOOD,  label: '🐱',  name: 'Cat Food',   icon: 'catnip_snack', desc: 'Feed the cat' },
  { id: TOOL_TYPE.PRUNER,    label: '✂️',  name: 'Prune',      icon: null, desc: 'Prune the trees' },
];

export class Toolbar {
  constructor(uiLayer, world) {
    this.world = world;
    this.container = new Container();
    this.selectedIndex = -1;
    this.buttons = [];
    this.shakeOffset = 0;
    this.shakeIntensity = 0;

    // Position at bottom center
    this.container.x = CANVAS_W / 2;
    this.container.y = CANVAS_H - 55;
    uiLayer.addChild(this.container);

    this._buildToolbar();
  }

  _buildToolbar() {
    const totalWidth = TOOLS.length * 70 + (TOOLS.length - 1) * 10;
    const startX = -totalWidth / 2;

    // Background panel
    const panel = new Graphics();
    panel.roundRect(startX - 15, -25, totalWidth + 30, 60, 12);
    panel.fill({ color: 0x1a1510, alpha: 0.75 });
    panel.stroke({ width: 1, color: 0x8a7e6b, alpha: 0.4 });
    this.container.addChild(panel);
    this.panel = panel;

    // Tool buttons
    TOOLS.forEach((tool, i) => {
      const btn = new Container();
      btn.x = startX + i * 80 + 35;
      btn.y = 5;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      // Button background
      const bg = new Graphics();
      bg.roundRect(-30, -22, 60, 44, 8);
      bg.fill({ color: 0x2a2520, alpha: 0.6 });
      btn.addChild(bg);

      // Icon or emoji text
      if (tool.icon) {
        try {
          const tex = Assets.get(tool.icon);
          if (tex) {
            const iconSprite = new Sprite(tex);
            iconSprite.anchor.set(0.5);
            iconSprite.scale.set(0.12);
            iconSprite.y = -2;
            btn.addChild(iconSprite);
          }
        } catch (e) { /* fallback to text */ }
      }

      // Label text
      const label = new Text({
        text: tool.label,
        style: {
          fontSize: 20,
          fill: '#d4c5a9',
        },
      });
      label.anchor.set(0.5);
      label.y = -2;
      if (tool.icon) {
        label.y = 14;
        label.style.fontSize = 10;
      }
      btn.addChild(label);

      // Tooltip on hover
      const tooltip = new Text({
        text: tool.desc,
        style: {
          fontSize: 10,
          fill: '#8a7e6b',
          fontFamily: 'Noto Serif SC, serif',
        },
      });
      tooltip.anchor.set(0.5);
      tooltip.y = -38;
      tooltip.alpha = 0;
      btn.addChild(tooltip);

      // Interaction
      btn.on('pointerenter', () => {
        tooltip.alpha = 1;
        bg.tint = 0xcccccc;
      });
      btn.on('pointerleave', () => {
        tooltip.alpha = 0;
        bg.tint = 0xffffff;
      });
      btn.on('pointerdown', () => {
        this.selectTool(i);
      });

      this.container.addChild(btn);
      this.buttons.push({ container: btn, bg, tool, selected: false });
    });
  }

  selectTool(index) {
    // Deselect previous
    if (this.selectedIndex >= 0) {
      const prev = this.buttons[this.selectedIndex];
      prev.bg.clear();
      prev.bg.roundRect(-30, -22, 60, 44, 8);
      prev.bg.fill({ color: 0x2a2520, alpha: 0.6 });
      prev.selected = false;
    }

    // Toggle if same
    if (this.selectedIndex === index) {
      this.selectedIndex = -1;
      this.world.input.selectedTool = TOOL_TYPE.NONE;
      return;
    }

    // Select new
    this.selectedIndex = index;
    const btn = this.buttons[index];
    btn.bg.clear();
    btn.bg.roundRect(-30, -22, 60, 44, 8);
    btn.bg.fill({ color: 0x5a4a30, alpha: 0.8 });
    btn.bg.stroke({ width: 2, color: 0xd4c5a9 });
    btn.selected = true;
    this.world.input.selectedTool = btn.tool.id;

    // Also set as drag item
    this.world.input.dragItem = { tool: btn.tool.id };
  }

  /**
   * Update toolbar visuals based on game state
   */
  update(delta, gameState) {
    // Fade/shake as game intensifies
    if (gameState === 1) {
      // STRUGGLE — subtle shake
      this.shakeIntensity = Math.min(3, this.shakeIntensity + delta * 0.5);
    } else if (gameState >= 2) {
      // CLIMAX/REBIRTH — fade out toolbar
      this.container.alpha = Math.max(0, this.container.alpha - delta * 0.5);
    }

    if (this.shakeIntensity > 0) {
      this.shakeOffset += delta * 15;
      this.container.y = CANVAS_H - 55 + Math.sin(this.shakeOffset) * this.shakeIntensity;
    }
  }
}
