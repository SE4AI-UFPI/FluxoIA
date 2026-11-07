import { AlertCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProcessDeletionDialog({
  open,
  reason,
  error,
  isSubmitting,
  onReasonChange,
  onCancel,
  onConfirm,
}: {
  open: boolean
  reason: string
  error: string | null
  isSubmitting: boolean
  onReasonChange: (value: string) => void
  onCancel: () => void
  onConfirm: () => void
}) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onCancel()
      }}
    >
      <section
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-process-title"
        aria-describedby="delete-process-description"
        className="w-full max-w-md rounded-md border border-fx-linha bg-fx-papel p-5 shadow-lg sm:p-6"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-fx-alerta/10 text-fx-alerta">
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 id="delete-process-title" className="font-serif text-xl font-semibold text-fx-marinho">
              Excluir Processo
            </h2>
            <p id="delete-process-description" className="text-sm leading-relaxed text-fx-grafite">
              Deseja realmente excluir este processo? Esta ação não poderá ser desfeita.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label htmlFor="delete-process-reason" className="text-xs font-semibold text-fx-grafite">
            Motivo da Exclusão (opcional)
          </label>
          <textarea
            id="delete-process-reason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            rows={3}
            disabled={isSubmitting}
            className="w-full resize-y rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm text-fx-grafite placeholder:text-fx-cinza/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fx-azul disabled:opacity-60"
          />
        </div>

        {error && (
          <div role="alert" className="mt-3 flex items-start gap-2 rounded-sm border border-fx-alerta/40 bg-fx-alerta/10 px-3 py-2 text-xs text-fx-alerta">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 grid gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" disabled={isSubmitting} onClick={onConfirm}>
            <Trash2 className="h-4 w-4" />
            {isSubmitting ? 'Excluindo...' : 'Excluir Processo'}
          </Button>
        </div>
      </section>
    </div>
  )
}