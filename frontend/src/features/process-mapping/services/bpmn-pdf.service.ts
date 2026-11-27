import { GState, jsPDF } from 'jspdf'
import type { ApiProcesso, ProcessStatus } from '../types/process.types'
import type { BpmnPdfDetails } from './pdf-details'

const STATUS_LABELS: Record<ApiProcesso['status'], string> = {
  rascunho: 'Rascunho',
  em_entrevista: 'Em Entrevista',
  em_modelagem: 'Em Modelagem BPMN',
  em_avaliacao: 'Em Avaliação',
  aguardando_validacao: 'Aguardando Validação do Gestor',
  ajustes_solicitados: 'Ajustes Solicitados',
  aprovado: 'Homologado pela Supervisão',
  publicado: 'Publicado',
  excluido: 'Excluído',
}

/**
 * `export`: o arquivo que será baixado. `preview`: o que a supervisão e a coordenação
 * conferem antes da publicação — layout do oficial, mas marcado como pré-visualização.
 */
export type BpmnPdfMode = 'export' | 'preview'

interface BpmnPdfOptions {
  diagramImage: string
  diagramWidth: number
  diagramHeight: number
  title: string
  code: string
  status: ProcessStatus | ApiProcesso['status']
  details?: BpmnPdfDetails
  mode?: BpmnPdfMode
  exportedAt?: Date
}

const MARGIN = 24
const DETAIL_MARGIN = 48
const LINE_HEIGHT = 14
const LABEL_WIDTH = 145
const FOOTER_SPACE = 48

/** Identifies the process and approval state on every diagram PDF export. */
export function createBpmnPdf({
  diagramImage, diagramWidth, diagramHeight, title, code, status, details, mode = 'export',
  exportedAt = new Date(),
}: BpmnPdfOptions): jsPDF {
  const statusLabel = status === 'Aprovado'
    ? STATUS_LABELS.aprovado
    : STATUS_LABELS[status as ApiProcesso['status']] ?? status
  // Só a publicação (aval final do coordenador) gera o PDF oficial, sem marca d'água.
  const approved = statusLabel === 'Publicado'
  const preview = mode === 'preview' && !approved
  const homologated = statusLabel === STATUS_LABELS.aprovado
  const watermark = approved ? null : preview ? 'PRÉ-VISUALIZAÇÃO' : 'NÃO APROVADO'
  const processTitle = title.trim() || 'Mapeamento de processo'
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' })
  pdf.setProperties({ title: processTitle, subject: `Status: ${statusLabel}`, creator: 'FluxoIA' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - MARGIN * 2

  pdf.setTextColor('#243447')
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(11)
  pdf.text('FluxoIA - Mapeamento de processos', MARGIN, 28)
  pdf.setFontSize(16)
  const titleLines: string[] = pdf.splitTextToSize(processTitle, contentWidth)
  pdf.text(titleLines, MARGIN, 52, { lineHeightFactor: 1.2 })
  const detailsY = 52 + titleLines.length * 19.2
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(10)
  pdf.text(`Código: ${code}`, MARGIN, detailsY)
  pdf.setFont('helvetica', 'bold')
  if (preview) {
    pdf.setTextColor('#1F4E79')
    pdf.text('Status: Pré-visualização - será publicado após o aval do coordenador', MARGIN, detailsY + 16)
  } else {
    pdf.setTextColor(approved ? '#24543D' : '#7C3B12')
    pdf.text(`Status: ${statusLabel}`, MARGIN, detailsY + 16)
  }
  if (!approved && !preview) {
    pdf.text(
      homologated
        ? 'NÃO APROVADO - Homologado pela supervisão; aguarda o aval final do coordenador.'
        : 'NÃO APROVADO - Este mapeamento ainda não foi aprovado.',
      MARGIN,
      detailsY + 32,
    )
  }

  const diagramTop = detailsY + (approved || preview ? 32 : 48)
  const diagramBottom = pageHeight - 48
  const availableHeight = diagramBottom - diagramTop
  const scale = Math.min(contentWidth / diagramWidth, availableHeight / diagramHeight)
  const width = diagramWidth * scale
  const height = diagramHeight * scale
  pdf.addImage(diagramImage, 'PNG', (pageWidth - width) / 2, diagramTop + (availableHeight - height) / 2, width, height)
  const firstPageWatermarkY = diagramTop + availableHeight / 2

  if (details) writeDetails(pdf, details, processTitle, code)

  const totalPages = pdf.getNumberOfPages()
  for (let page = 1; page <= totalPages; page += 1) {
    pdf.setPage(page)
    const width = pdf.internal.pageSize.getWidth()
    const height = pdf.internal.pageSize.getHeight()
    const margin = page === 1 ? MARGIN : DETAIL_MARGIN

    if (watermark) {
      pdf.saveGraphicsState()
      pdf.setGState(new GState({ opacity: 0.16 }))
      pdf.setFont('helvetica', 'bold')
      pdf.setFontSize(44)
      pdf.setTextColor(preview ? '#1F4E79' : '#7C3B12')
      // Draw after the content so the diagram's opaque background cannot hide it.
      pdf.text(watermark, width / 2, page === 1 ? firstPageWatermarkY : height / 2, { align: 'center', angle: 25 })
      pdf.restoreGraphicsState()
    }

    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor('#52657C')
    pdf.text(`Exportado em ${exportedAt.toLocaleString('pt-BR')}`, margin, height - 22)
    pdf.text(`FluxoIA - Mapeamento de processo | Página ${page} de ${totalPages}`, width - margin, height - 22, { align: 'right' })
  }
  return pdf
}

/** Information, technical sheet and deadlines on portrait pages after the diagram. */
function writeDetails(pdf: jsPDF, details: BpmnPdfDetails, processTitle: string, code: string) {
  let pageWidth = 0
  let pageHeight = 0
  let y = 0

  function newPage() {
    pdf.addPage('a4', 'portrait')
    pageWidth = pdf.internal.pageSize.getWidth()
    pageHeight = pdf.internal.pageSize.getHeight()
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.setTextColor('#52657C')
    const header: string[] = pdf.splitTextToSize(`${processTitle} | Código: ${code}`, pageWidth - DETAIL_MARGIN * 2)
    pdf.text(header[0], DETAIL_MARGIN, 36)
    y = 64
  }

  function ensureSpace(height: number) {
    if (y + height > pageHeight - FOOTER_SPACE) newPage()
  }

  function section(title: string) {
    ensureSpace(LINE_HEIGHT * 4)
    if (y > 64) y += 10
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(13)
    pdf.setTextColor('#243447')
    pdf.text(title, DETAIL_MARGIN, y)
    pdf.setDrawColor('#C9D3DF')
    pdf.line(DETAIL_MARGIN, y + 6, pageWidth - DETAIL_MARGIN, y + 6)
    y += 24
  }

  /** Label in the left column and wrapped value lines on the right, breaking pages per line. */
  function row(label: string, values: string[]) {
    const valueX = DETAIL_MARGIN + LABEL_WIDTH
    const valueWidth = pageWidth - DETAIL_MARGIN - valueX
    pdf.setFontSize(10)
    pdf.setFont('helvetica', 'bold')
    const labelLines: string[] = pdf.splitTextToSize(label, LABEL_WIDTH - 10)
    pdf.setFont('helvetica', 'normal')
    const valueLines = values.flatMap((value) => pdf.splitTextToSize(value, valueWidth) as string[])
    const lines = Math.max(labelLines.length, valueLines.length)
    for (let index = 0; index < lines; index += 1) {
      ensureSpace(LINE_HEIGHT)
      if (labelLines[index]) {
        pdf.setFont('helvetica', 'bold')
        pdf.setTextColor('#243447')
        pdf.text(labelLines[index], DETAIL_MARGIN, y)
      }
      if (valueLines[index]) {
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor('#33404F')
        pdf.text(valueLines[index], valueX, y)
      }
      y += LINE_HEIGHT
    }
    y += 6
  }

  const bullets = (items: string[]) => items.map((item) => `- ${item}`)
  const { ficha } = details

  newPage()
  section('Informações do processo')
  for (const { rotulo, valor } of details.informacoes) row(rotulo, [valor])

  section('Ficha Técnica')
  row('Informações gerais', [ficha.informacoesGerais])
  row('Sistemas', bullets(ficha.sistemas))
  row('Documentação exigida', bullets(ficha.documentacao))
  row('Taxas e guias', bullets(ficha.taxas))

  section('Prazos e regras complementares')
  row('Prazos', [ficha.observacoesPrazo])
}

/** Rasterizes a bpmn-js SVG on a white canvas at 2x for PNG and PDF exports. */
export async function renderSvgToCanvas(svg: string): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = url
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Não foi possível preparar a imagem do diagrama.'))
    })
    const canvas = document.createElement('canvas')
    canvas.width = (image.naturalWidth || 1200) * 2
    canvas.height = (image.naturalHeight || 600) * 2
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível gerar a imagem do diagrama.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function createBpmnPdfFromSvg(
  svg: string,
  options: Omit<BpmnPdfOptions, 'diagramImage' | 'diagramWidth' | 'diagramHeight'>,
): Promise<jsPDF> {
  const canvas = await renderSvgToCanvas(svg)
  return createBpmnPdf({
    ...options,
    diagramImage: canvas.toDataURL('image/png'),
    diagramWidth: canvas.width,
    diagramHeight: canvas.height,
  })
}
