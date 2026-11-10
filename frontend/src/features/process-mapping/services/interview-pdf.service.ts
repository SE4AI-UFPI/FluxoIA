import { jsPDF } from 'jspdf'
import type { InterviewExportData } from './interview-export.service'

/** Text PDF with line-by-line pagination: long answers never overflow the page. */
export function createInterviewPdf({ questions, answers, context, exportedAt = new Date() }: InterviewExportData): jsPDF {
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: false })
  pdf.setProperties({ title: `Entrevista - ${context.name}`, creator: 'FluxoIA', subject: context.status })
  const margin = 40
  const width = pdf.internal.pageSize.getWidth()
  const height = pdf.internal.pageSize.getHeight()
  const bottom = height - 48
  let y = 64

  function header() {
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.setTextColor('#0B2A4A')
    pdf.text('FluxoIA | Entrevista do processo', margin, 30)
    pdf.setDrawColor('#D6E3F3')
    pdf.line(margin, 42, width - margin, 42)
  }

  function ensureSpace(space: number) {
    if (y + space <= bottom) return
    pdf.addPage()
    header()
    y = 64
  }

  function text(value: string, size = 10, bold = false) {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    const lines: string[] = pdf.splitTextToSize(value.replace(/\r\n?/g, '\n'), width - margin * 2)
    const lineHeight = size * 1.45
    for (const line of lines) {
      ensureSpace(lineHeight)
      // A new-page header changes the font, so restore the body style per line.
      pdf.setFont('helvetica', bold ? 'bold' : 'normal')
      pdf.setFontSize(size)
      pdf.setTextColor('#0B2A4A')
      pdf.text(line, margin, y)
      y += lineHeight
    }
  }

  header()
  text(context.name || 'Mapeamento de processo', 17, true)
  y += 10
  for (const [label, value] of [
    ['Código', context.code || 'Não atribuído'],
    ['Setor / Unidade', context.sector],
    ['Autor', context.authorName],
    ['Status', context.status],
    ['Versão', context.version],
    ['Última atualização', context.updatedAt ? new Date(context.updatedAt).toLocaleString('pt-BR') : 'Não informada'],
  ]) text(`${label}: ${value}`)

  for (const [index, question] of questions.entries()) {
    y += 20
    ensureSpace(100)
    text(`${index + 1}. ${question.title}`, 13, true)
    text(question.required ? 'Obrigatória' : 'Opcional', 9)
    y += 8
    ensureSpace(45)
    text('Pergunta', 10, true)
    text(question.prompt)
    y += 8
    ensureSpace(45)
    text('Resposta', 10, true)
    const answer = answers[question.id]
    text(answer?.trim() ? answer : 'Sem resposta registrada.')
  }
  if (questions.length === 0) {
    y += 20
    text('As perguntas da entrevista não estão disponíveis.')
  }

  const total = pdf.getNumberOfPages()
  for (let page = 1; page <= total; page++) {
    pdf.setPage(page)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(8)
    pdf.setTextColor('#52657C')
    pdf.text(`Exportado em ${exportedAt.toLocaleString('pt-BR')}`, margin, height - 24)
    pdf.text(`Página ${page} de ${total}`, width - margin, height - 24, { align: 'right' })
  }
  return pdf
}
