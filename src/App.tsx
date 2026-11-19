import { Suspense, lazy, useEffect, useState } from 'react'
import { RolagemSuave } from './lib/movimento'
import { Abertura } from './components/Abertura'
import { Topo } from './components/Topo'
import { Contexto, Letreiro } from './components/Contexto'
import { BarraFixa } from './components/Rodape'
import { Assine } from './components/Assine'

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

  return (
    <div className="min-h-screen overflow-x-clip">
      <RolagemSuave />
      <Topo visivel={aberto} />
      <main>
        <Abertura aberto={abertoNaCarga} aoAbrir={() => setAberto(true)} />
        <div className="relative z-20 -mb-6 overflow-hidden py-2">
          <div className="-mx-[5%] -rotate-[2deg]">
            <Letreiro />
          </div>
        </div>
        <Assine />
        <Contexto />
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
