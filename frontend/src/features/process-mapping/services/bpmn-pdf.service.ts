import { GState, jsPDF } from 'jspdf'
import type { ApiProcesso, ProcessStatus } from '../types/process.types'

const STATUS_LABELS: Record<ApiProcesso['status'], ProcessStatus> = {
  rascunho: 'Rascunho',
  em_entrevista: 'Em Entrevista',
  em_modelagem: 'Em Modelagem BPMN',
  em_avaliacao: 'Em Avaliação',
  aguardando_validacao: 'Aguardando Validação do Gestor',
  ajustes_solicitados: 'Ajustes Solicitados',
  aprovado: 'Aprovado',
  publicado: 'Publicado',
  excluido: 'Excluído',
}

interface BpmnPdfOptions {
  diagramImage: string
  diagramWidth: number
  diagramHeight: number
  title: string
  code: string
  status: ProcessStatus | ApiProcesso['status']
  exportedAt?: Date
}

/** Identifies the process and approval state on every diagram PDF export. */
export function createBpmnPdf({
  diagramImage, diagramWidth, diagramHeight, title, code, status, exportedAt = new Date(),
}: BpmnPdfOptions): jsPDF {
  const statusLabel = STATUS_LABELS[status as ApiProcesso['status']] ?? status
  const approved = statusLabel === 'Aprovado' || statusLabel === 'Publicado'
  const processTitle = title.trim() || 'Mapeamento de processo'
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  pdf.setProperties({ title: processTitle, subject: `Status: ${statusLabel}`, creator: 'FluxoIA' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 24
  const contentWidth = pageWidth - margin * 2

  pdf.setTextColor('#243447')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('FluxoIA - Mapeamento de processos', margin, 28)
  pdf.setFontSize(16)
  const titleLines: string[] = pdf.splitTextToSize(processTitle, contentWidth)
  pdf.text(titleLines, margin, 52, { lineHeightFactor: 1.2 })
  const detailsY = 52 + titleLines.length * 19.2
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Código: ${code}`, margin, detailsY)
  pdf.setTextColor(approved ? '#24543D' : '#7C3B12')
  pdf.setFont('helvetica', 'bold')
  pdf.text(`Status: ${statusLabel}`, margin, detailsY + 16)
  if (!approved) {
    pdf.text('NÃO APROVADO - Este mapeamento ainda não foi aprovado.', margin, detailsY + 32)
  }

  const diagramTop = detailsY + (approved ? 32 : 48)
  const diagramBottom = pageHeight - 48
  const availableHeight = diagramBottom - diagramTop
  const scale = Math.min(contentWidth / diagramWidth, availableHeight / diagramHeight)
  const width = diagramWidth * scale
  const height = diagramHeight * scale
  pdf.addImage(diagramImage, 'PNG', (pageWidth - width) / 2, diagramTop + (availableHeight - height) / 2, width, height)

  if (!approved) {
    pdf.saveGraphicsState()
    pdf.setGState(new GState({ opacity: 0.16 }))
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(44)
    pdf.setTextColor('#7C3B12')
    // Draw after the image so its opaque background cannot hide the watermark.
    pdf.text('NÃO APROVADO', pageWidth / 2, diagramTop + availableHeight / 2, { align: 'center', angle: 25 })
    pdf.restoreGraphicsState()
  }

  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(9)
  pdf.setTextColor('#52657C')
  pdf.text(`Exportado em ${exportedAt.toLocaleString('pt-BR')}`, margin, pageHeight - 22)
  pdf.text('FluxoIA - Diagrama do processo | Página 1 de 1', pageWidth - margin, pageHeight - 22, { align: 'right' })
  return pdf
}
