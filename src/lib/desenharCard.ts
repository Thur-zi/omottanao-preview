/** Desenha o card "Cobre o seu deputado" num canvas (roda 100% no aparelho). */

export type Formato = 'feed' | 'status'
export type DadosCard = { deputado: string; nome: string; uf: string; frase: number; formato: Formato; site: string; foto?: HTMLImageElement | null; partido?: string; ufDeputado?: string }

export const FRASES = [
  (d: string) => ['Eu votei em você,', `${d}.`, 'Não votei pra', 'eleger o Motta.'],
  (d: string) => [`${d},`, 'meu voto não', 'foi para', 'o Motta.'],
  (d: string) => ['Deputado', `${d}:`, 'diga não', 'ao Motta.'],
]
export const FRASES_RESUMO = [
  'Eu votei em você, [deputado]. Não votei pra eleger o Motta.',
  '[deputado], meu voto não foi para o Motta.',
  'Deputado [deputado]: diga não ao Motta.',
]

function fonte(g: CanvasRenderingContext2D, peso: number, px: number, condensada = true) {
  const gg = g as CanvasRenderingContext2D & { fontStretch?: string }
  g.font = `${peso} ${px}px "Archivo Variable", Archivo, "Arial Narrow", sans-serif`
  if ('fontStretch' in gg) gg.fontStretch = condensada ? 'extra-condensed' : 'normal'
  else g.font = `${peso} ${condensada ? 'extra-condensed ' : ''}${px}px "Archivo Variable", Archivo, "Arial Narrow", sans-serif`
}

/**
 * O Safari não aplica font-stretch no canvas: a fonte sai larga e o card fica diferente do
 * Chrome. Detecta e, nesse caso, estreita o texto na mão (escala horizontal).
 */
let escalaX: number | null = null
function condensar(g: CanvasRenderingContext2D) {
  if (escalaX !== null) return escalaX
  const gg = g as CanvasRenderingContext2D & { fontStretch?: string }
  g.save()
  g.font = '900 100px "Archivo Variable", Archivo, sans-serif'
  if ('fontStretch' in gg) gg.fontStretch = 'normal'
  const normal = g.measureText('MOTTA NÃO').width
  fonte(g, 900, 100)
  const estreita = g.measureText('MOTTA NÃO').width
  g.restore()
  escalaX = estreita < normal * 0.93 ? 1 : 0.78
  return escalaX
}

/** Texto condensado (real ou simulado) em x,y; devolve a largura desenhada. */
function textoCond(g: CanvasRenderingContext2D, t: string, x: number, y: number) {
  const sx = condensar(g)
  g.save()
  g.translate(x, y)
  g.scale(sx, 1)
  g.fillText(t, 0, 0)
  g.restore()
}
const larguraCond = (g: CanvasRenderingContext2D, t: string) => g.measureText(t).width * condensar(g)

function carimbo(g: CanvasRenderingContext2D, cx: number, cy: number, larg: number, giro: number) {
  const alt = larg * 0.31
  g.save()
  g.translate(cx, cy)
  g.rotate((giro * Math.PI) / 180)
  g.strokeStyle = '#fff'
  g.fillStyle = '#fff'
  g.lineWidth = larg * 0.024
  const r = larg * 0.03
  g.beginPath()
  g.roundRect(-larg / 2, -alt / 2, larg, alt, r)
  g.stroke()
  g.lineWidth = larg * 0.007
  g.beginPath()
  g.roundRect(-larg / 2 + larg * 0.035, -alt / 2 + larg * 0.035, larg - larg * 0.07, alt - larg * 0.07, r / 2)
  g.stroke()
  fonte(g, 900, alt * 0.5)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('MOTTA NÃO', 0, alt * 0.08)
  // falhas de tinta
  g.globalCompositeOperation = 'destination-out'
  for (let i = 0; i < 260; i++) {
    g.globalAlpha = Math.random() * 0.9
    g.beginPath()
    g.arc((Math.random() - 0.5) * larg, (Math.random() - 0.5) * alt, Math.random() * larg * 0.006 + 0.5, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

export function desenharCard(cv: HTMLCanvasElement, img: HTMLImageElement | null, d: DadosCard) {
  const W = 1080
  const H = d.formato === 'feed' ? 1350 : 1920
  cv.width = W
  cv.height = H
  const g = cv.getContext('2d')!
  const pad = 76
  const dep = (d.deputado.trim().replace(/\s+/g, ' ') || 'Seu deputado').toUpperCase()

  // metade de cima: o Motta, carimbado
  const altoFoto = d.formato === 'feed' ? 640 : 980
  g.fillStyle = '#C61F1F'
  g.fillRect(0, 0, W, altoFoto)
  if (img?.complete && img.naturalWidth) {
    const lado = altoFoto * 1.12
    const x = (W - lado) / 2
    g.drawImage(img, x, -altoFoto * 0.04, lado, lado)
    carimbo(g, x + lado * 0.585, -altoFoto * 0.04 + lado * 0.245, lado * 0.57, 16)
  }
  const vinheta = g.createLinearGradient(0, altoFoto * 0.55, 0, altoFoto)
  vinheta.addColorStop(0, 'rgba(4,11,38,0)')
  vinheta.addColorStop(1, 'rgba(4,11,38,1)')
  g.fillStyle = vinheta
  g.fillRect(0, 0, W, altoFoto)

  // foto oficial do deputado escolhido, como um retrato preso no cartaz
  if (d.foto) {
    const feed = d.formato === 'feed'
    const fw = feed ? 158 : 190, fh = feed ? 210 : 253
    const fx = W - pad - fw + 10, fy = altoFoto - fh - (feed ? 150 : 70)
    g.save()
    g.translate(fx + fw / 2, fy + fh / 2)
    g.rotate((-4 * Math.PI) / 180)
    g.fillStyle = '#fff'
    g.shadowColor = 'rgba(0,0,0,0.45)'
    g.shadowBlur = 30
    g.fillRect(-fw / 2 - 8, -fh / 2 - 8, fw + 16, fh + 16 + (d.partido ? 44 : 0))
    g.shadowBlur = 0
    g.drawImage(d.foto, -fw / 2, -fh / 2, fw, fh)
    if (d.partido) {
      g.fillStyle = '#040B26'
      g.font = '800 26px "Inter Tight Variable", "Inter Tight", Inter, sans-serif'
      g.textAlign = 'center'
      g.textBaseline = 'middle'
      g.fillText(`${d.partido} · ${d.ufDeputado || d.uf || ''}`.replace(/ · $/, ''), 0, fh / 2 + 22)
    }
    g.restore()
  }

  // metade de baixo: o recado
  g.fillStyle = '#040B26'
  g.fillRect(0, altoFoto, W, H - altoFoto)
  g.fillStyle = '#1F4FE0'
  g.fillRect(0, H - 18, W, 18)

  const linhas = FRASES[d.frase](dep).map((l) => l.toUpperCase())
  const maxW = W - pad * 2
  let tam = d.formato === 'feed' ? 150 : 172
  fonte(g, 900, tam)
  while (tam > 56 && linhas.some((l) => larguraCond(g, l) > maxW)) {
    tam -= 4
    fonte(g, 900, tam)
  }
  // métricas reais da fonte: a faixa azul não invade a linha de cima
  g.textAlign = 'left'
  g.textBaseline = 'alphabetic'
  const cap = g.measureText('H').actualBoundingBoxAscent || tam * 0.72
  const entre = tam * 0.98
  const bloco = (linhas.length - 1) * entre + cap
  const topo = altoFoto - (d.formato === 'feed' ? tam * 0.45 : tam * 0.2)
  const fundo = H - 230
  // no story, o recado fica no meio do espaço livre (sem buraco embaixo)
  let y0 = d.formato === 'feed' ? topo : Math.max(topo, (topo + fundo) / 2 - bloco / 2)
  if (y0 + bloco > fundo) y0 = fundo - bloco
  linhas.forEach((l, i) => {
    const base = y0 + cap + i * entre
    const temDep = l.startsWith(dep)
    if (/MOTTA/.test(l)) {
      const w = larguraCond(g, l)
      g.fillStyle = '#1F4FE0'
      g.fillRect(pad - 14, base - cap - tam * 0.1, w + 28, cap + tam * 0.2)
    }
    g.fillStyle = temDep ? '#A9C1FF' : '#FFFFFF'
    textoCond(g, l, pad, base)
  })

  // assinatura
  g.textBaseline = 'alphabetic'
  const base = H - 74
  const nome = d.nome.trim().split(' ')[0]
  g.font = '600 34px "Inter Tight Variable", "Inter Tight", Inter, sans-serif'
  g.fillStyle = 'rgba(255,255,255,0.7)'
  const assinatura = `${nome ? nome[0].toUpperCase() + nome.slice(1) : 'Eleitor'}${d.uf ? `, eleitor(a) de ${d.uf}` : ''}`
  g.fillText(`— ${assinatura}`, pad, base - 64)
  fonte(g, 900, 58)
  g.fillStyle = '#fff'
  g.fillText('O MOTTA', pad, base)
  const w1 = g.measureText('O MOTTA ').width
  g.fillStyle = '#1F4FE0'
  const w2 = g.measureText('NÃO.').width
  g.fillRect(pad + w1 - 6, base - 52, w2 + 14, 62)
  g.fillStyle = '#fff'
  g.fillText('NÃO.', pad + w1, base)
  g.font = '700 28px "Inter Tight Variable", "Inter Tight", Inter, sans-serif'
  g.textAlign = 'right'
  g.fillStyle = 'rgba(255,255,255,0.6)'
  g.fillText(d.site, W - pad, base)
}
