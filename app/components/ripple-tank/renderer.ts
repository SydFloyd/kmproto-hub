import { copyOpacity } from "./geometry.ts";
import type { PoolLayout } from "./geometry.ts";
import type { PoolFrame } from "./simulation.ts";

export type WaterCursor = { x: number; y: number; visible: boolean };
export interface WaterRenderer {
  resize(layout: PoolLayout): void;
  update(frame: PoolFrame): void;
  draw(time: number, cursor: WaterCursor, energy?: number): boolean;
  dispose(): void;
}

const VERTEX = `
precision highp float;
attribute vec2 a_position;
attribute vec2 a_uv;
attribute float a_size;
attribute float a_letter;
uniform vec2 u_resolution;
uniform vec2 u_grid;
uniform vec4 u_copy;
uniform float u_ratio;
uniform float u_time;
uniform float u_energy;
uniform sampler2D u_field;
varying vec4 v_color;
varying float v_glyph;
void main() {
  vec2 p = a_position;
  float alpha = 1.0;
  if (u_copy.z >= 0.0 && a_letter >= 0.0) {
    vec2 d = max(max(u_copy.xy - p, p - u_copy.xy - u_copy.zw), vec2(0.0));
    alpha = 0.1 + 0.9 * smoothstep(0.0, min(100.0, u_resolution.x * 0.16), length(d));
  }
  vec3 color = vec3(0.949, 0.894, 0.773);
  float energy = 0.0;
  if (a_letter < 0.0) { v_glyph = 2.0; }
  else {
    vec4 field = texture2D(u_field, a_uv);
    float height = (field.r * 65280.0 + field.g * 255.0 - 32768.0) / 32767.0;
    float calm = 1.0 - exp(-u_time / 8.0);
    if (a_letter > 0.0) {
      vec2 t = 1.0 / u_grid;
      float glint = max(max(texture2D(u_field, a_uv + t * vec2(-0.5, -0.5)).b,
        texture2D(u_field, a_uv + t * vec2(0.5, -0.5)).b),
        max(texture2D(u_field, a_uv + t * vec2(-0.5, 0.5)).b,
        texture2D(u_field, a_uv + t * vec2(0.5, 0.5)).b)) * u_energy;
      energy = glint * 1.8;
      alpha *= a_letter * min(1.0, glint / 0.045);
      color = mix(vec3(0.165, 0.392, 0.439), vec3(0.977, 0.906, 0.777), min(1.0, energy * 1.6 + 0.2));
    } else {
      float bend = sin(a_uv.x * 5.0 - a_uv.y * 3.0 + u_time * 0.09);
      float tide = calm * 0.005 * sin(a_uv.x * 7.0 + a_uv.y * 8.0 + bend - u_time * 0.25);
      float value = height * u_energy + tide;
      energy = abs(value) * 2.0;
      float ink = pow(clamp((energy * 24.0 + 2.0) / 15.0, 0.0, 1.0), 0.75);
      color = value >= 0.0 || energy < 0.016
        ? mix(vec3(0.161, 0.337, 0.408), vec3(0.769, 0.957, 0.886), ink)
        : mix(vec3(0.114, 0.235, 0.314), vec3(0.4, 0.678, 0.745), ink);
      p += vec2(sin(a_uv.y * 7.0 + a_uv.x * 3.0 - u_time * 0.12),
        cos(a_uv.x * 7.0 - a_uv.y * 3.0 - u_time * 0.1)) * calm * a_size * 0.075;
    }
    v_glyph = energy < 0.016 ? 0.0 : energy < 0.04 ? 1.0 : energy < 0.11 ? 2.0 : energy < 0.28 ? 3.0 : 4.0;
  }
  v_color = vec4(color, alpha);
  gl_Position = vec4(p.x / u_resolution.x * 2.0 - 1.0, 1.0 - p.y / u_resolution.y * 2.0, 0.0, 1.0);
  gl_PointSize = a_size * u_ratio;
}`;
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_glyphs;
varying vec4 v_color;
varying float v_glyph;
void main() {
  float ink = texture2D(u_glyphs, vec2((v_glyph + gl_PointCoord.x) / 5.0, gl_PointCoord.y)).a;
  float alpha = ink * v_color.a;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(v_color.rgb, alpha);
}`;

function glyphAtlas(colored = false) {
  const canvas = document.createElement("canvas"); canvas.width = 160; canvas.height = colored ? 768 : 32;
  const ink = canvas.getContext("2d")!;
  ink.font = '26px "Courier New", monospace'; ink.textAlign = "center"; ink.textBaseline = "middle";
  const palettes = [[[29, 60, 80], [102, 173, 190]], [[41, 86, 104], [196, 244, 226]], [[42, 100, 112], [249, 231, 198]]];
  for (let row = 0; row < (colored ? 24 : 1); row++) {
    const [base, peak] = palettes[Math.floor(row / 8)], mix = (row % 8 / 7) ** 0.75;
    ink.fillStyle = colored ? `rgb(${base.map((v, i) => Math.round(v + (peak[i] - v) * mix)).join(",")})` : "white";
    ["·", ",", ":", "~", "≈"].forEach((mark, i) => ink.fillText(mark, i * 32 + 16, row * 32 + 16));
  }
  return canvas;
}

export class BatchedWaterRenderer implements WaterRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private vertexBuffer: WebGLBuffer;
  private fieldTexture: WebGLTexture;
  private glyphTexture: WebGLTexture;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private parallel: { COMPLETION_STATUS_KHR: number } | null;
  private ready = false;
  private layout: PoolLayout | null = null;
  private count = 0;
  private fieldWidth = 1;
  private fieldHeight = 1;
  private cursorVertices = new Float32Array(24);

  constructor(private canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: "low-power", preserveDrawingBuffer: false });
    if (!gl) throw new Error("WebGL unavailable");
    this.gl = gl;
    if (gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS) < 1) throw new Error("Vertex textures unavailable");
    this.parallel = gl.getExtension("KHR_parallel_shader_compile");
    const program = gl.createProgram()!;
    for (const [type, source] of [[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]] as const) {
      const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); gl.attachShader(program, shader); gl.deleteShader(shader);
    }
    ["a_position", "a_uv", "a_size", "a_letter"].forEach((name, index) => gl.bindAttribLocation(program, index, name));
    gl.linkProgram(program); this.program = program;
    this.vertexBuffer = gl.createBuffer()!;
    const texture = (unit: number) => {
      const value = gl.createTexture()!; gl.activeTexture(unit); gl.bindTexture(gl.TEXTURE_2D, value);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return value;
    };
    this.fieldTexture = texture(gl.TEXTURE0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 0, 0, 255]));
    this.glyphTexture = texture(gl.TEXTURE1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, glyphAtlas());
    gl.enable(gl.BLEND); gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
  }
  resize(layout: PoolLayout) {
    this.layout = layout; this.count = layout.points.length / 6;
    const gl = this.gl;
    this.canvas.width = Math.floor(layout.width * layout.ratio); this.canvas.height = Math.floor(layout.height * layout.ratio);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, layout.points.byteLength + this.cursorVertices.byteLength, gl.STATIC_DRAW);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, layout.points);
    for (const [index, size, offset] of [[0, 2, 0], [1, 2, 8], [2, 1, 16], [3, 1, 20]]) {
      gl.enableVertexAttribArray(index); gl.vertexAttribPointer(index, size, gl.FLOAT, false, 24, offset);
    }
  }
  update(frame: PoolFrame) {
    const gl = this.gl; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, this.fieldTexture);
    const pixels = new Uint8Array(frame.buffer);
    if (this.fieldWidth !== frame.columns || this.fieldHeight !== frame.rows) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, frame.columns, frame.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      this.fieldWidth = frame.columns; this.fieldHeight = frame.rows;
    } else gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, frame.columns, frame.rows, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  }
  draw(time: number, cursor: WaterCursor, energy = 1) {
    const gl = this.gl, layout = this.layout;
    if (!layout) return false;
    if (!this.ready) {
      if (this.parallel && !gl.getProgramParameter(this.program, this.parallel.COMPLETION_STATUS_KHR)) return false;
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) throw new Error("Water shader could not link");
      for (const name of ["resolution", "grid", "copy", "ratio", "time", "energy", "field", "glyphs"]) this.uniforms[name] = gl.getUniformLocation(this.program, `u_${name}`);
      this.ready = true;
    }
    gl.useProgram(this.program); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.uniforms.resolution, layout.width, layout.height);
    gl.uniform2f(this.uniforms.grid, this.fieldWidth, this.fieldHeight);
    const copy = layout.copy;
    gl.uniform4f(this.uniforms.copy, copy?.x || 0, copy?.y || 0, copy?.width ?? -1, copy?.height || 0);
    gl.uniform1f(this.uniforms.ratio, layout.ratio); gl.uniform1f(this.uniforms.time, time); gl.uniform1f(this.uniforms.energy, energy);
    gl.uniform1i(this.uniforms.field, 0); gl.uniform1i(this.uniforms.glyphs, 1);
    if (cursor.visible) {
      [[-12, 0], [12, 0], [0, -12], [0, 12]].forEach(([x, y], i) => this.cursorVertices.set([cursor.x * layout.width + x, cursor.y * layout.height + y, 0, 0, 13, -1], i * 6));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer); gl.bufferSubData(gl.ARRAY_BUFFER, layout.points.byteLength, this.cursorVertices);
    }
    gl.drawArrays(gl.POINTS, 0, this.count + (cursor.visible ? 4 : 0));
    return true;
  }
  dispose() {
    const gl = this.gl;
    gl.deleteBuffer(this.vertexBuffer); gl.deleteTexture(this.fieldTexture); gl.deleteTexture(this.glyphTexture); gl.deleteProgram(this.program);
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

// Software fallback: compose cached tiny punctuation stamps into one pixel
// buffer. One putImageData replaces hundreds of individual canvas draw calls.
export class QuietWaterRenderer implements WaterRenderer {
  private layout: PoolLayout | null = null;
  private values = new Uint8Array([128, 0, 0, 255]);
  private columns = 1;
  private rows = 1;
  private frame: ImageData | null = null;
  private base = new Uint8ClampedArray(0);
  private nodes: { x: number; y: number; size: number; alpha: number; letter: number; u: number; v: number }[] = [];
  private stamps = new Map<number, Uint8ClampedArray[]>();
  private colors: number[][] = [];
  constructor(private canvas: HTMLCanvasElement, private ctx: CanvasRenderingContext2D) {
    for (const [base, peak] of [[[29, 60, 80], [102, 173, 190]], [[41, 86, 104], [196, 244, 226]], [[42, 100, 112], [249, 231, 198]]]) {
      for (let i = 0; i < 8; i++) this.colors.push(base.map((value, j) => Math.round(value + (peak[j] - value) * (i / 7) ** 0.75)));
    }
  }
  resize(layout: PoolLayout) {
    this.layout = layout;
    this.canvas.width = Math.floor(layout.width * layout.ratio); this.canvas.height = Math.floor(layout.height * layout.ratio);
    this.frame = this.ctx.createImageData(this.canvas.width, this.canvas.height);
    this.base = new Uint8ClampedArray(this.frame.data.length); this.stamps.clear(); this.nodes = [];
    for (let i = 0; i < layout.points.length; i += 6) {
      const x = layout.points[i], y = layout.points[i + 1], size = Math.max(2, Math.round(layout.points[i + 4] * layout.ratio));
      if (!this.stamps.has(size)) {
        const sheet = document.createElement("canvas"); sheet.width = size * 5; sheet.height = size;
        const ink = sheet.getContext("2d", { willReadFrequently: true })!;
        ink.fillStyle = "white"; ink.font = `${size * 26 / 32}px "Courier New", monospace`; ink.textAlign = "center"; ink.textBaseline = "middle";
        ["·", ",", ":", "~", "≈"].forEach((mark, j) => ink.fillText(mark, (j + 0.5) * size, size / 2));
        this.stamps.set(size, Array.from({ length: 5 }, (_, j) => ink.getImageData(j * size, 0, size, size).data));
      }
      const node = { x: Math.round(x * layout.ratio - size / 2), y: Math.round(y * layout.ratio - size / 2), size,
        alpha: copyOpacity(x, y, layout.copy, layout.width), letter: layout.points[i + 5], u: layout.points[i + 2], v: layout.points[i + 3] };
      this.nodes.push(node);
      if (!node.letter) this.stamp(this.base, node.x, node.y, size, 0, this.colors[9], node.alpha);
    }
  }
  private stamp(data: Uint8ClampedArray, x: number, y: number, size: number, glyph: number, color: number[], opacity: number) {
    const pixels = this.stamps.get(size)![glyph], width = this.canvas.width, height = this.canvas.height;
    for (let dy = Math.max(0, -y); dy < Math.min(size, height - y); dy++) {
      for (let dx = Math.max(0, -x); dx < Math.min(size, width - x); dx++) {
        const alpha = pixels[(dy * size + dx) * 4 + 3] * opacity;
        if (alpha < 1) continue;
        const j = ((y + dy) * width + x + dx) * 4;
        data[j] = color[0]; data[j + 1] = color[1]; data[j + 2] = color[2]; data[j + 3] = alpha;
      }
    }
  }
  update(frame: PoolFrame) {
    if (this.values.length !== frame.buffer.byteLength) this.values = new Uint8Array(frame.buffer.byteLength);
    this.values.set(new Uint8Array(frame.buffer)); this.columns = frame.columns; this.rows = frame.rows;
  }
  draw(_time: number, cursor: WaterCursor, scale = 1) {
    const layout = this.layout, frame = this.frame;
    if (!layout || !frame) return false;
    frame.data.set(this.base);
    for (const node of this.nodes) {
      const sx = Math.max(0, Math.min(this.columns - 1, Math.round(node.u * (this.columns - 1))));
      const sy = Math.max(0, Math.min(this.rows - 1, Math.round(node.v * (this.rows - 1))));
      const j = (sy * this.columns + sx) * 4;
      const value = (this.values[j] * 256 + this.values[j + 1] - 32768) / 32767 * scale;
      let glint = 0;
      if (node.letter) for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
        const xx = Math.max(0, Math.min(this.columns - 1, sx + dx)), yy = Math.max(0, Math.min(this.rows - 1, sy + dy));
        glint = Math.max(glint, this.values[(yy * this.columns + xx) * 4 + 2] / 255 * scale);
      }
      const energy = node.letter ? glint * 1.8 : Math.abs(value) * 2;
      if (energy < (node.letter ? 0.004 : 0.016)) continue;
      const glyph = energy < 0.016 ? 0 : energy < 0.04 ? 1 : energy < 0.11 ? 2 : energy < 0.28 ? 3 : 4;
      const row = (node.letter ? 2 : value >= 0 ? 1 : 0) * 8 + Math.min(7, Math.floor(energy * 12 + 1));
      this.stamp(frame.data, node.x, node.y, node.size, glyph, this.colors[row], node.alpha * (node.letter ? node.letter * Math.min(1, glint / 0.045) : 1));
    }
    this.ctx.putImageData(frame, 0, 0);
    if (cursor.visible) {
      this.ctx.setTransform(layout.ratio, 0, 0, layout.ratio, 0, 0); this.ctx.fillStyle = "#f2e4c5"; this.ctx.font = "13px monospace";
      for (const [x, y] of [[-12, 0], [12, 0], [0, -12], [0, 12]]) this.ctx.fillText(":", cursor.x * layout.width + x, cursor.y * layout.height + y);
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    return true;
  }
  dispose() { this.frame = null; this.base = new Uint8ClampedArray(0); this.stamps.clear(); this.nodes = []; }
}
