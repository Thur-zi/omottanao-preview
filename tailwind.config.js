/**
 * O Motta Não — tokens.
 * Vermelho = o Motta (só no topo e no que é "dele"). Azul PL = o NÃO, a direita, a ação.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: { DEFAULT: '1.25rem', sm: '1.75rem', lg: '2.5rem' }, screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        vermelho: { DEFAULT: '#C61F1F', vivo: '#E02A2A', escuro: '#8E1414', noite: '#3A0707', tinta: '#1C0303' },
        azul: {
          DEFAULT: '#1F4FE0',
          vivo: '#3D7BFF',
          claro: '#A9C1FF',
          gelo: '#EEF3FF',
          profundo: '#0E2E9A',
          noite: '#081A52',
          fundo: '#040B26',
          tinta: '#0A1433',
        },
        papel: '#F5F6FA',
        aco: '#8A94AD',
        whatsapp: '#25D366',
      },
      fontFamily: {
        titulo: ['"Archivo Variable"', 'Archivo', 'Arial Narrow', 'sans-serif'],
        sans: ['"Inter Tight Variable"', '"Inter Tight"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: { titulo: '-0.025em', rotulo: '0.24em' },
      boxShadow: {
        azul: '0 18px 40px -14px rgba(31,79,224,0.85)',
        flutua: '0 50px 100px -40px rgba(4,11,38,0.7)',
        suave: '0 16px 36px -20px rgba(4,11,38,0.35)',
        vermelho: '0 30px 80px -30px rgba(142,20,20,0.9)',
      },
      keyframes: {
        letreiro: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        respira: { '0%,100%': { transform: 'scale(1)', opacity: '0.55' }, '50%': { transform: 'scale(1.35)', opacity: '0' } },
        desce: { '0%': { transform: 'translateY(-30%)', opacity: '0' }, '40%': { opacity: '1' }, '100%': { transform: 'translateY(60%)', opacity: '0' } },
        quica: { '0%,100%': { transform: 'translateY(-3px)' }, '50%': { transform: 'translateY(4px)' } },
        grao: {
          '0%,100%': { transform: 'translate(0,0)' },
          '20%': { transform: 'translate(-3%,2%)' },
          '40%': { transform: 'translate(2%,-3%)' },
          '60%': { transform: 'translate(-2%,-1%)' },
          '80%': { transform: 'translate(3%,3%)' },
        },
      },
      animation: {
        letreiro: 'letreiro 40s linear infinite',
        respira: 'respira 2.4s ease-out infinite',
        desce: 'desce 1.8s cubic-bezier(.6,0,.4,1) infinite',
        quica: 'quica 1.2s cubic-bezier(.45,0,.55,1) infinite',
        grao: 'grao 0.9s steps(4) infinite',
      },
    },
  },
  plugins: [],
}
