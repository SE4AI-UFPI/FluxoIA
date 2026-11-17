import type React from 'react'

export interface FluxoBotIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
}

/**
 * Ícone personalizado do Assistente FluxoIA.
 * Integra a tríade fundamental da notação BPMN 2.0 na identidade visual do robô:
 * - Antena: Gateway BPMN (Losango / Decisão)
 * - Cabeça: Atividade / Task BPMN (Retângulo com cantos arredondados)
 * - Orelhas: Eventos BPMN (Círculos com borda / Anéis)
 */
export function FluxoBotIcon({
  size = 24,
  className,
  width,
  height,
  ...props
}: FluxoBotIconProps) {
  const iconWidth = width ?? size
  const iconHeight = height ?? size

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={iconWidth}
      height={iconHeight}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Antena: sobe do topo e vira 90 graus para a esquerda até o círculo */}
      <path d="M12 9.5V4H7.8" />

      {/* Símbolo do Círculo (Evento BPMN) na ponta da antena */}
      <circle cx="6" cy="4" r="1.8" />

      {/* Cabeça retangular (Atividade / Task BPMN) com cantos retos/sutis */}
      <rect x="4.5" y="9.5" width="15" height="11" rx="0.75" />

      {/* Olhos (traços verticais) */}
      <line x1="9" y1="13.5" x2="9" y2="16.5" />
      <line x1="15" y1="13.5" x2="15" y2="16.5" />

      {/* Orelha Esquerda: haste reta + Losango (Gateway BPMN) na ponta */}
      <line x1="4.5" y1="15" x2="4" y2="15" />
      <path d="M2.2 13.2 L4 15 L2.2 16.8 L0.4 15 Z" />

      {/* Orelha Direita: haste reta + Losango (Gateway BPMN) na ponta */}
      <line x1="19.5" y1="15" x2="20" y2="15" />
      <path d="M21.8 13.2 L23.6 15 L21.8 16.8 L20 15 Z" />
    </svg>
  )
}

export default FluxoBotIcon
