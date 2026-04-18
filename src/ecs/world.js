/**
 * ECS World — Entity creation and world management
 */
import { createWorld, addEntity, addComponent } from 'bitecs';
import {
  Health, Position, SpriteRef, Interactable,
  EntityState, DecayMultiplier,
  ENTITY_STATE, ENTITY_TYPE, TOOL_TYPE,
} from './components.js';

/** Create the bitECS world */
export function createGameWorld() {
  const world = createWorld();
  world.time = { delta: 0, elapsed: 0 };
  world.input = {
    mouseX: 0, mouseY: 0,
    mouseDown: false,
    hoveredEntity: -1,
    selectedTool: TOOL_TYPE.NONE,
    dragItem: null,
  };
  world.gameState = 0; // ILLUSION
  world.effortTracker = {
    actions: [],        // timestamps of heal actions
    totalActions: 0,
  };
  world.entities = [];  // ordered list of entity IDs for iteration
  world.sprites = [];   // parallel PIXI sprite references
  world.stormProgress = 0;
  world.rebirthProgress = 0;
  return world;
}

/**
 * Entity factory — creates an entity with all standard components
 * @param {object} world - bitECS world
 * @param {object} config - { type, tool, x, y, health, decayRate, spriteIndex }
 * @returns {number} entity ID
 */
export function createEntity(world, config) {
  const eid = addEntity(world);

  addComponent(world, Health, eid);
  Health.current[eid] = config.health || 100;
  Health.max[eid] = config.health || 100;
  Health.decayRate[eid] = config.decayRate || 1.0;

  addComponent(world, Position, eid);
  Position.x[eid] = config.x || 0;
  Position.y[eid] = config.y || 0;

  addComponent(world, SpriteRef, eid);
  SpriteRef.index[eid] = config.spriteIndex || 0;

  addComponent(world, Interactable, eid);
  Interactable.type[eid] = config.type;
  Interactable.toolRequired[eid] = config.tool;

  addComponent(world, EntityState, eid);
  EntityState.value[eid] = ENTITY_STATE.PRISTINE;

  addComponent(world, DecayMultiplier, eid);
  DecayMultiplier.value[eid] = 1.0;

  world.entities.push(eid);
  return eid;
}

/**
 * Create all garden entities with their positions and properties.
 * Positions are in logical canvas coords (1376×768).
 */
export function populateGarden(world) {
  // Two plum blossom trees — left and right sides of garden
  createEntity(world, {
    type: ENTITY_TYPE.TREE,
    tool: TOOL_TYPE.PRUNER,
    x: 160, y: 300,
    health: 100, decayRate: 0.8,
    spriteIndex: 0,
  });

  createEntity(world, {
    type: ENTITY_TYPE.TREE,
    tool: TOOL_TYPE.PRUNER,
    x: 1050, y: 250,
    health: 100, decayRate: 0.9,
    spriteIndex: 1,
  });

  // Flower clusters — near the pond edges
  createEntity(world, {
    type: ENTITY_TYPE.FLOWER,
    tool: TOOL_TYPE.WATER,
    x: 100, y: 600,
    health: 100, decayRate: 1.2,
    spriteIndex: 2,
  });

  createEntity(world, {
    type: ENTITY_TYPE.FLOWER,
    tool: TOOL_TYPE.WATER,
    x: 850, y: 620,
    health: 100, decayRate: 1.1,
    spriteIndex: 3,
  });

  // Koi fish — in the pond area
  createEntity(world, {
    type: ENTITY_TYPE.FISH,
    tool: TOOL_TYPE.FISH_FOOD,
    x: 450, y: 500,
    health: 100, decayRate: 1.0,
    spriteIndex: 4,
  });

  // Cat — on the pavilion steps (right side)
  createEntity(world, {
    type: ENTITY_TYPE.CAT,
    tool: TOOL_TYPE.CAT_FOOD,
    x: 1150, y: 520,
    health: 100, decayRate: 0.7,
    spriteIndex: 5,
  });
}
