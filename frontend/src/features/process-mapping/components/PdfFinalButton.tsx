import * as React from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { baixarPdfFinal } from '../services/pdf-final.service'

/** Botão explícito do PDF final de um processo publicado, com o erro logo abaixo. */
export function PdfFinalButton({
  processoId,
  size = 'sm',
  className,
}: {
  processoId: string
  size?: 'sm' | 'default'
  className?: string
}) {
  const [gerando, setGerando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  async function baixar() {
    setGerando(true)
    setErro(null)
    try {
      await baixarPdfFinal(processoId)
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível gerar o PDF final.')
    } finally {
      setGerando(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button
        type="button"
        size={size}
        className={className}
        disabled={gerando}
        title="Baixar o PDF oficial do processo publicado"
        onClick={() => void baixar()}
      >
        {gerando ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileDown className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        {gerando ? 'Gerando PDF final...' : 'Baixar PDF final'}
      </Button>
      {erro && (
        <span role="alert" className="text-xs text-fx-alerta">
          {erro}
        </span>
      )}
    </span>
  )
}
