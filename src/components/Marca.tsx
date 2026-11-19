/** Peças de marca reutilizadas (logotipo, impressão do carimbo, seta). */

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`display inline-flex items-baseline gap-[0.18em] text-[26px] leading-none ${className}`} aria-label="O Motta não">
      <span>O MOTTA</span>
      <span className="relative inline-block bg-azul px-[0.16em] pb-[0.02em] pt-[0.06em] text-white">NÃO.</span>
    </span>
  )
}

/** A marca do carimbo, com tinta irregular (SVG + ruído). */
export function Impressao({ className = '', cor = '#ffffff', id = 'tinta' }: { className?: string; cor?: string; id?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 160" aria-hidden>
      <defs>
        <filter id={id} x="-6%" y="-12%" width="112%" height="124%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="warp" />
          <feDisplacementMap in="SourceGraphic" in2="warp" scale="6" xChannelSelector="R" yChannelSelector="G" result="rough" />
          <feTurbulence type="fractalNoise" baseFrequency="1.05" numOctaves="1" seed="11" result="grain" />
          <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -3.6 0 0 0 2.75" result="holes" />
          <feComposite in="rough" in2="holes" operator="in" />
        </filter>
      </defs>
      <g filter={`url(#${id})`} fill={cor}>
        <rect x="8" y="8" width="504" height="144" rx="16" fill="none" stroke={cor} strokeWidth="11" />
        <rect x="26" y="26" width="468" height="108" rx="8" fill="none" stroke={cor} strokeWidth="3" />
        <text
          x="260"
          y="114"
          textAnchor="middle"
          fontFamily="Archivo, 'Arial Narrow', sans-serif"
          fontWeight="900"
          fontSize="74"
          style={{ fontStretch: '70%' }}
          letterSpacing="4"
        >
          MOTTA NÃO
        </text>
      </g>
    </svg>
  )
}

export function SetaBaixo({ className = '' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 40" fill="none" aria-hidden>
      <path d="M12 2v34m0 0-8-8m8 8 8-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
