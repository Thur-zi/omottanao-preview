import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource-variable/inter-tight'
import '../index.css'
import { Admin } from './Admin'

createRoot(document.getElementById('painel')!).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
)
