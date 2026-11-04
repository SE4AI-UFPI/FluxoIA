import type { ProcessStep } from '../types/process.types'

const PROCESS_STEPS: Array<{ id: ProcessStep; label: string }> = [
  { id: 1, label: 'Dados Iniciais' },
  { id: 2, label: 'Entrevista' },
  { id: 3, label: 'Fluxo BPMN' },
  { id: 4, label: 'Avaliação e Feedback' },
]

export function ProcessWizard({ currentStep }: { currentStep: ProcessStep }) {
  return (
    <nav aria-label="Etapas do mapeamento">
      <ol className="grid gap-2 sm:grid-cols-4 sm:gap-3">
        {PROCESS_STEPS.map(({ id, label }) => {
          const current = currentStep === id
          const completed = currentStep > id
          return (
            <li
              key={id}
              aria-current={current ? 'step' : undefined}
              className={`flex min-h-11 items-center gap-2.5 rounded-sm border px-3 py-2 text-xs font-semibold ${
                current
                  ? 'border-fx-azul bg-fx-nevoa/60 text-fx-marinho'
                  : completed
                    ? 'border-fx-sucesso/40 bg-fx-sucesso/10 text-fx-marinho'
                    : 'border-fx-linha bg-fx-papel text-fx-cinza'
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${
                current ? 'bg-fx-azul text-fx-papel' : completed ? 'bg-fx-sucesso text-fx-papel' : 'bg-fx-nevoa text-fx-marinho'
              }`}>
                {id}
              </span>
              <span>{label}</span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}