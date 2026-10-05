// Ambient currents change only the drawing, so the physical solver can sleep
// and the submerged letters remain invisible until a real ripple reaches them.
export const KM_REVEAL_OPACITY = 0.42;

export function currentHeight(x: number, y: number, time: number) {
  const calm = 1 - Math.exp(-time / 8);
  const bend = Math.sin(x * 5 - y * 3 + time * 0.09);
  return calm * (0.035 * Math.sin(x * 9 + y * 11 + bend - time * 0.42)
    + 0.012 * Math.sin(x * 18 - y * 7 + bend * 0.65 + time * 0.24));
}

export const CURRENT_GLSL = `
float currentHeight(vec2 p, float time) {
  float calm = 1.0 - exp(-time / 8.0);
  float bend = sin(p.x * 5.0 - p.y * 3.0 + time * 0.09);
  return calm * (0.035 * sin(p.x * 9.0 + p.y * 11.0 + bend - time * 0.42)
    + 0.012 * sin(p.x * 18.0 - p.y * 7.0 + bend * 0.65 + time * 0.24));
}`;
