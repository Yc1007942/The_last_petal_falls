/**
 * UI Toolbar — Floating tool selection bar with labels
 */
import { Container, Sprite, Graphics, Text, Assets } from 'pixi.js';
import { CANVAS_W, CANVAS_H } from '../rendering/setup.js';
import { TOOL_TYPE } from '../ecs/components.js';

/**
 * Tool definitions — each maps to an entity type it can heal
 */
const TOOLS = [
  { id: TOOL_TYPE.WATER,     label: '💧',  name: 'Water',      target: 'Flowers',  icon: null },
  { id: TOOL_TYPE.FISH_FOOD, label: '🐟',  name: 'Fish Food',  target: 'Koi',      icon: 'pellets' },
  { id: TOOL_TYPE.CAT_FOOD,  label: '🐱',  name: 'Cat Food',   target: 'Cat',      icon: 'catnip_snack' },
  { id: TOOL_TYPE.PRUNER,    label: '✂️',  name: 'Pruner',     target: 'Trees',    icon: null },
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
    this.container.y = CANVAS_H - 60;
    uiLayer.addChild(this.container);

    this._buildToolbar();
  }

  _buildToolbar() {
    const btnWidth = 100;
    const btnGap = 8;
    const totalWidth = TOOLS.length * btnWidth + (TOOLS.length - 1) * btnGap;
    const startX = -totalWidth / 2;

    // Background panel
    const panel = new Graphics();
    panel.roundRect(startX - 12, -28, totalWidth + 24, 68, 12);
    panel.fill({ color: 0x0d0b08, alpha: 0.82 });
    panel.stroke({ width: 1, color: 0x8a7e6b, alpha: 0.3 });
    this.container.addChild(panel);
    this.panel = panel;

    // Tool buttons
    TOOLS.forEach((tool, i) => {
      const btn = new Container();
      btn.x = startX + i * (btnWidth + btnGap) + btnWidth / 2;
      btn.y = 5;
      btn.eventMode = 'static';
      btn.cursor = 'pointer';

      // Button background
      const bg = new Graphics();
      bg.roundRect(-btnWidth / 2 + 4, -24, btnWidth - 8, 56, 8);
      bg.fill({ color: 0x2a2520, alpha: 0.5 });
      btn.addChild(bg);

      // Emoji icon
      const emojiText = new Text({
        text: tool.label,
        style: {
          fontSize: 22,
          fill: '#ffffff',
        },
      });
      emojiText.anchor.set(0.5);
      emojiText.y = -6;
      btn.addChild(emojiText);

      // Tool name label
      const nameLabel = new Text({
        text: tool.name,
        style: {
          fontSize: 9,
          fill: '#d4c5a9',
          fontFamily: 'Noto Serif SC, serif',
          fontWeight: '700',
          letterSpacing: 0.5,
        },
      });
      nameLabel.anchor.set(0.5);
      nameLabel.y = 12;
      btn.addChild(nameLabel);

      // Target label (what it heals)
      const targetLabel = new Text({
        text: `→ ${tool.target}`,
        style: {
          fontSize: 8,
          fill: '#8a7e6b',
          fontFamily: 'Noto Serif SC, serif',
        },
      });
      targetLabel.anchor.set(0.5);
      targetLabel.y = 23;
      btn.addChild(targetLabel);

      // Interaction
      btn.on('pointerenter', () => {
        if (!this.buttons[i].selected) {
          bg.tint = 0xdddddd;
        }
      });
      btn.on('pointerleave', () => {
        if (!this.buttons[i].selected) {
          bg.tint = 0xffffff;
        }
      });
      btn.on('pointerdown', () => {
        this.selectTool(i);
      });

      this.container.addChild(btn);
      this.buttons.push({
        container: btn, bg, tool, selected: false,
        btnWidth,
      });
    });
  }

  selectTool(index) {
    const btnW = this.buttons[0].btnWidth;

    // Deselect previous
    if (this.selectedIndex >= 0) {
      const prev = this.buttons[this.selectedIndex];
      prev.bg.clear();
      prev.bg.roundRect(-btnW / 2 + 4, -24, btnW - 8, 56, 8);
      prev.bg.fill({ color: 0x2a2520, alpha: 0.5 });
      prev.selected = false;
      prev.bg.tint = 0xffffff;
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
    btn.bg.roundRect(-btnW / 2 + 4, -24, btnW - 8, 56, 8);
    btn.bg.fill({ color: 0x5a4a30, alpha: 0.85 });
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
      this.container.y = CANVAS_H - 60 + Math.sin(this.shakeOffset) * this.shakeIntensity;
    }
  }
}
