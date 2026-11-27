import * as React from 'react'
import { FileDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Mostra o PDF no visualizador nativo do navegador. O download só é oferecido quando
 * `onDownload` é passado (processo publicado), para que a pré-visualização não circule
 * como documento oficial.
 */
export function PdfPreviewDialog({
  pdf,
  title,
  onClose,
  onDownload,
}: {
  pdf: Blob
  title: string
  onClose: () => void
  onDownload?: () => void
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null)
  const url = React.useMemo(() => URL.createObjectURL(pdf), [pdf])

  React.useEffect(() => () => URL.revokeObjectURL(url), [url])

  React.useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      previousFocus?.focus()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-preview-title"
      className="fixed inset-0 z-50 flex flex-col gap-2.5 bg-fx-papel p-3 shadow-2xl sm:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-fx-linha pb-2">
        <h2 id="pdf-preview-title" className="text-sm font-semibold text-fx-marinho sm:text-base">
          Pré-visualização do PDF · {title}
        </h2>
        <div className="flex items-center gap-2">
          {onDownload && (
            <Button type="button" size="sm" onClick={onDownload}>
              <FileDown className="mr-1.5 h-4 w-4" aria-hidden="true" /> Baixar PDF
            </Button>
          )}
          <Button ref={closeRef} type="button" size="sm" variant="outline" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" aria-hidden="true" /> Fechar (Esc)
          </Button>
        </div>
      </div>
      <iframe
        src={url}
        title={`PDF de ${title}`}
        className="min-h-0 flex-1 rounded-sm border border-fx-linha bg-white"
      />
    </div>
  )
}
