/**
 * ECS Components — bitECS component definitions
 * Every garden entity is composed of these data components.
 */
import { defineComponent, Types } from 'bitecs';

const { f32, ui8, ui32 } = Types;

/** Health that decays over time and can be restored by interaction */
export const Health = defineComponent({
  current: f32,
  max: f32,
  decayRate: f32,    // base units/second
});

/** World position (logical coordinates within 1376×768 canvas) */
export const Position = defineComponent({
  x: f32,
  y: f32,
});

/** Index into the global sprite array managed by the renderer */
export const SpriteRef = defineComponent({
  index: ui32,
});

/** What kind of entity this is — determines which tool can interact with it */
export const Interactable = defineComponent({
  type: ui8,        // EntityType enum
  toolRequired: ui8, // ToolType enum
});

/**
 * Entity visual/gameplay state
 * 0 = PRISTINE, 1 = FADING, 2 = BEING_FORCED, 3 = RUINED, 4 = RECLAIMED
 */
export const EntityState = defineComponent({
  value: ui8,
});

/** Multiplier applied to decay rate — increases as game progresses */
export const DecayMultiplier = defineComponent({
  value: f32,
});

// === Enums ===

export const ENTITY_STATE = {
  PRISTINE: 0,
  FADING: 1,
  BEING_FORCED: 2,
  RUINED: 3,
  RECLAIMED: 4,
};

export const ENTITY_TYPE = {
  TREE: 0,
  FLOWER: 1,
  FISH: 2,
  BIRD: 3,
  CAT: 4,
  POND: 5,
};

export const TOOL_TYPE = {
  NONE: 0,
  WATER: 1,       // for pond/flowers
  FISH_FOOD: 2,   // for fish
  CAT_FOOD: 3,    // for cat
  PRUNER: 4,      // for trees/flowers
  PAINT: 5,       // for structures
};
