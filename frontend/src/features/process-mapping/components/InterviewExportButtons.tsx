import { useState } from 'react'
import { Download, FileDown, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { InterviewExportData } from '../services/interview-export.service'
import { createInterviewMarkdown, interviewExportFilename } from '../services/interview-export.service'

export function InterviewExportButtons({ data }: { data: InterviewExportData }) {
  const [exporting, setExporting] = useState<'pdf' | 'md' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function exportInterview(format: 'pdf' | 'md') {
    if (exporting) return
    setExporting(format)
    setError(null)
    try {
      const filename = interviewExportFilename(data.context)
      if (format === 'pdf') {
        const { createInterviewPdf } = await import('../services/interview-pdf.service')
        createInterviewPdf(data).save(`${filename}.pdf`)
      } else {
        const url = URL.createObjectURL(new Blob([createInterviewMarkdown(data)], { type: 'text/markdown;charset=utf-8' }))
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = `${filename}.md`
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
        window.setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    } catch {
      setError('Não foi possível exportar a entrevista. Tente novamente.')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="space-y-2">
      <div role="group" aria-label="Exportar entrevista" className="flex flex-wrap gap-2">
        <Button type="button" size="sm" className="bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700" disabled={Boolean(exporting) || data.questions.length === 0} onClick={() => void exportInterview('pdf')}>
          {exporting === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          Exportar PDF
        </Button>
        <Button type="button" size="sm" disabled={Boolean(exporting) || data.questions.length === 0} onClick={() => void exportInterview('md')}>
          <Download className="h-4 w-4" /> Exportar Markdown
        </Button>
      </div>
      {exporting && <p role="status" className="text-xs text-fx-cinza">Preparando exportação…</p>}
      {error && <p role="alert" className="text-sm text-fx-alerta">{error}</p>}
    </div>
  )
}
