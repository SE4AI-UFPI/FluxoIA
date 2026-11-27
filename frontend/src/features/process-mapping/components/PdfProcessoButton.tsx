import * as React from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { baixarPdfProcesso } from '../services/pdf-processo.service'

/**
 * Botão explícito do PDF do processo, com o erro logo abaixo. Publicado, é o PDF final
 * (sem marca d'água); antes disso, o mesmo arquivo marcado como não aprovado.
 */
export function PdfProcessoButton({
  processoId,
  publicado,
  size = 'sm',
  className,
}: {
  processoId: string
  publicado: boolean
  size?: 'sm' | 'default'
  className?: string
}) {
  const [gerando, setGerando] = React.useState(false)
  const [erro, setErro] = React.useState<string | null>(null)

  async function baixar() {
    setGerando(true)
    setErro(null)
    try {
      await baixarPdfProcesso(processoId)
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível gerar o PDF.')
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
        title={publicado ? 'Baixar o PDF oficial do processo publicado' : "Baixar o PDF com marca d'água de não aprovado"}
        onClick={() => void baixar()}
      >
        {gerando ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileDown className="mr-1.5 h-4 w-4" aria-hidden="true" />
        )}
        {gerando ? 'Gerando PDF...' : publicado ? 'Baixar PDF final' : 'Baixar PDF'}
      </Button>
      {erro && (
        <span role="alert" className="text-xs text-fx-alerta">
          {erro}
        </span>
      )}
    </span>
  )
}
