import { useEffect, useState } from 'react'

/** Votação: 1º/02/2027. Horário oficial ainda não divulgado; usamos 00h de Brasília. */
export const DATA_ELEICAO = new Date('2027-02-01T00:00:00-03:00')

export function useContagem(alvo = DATA_ELEICAO) {
  const calc = () => {
    const ms = Math.max(0, alvo.getTime() - Date.now())
    return {
      dias: Math.floor(ms / 86_400_000),
      horas: Math.floor((ms / 3_600_000) % 24),
      minutos: Math.floor((ms / 60_000) % 60),
      segundos: Math.floor((ms / 1000) % 60),
    }
  }
  const [t, setT] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return t
}
