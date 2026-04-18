Concept: A 2D interactive artefact framed as a meticulously maintained traditional Chinese scholar's garden. It explores the emotional tension between the human desire to permanently preserve a moment and the inevitable, beautiful decay brought by time.
Mechanics: The user is tasked with maintaining the garden (painting walls, watering ponds, feeding animals). As time progresses, elements naturally fade and decay. The user can "force" them back to life by holding their cursor over them, but this action is paired with jarring visual glitches and harsh audio, making the act of preservation feel tense and unnatural.
Climax: Reaching a high threshold of frantic maintenance triggers a storm that disables user input and wipes out the structured garden.
Resolution: After the storm, the user watches as wild, uncultivated flora naturally reclaims the ruined architecture, shifting the mood from anxious control to quiet, organic acceptance.

Use Rendering Engine: PixiJS, Architecture: bitECS, Audio Engine: Howler.js, 


Phase 1: Foundation & Asset Loading

    Set up the development environment using a rapid bundler.

    Pre-load all core assets: background layers, structural sprites (pristine and ruined states), and ambient audio tracks. There are many assets all in the assets/ folder. Some of the images are combined, like mnay individual interactive objects in the same image. You are to identify and cleverly load the correct ones. 

    Establish the global game loop to govern the passage of "time."

Phase 2: Entity State Management

    Implement a system where every garden element (flower, fish, wall) has a health value that constantly decreases.

    Link the health variable to a WebGL shader that dynamically drains the color (saturation) from the sprite as it decays, rather than drawing dozens of different frames for each object.

Phase 3: The "Unnatural" Interaction

    Build the mouse-hold event listeners. Can create a game menue tool bar to allow user to drag relevant assets to interact with the game.

    When a user forcefully heals an object, trigger a harsh screen-shake effect on that specific sprite.

    Fire the synthetic, abrasive sound effect to contrast heavily with the peaceful ambient music.

Phase 4: The Climax & Procedural Rebirth

    Create a hidden "effort tracker" that monitors the frequency of user clicks.

    Once the threshold is hit, lock all inputs, trigger the storm overlay (rain/darkness vignette), and force all entity health to zero.

    Write a lightweight procedural generation script that randomly spawns the "wild flora" sprites on top of the ruined architecture once the storm clears.









Phase 1: Project Scaffolding
 Initialize Vite project with dependencies
 Create index.html with loading screen
 Create vite.config.js
Phase 2: Asset Pipeline
 Write sprite cropping script (scripts/crop-sprites.js)
 Run cropping, verify output
 Copy audio files to public
 Generate wild flora images for rebirth
Phase 3: Core ECS Architecture
 Define bitECS components
 Create world & entity factories
 Implement DecaySystem
 Implement SpriteUpdateSystem
 Implement InteractionSystem
 Implement EffortTrackingSystem
 Implement GameStateSystem
Phase 4: Rendering
 PixiJS app setup with layer management
 Desaturation shader (GLSL)
 Glitch shader (GLSL)
 Screen shake & flash effects
 Storm overlay (rain + vignette)
 Rebirth particles
Phase 5: Audio
 Howler.js manager with crossfade
 Web Audio API synth (glitch SFX, thunder, wind chimes)
Phase 6: Interaction & UI
 Mouse input tracking & hit testing
 Toolbar with tool icons
 Drag-and-drop tool → entity interaction
 Loading screen
Phase 7: Game State Machine
 State machine implementation
 ILLUSION → STRUGGLE transition
 STRUGGLE → CLIMAX transition (effort threshold)
 CLIMAX storm sequence
 REBIRTH procedural flora spawning
Phase 8: Polish & Verification
 Play through full cycle
 Performance profiling
 Responsive scaling
