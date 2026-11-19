/**
 * Lista suspensa digitável (combobox ARIA): digite para filtrar, setas para navegar,
 * Enter para escolher, Esc para fechar. Busca ignora acentos e maiúsculas.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AnimatePresence, m } from 'motion/react'
import { ChevronDown, Search } from 'lucide-react'

export type Opcao = { valor: string; rotulo: string; detalhe?: string }

const normalizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export function Combobox({
  id,
  opcoes,
  valor,
  aoEscolher,
  placeholder,
  carregando,
  invalido,
  classeEntrada,
  limite = 80,
}: {
  id: string
  opcoes: Opcao[]
  valor: string
  aoEscolher: (v: string) => void
  placeholder?: string
  carregando?: boolean
  invalido?: boolean
  classeEntrada: string
  limite?: number
}) {
  const lista = useId()
  const atual = opcoes.find((o) => o.valor === valor)
  const [texto, setTexto] = useState(atual?.rotulo ?? '')
  const [aberto, setAberto] = useState(false)
  const [ativo, setAtivo] = useState(0)
  const caixa = useRef<HTMLDivElement>(null)
  const ul = useRef<HTMLUListElement>(null)

  // sincroniza quando o valor muda por fora (ex.: UF vinda da UTM)
  useEffect(() => {
    if (!aberto) setTexto(atual?.rotulo ?? '')
  }, [atual?.rotulo, aberto])

  const filtradas = useMemo(() => {
    const q = normalizar(texto)
    if (!q || (atual && texto === atual.rotulo)) return opcoes
    const comeca: Opcao[] = []
    const contem: Opcao[] = []
    for (const o of opcoes) {
      const r = normalizar(o.rotulo)
      const v = normalizar(o.valor)
      if (r.startsWith(q) || v === q) comeca.push(o)
      else if (r.includes(q)) contem.push(o)
    }
    return [...comeca, ...contem]
  }, [texto, opcoes, atual])
  const visiveis = filtradas.slice(0, limite)

  useEffect(() => setAtivo(0), [texto])
  useEffect(() => {
    ul.current?.querySelector(`[data-i="${ativo}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [ativo])

  // fecha ao clicar fora
  useEffect(() => {
    if (!aberto) return
    const fora = (e: PointerEvent) => {
      if (!caixa.current?.contains(e.target as Node)) fechar()
    }
    document.addEventListener('pointerdown', fora)
    return () => document.removeEventListener('pointerdown', fora)
  })

  function escolher(o: Opcao) {
    aoEscolher(o.valor)
    setTexto(o.rotulo)
    setAberto(false)
  }
  function fechar() {
    setAberto(false)
    // texto que não virou escolha volta para o valor atual
    setTexto(atual?.rotulo ?? '')
  }

  function tecla(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!aberto) setAberto(true)
      else setAtivo((a) => Math.min(a + 1, visiveis.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAtivo((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (aberto && visiveis[ativo]) {
        e.preventDefault()
        escolher(visiveis[ativo])
      }
    } else if (e.key === 'Escape') {
      fechar()
    } else if (e.key === 'Tab' && aberto && visiveis.length === 1) {
      escolher(visiveis[0])
    }
  }

  return (
    <div ref={caixa} className="relative w-full">
      <div className="flex items-center">
        <input
          id={id}
          role="combobox"
          aria-expanded={aberto}
          aria-controls={lista}
          aria-autocomplete="list"
          aria-activedescendant={aberto && visiveis[ativo] ? `${lista}-${ativo}` : undefined}
          aria-invalid={invalido}
          autoComplete="off"
          className={classeEntrada}
          placeholder={carregando ? 'Carregando…' : placeholder}
          value={texto}
          disabled={carregando}
          onChange={(e) => {
            setTexto(e.target.value)
            setAberto(true)
          }}
          onFocus={(e) => {
            setAberto(true)
            e.target.select()
          }}
          onKeyDown={tecla}
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label="Abrir lista"
          className="grid h-10 w-8 shrink-0 place-items-center text-azul-tinta/40"
          onClick={() => {
            setAberto((v) => !v)
            ;(caixa.current?.querySelector('input') as HTMLInputElement | null)?.focus()
          }}
        >
          <ChevronDown size={18} className={`transition-transform ${aberto ? 'rotate-180' : ''}`} />
        </button>
      </div>
      <AnimatePresence>
        {aberto && (
          <m.ul
            ref={ul}
            id={lista}
            role="listbox"
            data-lenis-prevent
            className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 max-h-64 min-w-[220px] overflow-y-auto overscroll-contain rounded-2xl border border-azul-tinta/10 bg-white p-1.5 shadow-[0_24px_60px_-20px_rgba(4,11,38,0.45)]"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            {visiveis.length === 0 && (
              <li className="flex items-center gap-2 px-3 py-3 text-[14px] text-azul-tinta/50">
                <Search size={15} /> Nada encontrado para “{texto}”
              </li>
            )}
            {visiveis.map((o, i) => (
              <li
                key={o.valor}
                id={`${lista}-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.valor === valor}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => escolher(o)}
                onPointerEnter={() => setAtivo(i)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors ${
                  i === ativo ? 'bg-azul-gelo text-azul-profundo' : 'text-azul-tinta'
                }`}
              >
                <span>{o.rotulo}</span>
                {o.detalhe && <span className="text-[12px] font-bold text-azul-tinta/40">{o.detalhe}</span>}
              </li>
            ))}
            {filtradas.length > limite && <li className="px-3 py-2 text-[12px] text-azul-tinta/45">Continue digitando para ver mais…</li>}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
