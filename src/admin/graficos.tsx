/** Gráficos (Recharts) do painel. */
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmt } from './api'
import { CORES, PALETA, Vazio } from './ui'

const rotuloTempo = (t: string) => (t.length > 10 ? `${t.slice(11, 13)}h` : `${t.slice(8, 10)}/${t.slice(5, 7)}`)

export function SerieTempo({ dados }: { dados: { t: string; visitantes: number; assinaturas: number }[] }) {
  if (!dados.length) return <Vazio />
  return (
    <div className="h-[280px]">
      <ResponsiveContainer>
        <AreaChart data={dados} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            {[
              ['v', CORES.s1],
              ['a', CORES.s2],
            ].map(([id, c]) => (
              <linearGradient key={id} id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={CORES.grade} vertical={false} />
          <XAxis dataKey="t" tickFormatter={rotuloTempo} tick={{ fontSize: 11, fill: CORES.eixo }} axisLine={false} tickLine={false} minTickGap={18} />
          <YAxis tick={{ fontSize: 11, fill: CORES.eixo }} axisLine={false} tickLine={false} allowDecimals={false} />
          <Tooltip labelFormatter={(t) => rotuloTempo(String(t))} formatter={(v: number) => fmt.format(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 30px -10px rgba(4,11,38,.35)' }} />
          <Area type="monotone" dataKey="visitantes" name="Visitantes" stroke={CORES.s1} strokeWidth={2.5} fill="url(#gv)" />
          <Area type="monotone" dataKey="assinaturas" name="Assinaturas" stroke={CORES.s2} strokeWidth={2.5} fill="url(#ga)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function BarrasHora({ dados }: { dados: { r: number; n: number }[] }) {
  const pico = dados.reduce((a, b) => (b.n > a.n ? b : a), { r: 0, n: 0 })
  if (!pico.n) return <Vazio />
  return (
    <>
      <p className="mb-2 text-[13px] text-azul-tinta/60">
        Pico às <b className="text-azul-tinta">{pico.r}h</b> ({fmt.format(pico.n)} assinaturas)
      </p>
      <div className="h-[200px]">
        <ResponsiveContainer>
          <BarChart data={dados} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid stroke={CORES.grade} vertical={false} />
            <XAxis dataKey="r" tick={{ fontSize: 10, fill: CORES.eixo }} axisLine={false} tickLine={false} interval={2} tickFormatter={(h) => `${h}h`} />
            <YAxis tick={{ fontSize: 10, fill: CORES.eixo }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip formatter={(v: number) => fmt.format(v)} labelFormatter={(h) => `${h}h`} cursor={{ fill: 'rgba(31,79,224,0.06)' }} />
            <Bar dataKey="n" name="Assinaturas" radius={[5, 5, 0, 0]}>
              {dados.map((d) => (
                <Cell key={d.r} fill={d.r === pico.r ? CORES.s2 : CORES.s1} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </>
  )
}

export function Rosca({ dados, rotulos = {} }: { dados: { r: string | null; n: number }[]; rotulos?: Record<string, string> }) {
  const tot = dados.reduce((s, d) => s + d.n, 0)
  if (!tot) return <Vazio />
  const top = [...dados].sort((a, b) => b.n - a.n)
  const lista = top.length > 5 ? [...top.slice(0, 4), { r: 'Outros', n: top.slice(4).reduce((s, d) => s + d.n, 0) }] : top
  return (
    <div className="flex items-center gap-5">
      <div className="h-[160px] w-[160px] shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={lista} dataKey="n" nameKey="r" innerRadius={48} outerRadius={76} paddingAngle={2} stroke="none">
              {lista.map((_, i) => (
                <Cell key={i} fill={PALETA[i % PALETA.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="min-w-0 flex-1 space-y-2 text-[13px]">
        {lista.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <i className="h-3 w-3 shrink-0 rounded" style={{ background: PALETA[i % PALETA.length] }} />
            <span className="truncate font-semibold">{rotulos[String(d.r)] ?? d.r ?? '—'}</span>
            <span className="ml-auto tabular-nums text-azul-tinta/60">{Math.round((d.n / tot) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
