Here is a comprehensive breakdown of the assets, art, and states you will need to build this artefact. To keep your workload manageable and performance high, this list is designed to rely heavily on code-driven visual effects (like shaders and opacity changes) rather than drawing dozens of frames for every single object.

### **1. Visual Assets (2D Sprites & Backgrounds)**

**The Environment (Background & Base Layers)**
* **Backdrop:** A serene, painted sky (can shift color via code from dawn to dusk to gray).
* **Ground:** A meticulously swept dirt or stone path base layer.
* **The Pond Basin:** The empty physical hole in the ground (water will be placed on top).

**Structural Elements (Requires Base & Ruined Sprites)**
* **Garden Walls:** * *Sprite A:* Pristine, freshly painted white with clean gray brick roofing.
    * *Sprite B:* Collapsed, crumbled section of the wall.
* **The Pavilion/House Exterior:** * *Sprite A:* Ornate, polished wood with perfect tiles.
    * *Sprite B:* Weather-beaten, slightly sunken or tilted, broken tiles.

**The Flora & Fauna (The Main Interactables)**
* **The Trees (e.g., Plum Blossom or Willow):** * *Sprite A:* Fully bloomed and vibrant.
    * *Sprite B:* Bare, dead branches.
* **The Flowers (e.g., Peonies or Lotus):**
    * *Sprite A:* Open and vibrant.
    * *Sprite B:* Drooping, browned, and withered.
* **The Animals:**
    * *Sprite A (Fish):* Bright Koi, swimming animation (can just be a simple 2-frame wiggle).
    * *Sprite B (Caged Bird):* Brightly colored bird inside a rigid, ornate cage.
    * *Sprite C (Cat/Dog):* Sleeping or sitting perfectly still on a pavilion step.

**The Overlay Effects (For Tension & The Storm)**
* **Pond Water:** A semi-transparent blue/green shape (scale it down on the Y-axis to simulate drying up).
* **The Storm:** A screen-sized, looping particle effect or animated sprite of heavy rain/snow and encroaching darkness (vignette).
* **The "Maintenance" Glitch:** A visual distortion shader or a sharp, white "flash" mask applied to entities when the user forcefully heals them.

**The Rebirth Assets (Post-Storm)**
* *Note: These should have a slightly different art style—softer, like faded ink-wash, contrasting the rigid perfection of the first stage.*
* **Wild Vines & Moss:** Organic shapes that can be procedurally layered over the ruined walls and pavilion.
* **Uncultivated Wildflowers:** Small, subtle plants that sprout from the cracks in the ground.
* **Wild Bird:** A simple silhouette of a bird flying freely across the sky.

---

### **2. Audio Assets (The Emotional Drivers)**

**Background Music (BGM)**
* **Track 1 (The Illusion):** Traditional Chinese instruments (Guzheng or Guqin). Placid, highly structured, and repetitive.
* **Track 2 (The Desperation):** The same melody as Track 1, but pitched down slightly, with minor discordant notes or a subtle, stressful ticking rhythm introduced.
* **Track 3 (The Storm):** No music. Just the heavy, overwhelming sound of wind and rain.
* **Track 4 (The Rebirth):** Soft, organic ambient sounds. Wind chimes, natural breezes, and warm acoustic tones. No rigid melody.

**Sound Effects (SFX)**
* **Natural Decay:** Subtle sounds of cracking wood, a dry leaf rustling, or a splash getting quieter.
* **Forced Maintenance (Crucial):** A synthetic, almost abrasive sound. Imagine the sound of a VHS tape rewinding or a sharp digital scrape. It must feel unnatural.
* **The Breaking Point:** A loud thunderclap or the deep, resounding strike of a gong that triggers the storm.

---

### **3. Game Logic States**

**Global Game States (The Narrative Arc)**
1.  **`STATE_ILLUSION`:** The game begins. Decay rates are slow. Music is peaceful. User interaction yields gentle results.
2.  **`STATE_STRUGGLE`:** Decay rates multiply. Music becomes tense. The user is forced into constant, frantic clicking/holding. The "synthetic" feedback is highly active.
3.  **`STATE_CLIMAX`:** Triggered by high user interaction. Input is completely disabled. The Storm overlay activates. All entities are forcefully pushed to their dead/ruined states.
4.  **`STATE_REBIRTH`:** The storm fades. Input remains disabled (observation only). The Rebirth visual assets dynamically fade in over the ruined structures. BGM Track 4 plays.

**Entity States (Attached to every Flora, Fauna, and Structure)**
1.  **`PRISTINE`:** `currentHealth` is at 100%. Sprite A is fully saturated. 
2.  **`FADING`:** `currentHealth` is dropping. A desaturation shader is applied. The sprite may begin to gently shake on the X/Y axis.
3.  **`BEING_FORCED`:** The user is clicking/holding the object. `currentHealth` rapidly increases. The "glitch" visual mask and synthetic audio play. 
4.  **`RUINED`:** `currentHealth` hits 0. Sprite B replaces Sprite A. The entity is no longer interactable.
5.  **`RECLAIMED`:** Used only during `STATE_REBIRTH`. The entity remains in its `RUINED` state, but serves as an anchor point to spawn the wild moss/vine sprites.