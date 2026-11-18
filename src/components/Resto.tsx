import { useEffect } from 'react'
import { rolarPara } from '../lib/movimento'
import { Votometro } from './Votometro'
import { PorQueNao } from './PorQueNao'
import { Alternativa } from './Alternativa'
import { Recado } from './Recado'
import { Assine } from './Assine'
import { Rodape } from './Rodape'

/** Ordem do briefing: votômetro → por que não → a alternativa → (card) → assine → rodapé. */
export default function Resto() {
  // quem chega por âncora (#votometro, #assine…) vai direto para a seção, depois que ela existe
  useEffect(() => {
    const id = location.hash.slice(1)
    if (id) setTimeout(() => rolarPara(id), 300)
  }, [])
  return (
    <>
      <Votometro />
      <PorQueNao />
      <Alternativa />
      <Recado />
      <Assine />
      <Rodape />
    </>
  )
}
