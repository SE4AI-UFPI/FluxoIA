import { cn } from '@/lib/utils'

interface FioDeFluxoProps {
  /** 'dark' para uso sobre Azul Marinho (#0B2A4A), 'light' para uso sobre Papel/Fundo */
  theme?: 'dark' | 'light'
  className?: string
}

/**
 * Grafismo oficial "O fio de fluxo" (Seção 10 do Guia de Marca FluxoIA v1.0):
 * - Uma linha só por composição, na horizontal.
 * - Nós BPMN na ordem: início (círculo sólido), tarefa (retângulo arredondado), decisão (losango) e fim (anel).
 * - Cores da paleta: linha em Azul Marinho ou branco; nós em Azul FluxoIA ou Azul Claro.
 */
export function FioDeFluxo({ theme = 'dark', className }: FioDeFluxoProps) {
  const strokeMain = theme === 'dark' ? '#F7FAFD' : '#0B2A4A'
  const accentColor = theme === 'dark' ? '#7FB2E5' : '#1D5FA6'

  return (
    <svg
      viewBox="0 0 360 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={cn('w-64 h-auto select-none', className)}
    >
      {/* Fio contínuo entre os elementos */}
      <line x1="20" y1="22" x2="112" y2="22" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="168" y1="22" x2="210" y2="22" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="242" y1="22" x2="330" y2="22" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" />

      {/* 1. Círculo sólido (Evento de Início BPMN) */}
      <circle cx="14" cy="22" r="7.5" fill={accentColor} />

      {/* 2. Retângulo arredondado (Tarefa BPMN) */}
      <rect
        x="112"
        y="10"
        width="56"
        height="24"
        rx="6"
        stroke={strokeMain}
        strokeWidth="3.5"
      />

      {/* 3. Losango (Gateway de Decisão BPMN) */}
      <rect
        x="226"
        y="7.5"
        width="20.5"
        height="20.5"
        rx="2"
        transform="rotate(45 226 7.5)"
        stroke={accentColor}
        strokeWidth="3.5"
      />

      {/* 4. Anel (Evento de Fim BPMN) */}
      <circle cx="340" cy="22" r="8.5" stroke={strokeMain} strokeWidth="3.5" />
    </svg>
  )
}
