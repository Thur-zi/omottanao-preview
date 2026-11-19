import { useEffect } from 'react'
import { rolarPara } from '../lib/movimento'
import { Votometro } from './Votometro'
import { PorQueNao } from './PorQueNao'
import { Alternativa } from './Alternativa'
import { Recado } from './Recado'
import { Rodape } from './Rodape'

/** Depois do formulário (2ª seção) e do contexto: votômetro → por que não → a alternativa → card → rodapé. */
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
      <Rodape />
    </>
  )
}
