/** Mini motor de tweens para as cenas 3D (sem dependência extra). */
export type Easing = (t: number) => number

export const ease = {
  linear: (t: number) => t,
  inCubic: (t: number) => t * t * t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  inOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: (t: number) => (t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Roda `passo(t)` de 0 a 1 em `duracao` segundos, no rAF. */
export function tween(duracao: number, passo: (t: number) => void, easing: Easing = ease.inOutCubic): Promise<void> {
  return new Promise((resolve) => {
    const t0 = performance.now()
    const tick = (agora: number) => {
      const k = Math.min(1, (agora - t0) / (duracao * 1000))
      passo(easing(k))
      if (k < 1) requestAnimationFrame(tick)
      else resolve()
    }
    requestAnimationFrame(tick)
  })
}

export const espera = (s: number) => new Promise<void>((r) => setTimeout(r, s * 1000))
