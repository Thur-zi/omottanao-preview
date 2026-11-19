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

/** O resto da página monta quando o navegador fica livre (ou já, se a pessoa chegou por âncora). */
function useOcioso() {
  const [pronto, setPronto] = useState(false)
  useEffect(() => {
    const vai = () => setPronto(true)
    if (location.hash) return vai()
    const ric = (window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number }).requestIdleCallback
    if (ric) ric(vai, { timeout: 2200 })
    else setTimeout(vai, 900)
  }, [])
  return pronto
}

export default function App() {
  const [aberto, setAberto] = useState(() => !comAbertura())
  const [abertoNaCarga] = useState(aberto)
  const pronto = useOcioso()
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
