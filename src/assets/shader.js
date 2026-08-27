
/* ══════════════════════════════════════════════════════════════════════
   PULSING BORDER SHADER  -  services section backdrop

   Shader adapted from Paper Shaders (Apache-2.0):
   https://shaders.paper.design/pulsing-border
   Ported from the React component to vanilla JS: this project has no
   framework and no build step, and the original is imperative WebGL apart
   from useRef/useEffect.

   Kept from the original: off-screen and hidden-tab pausing, the 2MP pixel
   budget, DPR cap, ResizeObserver relayout.
   Added: shader compile/link checks with a silent bail, prefers-reduced-
   motion (renders one still frame instead of animating), and pointer
   handling stripped out since the cursor effect is off.
   ══════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var canvas = document.getElementById('svc-shader');
  if (!canvas) return;

  var VERT =
    'attribute vec2 a_position;' +
    'void main(){ gl_Position = vec4(a_position, 0.0, 1.0); }';

  var FRAG = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec3 u_colors[8];
uniform vec4 u_scene;      // resolution.xy, time, colour count
uniform vec4 u_shape;      // scale, intensity, paramA, warp
uniform vec4 u_surface;    // detail, contrast, brightness, saturation
uniform vec4 u_finish;     // hue, vignette, blur, grain
uniform vec4 u_transform;  // seed, rotation, drift, OKLab toggle
uniform vec4 u_space;      // offset.xy, pointer.xy

#define u_resolution u_scene.xy
#define u_time u_scene.z
#define u_colorCount u_scene.w
#define u_scale u_shape.x
#define u_intensity u_shape.y
#define u_paramA u_shape.z
#define u_warp u_shape.w
#define u_detail u_surface.x
#define u_contrast u_surface.y
#define u_brightness u_surface.z
#define u_saturation u_surface.w
#define u_hue u_finish.x
#define u_vignette u_finish.y
#define u_blur u_finish.z
#define u_grain u_finish.w
#ifdef GL_FRAGMENT_PRECISION_HIGH
#define u_seed u_transform.x
#else
#define u_seed mod(u_transform.x, 31.0)
#endif
#define u_rotate u_transform.y
#define u_drift u_transform.z
#define u_oklab u_transform.w
#define u_offset u_space.xy

float hash21(vec2 p) {
#ifndef GL_FRAGMENT_PRECISION_HIGH
  p = mod(p, 31.0);
#endif
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

float grainHash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(17.0, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 srgbToLinear(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c));
}
vec3 linearToSrgb(vec3 c) {
  return mix(c * 12.92, 1.055 * pow(max(c, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055,
    step(0.0031308, c));
}
vec3 linToOklab(vec3 c) {
  float l = 0.4122214708 * c.r + 0.5363325363 * c.g + 0.0514459929 * c.b;
  float m = 0.2119034982 * c.r + 0.6806995451 * c.g + 0.1073969566 * c.b;
  float s = 0.0883024619 * c.r + 0.2817188376 * c.g + 0.6299787005 * c.b;
  l = pow(max(l, 0.0), 1.0 / 3.0);
  m = pow(max(m, 0.0), 1.0 / 3.0);
  s = pow(max(s, 0.0), 1.0 / 3.0);
  return vec3(
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s);
}
vec3 oklabToLin(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}
vec3 mixColour(vec3 a, vec3 b, float t) {
  if (u_oklab > 0.5) {
    vec3 la = linToOklab(srgbToLinear(a));
    vec3 lb = linToOklab(srgbToLinear(b));
    return clamp(linearToSrgb(oklabToLin(mix(la, lb, t))), 0.0, 1.0);
  }
  return mix(a, b, t);
}

vec3 palette(float x) {
  float n = max(u_colorCount - 1.0, 1.0);
  float f = clamp(x, 0.0, 1.0) * n;
  vec3 col = u_colors[0];
  for (int i = 0; i < 7; i++) {
    if (float(i) < n)
      col = mixColour(col, u_colors[i + 1],
        smoothstep(0.0, 1.0, clamp(f - float(i), 0.0, 1.0)));
  }
  return col;
}

vec3 hueRotate(vec3 col, float a) {
  const mat3 toYIQ = mat3(0.299, 0.596, 0.211,
                          0.587, -0.274, -0.523,
                          0.114, -0.322, 0.312);
  const mat3 toRGB = mat3(1.0, 1.0, 1.0,
                          0.956, -0.272, -1.106,
                          0.621, -0.647, 1.703);
  vec3 yiq = toYIQ * col;
  float ca = cos(a), sa = sin(a);
  yiq = vec3(yiq.x, yiq.y * ca - yiq.z * sa, yiq.y * sa + yiq.z * ca);
  return toRGB * yiq;
}

vec3 shade(vec2 uv, vec2 p, float t) {
  // The original hard-codes box = vec2(0.82, 0.47), which on a tall section
  // puts the horizontal arcs straight through the headline. Deriving the box
  // from the canvas instead keeps the ring hugging the section edge at every
  // aspect ratio, so it frames the content rather than crossing it.
  vec2 halfExtent =
    0.5 * u_resolution / min(u_resolution.x, u_resolution.y) * u_scale;
  vec2 box = halfExtent * 0.90;
  vec2 d = abs(p) - box;
  float outside = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
  float thickness = mix(0.018, 0.11, u_paramA);
  float edge = 1.0 - smoothstep(thickness * 0.35, thickness, abs(outside));
  float perimeter = atan(p.y * box.x, p.x * box.y) / 6.2831853 + 0.5;
  float pulse = 0.5 + 0.5 * sin(perimeter * (5.0 + u_intensity * 9.0) - t * 1.8);
  float trail = pow(pulse, mix(7.0, 2.0, u_intensity));
  float innerGlow = exp(-abs(outside) * 24.0) * 0.32;
  return mix(u_colors[0], palette(trail), clamp(edge + innerGlow, 0.0, 1.0));
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution.xy;
  vec2 screenUv = uv;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_resolution.xy)
    / min(u_resolution.x, u_resolution.y);

  uv = p * min(u_resolution.x, u_resolution.y) / u_resolution.xy + 0.5;
  p *= u_scale;
  if (abs(u_rotate) > 0.0001) {
    float cr = cos(u_rotate), sr = sin(u_rotate);
    p = mat2(cr, -sr, sr, cr) * p;
  }
  p += u_offset;
  if (u_drift > 0.0001)
    p += u_drift * vec2(sin(u_time * 0.31), cos(u_time * 0.23));
  if (u_warp > 0.0) {
    p += u_warp * (vec2(
      fbm(p * u_detail + u_seed),
      fbm(p * u_detail + vec2(5.2, 1.3))) - 0.5);
  }
  vec3 col;
  if (u_blur > 0.0) {
    float e = u_blur;
    float pe = e * u_scale;
    vec2 uvE = vec2(e) * min(u_resolution.x, u_resolution.y) / u_resolution.xy;
    col  = shade(uv, p, u_time) * 0.36;
    col += shade(uv + vec2(uvE.x, 0.0), p + vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv - vec2(uvE.x, 0.0), p - vec2(pe, 0.0), u_time) * 0.16;
    col += shade(uv + vec2(0.0, uvE.y), p + vec2(0.0, pe), u_time) * 0.16;
    col += shade(uv - vec2(0.0, uvE.y), p - vec2(0.0, pe), u_time) * 0.16;
  } else {
    col = shade(uv, p, u_time);
  }
  if (abs(u_contrast - 1.0) > 0.0001)
    col = (col - 0.5) * u_contrast + 0.5;
  if (abs(u_saturation - 1.0) > 0.0001) {
    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, u_saturation);
  }
  if (abs(u_hue) > 0.0001)
    col = hueRotate(col, u_hue);
  if (abs(u_brightness) > 0.0001)
    col += u_brightness;
  if (u_vignette > 0.0001) {
    float vd = length(screenUv - 0.5) * 1.41421356;
    col *= 1.0 - u_vignette * smoothstep(0.35, 1.0, vd);
  }
  if (u_grain > 0.0001)
    col += (grainHash(
      gl_FragCoord.xy + vec2(u_seed * 17.0, u_seed * 31.0)) - 0.5) * u_grain;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`;

  /* Recipe colours. These already sit on the AlvSolutions palette:
     near-black navy base, deep blue, brand cyan, near-white highlight. */
  var U = {
    colors: [
      [0.0196078431, 0.0274509804, 0.0509803922],  // #05070D  base navy
      [0.0705882353, 0.3803921569, 0.6274509804],  // #1261A0  deep blue
      [0.2078431373, 0.7686274510, 0.9098039216],  // #35C4E8  brand cyan
      [0.9490196078, 0.9843137255, 1.0],           // #F2FBFF  highlight
      [0.9490196078, 0.9843137255, 1.0],
      [0.9490196078, 0.9843137255, 1.0],
      [0.9490196078, 0.9843137255, 1.0],
      [0.9490196078, 0.9843137255, 1.0]
    ],
    // 3 stops, not 4: the 4th is a near-white highlight that blows out to
    // grey glare on a dark navy page. Stopping at the brand cyan keeps the
    // glow on-palette.
    colorCount: 3,
    scale: 1.26, intensity: 0.40, paramA: 0.30, warp: 0,
    detail: 1.824, contrast: 1.005, brightness: 0, saturation: 1,
    hue: 0, vignette: 0, blur: 0, grain: 0.042,
    seed: 1, rotate: 0, offsetX: 0, offsetY: 0, drift: 0,
    oklab: 0, timeScale: 0.575
  };

  var gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) { canvas.style.display = 'none'; return; }   // no WebGL: plain bg

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      gl.deleteShader(s);
      return null;
    }
    return s;
  }

  var vs = compile(gl.VERTEX_SHADER, VERT);
  var fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) { canvas.style.display = 'none'; return; }

  var program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    canvas.style.display = 'none';
    return;
  }
  gl.useProgram(program);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(program, 'a_position');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  function u(name) { return gl.getUniformLocation(program, name); }
  var uScene = u('u_scene'), uSpace = u('u_space');

  var flat = [];
  for (var i = 0; i < U.colors.length; i++) {
    flat.push(U.colors[i][0], U.colors[i][1], U.colors[i][2]);
  }
  gl.uniform3fv(u('u_colors'), new Float32Array(flat));
  gl.uniform4f(u('u_shape'), U.scale, U.intensity, U.paramA, U.warp);
  gl.uniform4f(u('u_surface'), U.detail, U.contrast, U.brightness, U.saturation);
  gl.uniform4f(u('u_finish'), U.hue, U.vignette, U.blur, U.grain);
  gl.uniform4f(u('u_transform'), U.seed, U.rotate, U.drift, U.oklab);

  var raf = 0, start = performance.now();
  var visible = document.visibilityState === 'visible';
  var inView = false;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  function resize() {
    var r = canvas.getBoundingClientRect();
    // DPR is deliberately NOT applied: this layer is blurred 28px in CSS, so
    // rendering above 1x is invisible work. The original's 2MP budget pegs
    // software WebGL (SwiftShader) on machines without a GPU; 0.3MP looks
    // identical through the blur and costs ~7x less per frame.
    var rw = Math.max(1, Math.round(r.width));
    var rh = Math.max(1, Math.round(r.height));
    var k = Math.min(1, Math.sqrt(300000 / Math.max(1, rw * rh)));
    var w = Math.max(1, Math.round(rw * k));
    var h = Math.max(1, Math.round(rh * k));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  }

  function draw(timeSeconds) {
    resize();
    gl.uniform4f(uScene, canvas.width, canvas.height, timeSeconds, U.colorCount);
    gl.uniform4f(uSpace, U.offsetX, U.offsetY, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    raf = 0;
    if (!visible || !inView) return;
    draw(((now - start) / 1000) * U.timeScale);
    raf = requestAnimationFrame(frame);
  }

  function play() {
    if (reduce.matches) { draw(0); return; }   // one still frame, no loop
    if (raf === 0 && visible && inView) raf = requestAnimationFrame(frame);
  }
  function stop() {
    if (raf !== 0) { cancelAnimationFrame(raf); raf = 0; }
  }

  // only run while the section is actually on screen
  new IntersectionObserver(function (entries) {
    inView = entries[0].isIntersecting;
    if (inView) play(); else stop();
  }).observe(canvas);

  document.addEventListener('visibilitychange', function () {
    visible = document.visibilityState === 'visible';
    if (visible) play(); else stop();
  });

  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(function () {
      resize();
      if (reduce.matches) draw(0);
    }).observe(canvas);
  }

  // respond live if the user flips the reduced-motion setting
  var onReduce = function () { stop(); play(); };
  if (reduce.addEventListener) reduce.addEventListener('change', onReduce);
  else if (reduce.addListener) reduce.addListener(onReduce);
})();
