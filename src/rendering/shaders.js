/**
 * Custom PIXI Filters — Desaturation and Glitch shaders
 * Uses PixiJS 8 Filter API with GLSL fragment shaders
 */
import { Filter, GlProgram } from 'pixi.js';

// ============================================================
// DESATURATION FILTER
// Drains color saturation based on uDecay uniform (0 = full, 1 = gray)
// Also applies a slight sepia/brown tint as decay increases
// ============================================================
const desatVertex = `
  in vec2 aPosition;
  out vec2 vTextureCoord;
  uniform vec4 uInputSize;
  uniform vec4 uOutputFrame;
  uniform vec4 uOutputTexture;

  vec4 filterVertexPosition(void) {
    vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
    position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
    position.y = position.y * (2.0*uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
    return vec4(position, 0.0, 1.0);
  }
  vec2 filterTextureCoord(void) {
    return aPosition * (uOutputFrame.zw * uInputSize.zw);
  }
  void main(void) {
    gl_Position = filterVertexPosition();
    vTextureCoord = filterTextureCoord();
  }
`;

const desatFrag = `
  in vec2 vTextureCoord;
  out vec4 finalColor;
  uniform sampler2D uTexture;
  uniform float uDecay;

  void main() {
    vec4 color = texture(uTexture, vTextureCoord);
    
    // Luminance weights (Rec. 709)
    float gray = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
    
    // Sepia tint for the decayed look
    vec3 sepia = vec3(gray * 1.1, gray * 0.9, gray * 0.7);
    
    // Mix: original → sepia/gray based on decay
    vec3 decayed = mix(color.rgb, mix(sepia, vec3(gray), uDecay * 0.5), uDecay);
    
    finalColor = vec4(decayed, color.a);
  }
`;

export class DesaturationFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({
      vertex: desatVertex,
      fragment: desatFrag,
    });
    super({
      glProgram,
      resources: {
        uniforms: {
          uDecay: { value: 0.0, type: 'f32' },
        },
      },
    });
  }

  get decay() {
    return this.resources.uniforms.uniforms.uDecay;
  }

  set decay(value) {
    this.resources.uniforms.uniforms.uDecay = value;
  }
}

// ============================================================
// GLITCH FILTER
// Chromatic aberration + scanline displacement when healing
// ============================================================
const glitchFrag = `
  in vec2 vTextureCoord;
  out vec4 finalColor;
  uniform sampler2D uTexture;
  uniform float uIntensity;
  uniform float uTime;

  float rand(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    vec2 uv = vTextureCoord;
    
    // Horizontal displacement based on scanlines
    float scanline = floor(uv.y * 30.0 + uTime * 5.0);
    float offset = (rand(vec2(scanline, uTime)) - 0.5) * uIntensity * 0.05;
    
    // Chromatic aberration
    float rOffset = uIntensity * 0.008;
    
    float r = texture(uTexture, vec2(uv.x + offset + rOffset, uv.y)).r;
    float g = texture(uTexture, vec2(uv.x + offset, uv.y)).g;
    float b = texture(uTexture, vec2(uv.x + offset - rOffset, uv.y)).b;
    float a = texture(uTexture, uv).a;
    
    // Flash effect — periodic white bursts
    float flash = step(0.95, rand(vec2(uTime * 10.0, 0.0))) * uIntensity * 0.4;
    
    finalColor = vec4(r + flash, g + flash, b + flash, a);
  }
`;

export class GlitchFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({
      vertex: desatVertex, // reuse same vertex shader
      fragment: glitchFrag,
    });
    super({
      glProgram,
      resources: {
        uniforms: {
          uIntensity: { value: 0.0, type: 'f32' },
          uTime: { value: 0.0, type: 'f32' },
        },
      },
    });
  }

  get intensity() {
    return this.resources.uniforms.uniforms.uIntensity;
  }
  set intensity(value) {
    this.resources.uniforms.uniforms.uIntensity = value;
  }

  get time() {
    return this.resources.uniforms.uniforms.uTime;
  }
  set time(value) {
    this.resources.uniforms.uniforms.uTime = value;
  }
}

// ============================================================
// VIGNETTE FILTER — Dark overlay from edges for storm
// ============================================================
const vignetteFrag = `
  in vec2 vTextureCoord;
  out vec4 finalColor;
  uniform sampler2D uTexture;
  uniform float uDarkness;
  uniform float uSize;

  void main() {
    vec4 color = texture(uTexture, vTextureCoord);
    vec2 center = vec2(0.5);
    float dist = distance(vTextureCoord, center);
    float vignette = smoothstep(uSize, uSize - 0.35, dist);
    color.rgb *= mix(1.0, vignette, uDarkness);
    // Also darken overall
    color.rgb *= (1.0 - uDarkness * 0.5);
    finalColor = color;
  }
`;

export class VignetteFilter extends Filter {
  constructor() {
    const glProgram = GlProgram.from({
      vertex: desatVertex,
      fragment: vignetteFrag,
    });
    super({
      glProgram,
      resources: {
        uniforms: {
          uDarkness: { value: 0.0, type: 'f32' },
          uSize: { value: 0.8, type: 'f32' },
        },
      },
    });
  }

  get darkness() {
    return this.resources.uniforms.uniforms.uDarkness;
  }
  set darkness(value) {
    this.resources.uniforms.uniforms.uDarkness = value;
  }
}
