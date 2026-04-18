import { defineQuery } from 'bitecs';
import {
  Health, Position, SpriteRef, Interactable,
  EntityState, DecayMultiplier,
  ENTITY_STATE, ENTITY_TYPE, TOOL_TYPE,
} from './components.js';

// Query: all entities with Health + EntityState
const healthQuery = defineQuery([Health, EntityState, DecayMultiplier]);
const interactableQuery = defineQuery([Interactable, Position, Health, EntityState]);

// ============================================================
// GARDEN HEALTH SYSTEM — Tracks overall garden vitality
// ============================================================
export function gardenHealthSystem(world) {
  const entities = healthQuery(world);
  let totalHealth = 0;
  let totalMax = 0;

  for (const eid of entities) {
    totalHealth += Health.current[eid];
    totalMax += Health.max[eid];
  }

  const pct = totalMax > 0 ? totalHealth / totalMax : 0;
  world.gardenHealth = pct;

  // If garden health drops to 0, immediately trigger climax
  if (pct <= 0 && world.gameState < 2) {
    world.gameState = 2;
    world.stormProgress = 0;
  }

  // If garden health below 40% and still in ILLUSION, enter STRUGGLE
  if (pct < 0.4 && world.gameState === 0) {
    world.gameState = 1;
  }

  return world;
}


// ============================================================
// DECAY SYSTEM — Health constantly decreases over time
// ============================================================
export function decaySystem(world) {
  const { delta } = world.time;
  const entities = healthQuery(world);

  for (const eid of entities) {
    const state = EntityState.value[eid];
    // Don't decay if already ruined or being forced or reclaimed
    if (state === ENTITY_STATE.RUINED || state === ENTITY_STATE.RECLAIMED) continue;
    if (state === ENTITY_STATE.BEING_FORCED) continue;

    const current = Health.current[eid];
    const rate = Health.decayRate[eid];
    const mult = DecayMultiplier.value[eid];

    // Non-linear decay: accelerates below 50% health
    const healthPct = current / Health.max[eid];
    const accel = healthPct < 0.5 ? 1.0 + (1.0 - healthPct * 2) * 1.5 : 1.0;

    const newHealth = Math.max(0, current - rate * mult * accel * delta);
    Health.current[eid] = newHealth;

    // Update entity state based on health
    if (newHealth <= 0) {
      EntityState.value[eid] = ENTITY_STATE.RUINED;
    } else if (newHealth < Health.max[eid] * 0.9) {
      EntityState.value[eid] = ENTITY_STATE.FADING;
    }
  }
  return world;
}

// ============================================================
// INTERACTION SYSTEM — Handle mouse hover/click healing
// ============================================================
export function interactionSystem(world) {
  const { delta } = world.time;
  const { mouseX, mouseY, mouseDown, selectedTool, dragItem } = world.input;
  const entities = interactableQuery(world);

  // Reset hovered entity
  world.input.hoveredEntity = -1;

  // Check if we're in a state that allows interaction
  if (world.gameState >= 2) return world; // CLIMAX or REBIRTH — no input

  for (const eid of entities) {
    const state = EntityState.value[eid];
    if (state === ENTITY_STATE.RUINED || state === ENTITY_STATE.RECLAIMED) continue;

    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const sprite = world.sprites[SpriteRef.index[eid]];
    if (!sprite) continue;

    // Hit test — check if mouse is within sprite bounds
    // sprite.width/height already include scale in PixiJS 8
    const halfW = sprite.width / 2;
    const halfH = sprite.height / 2;
    const dx = mouseX - ex;
    const dy = mouseY - ey;

    if (Math.abs(dx) < halfW && Math.abs(dy) < halfH) {
      world.input.hoveredEntity = eid;

      // Check if mouse is held AND correct tool is selected/being dragged
      const toolReq = Interactable.toolRequired[eid];
      const hasTool = selectedTool === toolReq || (dragItem && dragItem.tool === toolReq);

      if (mouseDown && hasTool) {
        // Heal the entity — rapid health restoration
        const healRate = 25.0; // health/second while healing
        const prevHealth = Health.current[eid];
        Health.current[eid] = Math.min(
          Health.max[eid],
          Health.current[eid] + healRate * delta
        );

        // Set state to BEING_FORCED
        EntityState.value[eid] = ENTITY_STATE.BEING_FORCED;

        // Track this interaction for the effort tracker
        // Throttle: max 2 action entries per second to avoid frame-rate flooding
        const lastAction = world.effortTracker.actions[world.effortTracker.actions.length - 1] || 0;
        if (world.time.elapsed - lastAction > 0.5 && prevHealth < Health.max[eid]) {
          world.effortTracker.actions.push(world.time.elapsed);
          world.effortTracker.totalActions++;
        }

        // Signal the audio/visual systems
        world._healingActive = eid;
      } else {
        // Not healing — restore from BEING_FORCED if was set
        if (state === ENTITY_STATE.BEING_FORCED) {
          const h = Health.current[eid] / Health.max[eid];
          EntityState.value[eid] = h > 0.9 ? ENTITY_STATE.PRISTINE : ENTITY_STATE.FADING;
        }
      }
    } else {
      // Mouse not over this entity
      if (state === ENTITY_STATE.BEING_FORCED) {
        const h = Health.current[eid] / Health.max[eid];
        EntityState.value[eid] = h > 0.9 ? ENTITY_STATE.PRISTINE : ENTITY_STATE.FADING;
      }
    }
  }

  // Clear healing signal if nobody is being healed
  if (world.input.hoveredEntity === -1 || !mouseDown) {
    world._healingActive = -1;
  }

  return world;
}

// ============================================================
// EFFORT TRACKING SYSTEM — Monitors frantic user interactions
// ============================================================
const EFFORT_WINDOW = 10; // seconds
const EFFORT_THRESHOLD_STRUGGLE = 8;  // actions in window to trigger struggle
const EFFORT_THRESHOLD_CLIMAX = 18;   // actions in window to trigger climax

export function effortTrackingSystem(world) {
  const now = world.time.elapsed;
  const tracker = world.effortTracker;

  // Remove old actions outside the window
  tracker.actions = tracker.actions.filter(t => now - t < EFFORT_WINDOW);

  const recentCount = tracker.actions.length;

  // Transition logic
  if (world.gameState === 0) {
    // ILLUSION → STRUGGLE: after 45s OR lots of effort
    if (now > 45 || recentCount > EFFORT_THRESHOLD_STRUGGLE) {
      world.gameState = 1; // STRUGGLE
    }
  } else if (world.gameState === 1) {
    // STRUGGLE → CLIMAX: effort threshold exceeded
    if (recentCount > EFFORT_THRESHOLD_CLIMAX) {
      world.gameState = 2; // CLIMAX
      world.stormProgress = 0;
    }
    // Also auto-trigger climax after 120s total
    if (now > 120) {
      world.gameState = 2;
      world.stormProgress = 0;
    }
  }

  return world;
}

// ============================================================
// GAME STATE SYSTEM — Manages global state transitions
// ============================================================
const STORM_DURATION = 15; // seconds
const REBIRTH_DELAY = 3;   // seconds after storm before rebirth starts

export function gameStateSystem(world) {
  const { delta } = world.time;

  if (world.gameState === 0) {
    // ILLUSION — gradually ramp up decay
    const elapsed = world.time.elapsed;
    const ramp = 1.0 + Math.min(0.5, elapsed / 60); // 1.0 → 1.5 over 60s
    const entities = healthQuery(world);
    for (const eid of entities) {
      DecayMultiplier.value[eid] = ramp;
    }
  }

  if (world.gameState === 1) {
    // STRUGGLE — increase decay multipliers
    const entities = healthQuery(world);
    for (const eid of entities) {
      DecayMultiplier.value[eid] = 3.0; // 3× faster decay
    }
  }

  if (world.gameState === 2) {
    // CLIMAX — storm in progress
    world.stormProgress += delta;

    // Force all entities to die during storm
    const entities = healthQuery(world);
    for (const eid of entities) {
      if (EntityState.value[eid] !== ENTITY_STATE.RUINED) {
        Health.current[eid] = Math.max(0, Health.current[eid] - 15 * delta);
        if (Health.current[eid] <= 0) {
          Health.current[eid] = 0;
          EntityState.value[eid] = ENTITY_STATE.RUINED;
        }
      }
    }

    // Transition to REBIRTH
    if (world.stormProgress > STORM_DURATION) {
      world.gameState = 3; // REBIRTH
      world.rebirthProgress = 0;

      // Mark all ruined entities as RECLAIMED
      for (const eid of entities) {
        if (EntityState.value[eid] === ENTITY_STATE.RUINED) {
          EntityState.value[eid] = ENTITY_STATE.RECLAIMED;
        }
      }
    }
  }

  if (world.gameState === 3) {
    // REBIRTH — just track progress
    world.rebirthProgress += delta;
  }

  return world;
}
