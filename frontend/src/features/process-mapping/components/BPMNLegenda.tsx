type ItemLegenda = {
  chave: string
  titulo: string
  descricao: string
  icone: React.ReactNode
}

const ITENS: ItemLegenda[] = [
  {
    chave: 'inicio',
    titulo: 'Início do processo',
    descricao: 'Evento que dispara o fluxo (primeira etapa).',
    icone: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="#f8fafc" stroke="#0f3b66" strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    chave: 'atividade',
    titulo: 'Atividade (tarefa)',
    descricao: 'Ação executada por uma pessoa ou setor.',
    icone: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
        <rect x="5" y="11" width="30" height="18" rx="3" fill="#f8fafc" stroke="#0f3b66" strokeWidth="1.8" />
        <path d="M11 20h18" stroke="#94a3b8" strokeWidth="1.4" strokeDasharray="3 2" />
      </svg>
    ),
  },
  {
    chave: 'decisao',
    titulo: 'Estrutura de decisão',
    descricao: 'Gateway: o caminho se divide conforme a condição.',
    icone: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
        <path d="M20 4 36 20 20 36 4 20Z" fill="#f8fafc" stroke="#0f3b66" strokeWidth="1.8" />
        <path d="M14 14 26 26M26 14 14 26" stroke="#0f3b66" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    chave: 'fim',
    titulo: 'Fim do processo',
    descricao: 'Evento que encerra o fluxo.',
    icone: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
        <circle cx="20" cy="20" r="15" fill="#f8fafc" stroke="#0f3b66" strokeWidth="4" />
      </svg>
    ),
  },
  {
    chave: 'fluxo',
    titulo: 'Fluxo de sequência',
    descricao: 'Seta que indica a ordem entre as etapas.',
    icone: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
        <path d="M6 20h24" stroke="#0f3b66" strokeWidth="1.8" />
        <path d="M26 14l6 6-6 6" fill="none" stroke="#0f3b66" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    chave: 'raia',
    titulo: 'Raia (setor)',
    descricao: 'Faixa que mostra quem executa cada etapa.',
    icone: (
      <svg viewBox="0 0 40 40" className="h-7 w-7" aria-hidden="true">
        <rect x="4" y="8" width="32" height="24" fill="none" stroke="#0f3b66" strokeWidth="1.6" />
        <path d="M14 8v24" stroke="#0f3b66" strokeWidth="1.4" />
        <path d="M8 20h4M18 20h14" stroke="#94a3b8" strokeWidth="1.2" />
      </svg>
    ),
  },
]

/**
 * Legenda institucional do diagrama: identifica cada elemento exibido no quadro.
 */
export function BPMNLegenda() {
  return (
    <section
      aria-label="Legenda dos elementos do diagrama BPMN"
      className="rounded-sm border border-fx-linha bg-fx-papel px-3 py-2.5"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-fx-marinho">
        Legenda do diagrama
      </p>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {ITENS.map((item) => (
          <li key={item.chave} className="flex items-start gap-2">
            <span className="mt-0.5 shrink-0">{item.icone}</span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-fx-grafite">{item.titulo}</span>
              <span className="block text-[11px] leading-snug text-fx-cinza">{item.descricao}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
