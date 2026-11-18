/** Desenha o card "Cobre o seu deputado" num canvas (roda 100% no aparelho). */

export type Formato = 'feed' | 'status'
export type DadosCard = { deputado: string; nome: string; uf: string; frase: number; formato: Formato; site: string }

export const FRASES = [
  (d: string) => ['Eu votei em', `${d}.`, 'Não votei para', 'eleger o Motta.'],
  (d: string) => [`${d},`, 'meu voto não', 'foi para', 'o Motta.'],
  (d: string) => ['Deputado', `${d}:`, 'diga não', 'ao Motta.'],
]
export const FRASES_RESUMO = [
  'Eu votei em [deputado]. Não votei para eleger o Motta.',
  '[deputado], meu voto não foi para o Motta.',
  'Deputado [deputado]: diga não ao Motta.',
]

function fonte(g: CanvasRenderingContext2D, peso: number, px: number, condensada = true) {
  const gg = g as CanvasRenderingContext2D & { fontStretch?: string }
  g.font = `${peso} ${px}px Archivo, "Arial Narrow", sans-serif`
  if ('fontStretch' in gg) gg.fontStretch = condensada ? 'extra-condensed' : 'normal'
  else g.font = `${peso} ${condensada ? 'extra-condensed ' : ''}${px}px Archivo, "Arial Narrow", sans-serif`
}

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
  fonte(g, 900, alt * 0.66)
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText('MOTTA NÃO', 0, alt * 0.05)
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
    carimbo(g, x + lado * 0.52, -altoFoto * 0.04 + lado * 0.235, lado * 0.56, 12)
  }
  const vinheta = g.createLinearGradient(0, altoFoto * 0.55, 0, altoFoto)
  vinheta.addColorStop(0, 'rgba(4,11,38,0)')
  vinheta.addColorStop(1, 'rgba(4,11,38,1)')
  g.fillStyle = vinheta
  g.fillRect(0, 0, W, altoFoto)

  // metade de baixo: o recado
  g.fillStyle = '#040B26'
  g.fillRect(0, altoFoto, W, H - altoFoto)
  g.fillStyle = '#1F4FE0'
  g.fillRect(0, H - 18, W, 18)

  const linhas = FRASES[d.frase](dep).map((l) => l.toUpperCase())
  let tam = d.formato === 'feed' ? 150 : 168
  fonte(g, 900, tam)
  while (tam > 60 && linhas.some((l) => g.measureText(l).width > W - pad * 2)) {
    tam -= 4
    fonte(g, 900, tam)
  }
  const alturaBloco = linhas.length * tam * 0.9
  let y = altoFoto - tam * 0.55
  const limite = H - 210
  if (y + alturaBloco > limite) y = limite - alturaBloco
  g.textAlign = 'left'
  g.textBaseline = 'top'
  linhas.forEach((l, i) => {
    const temDep = l.startsWith(dep)
    const temNao = /MOTTA/.test(l)
    if (temNao) {
      const w = g.measureText(l).width
      g.fillStyle = '#1F4FE0'
      g.fillRect(pad - 14, y + i * tam * 0.9 - tam * 0.02, w + 28, tam * 0.9)
    }
    g.fillStyle = temDep ? '#A9C1FF' : '#FFFFFF'
    g.fillText(l, pad, y + i * tam * 0.9 + tam * 0.04)
  })

  // assinatura
  g.textBaseline = 'alphabetic'
  const base = H - 74
  const nome = d.nome.trim().split(' ')[0]
  g.font = '600 34px "Inter Tight", Inter, sans-serif'
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
  g.font = '700 28px "Inter Tight", Inter, sans-serif'
  g.textAlign = 'right'
  g.fillStyle = 'rgba(255,255,255,0.6)'
  g.fillText(d.site, W - pad, base)
}
