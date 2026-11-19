import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LazyMotion, domAnimation } from 'motion/react'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/inter-tight'
import './index.css'
import App from './App'
import { iniciarRastreio } from './lib/rastreio'
import { carregarConteudo } from './lib/conteudo'

iniciarRastreio()
carregarConteudo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <App />
    </LazyMotion>
  </StrictMode>,
)
