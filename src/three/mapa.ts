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
        .map(([x, y]) => new THREE.Vector2((x - W / 2) / S, -(y - H / 2) / S))
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.grosso ? 1.5 : 2))
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
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.012,
        bevelSegments: 1,
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
        const linha = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: '#c9d8ff', transparent: true, opacity: 0.35 }),
        )
        grupo.add(linha)
      }
      this.scene.add(grupo)
      this.malhas.push(malha)
      const [x0, y0, x1, y1] = m.b
      const centro = new THREE.Vector3((m.c[0] - dados.w / 2) / S, -(m.c[1] - dados.h / 2) / S, altura)
      this.estados.set(uf, { uf, grupo, topo, lado, corBase: cor.clone(), altura, centro, tamanho: Math.max(x1 - x0, y1 - y0) / S, alvoZ: 0 })
    }

    // nuvens ambiente: anel em volta do mapa, acima dele
    const tex = texturaNuvem()
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.22 + Math.random() * 0.25 }))
      const a = (i / 16) * Math.PI * 2 + Math.random() * 0.3
      const r = 5.2 + Math.random() * 3
      s.position.set(Math.cos(a) * r, Math.sin(a) * r * 0.9, 1.2 + Math.random() * 2.6)
      const esc = 3 + Math.random() * 3.5
      s.scale.set(esc * 1.6, esc, 1)
      this.scene.add(s)
      this.nuvens.push({ s, v: 0.08 + Math.random() * 0.12, base: s.position.x })
    }
    // nuvens do voo (invisíveis até a câmera atravessar)
    for (let i = 0; i < 26; i++) {
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
        el.innerHTML = i.nao > 0 ? `${uf}<b>${i.nao}</b>` : uf
        if (uf === destaque) el.dataset.destaque = 'true'
        camadaRotulos.appendChild(el)
        this.rotulos.set(uf, el)
        void e
      }
    }

    // ponteiro
    canvas.addEventListener('pointermove', this.mover)
    canvas.addEventListener('pointerleave', this.sair)
    canvas.addEventListener('click', this.clicar)

    this.ro = new ResizeObserver(() => this.redimensionar())
    this.ro.observe(canvas.parentElement ?? canvas)
    this.redimensionar()
    this.camera.position.copy(this.posBase)
    this.camera.lookAt(this.olhar)
    this.iniciar()
  }

  /** Enquadra o mapa inteiro conforme a proporção do canvas. */
  private redimensionar() {
    const el = this.canvas.parentElement ?? this.canvas
    this.w = el.clientWidth || 1
    this.h = el.clientHeight || 1
    this.renderer.setSize(this.w, this.h, false)
    this.camera.aspect = this.w / this.h
    this.camera.updateProjectionMatrix()
    const fator = Math.min(2.1, Math.max(1, 0.95 / Math.min(1, this.camera.aspect) ** 0.9))
    this.posBase.set(0, -10.5 * fator, 12.5 * fator)
    if (!this.selecionado && !this.voando) {
      this.camera.position.copy(this.posBase)
      this.camera.lookAt(this.olhar)
    }
  }

  private mover = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect()
    this.ponteiro.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.sway.x = this.ponteiro.x
    this.sway.y = this.ponteiro.y
    this.ponteiroSujo = e.pointerType !== 'touch'
  }
  private sair = () => {
    this.ponteiro.set(9, 9)
    this.ponteiroSujo = true
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
      if (!this.visivel) return
      this.quadro++
      // no celular, parado, 30 fps bastam
      if (this.grosso && !this.voando && this.quadro % 2) return
      this.passo()
    }
    requestAnimationFrame(loop)
  }

  private passo() {
    const t = this.relogio.getElapsedTime()
    for (const n of this.nuvens) {
      n.s.position.x = n.base + Math.sin(t * n.v + n.base) * 0.9
    }
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
      e.alvoZ = lerp(e.alvoZ, quer, 0.15)
      e.grupo.position.z = e.alvoZ
      e.topo.emissiveIntensity = lerp(e.topo.emissiveIntensity, e.uf === this.passando || e.uf === this.selecionado ? 0.45 : 0, 0.15)
    }
    if (!this.voando && !this.selecionado) {
      // leve balanço da câmera
      const alvo = this.posBase.clone().add(new THREE.Vector3(this.sway.x * 0.8 + Math.sin(t * 0.25) * 0.4, this.sway.y * 0.5, 0))
      this.camera.position.lerp(alvo, 0.04)
      this.camera.lookAt(this.olhar)
    } else if (this.selecionado && !this.voando) {
      // balanço lento em volta do ponto de enquadramento
      const r = this.camera.position.clone().sub(this.olharSel)
      r.applyAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(t * 0.35) * 0.0012)
      this.camera.position.copy(this.olharSel).add(r)
      this.camera.lookAt(this.olharSel)
    }
    this.renderer.render(this.scene, this.camera)
    this.atualizarRotulos()
    if (this.passando && this.aoPassar) {
      const e = this.estados.get(this.passando)!
      const p = e.centro.clone().setZ(e.altura + e.alvoZ).project(this.camera)
      this.aoPassar(this.passando, ((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h)
    } else this.aoPassar?.(null, 0, 0)
  }

  private atualizarRotulos() {
    if (!this.rotulos.size) return
    const mostrar = !this.voando && !this.selecionado
    for (const [uf, el] of this.rotulos) {
      const e = this.estados.get(uf)!
      const p = e.centro.clone().setZ(e.altura + e.alvoZ + 0.05).project(this.camera)
      el.style.transform = `translate(${((p.x + 1) / 2) * this.w}px, ${((1 - p.y) / 2) * this.h}px) translate(-50%, -50%)`
      el.style.opacity = mostrar ? '1' : '0'
    }
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
    const tam = Math.min(2.6, Math.max(0.75, e.tamanho / 2.2))
    // o painel ocupa a direita (desktop) ou a metade de baixo (celular): o estado fica no espaço livre
    const largo = this.w / this.h > 1.1
    const desvio = largo ? new THREE.Vector3(1.55 * tam, 0, 0) : new THREE.Vector3(0, -1.35 * tam, 0)
    const P0 = this.camera.position.clone()
    const P2 = e.centro.clone().add(desvio).add(new THREE.Vector3(0, -2.7 * tam, 3.6 * tam))
    const P1 = P0.clone().lerp(P2, 0.5).add(new THREE.Vector3(0, 0, 3.5))
    const L0 = this.olhar.clone()
    const L1 = e.centro.clone().add(desvio)
    this.olharSel = L1.clone()
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
      this.camera.position.lerpVectors(P0, this.posBase, k)
      this.camera.lookAt(L0.clone().lerp(this.olhar, k))
      for (const o of this.estados.values()) o.topo.color.copy((o.topo.userData.de as THREE.Color).clone().lerp(o.topo.userData.para as THREE.Color, k))
    }, ease.inOutCubic)
    this.voando = false
  }

  private bezier(a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, t: number) {
    const u = 1 - t
    return new THREE.Vector3(
      u * u * a.x + 2 * u * t * b.x + t * t * c.x,
      u * u * a.y + 2 * u * t * b.y + t * t * c.y,
      u * u * a.z + 2 * u * t * b.z + t * t * c.z,
    )
  }

  definirVisivel(v: boolean) {
    this.visivel = v
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
