import { apiClient } from '@/services/apiClient'
import { detalhesPdfDaApi, type ProcessoApiPdf } from './pdf-details'

interface ProcessoPdfFinal extends ProcessoApiPdf {
  codigo: string | null
  nome: string
  status: string
  bpmn_xml_atual: string | null
}

/** Desenha o XML num viewer fora da tela só para obter o SVG do diagrama. */
async function renderizarSvg(xml: string): Promise<string> {
  const { default: NavigatedViewer } = await import('bpmn-js/lib/NavigatedViewer')
  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.style.cssText = 'position:fixed;left:-10000px;top:0;width:1600px;height:900px;'
  document.body.appendChild(container)
  const viewer = new NavigatedViewer({ container })
  try {
    await viewer.importXML(xml)
    const { svg } = await viewer.saveSVG()
    return svg
  } finally {
    viewer.destroy()
    container.remove()
  }
}

/**
 * Baixa o PDF final (oficial) de um processo publicado. Busca o processo na API para
 * que o arquivo seja o mesmo em qualquer tela: diagrama, informações e ficha técnica.
 */
export async function baixarPdfFinal(processoId: string): Promise<void> {
  const processo = await apiClient.get<ProcessoPdfFinal>(`/api/processos/${processoId}/`)
  if (processo.status !== 'publicado') {
    throw new Error('O PDF final só fica disponível depois do aval final do coordenador.')
  }
  if (!processo.bpmn_xml_atual) throw new Error('Este processo não possui diagrama BPMN registrado.')

  const [svg, { createBpmnPdfFromSvg }] = await Promise.all([
    renderizarSvg(processo.bpmn_xml_atual),
    import('./bpmn-pdf.service'),
  ])
  const codigo = processo.codigo ?? 'processo-bpmn'
  const pdf = await createBpmnPdfFromSvg(svg, {
    title: processo.nome,
    code: codigo,
    status: 'publicado',
    details: detalhesPdfDaApi(processo),
  })

  const url = URL.createObjectURL(pdf.output('blob'))
  const link = document.createElement('a')
  link.href = url
  link.download = `${codigo}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
