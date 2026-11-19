import { useEffect } from 'react'
import { rolarPara } from '../lib/movimento'
import { CONFIG } from '../config'
import { useConteudo } from '../lib/conteudo'
import { Votometro } from './Votometro'
import { PorQueNao } from './PorQueNao'
import { Alternativa } from './Alternativa'
import { Recado } from './Recado'
import { Rodape } from './Rodape'

/** Depois do formulário (2ª seção): card de cobrança → [votômetro, arquivado] → por que não → a alternativa → rodapé. */
export default function Resto() {
  useConteudo()
  // quem chega por âncora (#votometro, #assine…) vai direto para a seção, depois que ela existe
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) setTimeout(() => rolarPara(id), 300)
  }, [])
  return (
    <>
      {/* arquivado: Painel → Arquivo → "Votômetro" */}
      <Recado />
      {CONFIG.mostrarVotometro && <Votometro />}
      <PorQueNao />
      <Alternativa />
      <Rodape />
    </>
  )
}
