/**
 * Votômetro 3D: estados extrudados (altura = proporção de NÃO), nuvens em sprites e
 * voo de câmera até o estado escolhido, atravessando a camada de nuvens.
 * Tudo dentro do próprio canvas; renderiza só quando visível.
 */
import * as THREE from 'three'
import { ease, lerp, tween } from './animar'

export type DadosMapa = { w: number; h: number; uf: Record<string, { d: string; c: [number, number]; b: [number, number, number, number] }> }
export type InfoUF = { intensidade: number; nao: number; motta: number; cadeiras: number }

type Estado = {
  uf: string
  grupo: THREE.Group
  topo: THREE.MeshStandardMaterial
  lado: THREE.MeshStandardMaterial
  corBase: THREE.Color
  altura: number
  centro: THREE.Vector3
  tamanho: number
  alvoZ: number
}

const S = 100 // pixels do SVG por unidade de mundo
/** Alarga o mapa no eixo leste-oeste (telas largas): mais espaço para as siglas caberem dentro dos estados. No celular a largura da tela é o limite, então fica 1. */
const LARGO = typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches ? 1 : 1.14
const NAVY = new THREE.Color('#040B26')
const SEM = new THREE.Color('#26375f')
const AZUL = new THREE.Color('#1F4FE0')
const AZUL_VIVO = new THREE.Color('#8fb0ff')
const VERMELHO = new THREE.Color('#b0252b')

function formas(d: string, W: number, H: number): THREE.Shape[] {
  return d
    .split('M')
    .filter(Boolean)
    .map((parte) => {
      const pts = parte
        .replace(/Z/g, '')
        .split('L')
        .map((p) => p.split(',').map(Number))
        .map(([x, y]) => new THREE.Vector2(((x - W / 2) / S) * LARGO, -(y - H / 2) / S))
      return new THREE.Shape(pts)
    })
}

function texturaNuvem() {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')!
  const bolha = (x: number, y: number, r: number, a: number) => {
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `rgba(255,255,255,${a})`)
    grad.addColorStop(0.55, `rgba(236,242,255,${a * 0.55})`)
    grad.addColorStop(1, 'rgba(230,238,255,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2
    const d = Math.random() * 56
    bolha(128 + Math.cos(a) * d, 132 + Math.sin(a) * d * 0.55, 40 + Math.random() * 46, 0.35 + Math.random() * 0.3)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function texturaChao() {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(256, 256, 0, 256, 256, 256)
  grad.addColorStop(0, 'rgba(61,123,255,0.35)')
  grad.addColorStop(0.45, 'rgba(31,79,224,0.12)')
  grad.addColorStop(1, 'rgba(4,11,38,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  return new THREE.CanvasTexture(c)
}

export class CenaMapa {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 120)
  private estados = new Map<string, Estado>()
  private malhas: THREE.Mesh[] = []
  private nuvens: { s: THREE.Sprite; v: number; base: number }[] = []
  private nuvensVoo: { s: THREE.Sprite; fase: number }[] = []
  private raio = new THREE.Raycaster()
  private ponteiro = new THREE.Vector2(9, 9)
  private ponteiroSujo = false
  private sujo = true
  private passando: string | null = null
  private selecionado: string | null = null
  private olhar = new THREE.Vector3(0, -0.5, 0)
  private olharSel = new THREE.Vector3()
  private posBase = new THREE.Vector3()
  private voando = false
  private visivel = true
  private rodando = false
  private relogio = new THREE.Clock()
  private ro: ResizeObserver
  private w = 1
  private h = 1
  private rotulos = new Map<string, HTMLElement>()
  private grosso = window.matchMedia('(pointer: coarse)').matches
  private quadro = 0
  private sway = { x: 0, y: 0 }
  private contorno: THREE.Vector3[] = []
  /** Direção da câmera (y para trás, z para cima). */
  incl = { y: 10.5, z: 12.5 }
  private medidas = new Map<string, { w: number; h: number }>()
  private desvios = new Map<string, { x: number; y: number }>()
  private arranjoSujo = true
  /** Deslocamento de tela que centraliza o mapa inteiro (px). */
  private vo = { x: 0, y: 0 }

  aoPassar?: (uf: string | null, x: number, y: number) => void
  aoClicar?: (uf: string) => void

  constructor(
    private canvas: HTMLCanvasElement,
    dados: DadosMapa,
    info: (uf: string) => InfoUF,
    private camadaRotulos?: HTMLElement,
    destaque?: string | null,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.grosso ? 1.25 : 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.scene.fog = new THREE.Fog(NAVY, 16, 42)

    this.scene.add(new THREE.HemisphereLight('#d6e3ff', '#0a1433', 1.25))
    const sol = new THREE.DirectionalLight('#ffffff', 2.1)
    sol.position.set(-6, -9, 14)
    this.scene.add(sol)
    const recorte = new THREE.DirectionalLight('#5b8cff', 1.6)
    recorte.position.set(9, 11, 5)
    this.scene.add(recorte)

    // chão: brilho + grade
    const chao = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ map: texturaChao(), transparent: true, depthWrite: false }),
    )
    chao.position.z = -0.01
    this.scene.add(chao)
    const grade = new THREE.GridHelper(40, 40, '#3d7bff', '#3d7bff')
    grade.rotation.x = Math.PI / 2
    ;(grade.material as THREE.Material).transparent = true
    ;(grade.material as THREE.Material).opacity = 0.07
    this.scene.add(grade)

    // estados
    for (const [uf, m] of Object.entries(dados.uf)) {
      const i = info(uf)
      const altura = 0.16 + i.intensidade * 1.6
      const geo = new THREE.ExtrudeGeometry(formas(m.d, dados.w, dados.h), {
        depth: altura,
        bevelEnabled: false,
        curveSegments: 1,
      })
      let cor = i.nao > 0 ? SEM.clone().lerp(AZUL, Math.min(1, 0.45 + i.intensidade * 2.2)) : SEM.clone()
      if (i.intensidade > 0.3) cor = AZUL.clone().lerp(AZUL_VIVO, Math.min(1, (i.intensidade - 0.3) * 2.5))
      if (i.motta > i.nao) cor = SEM.clone().lerp(VERMELHO, Math.min(0.85, 0.35 + (i.motta / i.cadeiras) * 3))
      const topo = new THREE.MeshStandardMaterial({ color: cor, roughness: 0.55, metalness: 0.1, emissive: new THREE.Color('#3d7bff'), emissiveIntensity: 0 })
      const lado = new THREE.MeshStandardMaterial({ color: cor.clone().multiplyScalar(0.45), roughness: 0.7 })
      const malha = new THREE.Mesh(geo, [topo, lado])
      malha.userData.uf = uf
      const grupo = new THREE.Group()
      grupo.add(malha)
      // contorno no topo
      for (const f of formas(m.d, dados.w, dados.h)) {
        const pts = f.getPoints().map((p) => new THREE.Vector3(p.x, p.y, altura + 0.02))
        // amostra do contorno para enquadrar o mapa na tela
        for (let k = 0; k < pts.length; k += 3) this.contorno.push(pts[k].clone().setZ(0), pts[k].clone())
        const linha = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: '#c9d8ff', transparent: true, opacity: 0.35 }),
        )
        grupo.add(linha)
      }
      this.scene.add(grupo)
      this.malhas.push(malha)
      const [x0, y0, x1, y1] = m.b
      const centro = new THREE.Vector3(((m.c[0] - dados.w / 2) / S) * LARGO, -(m.c[1] - dados.h / 2) / S, altura)
      this.estados.set(uf, { uf, grupo, topo, lado, corBase: cor.clone(), altura, centro, tamanho: Math.max((x1 - x0) * LARGO, y1 - y0) / S, alvoZ: 0 })
    }

    // nuvens ambiente: anel em volta do mapa, acima dele
    const tex = texturaNuvem()
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.22 + Math.random() * 0.25 }))
      const a = (i / 10) * Math.PI * 2 + Math.random() * 0.3
      const r = 5.2 + Math.random() * 3
      s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.9, 1.2 + Math.random() * 2.6)
      const esc = 3 + Math.random() * 3.5
      s.scale.set(esc * 1.6, esc, 1)
      this.scene.add(s)
      this.nuvens.push({ s, v: 0.08 + Math.random() * 0.12, base: s.position.x })
    }
    // nuvens do voo (invisíveis até a câmera atravessar)
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }))
      const esc = 2.6 + Math.random() * 3
      s.scale.set(esc * 1.5, esc, 1)
      s.visible = false
      this.scene.add(s)
      this.nuvensVoo.push({ s, fase: Math.random() })
    }

    // rótulos (DOM, projetados)
    if (camadaRotulos) {
      for (const [uf, e] of this.estados) {
        const el = document.createElement('span')
        const i = info(uf)
        el.className = 'rotulo-uf'
        el.style.opacity = '0' // aparece no primeiro desenho, já no lugar
        el.innerHTML = i.nao > 0 ? `${uf}<b>${i.nao}</b>` : uf
        if (uf === destaque) el.dataset.destaque = 'true'
        // o rótulo também é alvo de clique/toque (estados pequenos como o DF ficam fáceis de acertar)
        el.setAttribute('role', 'button')
        el.setAttribute('aria-label', `Ver deputados: ${uf}`)
        el.addEventListener('click', (ev) => {
          ev.stopPropagation()
          if (!this.voando && !this.selecionado) this.aoClicar?.(uf)
        })
        el.addEventListener('pointerenter', (ev) => {
          if ((ev as PointerEvent).pointerType !== 'mouse' || this.voando || this.selecionado) return
          this.passando = uf
          this.sujo = true
        })
        el.addEventListener('pointerleave', () => {
          if (this.passando === uf) this.ponteiroSujo = true
          this.sujo = true
        })
        camadaRotulos.appendChild(el)
        this.rotulos.set(uf, el)
        void e
      }
    }

    // ponteiro
    canvas.addEventListener('pointermove', this.mover)
    canvas.addEventListener('pointerleave', this.sair)
    canvas.addEventListener('click', this.clicar)

    document.fonts?.ready.then(() => {
      this.medidas.clear()
      this.arranjoSujo = true
      this.sujo = true
    })
    this.ro = new ResizeObserver(() => this.redimensionar())
    this.ro.observe(canvas.parentElement ?? canvas)
    this.redimensionar()
    this.camera.position.copy(this.posBase)
    this.camera.lookAt(this.olhar)
    // compila os shaders sem travar a página (KHR_parallel_shader_compile) e só então desenha
    this.renderer
      .compileAsync(this.scene, this.camera)
      .catch(() => undefined)
      .finally(() => this.iniciar())
  }

  /** Enquadra o mapa inteiro conforme a proporção do canvas: nada cortado, centralizado. */
  private redimensionar() {
    const el = this.canvas.parentElement ?? this.canvas
    this.w = el.clientWidth || 1
    this.h = el.clientHeight || 1
    this.renderer.setSize(this.w, this.h, false)
    this.medidas.clear()
    this.arranjoSujo = true
    this.camera.aspect = this.w / this.h
    this.camera.clearViewOffset()
    this.camera.updateProjectionMatrix()
    const pos0 = this.camera.position.clone()
    const q0 = this.camera.quaternion.clone()
    const v = new THREE.Vector3()
    const medir = (f: number) => {
      this.camera.position.set(0, -this.incl.y * f, this.incl.z * f)
      this.camera.lookAt(this.olhar)
      this.camera.updateMatrixWorld()
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
      for (const p of this.contorno) {
        v.copy(p).project(this.camera)
        if (v.x < x0) x0 = v.x
        if (v.x > x1) x1 = v.x
        if (v.y < y0) y0 = v.y
        if (v.y > y1) y1 = v.y
      }
      return { x0, x1, y0, y1 }
    }
    // folga: rótulos laterais e o "Escolha um estado" no topo
    const mx = this.camera.aspect < 0.8 ? 0.985 : 0.9
    const my = 0.84
    let lo = 0.3
    let hi = 6
    for (let i = 0; i < 22; i++) {
      const f = (lo + hi) / 2
      const b = medir(f)
      if ((b.x1 - b.x0) / 2 <= mx && (b.y1 - b.y0) / 2 <= my) hi = f
      else lo = f
    }
    const b = medir(hi)
    this.posBase.set(0, -this.incl.y * hi, this.incl.z * hi)
    // a névoa acompanha a distância da câmera (senão o mapa escurece quando ela se afasta)
    const fog = this.scene.fog as THREE.Fog
    fog.near = 16 * hi
    fog.far = 42 * hi
    this.camera.far = Math.max(120, 60 * hi)
    const cx = (b.x0 + b.x1) / 2
    const cy = (b.y0 + b.y1) / 2 + 0.04 // um pouco abaixo do centro
    this.vo = { x: (cx * this.w) / 2, y: (-cy * this.h) / 2 }
    this.aplicarDeslocamento(this.selecionado || this.voando ? 0 : this.vo.x, this.selecionado || this.voando ? 0 : this.vo.y)
    if (!this.selecionado && !this.voando) {
      this.camera.position.copy(this.posBase)
      this.camera.lookAt(this.olhar)
    } else if (this.selecionado && !this.voando) {
      // tela mudou com um estado aberto: reenquadra o estado no espaço livre
      const { P2, L1 } = this.alvoDoVoo(this.estados.get(this.selecionado)!)
      this.camera.position.copy(P2)
      this.camera.lookAt(L1)
      this.olharSel = L1
    } else {
      this.camera.position.copy(pos0)
      this.camera.quaternion.copy(q0)
    }
    this.sujo = true
  }

  private mover = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect()
    this.ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    if (e.pointerType === 'mouse') {
      this.sway.x = this.ponteiro.x
      this.sway.y = this.ponteiro.y
    }
    this.ponteiroSujo = e.pointerType !== 'touch'
    this.sujo = true
  }
  private sair = () => {
    this.ponteiro.set(9, 9)
    this.sway.x = this.sway.y = 0
    this.ponteiroSujo = true
    this.sujo = true
  }
  private clicar = (e: MouseEvent) => {
    if (this.voando || this.selecionado) return
    const r = this.canvas.getBoundingClientRect()
    this.ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    const uf = this.pegar()
    if (uf) this.aoClicar?.(uf)
  }

  private pegar(): string | null {
    this.raio.setFromCamera(this.ponteiro, this.camera)
    const hit = this.raio.intersectObjects(this.malhas, false)[0]
    return hit ? (hit.object.userData.uf as string) : null
  }

  private iniciar() {
    if (this.rodando) return
    this.rodando = true
    const loop = () => {
      if (!this.rodando) return
      requestAnimationFrame(loop)
      // renderiza só quando algo muda (ponteiro, transição, redimensionamento): parado, custo zero
      if (!this.visivel || (!this.sujo && !this.voando)) return
      this.passo()
    }
    requestAnimationFrame(loop)
  }

  private passo() {
    this.sujo = false
    if (this.ponteiroSujo && !this.voando && !this.selecionado) {
      this.ponteiroSujo = false
      const uf = this.pegar()
      if (uf !== this.passando) {
        this.passando = uf
        this.canvas.style.cursor = uf ? 'pointer' : ''
      }
    }
    for (const e of this.estados.values()) {
      const quer = e.uf === this.selecionado ? 0.35 : e.uf === this.passando ? 0.22 : 0
      const brilho = e.uf === this.passando || e.uf === this.selecionado ? 0.45 : 0
      e.alvoZ = lerp(e.alvoZ, quer, 0.2)
      e.grupo.position.z = e.alvoZ
      e.topo.emissiveIntensity = lerp(e.topo.emissiveIntensity, brilho, 0.2)
      // ainda em movimento? então mais um quadro
      if (Math.abs(e.alvoZ - quer) > 0.002 || Math.abs(e.topo.emissiveIntensity - brilho) > 0.01) this.sujo = true
    }
    if (!this.voando && !this.selecionado) {
      // paralaxe leve guiada pelo mouse (só renderiza enquanto ele se move)
      const alvo = this.posBase.clone().add(new THREE.Vector3(this.sway.x * 0.8, this.sway.y * 0.5, 0))
      this.camera.position.lerp(alvo, 0.12)
      if (this.camera.position.distanceTo(alvo) > 0.01) this.sujo = true
      this.camera.lookAt(this.olhar)
    }
    this.renderer.render(this.scene, this.camera)
    this.atualizarRotulos()
    if (this.passando && this.aoPassar) {
      const e = this.estados.get(this.passando)!
      const p = e.centro.clone().setZ(e.altura + e.alvoZ).project(this.camera)
      this.aoPassar(this.passando, ((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h)
    } else this.aoPassar?.(null, 0, 0)
  }

  /**
   * Posiciona os rótulos no estado, aplicando o arranjo anti-sobreposição já calculado.
   */
  private atualizarRotulos() {
    if (!this.rotulos.size) return
    const mostrar = !this.voando && !this.selecionado
    // o arranjo (quem cede espaço para quem) é calculado uma vez, com o mapa parado,
    // e reaproveitado: estado que sobe no hover não empurra mais os vizinhos
    if (this.arranjoSujo) this.arranjar()
    for (const [uf, el] of this.rotulos) {
      const e = this.estados.get(uf)!
      const d = this.desvios.get(uf) ?? { x: 0, y: 0 }
      const m = this.medidas.get(uf) ?? { w: 0, h: 0 }
      // sigla fixa: não acompanha o estado que sobe no destaque (não esbarra nas vizinhas)
      const p = e.centro.clone().setZ(e.altura + 0.05).project(this.camera)
      const x = Math.min(this.w - m.w / 2 - 3, Math.max(m.w / 2 + 3, ((p.x + 1) / 2) * this.w + d.x))
      const y = Math.min(this.h - m.h / 2 - 3, Math.max(m.h / 2 + 3, ((1 - p.y) / 2) * this.h + d.y))
      el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
      el.style.opacity = mostrar ? '1' : '0'
      el.style.pointerEvents = mostrar ? 'auto' : 'none'
    }
  }

  /** Afasta rótulos sobrepostos (DF/GO, PR/SC, Nordeste); o menor cede, mantendo a ordem real. */
  private arranjar() {
    this.arranjoSujo = false
    const pos = this.camera.position.clone()
    const q = this.camera.quaternion.clone()
    this.camera.position.copy(this.posBase)
    this.camera.lookAt(this.olhar)
    this.camera.updateMatrixWorld()
    const itens: { uf: string; ax: number; ay: number; x: number; y: number; w: number; h: number; peso: number }[] = []
    for (const [uf, el] of this.rotulos) {
      const e = this.estados.get(uf)!
      const p = e.centro.clone().setZ(e.altura + 0.05).project(this.camera)
      const ax = ((p.x + 1) / 2) * this.w
      const ay = ((1 - p.y) / 2) * this.h
      let m = this.medidas.get(uf)
      if (!m || !m.w) {
        m = { w: el.offsetWidth, h: el.offsetHeight }
        this.medidas.set(uf, m)
      }
      itens.push({ uf, ax, ay, x: ax, y: ay, w: m.w + 12, h: m.h + 7, peso: 1 / (e.tamanho + 0.25) })
    }
    for (let volta = 0; volta < 40; volta++) {
      let mexeu = false
      for (let i = 0; i < itens.length; i++) {
        for (let j = i + 1; j < itens.length; j++) {
          const a = itens[i]
          const b = itens[j]
          const dx = b.x - a.x
          const dy = b.y - a.y
          const ox = (a.w + b.w) / 2 - Math.abs(dx)
          const oy = (a.h + b.h) / 2 - Math.abs(dy)
          if (ox <= 0 || oy <= 0) continue
          mexeu = true
          const pa = a.peso / (a.peso + b.peso)
          const pb = 1 - pa
          if (oy <= ox) {
            const sinal = b.ay !== a.ay ? Math.sign(b.ay - a.ay) : 1 // mantém a ordem real (RN acima de PB)
            a.y -= sinal * oy * pa
            b.y += sinal * oy * pb
          } else {
            const sinal = b.ax !== a.ax ? Math.sign(b.ax - a.ax) : 1
            a.x -= sinal * ox * pa
            b.x += sinal * ox * pb
          }
        }
      }
      if (!mexeu) break
    }
    this.desvios.clear()
    for (const it of itens) this.desvios.set(it.uf, { x: it.x - it.ax, y: it.y - it.ay })
    this.camera.position.copy(pos)
    this.camera.quaternion.copy(q)
    this.camera.updateMatrixWorld()
  }

  private aplicarDeslocamento(x: number, y: number) {
    if (Math.abs(x) < 0.01 && Math.abs(y) < 0.01) this.camera.clearViewOffset()
    else this.camera.setViewOffset(this.w, this.h, x, y, this.w, this.h)
    this.camera.updateProjectionMatrix()
  }

  /**
   * Ponto final do voo: o estado inteiro, centralizado no espaço que o painel deixa livre
   * (faixa de cima no celular/tablet, metade esquerda no desktop).
   */
  private alvoDoVoo(e: Estado) {
    const cam = this.camera.clone()
    cam.clearViewOffset()
    cam.updateProjectionMatrix()
    const largo = window.innerWidth >= 1024 // mesmo ponto de quebra do painel (lg)
    const hf = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2))
    const visW = 2 * hf * cam.aspect
    const visH = 2 * hf
    // fração da tela livre e onde fica o centro dela (NDC)
    const livreW = largo ? 0.42 : 0.86
    const livreH = largo ? 0.78 : 0.2
    const tx = largo ? -0.5 : 0
    const ty = largo ? 0 : 0.7
    const dist = Math.min(30, Math.max(3, (e.tamanho * 1.05) / (livreW * visW), (e.tamanho * 0.8) / (livreH * visH)))
    const D = new THREE.Vector3(0, -0.6, 0.8)
    const L = e.centro.clone()
    const P = L.clone().addScaledVector(D, dist)
    cam.position.copy(P)
    cam.lookAt(L)
    cam.updateMatrixWorld()
    const direita = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 0)
    const cima = new THREE.Vector3().setFromMatrixColumn(cam.matrixWorld, 1)
    const desvio = direita.multiplyScalar(-tx * dist * hf * cam.aspect).add(cima.multiplyScalar(-ty * dist * hf))
    return { P2: P.add(desvio), L1: L.add(desvio) }
  }

  /** Voa até o estado atravessando as nuvens. */
  async voarPara(uf: string) {
    const e = this.estados.get(uf)
    if (!e || this.voando) return
    this.voando = true
    this.passando = null
    this.selecionado = uf
    // escurece os outros
    for (const o of this.estados.values()) {
      const alvo = o.uf === uf ? o.corBase : o.corBase.clone().lerp(NAVY, 0.72)
      o.topo.userData.de = o.topo.color.clone()
      o.topo.userData.para = alvo
    }
    const { P2, L1 } = this.alvoDoVoo(e)
    const P0 = this.camera.position.clone()
    const P1 = P0.clone().lerp(P2, 0.5).add(new THREE.Vector3(0, 0, 3.5))
    const L0 = this.olhar.clone()
    this.olharSel = L1.clone()
    const vo0 = { ...this.vo }
    // posiciona as nuvens do voo ao redor do caminho, na altura que a câmera atravessa
    this.nuvensVoo.forEach((n, i) => {
      const k = 0.35 + (i / this.nuvensVoo.length) * 0.45
      const p = this.bezier(P0, P1, P2, k)
      const a = Math.random() * Math.PI * 2
      const d = 1.2 + Math.random() * 2.6
      n.s.position.set(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d * 0.6, p.z - 1.5 - Math.random() * 2.5)
      n.s.visible = true
      n.fase = k
    })
    await tween(2.1, (k) => {
      // o deslocamento de enquadramento do mapa inteiro some durante o voo
      this.aplicarDeslocamento(vo0.x * (1 - k), vo0.y * (1 - k))
      this.camera.position.copy(this.bezier(P0, P1, P2, k))
      const look = L0.clone().lerp(L1, ease.inOutCubic(Math.min(1, k * 1.25)))
      this.camera.lookAt(look)
      for (const o of this.estados.values()) o.topo.color.copy((o.topo.userData.de as THREE.Color).clone().lerp(o.topo.userData.para as THREE.Color, k))
      for (const n of this.nuvensVoo) {
        const perto = 1 - Math.min(1, Math.abs(k - n.fase) / 0.28)
        ;(n.s.material as THREE.SpriteMaterial).opacity = Math.max(0, perto) * 0.9
      }
    }, ease.inOutCubic)
    this.nuvensVoo.forEach((n) => (n.s.visible = false))
    this.voando = false
    this.sujo = true
  }

  async voltar() {
    if (!this.selecionado || this.voando) return
    this.voando = true
    const P0 = this.camera.position.clone()
    const L0 = this.olharSel.clone()
    for (const o of this.estados.values()) {
      o.topo.userData.de = o.topo.color.clone()
      o.topo.userData.para = o.corBase
    }
    this.selecionado = null
    await tween(1.3, (k) => {
      this.aplicarDeslocamento(this.vo.x * k, this.vo.y * k)
      this.camera.position.lerpVectors(P0, this.posBase, k)
      this.camera.lookAt(L0.clone().lerp(this.olhar, k))
      for (const o of this.estados.values()) o.topo.color.copy((o.topo.userData.de as THREE.Color).clone().lerp(o.topo.userData.para as THREE.Color, k))
    }, ease.inOutCubic)
    this.voando = false
    this.sujo = true
  }

  private bezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number) {
    const u = 1 - t
    return new THREE.Vector3(
      u * u * a.x + 2 * u * t * b.x + t * t * c.x,
      u * u * a.y + 2 * u * t * b.y + t * t * c.y,
      u * u * a.z + 2 * u * t * b.z + t * t * c.z,
    )
  }

  /** Só para ajuste fino em desenvolvimento. */
  reenquadrar() {
    this.redimensionar()
  }

  definirVisivel(v: boolean) {
    this.visivel = v
    if (v) this.sujo = true
  }

  dispose() {
    this.rodando = false
    this.ro.disconnect()
    this.canvas.removeEventListener('pointermove', this.mover)
    this.canvas.removeEventListener('pointerleave', this.sair)
    this.canvas.removeEventListener('click', this.clicar)
    this.rotulos.forEach((el) => el.remove())
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      mesh.geometry?.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    })
    this.renderer.dispose()
  }
}
