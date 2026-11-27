import { apiClient } from '@/services/apiClient'
import type { BpmnPdfMode } from './bpmn-pdf.service'
import { detalhesPdfDaApi, type ProcessoApiPdf } from './pdf-details'

interface ProcessoPdf extends ProcessoApiPdf {
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
 * PDF do processo, igual para qualquer usuário e tela: diagrama, informações e ficha
 * técnica vindos da API. Só o status muda o arquivo — a marca d'água sai apenas após
 * a publicação (aval final do coordenador). `svg` permite usar o diagrama já aberto.
 */
export async function gerarPdfProcesso(
  processoId: string,
  { svg, mode = 'export' }: { svg?: string; mode?: BpmnPdfMode } = {},
): Promise<{ blob: Blob; nomeArquivo: string }> {
  const processo = await apiClient.get<ProcessoPdf>(`/api/processos/${processoId}/`)
  const xml = processo.bpmn_xml_atual
  if (!svg && !xml) throw new Error('Este processo não possui diagrama BPMN registrado.')

  const [svgDiagrama, { createBpmnPdfFromSvg }] = await Promise.all([
    svg ?? renderizarSvg(xml as string),
    import('./bpmn-pdf.service'),
  ])
  const codigo = processo.codigo ?? 'processo-bpmn'
  const pdf = await createBpmnPdfFromSvg(svgDiagrama, {
    title: processo.nome,
    code: codigo,
    status: processo.status as Parameters<typeof createBpmnPdfFromSvg>[1]['status'],
    details: detalhesPdfDaApi(processo),
    mode,
  })
  return { blob: pdf.output('blob'), nomeArquivo: `${codigo}.pdf` }
}

export function baixarArquivo(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}

export async function baixarPdfProcesso(processoId: string, svg?: string): Promise<void> {
  const { blob, nomeArquivo } = await gerarPdfProcesso(processoId, { svg })
  baixarArquivo(nomeArquivo, blob)
}
