/** Estado compartilhado mínimo: a UF da pessoa (vem da UTM, do mapa ou do formulário). */
import { useSyncExternalStore } from 'react'
import type { UF } from '../data/votometro'
import { ORIGEM } from './rastreio'

let uf: UF | null = ORIGEM.uf ?? null
const ouvintes = new Set<() => void>()

export function definirUF(nova: UF | null) {
  if (nova === uf) return
  uf = nova
  ouvintes.forEach((f) => f())
}

export function useUF() {
  return useSyncExternalStore(
    (f) => {
      ouvintes.add(f)
      return () => ouvintes.delete(f)
    },
    () => uf,
  )
}
