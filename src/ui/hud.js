/**
 * HUD — Garden Health Bar + Heal Feedback Particles
 * Shows overall garden vitality at the top of the screen
 */
import { Container, Graphics, Text } from 'pixi.js';
import { CANVAS_W } from '../rendering/setup.js';

const BAR_WIDTH = 340;
const BAR_HEIGHT = 10;
const BAR_Y = 18;

export class GardenHUD {
  constructor(uiLayer) {
    this.container = new Container();
    this.container.x = CANVAS_W / 2;
    this.container.y = BAR_Y;
    uiLayer.addChild(this.container);

    this.feedbackParticles = [];
    this.lastHealthPct = 1;
    this.pulseTimer = 0;
    this.flashTimer = 0; // for heal flash

    this._build();
  }

  _build() {
    // Label
    const label = new Text({
      text: 'GARDEN VITALITY',
      style: {
        fontSize: 9,
        fill: '#d4c5a9',
        fontFamily: 'Noto Serif SC, serif',
        letterSpacing: 2,
        fontWeight: '700',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 6,
        dropShadowDistance: 0,
      },
    });
    label.anchor.set(0.5);
    label.y = -2;
    this.container.addChild(label);
    this.label = label;

    // Chinese subtitle
    const zhLabel = new Text({
      text: '庭園生機',
      style: {
        fontSize: 8,
        fill: '#6a6050',
        fontFamily: 'Ma Shan Zheng, cursive',
        letterSpacing: 3,
      },
    });
    zhLabel.anchor.set(0.5);
    zhLabel.y = 10;
    this.container.addChild(zhLabel);

    // Bar background
    const barBg = new Graphics();
    barBg.roundRect(-BAR_WIDTH / 2, 22, BAR_WIDTH, BAR_HEIGHT, 5);
    barBg.fill({ color: 0x0d0b08, alpha: 0.75 });
    barBg.stroke({ width: 1, color: 0x5a5248, alpha: 0.4 });
    this.container.addChild(barBg);

    // Bar fill
    this.barFill = new Graphics();
    this.container.addChild(this.barFill);

    // Bar glow overlay (for heal flash)
    this.barGlow = new Graphics();
    this.barGlow.alpha = 0;
    this.container.addChild(this.barGlow);

    // Percentage text
    this.pctText = new Text({
      text: '100%',
      style: {
        fontSize: 9,
        fill: '#d4c5a9',
        fontFamily: 'Noto Serif SC, serif',
        fontWeight: '700',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowDistance: 0,
      },
    });
    this.pctText.anchor.set(0.5);
    this.pctText.y = 22 + BAR_HEIGHT / 2;
    this.container.addChild(this.pctText);

    // Status text (appears contextually)
    this.statusText = new Text({
      text: '',
      style: {
        fontSize: 10,
        fill: '#c4b598',
        fontFamily: 'Noto Serif SC, serif',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 5,
        dropShadowDistance: 0,
      },
    });
    this.statusText.anchor.set(0.5);
    this.statusText.y = 40;
    this.statusText.alpha = 0;
    this.container.addChild(this.statusText);
  }

  /**
   * Trigger a positive heal feedback effect
   * @param {string} entityName - name of entity healed
   */
  triggerHealFeedback(entityName) {
    this.flashTimer = 0.4; // glow duration

    // Spawn floating "+heal" particle
    const particle = new Text({
      text: `✦ ${entityName} restored`,
      style: {
        fontSize: 10,
        fill: '#8dcea0',
        fontFamily: 'Noto Serif SC, serif',
        fontWeight: '700',
        dropShadow: true,
        dropShadowColor: '#000000',
        dropShadowBlur: 4,
        dropShadowDistance: 0,
      },
    });
    particle.anchor.set(0.5);
    particle.x = (Math.random() - 0.5) * 100;
    particle.y = 38;
    particle.alpha = 1;
    this.container.addChild(particle);
    this.feedbackParticles.push({
      gfx: particle,
      life: 0,
      maxLife: 1.8,
    });
  }

  /**
   * Update the bar each frame
   * @param {number} delta - seconds
   * @param {number} healthPct - 0-1 overall garden health
   * @param {number} gameState - current game state
   * @param {boolean} isHealing - whether user is currently healing something
   */
  update(delta, healthPct, gameState, isHealing) {
    // Smooth interpolation
    this.lastHealthPct += (healthPct - this.lastHealthPct) * delta * 5;
    const pct = Math.max(0, Math.min(1, this.lastHealthPct));

    // Color gradient: green → yellow → red
    const r = pct < 0.5 ? 1.0 : 1.0 - (pct - 0.5) * 1.5;
    const g = pct > 0.5 ? 0.85 : pct * 1.7;
    const b = pct * 0.15;
    const color = (Math.floor(r * 255) << 16) | (Math.floor(g * 255) << 8) | Math.floor(b * 255);

    // Redraw bar fill
    const fillWidth = Math.max(2, BAR_WIDTH * pct);
    this.barFill.clear();
    this.barFill.roundRect(-BAR_WIDTH / 2, 22, fillWidth, BAR_HEIGHT, 5);
    this.barFill.fill({ color });

    // Percentage text
    this.pctText.text = `${Math.round(pct * 100)}%`;

    // Pulse when low
    if (pct < 0.3 && gameState < 2) {
      this.pulseTimer += delta;
      const pulse = 0.7 + Math.sin(this.pulseTimer * 4) * 0.3;
      this.barFill.alpha = pulse;
      this.label.style.fill = '#e07060';
    } else {
      this.barFill.alpha = 1;
      this.label.style.fill = '#d4c5a9';
    }

    // Heal flash glow
    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      this.barGlow.clear();
      this.barGlow.roundRect(-BAR_WIDTH / 2 - 2, 20, fillWidth + 4, BAR_HEIGHT + 4, 6);
      this.barGlow.fill({ color: 0x8dcea0, alpha: 0.3 });
      this.barGlow.alpha = Math.max(0, this.flashTimer / 0.4);
    } else {
      this.barGlow.alpha = 0;
    }

    // Status text
    if (gameState >= 2) {
      // Hide during climax/rebirth
      this.container.alpha = Math.max(0, this.container.alpha - delta * 0.5);
    } else if (pct < 0.15 && gameState < 2) {
      this.statusText.text = '⚠ The garden is dying…';
      this.statusText.style.fill = '#e07060';
      this.statusText.alpha = Math.min(1, this.statusText.alpha + delta * 2);
    } else if (isHealing) {
      this.statusText.text = '✦ Restoring…';
      this.statusText.style.fill = '#8dcea0';
      this.statusText.alpha = Math.min(0.8, this.statusText.alpha + delta * 3);
    } else {
      this.statusText.alpha = Math.max(0, this.statusText.alpha - delta * 2);
    }

    // Update feedback particles
    for (let i = this.feedbackParticles.length - 1; i >= 0; i--) {
      const p = this.feedbackParticles[i];
      p.life += delta;
      p.gfx.y -= delta * 18;
      p.gfx.alpha = Math.max(0, 1 - p.life / p.maxLife);
      if (p.life >= p.maxLife) {
        this.container.removeChild(p.gfx);
        p.gfx.destroy();
        this.feedbackParticles.splice(i, 1);
      }
    }
  }
}
