
### **Phase 1: Architecture & Tech Stack**
For a 2D, heavily visual, and interaction-driven web game, you want a framework that handles the rendering loop efficiently while giving you fine-grained control over states.

* **Rendering Engine:** **Phaser.js** or **PixiJS**. PixiJS is strictly a 2D WebGL renderer and is incredibly fast, making it perfect if you want to write your own custom game loop and physics. Phaser is a full game engine with built-in asset loading and scene management.
* **State Management:** You will need a robust way to track the "health" or "lifespan" of every object. A simple Entity Component System (ECS) or a centralized state manager (like Redux, if using React as a wrapper, though native JS objects in a game loop are faster) will keep track of decay rates.
* **Audio Engine:** **Howler.js**. Audio is 50% of the lyrical experience. Howler handles spatial audio and cross-fading seamlessly, allowing you to dynamically shift from serene music to scraping tension sounds.

### **Phase 2: Asset Pipeline & Art Direction**
The visual transition from meticulously maintained to naturally ruined is the core mechanic.

* **Base Assets:** Create or source 2D illustrations of the Chinese garden (pavilions, ponds, walls, flora, fauna). 
* **Decay States:** Instead of drawing 10 different states of decay for every object, use a single base sprite and utilize WebGL shaders or canvas blending modes. You can programmatically drain the saturation, shift the hue to yellow/brown, or decrease the alpha channel (transparency) as the object's health decreases.
* **The "Rebirth" Assets:** Prepare a separate set of assets for the post-storm wild flora. These should have a softer, perhaps ink-wash style texture to contrast with the rigid outlines of the initial garden.

### **Phase 3: Core Game Loop & State Mechanics**
This is where the "Illusion of Permanence" is actually coded.

* **The Global Clock:** Implement a continuous game loop (using `requestAnimationFrame`). Time is your primary enemy in this game.
* **Entity Properties:** Every interactable object needs properties: `currentHealth`, `maxHealth`, `decayRate`, and `state` (Prisitne, Fading, Dead, Reborn).
* **The Decay Algorithm:** In the update loop, systematically subtract the `decayRate` from `currentHealth`.
    * *Implementation detail:* Make the `decayRate` non-linear. Things decay slowly at first, then exponentially faster, inducing panic in the user.

### **Phase 4: Input & Interaction Logic**
The interaction must feel like a forceful, desperate act of preservation rather than a casual click.

* **Input Handling:** Detect `mousedown` and `hold` events on specific coordinates or entity bounding boxes.
* **The "Forced Healing" Mechanic:** While the user holds the mouse down on a fading entity, run a function that rapidly restores `currentHealth`. 
* **Sensory Feedback:** Tie the `currentHealth` variable directly to visual and auditory outputs. As health drops, `sprite.tint` changes. As the user "force heals" an object, trigger screen shake or particle effects, and play the harsh, synthetic audio loop to make the action feel jarring.

### **Phase 5: Event Triggers (The Storm & Rebirth)**
This phase dictates the emotional climax of the artefact.

* **The Tension Threshold:** Create a global variable that tracks "User Effort" (e.g., how many times they've clicked/held to heal objects in the last 60 seconds). When this effort hits a critical threshold—meaning they are fighting their hardest to maintain the illusion—trigger the Storm Event.
* **The Storm Override:** Disable all user input listeners. Overlay a full-screen semi-transparent sprite (snow or dark rain) and fade out the ambient audio track, replacing it with heavy wind. Rapidly force all garden entities to `currentHealth = 0`.
* **Procedural Rebirth:** Once the storm passes, initiate the rebirth state. Instead of hard-coding where the new wild plants grow, use a lightweight procedural generation algorithm to spawn the "Rebirth" assets randomly around the ruined architecture. This ensures the ending feels organic and out of the user's control.

### **Phase 6: Deployment & Polish**
* **Preloading:** Ensure all visual and audio assets are preloaded before the canvas renders. A blank screen with a loading bar ruins immersion.
* **Hosting:** Package the build using Vite or Webpack and deploy it on a lightweight, static hosting service like Vercel, GitHub Pages, or Netlify. 
* **Performance Profiling:** Check for memory leaks, especially with the continuous generation of particles during the "healing" phase or the procedural generation at the end. The browser tab shouldn't crash just because time is passing.