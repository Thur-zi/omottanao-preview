/**
 * Carimbo 3D da abertura.
 * O plano z=0 é a "foto" (DOM, atrás do canvas). O carimbo paira, mergulha até z=0 na testa e sai.
 */
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ease, espera, lerp, tween } from './animar'

const FOV = 30
const DIST = 10
const GRAUS = Math.PI / 180

/** Textura de madeira procedural (veios + poros), gerada uma vez em canvas. */
function texturaMadeira(base: string, veio: string, claro: string, semente: number) {
  const c = document.createElement('canvas')
  c.width = c.height = 512
  const g = c.getContext('2d')!
  let s = semente
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  const grad = g.createLinearGradient(0, 0, 512, 0)
  grad.addColorStop(0, base)
  grad.addColorStop(0.5, claro)
  grad.addColorStop(1, base)
  g.fillStyle = grad
  g.fillRect(0, 0, 512, 512)
  // veios ondulados ao longo do comprimento
  for (let i = 0; i < 70; i++) {
    const y0 = rnd() * 512
    const amp = 2 + rnd() * 9
    const freq = 0.004 + rnd() * 0.012
    const fase = rnd() * 10
    g.strokeStyle = veio
    g.globalAlpha = 0.06 + rnd() * 0.2
    g.lineWidth = 0.6 + rnd() * 2.4
    g.beginPath()
    for (let x = 0; x <= 512; x += 6) {
      const y = y0 + Math.sin(x * freq + fase) * amp + Math.sin(x * freq * 3.1) * amp * 0.25
      x === 0 ? g.moveTo(x, y) : g.lineTo(x, y)
    }
    g.stroke()
  }
  // poros
  g.globalAlpha = 0.08
  g.fillStyle = veio
  for (let i = 0; i < 2600; i++) g.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1)
  g.globalAlpha = 1
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.anisotropy = 8
  return t
}

/** Carimbo de madeira: bloco envernizado, borracha embaixo, cabo torneado com bola no topo. */
function montarCarimbo() {
  const modelo = new THREE.Group()
  const verniz = { roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.28 }

  const borracha = new THREE.Mesh(
    new RoundedBoxGeometry(0.96, 0.05, 0.6, 2, 0.012),
    new THREE.MeshStandardMaterial({ color: '#2a1414', roughness: 0.95 }),
  )
  borracha.position.y = 0.025
  modelo.add(borracha)

  const texBloco = texturaMadeira('#c8741f', '#7a3c0c', '#e09a45', 7)
  texBloco.repeat.set(1.4, 1)
  const bloco = new THREE.Mesh(
    new RoundedBoxGeometry(1.0, 0.28, 0.64, 4, 0.025),
    new THREE.MeshPhysicalMaterial({ map: texBloco, color: '#e9a768', ...verniz }),
  )
  bloco.position.y = 0.05 + 0.14
  modelo.add(bloco)

  // cabo torneado: pé alargado, pescoço, anel e bola levemente achatada
  const y0 = 0.33
  const perfil = [
    [0.0, 0], [0.135, 0], [0.13, 0.025], [0.1, 0.05], [0.078, 0.1], [0.07, 0.2], [0.072, 0.28], [0.09, 0.31],
    [0.092, 0.33], [0.082, 0.345], [0.11, 0.38], [0.15, 0.43], [0.165, 0.49], [0.158, 0.55], [0.13, 0.6], [0.08, 0.63], [0.0, 0.64],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const texCabo = texturaMadeira('#d9a35a', '#9a5a1c', '#ecc07e', 21)
  texCabo.rotation = Math.PI / 2
  texCabo.repeat.set(1, 2)
  const cabo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 56), new THREE.MeshPhysicalMaterial({ map: texCabo, color: '#f0bd86', ...verniz }))
  cabo.position.y = y0
  modelo.add(cabo)

  return modelo
}

export class CenaCarimbo {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100)
  private externo = new THREE.Group() // posição + giro no plano da tela
  private interno = new THREE.Group() // inclinação (de lado → mergulho)
  private modelo: THREE.Group
  private w = 1
  private h = 1
  private escalaPx = 0.01 // mundo por pixel no plano z=0
  private alvo = new THREE.Vector3()
  private largura = 1 // largura do carimbo em mundo
  private giro = -12 * GRAUS
  private estado: 'oculto' | 'ocioso' | 'batendo' | 'fim' = 'oculto'
  private mouse = { x: 0, y: 0, sx: 0, sy: 0 }
  private relogio = new THREE.Clock()
  private rodando = false
  private ro: ResizeObserver
  /** 0 (longe) .. 1 (encostado): para a sombra de contato no DOM */
  aoAproximar?: (proximidade: number, xPx: number, yPx: number) => void

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' })
    const grosso = window.matchMedia('(pointer: coarse)').matches
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, grosso ? 1.5 : 1.75))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.92
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    pmrem.dispose()

    this.scene.add(new THREE.HemisphereLight('#ffffff', '#c61f1f', 0.9))
    const chave = new THREE.DirectionalLight('#ffffff', 2.4)
    chave.position.set(-4, 6, 8)
    this.scene.add(chave)
    const recorte = new THREE.DirectionalLight('#ffd9a8', 1.3)
    recorte.position.set(5, 3, -4)
    this.scene.add(recorte)

    this.modelo = montarCarimbo()
    this.interno.add(this.modelo)
    this.externo.add(this.interno)
    this.externo.visible = false
    this.scene.add(this.externo)

    this.camera.position.set(0, 0, DIST)
    this.camera.lookAt(0, 0, 0)

    this.ro = new ResizeObserver(() => this.redimensionar())
    this.ro.observe(canvas.parentElement ?? canvas)
    this.redimensionar()
  }

  private redimensionar() {
    const el = this.canvas.parentElement ?? this.canvas
    this.w = el.clientWidth || 1
    this.h = el.clientHeight || 1
    this.renderer.setSize(this.w, this.h, false)
    this.camera.aspect = this.w / this.h
    this.camera.updateProjectionMatrix()
    this.escalaPx = (2 * DIST * Math.tan((FOV * GRAUS) / 2)) / this.h
    this.renderizar()
  }

  /** Alvo (testa) em pixels do canvas + largura desejada do carimbo em pixels + giro em graus (horário). */
  definirAlvo(xPx: number, yPx: number, larguraPx: number, giroGraus = 12) {
    this.alvo.set((xPx - this.w / 2) * this.escalaPx, -(yPx - this.h / 2) * this.escalaPx, 0)
    this.largura = larguraPx * this.escalaPx
    this.giro = -giroGraus * GRAUS
    this.modelo.scale.setScalar(this.largura)
    if (this.estado === 'ocioso') this.poseOciosa(0)
    this.renderizar()
  }

  apontar(nx: number, ny: number) {
    this.mouse.x = nx
    this.mouse.y = ny
  }

  /** deslocamento vertical da entrada em cena (em larguras do carimbo) */
  private entrada = 4

  /**
   * Pairando à frente da foto, um pouco acima da testa. As coordenadas são corrigidas pela
   * perspectiva (k) para que, na tela, ele fique exatamente sobre o alvo, só que maior (mais perto).
   */
  private poseOciosa(t: number) {
    const L = this.largura
    this.mouse.sx = lerp(this.mouse.sx, this.mouse.x, 0.06)
    this.mouse.sy = lerp(this.mouse.sy, this.mouse.y, 0.06)
    // pairando ao lado da cabeça (o rosto fica livre); no celular, mais perto do centro
    const z = 0.55 * L
    const k = (DIST - z) / DIST
    const lateral = this.w / this.h < 0.8 ? 0.42 : 0.98
    const bob = Math.sin(t * 1.6) * 0.035 * L
    const tela = {
      x: this.alvo.x + (lateral + this.mouse.sx * 0.08) * L,
      y: this.alvo.y + (-0.05 + this.entrada) * L + bob - this.mouse.sy * 0.05 * L,
    }
    this.externo.position.set(tela.x * k, tela.y * k, z)
    this.externo.rotation.z = this.giro - 0.32 + Math.sin(t * 0.9) * 0.05 + this.mouse.sx * 0.08
    this.interno.rotation.x = Math.PI / 2 - (0.92 + Math.sin(t * 1.3) * 0.04 + this.mouse.sy * 0.12)
    this.interno.rotation.y = Math.sin(t * 0.7) * 0.14 + this.mouse.sx * 0.25
  }

  /** Entra em cena descendo e fica pairando sobre a testa. */
  async entrar() {
    this.estado = 'ocioso'
    this.externo.visible = true
    this.entrada = 4
    this.iniciarLoop()
    await tween(1.3, (k) => {
      this.entrada = lerp(4, 0, k)
    }, ease.outBack)
  }

  /** O golpe. `aoImpacto` dispara no instante do contato. */
  async bater(aoImpacto: () => void) {
    if (this.estado === 'batendo' || this.estado === 'fim') return
    if (this.estado === 'oculto') {
      this.entrada = 0.6
      this.poseOciosa(0)
      this.externo.visible = true
      this.iniciarLoop()
    }
    this.estado = 'batendo'
    const L = this.largura
    const p0 = this.externo.position.clone()
    const rz0 = this.externo.rotation.z
    const rx0 = this.interno.rotation.x
    const ry0 = this.interno.rotation.y

    // 1. sobe um pouco (antecipação)
    await tween(0.28, (k) => {
      this.externo.position.y = p0.y + 0.35 * L * k
      this.externo.position.z = p0.z + 0.5 * L * k
      this.interno.rotation.x = rx0 - 0.15 * k
    }, ease.outCubic)

    // 2. mergulho
    const p1 = this.externo.position.clone()
    const rx1 = this.interno.rotation.x
    await tween(0.34, (k) => {
      this.externo.position.set(lerp(p1.x, this.alvo.x, k), lerp(p1.y, this.alvo.y, k), lerp(p1.z, 0, k))
      this.externo.rotation.z = lerp(rz0, this.giro, k)
      this.interno.rotation.x = lerp(rx1, Math.PI / 2, ease.outCubic(k))
      this.interno.rotation.y = lerp(ry0, 0, k)
    }, ease.inCubic)

    // 3. impacto: achata e afunda
    aoImpacto()
    await tween(0.09, (k) => {
      this.modelo.scale.set(L * (1 + 0.04 * k), L * (1 - 0.1 * k), L * (1 + 0.04 * k))
      this.externo.position.z = -0.02 * L * k
    }, ease.outCubic)
    await tween(0.22, (k) => {
      this.modelo.scale.set(L * (1.04 - 0.04 * k), L * (0.9 + 0.1 * k), L * (1.04 - 0.04 * k))
    }, ease.outBack)
    await espera(0.28)

    // 4. sai de cena girando, em direção à câmera
    const p2 = this.externo.position.clone()
    await tween(0.85, (k) => {
      this.externo.position.set(p2.x + 0.6 * L * k, p2.y + 3.6 * L * k, p2.z + 2.4 * L * k)
      this.interno.rotation.x = Math.PI / 2 - 0.9 * k
      this.externo.rotation.z = this.giro + 0.5 * k
    }, ease.inOutCubic)
    this.estado = 'fim'
    this.externo.visible = false
    this.renderizar()
    this.rodando = false
  }

  private iniciarLoop() {
    if (this.rodando) return
    this.rodando = true
    const loop = () => {
      if (!this.rodando) return
      const t = this.relogio.getElapsedTime()
      if (this.estado === 'ocioso') this.poseOciosa(t)
      this.renderizar()
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  private renderizar() {
    this.renderer.render(this.scene, this.camera)
    if (this.aoAproximar && this.externo.visible) {
      const z = Math.max(0, this.externo.position.z)
      const prox = 1 - Math.min(1, z / (2.2 * this.largura))
      const p = this.externo.position.clone().setZ(0).project(this.camera)
      this.aoAproximar(prox, ((p.x + 1) / 2) * this.w, ((1 - p.y) / 2) * this.h)
    }
  }

  dispose() {
    this.rodando = false
    this.ro.disconnect()
    this.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.Material | THREE.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose())
      else mat?.dispose()
    })
    this.renderer.dispose()
  }
}
