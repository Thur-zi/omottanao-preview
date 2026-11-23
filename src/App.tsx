import { Suspense, lazy, useEffect, useState } from 'react'
import { RolagemSuave } from './lib/movimento'
import { Abertura } from './components/Abertura'
import { Topo } from './components/Topo'
import { BarraFixa } from './components/Rodape'
import { Assine } from './components/Assine'
import { Contexto } from './components/Contexto'
import { CONFIG } from './config'
import { useConteudo } from './lib/conteudo'

const Resto = lazy(() => import('./components/Resto'))

const comAbertura = () => document.documentElement.classList.contains('com-abertura')

/**
 * O resto da página monta quando o navegador fica livre e, na primeira visita, só depois do carimbo
 * (montar tudo no meio da animação engasgava o celular). Quem chega por âncora monta na hora.
 */
function useOcioso(liberado: boolean) {
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    if (pronto) return
    const vai = () => setPronto(true)
    if (location.hash) return vai()
    if (!liberado) return
    const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    const t = setTimeout(() => (ric ? ric(vai, { timeout: 1500 }) : vai()), 1600) // depois da rolagem até o formulário
    return () => clearTimeout(t)
  }, [liberado, pronto])
  return pronto
}

export default function App() {
  const [aberto, setAberto] = useState(() => !comAbertura())
  const [abertoNaCarga] = useState(aberto)
  const pronto = useOcioso(aberto)
  useConteudo()

  return (
    <div className="min-h-screen overflow-x-clip">
      <RolagemSuave />
      <Topo visivel={aberto} />
      <main>
        <Abertura aberto={abertoNaCarga} aoAbrir={() => setAberto(true)} />
        <Assine />
        {/* arquivado: Painel → Arquivo → "Como funciona" */}
        {CONFIG.mostrarComoFunciona && <Contexto />}
        {pronto && (
          <Suspense fallback={<div className="h-[100svh] bg-azul-fundo" />}>
            <Resto />
          </Suspense>
        )}
      </main>
      <BarraFixa ativa={aberto} />
    </div>
  )
}
