import * as React from 'react'
import {
  Download,
  Expand,
  Eye,
  FileCode2,
  FileDown,
  LayoutDashboard,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Move,
  Plus,
  Save,
  Undo2,
  X,
} from 'lucide-react'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BPMNLegenda } from './BPMNLegenda'
import { PdfFinalButton } from './PdfFinalButton'
import { PdfPreviewDialog } from './PdfPreviewDialog'
import type { BpmnPdfDetails } from '../services/pdf-details'
import type { ProcessStatus } from '../types/process.types'
import {
  canEditBpmnLayout,
  comandoFuncionalBloqueado,
  EVENTOS_ESTRUTURAIS_BLOQUEADOS,
  MOTIVO_BLOQUEIO_EDICAO,
  MOTIVO_BLOQUEIO_MOBILE,
} from '../services/bpmn-layout.service'

interface CanvasService {
  zoom: (value: number | 'fit-viewport') => number
  viewbox: (box?: { x: number; y: number; width: number; height: number }) => {
    x: number
    y: number
    width: number
    height: number
    scale: number
  }
  scrollToElement: (element: unknown) => void
  getRootElement: () => unknown
  resized: () => void
}

interface ElementoDiagrama {
  id?: string
  type?: string
  x?: number
  y?: number
  width?: number
  height?: number
}

interface ResizeService {
  activate: (
    event: MouseEvent,
    shape: ElementoDiagrama,
    direction: 'n' | 's' | 'e' | 'w',
  ) => void
}

interface ElementRegistryService {
  getAll: () => ElementoDiagrama[]
}

interface EventBusService {
  on: (
    events: string | string[],
    priority: number,
    handler: (event: { command?: string }) => unknown,
  ) => void
}

interface CommandStackService {
  undo: () => void
  canUndo: () => boolean
}

interface DiagramInstance {
  importXML: (xml: string) => Promise<unknown>
  saveXML: (options?: { format?: boolean }) => Promise<{ xml?: string }>
  saveSVG: () => Promise<{ svg?: string }>
  get: <T>(service: string) => T
  destroy: () => void
}

/** Primeira versão: nada de criação/exclusão via palette ou context pad. */
const SEM_CRIACAO_MODULE = {
  paletteProvider: ['value', { getPaletteEntries: () => ({}) }],
  contextPadProvider: ['value', { getContextPadEntries: () => ({}) }],
  popupMenuProvider: ['value', { getPopupMenuHeaderEntries: () => ({}) }],
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadFile(filename: string, contents: string, contentType: string) {
  downloadBlob(filename, new Blob([contents], { type: contentType }))
}

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches,
  )

  React.useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)')
    const onChange = (event: MediaQueryListEvent) => setIsSmall(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  return isSmall
}

function normatizarXml(xml: string): string {
  return xml.replace(/\s+/g, ' ').trim()
}

export function BPMNEditor({
  xml,
  filename,
  processName,
  status,
  readOnly = false,
  isSaving = false,
  onSaveLayout,
  pdfDetails,
  processoId,
}: {
  xml: string
  filename: string
  processName?: string
  status: ProcessStatus
  readOnly?: boolean
  isSaving?: boolean
  onSaveLayout: (xml: string) => Promise<void> | void
  /** Conteúdo complementar do PDF; quando presente, habilita a pré-visualização. */
  pdfDetails?: BpmnPdfDetails
  /** Id do processo na API; publicado, troca a exportação comum pelo PDF final. */
  processoId?: string | null
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const instanceRef = React.useRef<DiagramInstance | null>(null)
  const importingRef = React.useRef(false)
  const xmlRef = React.useRef<string>(xml)

  const isSmallScreen = useIsSmallScreen()
  const statusPermiteEdicao = !readOnly && canEditBpmnLayout(status)
  const edicaoDisponivel = statusPermiteEdicao && !isSmallScreen

  const [isEditing, setIsEditing] = React.useState(false)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [xmlVigente, setXmlVigente] = React.useState(xml)
  const [dirty, setDirty] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [pdfPreview, setPdfPreview] = React.useState<Blob | null>(null)
  const fecharPreview = React.useCallback(() => setPdfPreview(null), [])

  React.useEffect(() => {
    xmlRef.current = xmlVigente
  }, [xmlVigente])

  React.useEffect(() => {
    setXmlVigente(xml)
  }, [xml])

  React.useEffect(() => {
    if (!edicaoDisponivel && isEditing) setIsEditing(false)
  }, [edicaoDisponivel, isEditing])

  const enquadrar = React.useCallback(() => {
    const instance = instanceRef.current
    const container = containerRef.current
    if (!instance || !container || container.clientWidth === 0 || container.clientHeight === 0) return

    const canvas = instance.get<CanvasService>('canvas')
    const registry = instance.get<ElementRegistryService>('elementRegistry')
    canvas.resized()

    // Enquadra e centraliza a partir do bounding box real dos elementos.
    const elementos = registry.getAll().filter(
      (elemento): elemento is Required<ElementoDiagrama> =>
        typeof elemento.x === 'number' &&
        typeof elemento.y === 'number' &&
        typeof elemento.width === 'number' &&
        typeof elemento.height === 'number' &&
        elemento.width > 0 &&
        elemento.height > 0,
    )

    if (elementos.length === 0) {
      canvas.zoom('fit-viewport')
      return
    }

    const minX = Math.min(...elementos.map((elemento) => elemento.x))
    const minY = Math.min(...elementos.map((elemento) => elemento.y))
    const maxX = Math.max(...elementos.map((elemento) => elemento.x + elemento.width))
    const maxY = Math.max(...elementos.map((elemento) => elemento.y + elemento.height))
    const margem = 30

    const larguraConteudo = maxX - minX + margem * 2
    const alturaConteudo = maxY - minY + margem * 2
    const escala = Math.min(
      container.clientWidth / larguraConteudo,
      container.clientHeight / alturaConteudo,
    )

    canvas.viewbox({
      x: (minX + maxX) / 2 - container.clientWidth / escala / 2,
      y: (minY + maxY) / 2 - container.clientHeight / escala / 2,
      width: container.clientWidth / escala,
      height: container.clientHeight / escala,
    })
  }, [])

  /**
   * Modo visualização usa NavigatedViewer (sem qualquer possibilidade de edição).
   * Modo edição usa Modeler com palette/context pad removidos e comandos funcionais bloqueados.
   */
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    setLoading(true)
    setError(null)

    let instance: DiagramInstance
    let removerListenersBordaRaia: (() => void) | null = null

    if (isEditing) {
      const modeler = new BpmnModeler({
        container,
        additionalModules: [SEM_CRIACAO_MODULE],
      })
      const eventBus = modeler.get<EventBusService>('eventBus')
      eventBus.on('commandStack.canExecute', 1500, (event) => {
        if (importingRef.current) return undefined
        return comandoFuncionalBloqueado(event?.command ?? '') ? false : undefined
      })
      eventBus.on([...EVENTOS_ESTRUTURAIS_BLOQUEADOS], 1500, () => false)
      eventBus.on('commandStack.changed', 500, () => setDirty(true))
      instance = modeler as unknown as DiagramInstance

      // Permite arrastar diretamente qualquer linha divisória de raia (horizontal ou borda direita)
      // em qualquer ponto da sua extensão, sem precisar caçar a alça central do diagrama.
      const detectarBordaRaia = (
        event: MouseEvent,
      ): { shape: Required<ElementoDiagrama>; direction: 'n' | 's' | 'e' } | null => {
        const alvo = event.target as HTMLElement | SVGElement | null
        if (
          alvo?.closest?.(
            '.djs-bendpoint, .djs-segment-dragger, .djs-bendpoints, .djs-resizer',
          )
        ) {
          return null
        }

        const canvas = modeler.get<CanvasService>('canvas')
        const registry = modeler.get<ElementRegistryService>('elementRegistry')
        const vbox = canvas.viewbox()
        if (!vbox.scale) return null

        const rect = container.getBoundingClientRect()
        const cx = vbox.x + (event.clientX - rect.left) / vbox.scale
        const cy = vbox.y + (event.clientY - rect.top) / vbox.scale
        const tolerancia = 7 / vbox.scale

        const lanes = registry
          .getAll()
          .filter(
            (el): el is Required<ElementoDiagrama> =>
              el.type === 'bpmn:Lane' &&
              typeof el.x === 'number' &&
              typeof el.y === 'number' &&
              typeof el.width === 'number' &&
              typeof el.height === 'number',
          )
          .sort((a, b) => a.y - b.y)

        for (const lane of lanes) {
          if (cx >= lane.x - 30 && cx <= lane.x + lane.width) {
            if (Math.abs(cy - (lane.y + lane.height)) <= tolerancia) {
              return { shape: lane, direction: 's' }
            }
            if (Math.abs(cy - lane.y) <= tolerancia) {
              return { shape: lane, direction: 'n' }
            }
          }
          if (
            cy >= lane.y &&
            cy <= lane.y + lane.height &&
            Math.abs(cx - (lane.x + lane.width)) <= tolerancia
          ) {
            return { shape: lane, direction: 'e' }
          }
        }
        return null
      }

      const onMouseMove = (event: MouseEvent) => {
        if (event.buttons !== 0) return
        const hit = detectarBordaRaia(event)
        container.style.cursor = hit ? (hit.direction === 'e' ? 'ew-resize' : 'ns-resize') : ''
      }

      const onMouseDown = (event: MouseEvent) => {
        if (event.button !== 0) return
        const hit = detectarBordaRaia(event)
        if (!hit) return
        const resize = modeler.get<ResizeService>('resize')
        event.stopPropagation()
        event.preventDefault()
        resize.activate(event, hit.shape, hit.direction)
      }

      container.addEventListener('mousemove', onMouseMove)
      container.addEventListener('mousedown', onMouseDown, { capture: true })
      removerListenersBordaRaia = () => {
        container.removeEventListener('mousemove', onMouseMove)
        container.removeEventListener('mousedown', onMouseDown, { capture: true })
        container.style.cursor = ''
      }
    } else {
      instance = new NavigatedViewer({ container }) as unknown as DiagramInstance
    }

    instanceRef.current = instance
    importingRef.current = true

    instance
      .importXML(xmlRef.current)
      .then(() => {
        if (instanceRef.current !== instance) return
        window.requestAnimationFrame(() => {
          if (instanceRef.current === instance) enquadrar()
        })
      })
      .catch((cause: unknown) => {
        if (instanceRef.current !== instance) return
        setError(
          cause instanceof Error ? cause.message : 'Não foi possível exibir o diagrama BPMN.',
        )
      })
      .finally(() => {
        importingRef.current = false
        if (instanceRef.current === instance) setLoading(false)
      })

    return () => {
      removerListenersBordaRaia?.()
      instance.destroy()
      if (instanceRef.current === instance) instanceRef.current = null
    }
  }, [isEditing, xmlVigente, enquadrar])

  async function alternarModoEdicao() {
    if (isEditing) {
      const modeler = instanceRef.current
      try {
        const resultado = await modeler?.saveXML({ format: true })
        if (resultado?.xml) setXmlVigente(resultado.xml)
      } catch {
        // mantém o XML atual se não for possível serializar
      }
      setIsEditing(false)
      return
    }
    setIsEditing(true)
  }

  function zoomBy(amount: number) {
    const canvas = instanceRef.current?.get<CanvasService>('canvas')
    if (!canvas) return
    canvas.zoom(Math.min(2.5, Math.max(0.15, canvas.viewbox().scale + amount)))
  }

  function setExactZoom(targetScale: number | 'fit-viewport') {
    instanceRef.current?.get<CanvasService>('canvas')?.zoom(targetScale)
  }

  function centralizarFluxo() {
    const canvas = instanceRef.current?.get<CanvasService>('canvas')
    if (!canvas) return
    canvas.scrollToElement(canvas.getRootElement())
  }

  function desfazer() {
    const commandStack = instanceRef.current?.get<CommandStackService>('commandStack')
    if (!commandStack?.canUndo()) return
    commandStack.undo()
  }

  async function salvarAjustes() {
    const instance = instanceRef.current
    try {
      let xmlParaSalvar = xmlRef.current
      if (isEditing && instance) {
        const resultado = await instance.saveXML({ format: true })
        if (resultado.xml) xmlParaSalvar = resultado.xml
      }

      await onSaveLayout(xmlParaSalvar)
      setXmlVigente(xmlParaSalvar)
      setDirty(false)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Não foi possível salvar os ajustes de layout.',
      )
    }
  }

  async function baixarDiagrama(extensao: 'bpmn' | 'xml') {
    const resultado = await instanceRef.current?.saveXML({ format: true })
    if (resultado?.xml) downloadFile(`${filename}.${extensao}`, resultado.xml, 'application/xml')
  }

  async function exportSvg() {
    const resultado = await instanceRef.current?.saveSVG()
    if (resultado?.svg) downloadFile(`${filename}.svg`, resultado.svg, 'image/svg+xml')
  }

  async function gerarPdf(mode: 'export' | 'preview') {
    const resultado = await instanceRef.current?.saveSVG()
    if (!resultado?.svg) return null
    const { createBpmnPdfFromSvg } = await import('../services/bpmn-pdf.service')
    const pdf = await createBpmnPdfFromSvg(resultado.svg, {
      title: processName ?? filename,
      code: filename,
      status,
      details: pdfDetails,
      mode,
    })
    return pdf.output('blob')
  }

  async function exportPdf() {
    try {
      const blob = await gerarPdf('export')
      if (blob) downloadBlob(`${filename}.pdf`, blob)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível exportar o PDF.')
    }
  }

  async function abrirPreviewPdf() {
    try {
      const blob = await gerarPdf('preview')
      if (blob) setPdfPreview(blob)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível gerar a pré-visualização do PDF.')
    }
  }

  function toggleExpanded() {
    setIsExpanded((prev) => !prev)
  }

  React.useEffect(() => {
    window.requestAnimationFrame(() => {
      enquadrar()
    })
  }, [isExpanded, enquadrar])

  React.useEffect(() => {
    if (!isExpanded) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExpanded(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [isExpanded])

  const ocupado = loading || isSaving

  return (
    <section
      aria-label="Editor de diagrama BPMN"
      className={
        isExpanded
          ? 'fixed inset-0 z-50 flex flex-col gap-2.5 bg-fx-papel p-3 sm:p-5 shadow-2xl'
          : 'space-y-2'
      }
    >
      {isExpanded && (
        <div className="flex items-center justify-between border-b border-fx-linha pb-2">
          <div className="flex items-center gap-2.5">
            <Badge variant="secondary" className="text-xs">Modo Ampliado</Badge>
            <h3 className="text-sm sm:text-base font-semibold text-fx-marinho">
              Diagrama BPMN 2.0 {processName ? `· ${processName}` : ''}
            </h3>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setIsExpanded(false)}
            title="Fechar visualização ampliada (Esc)"
          >
            <X className="mr-1.5 h-4 w-4" /> Fechar Ampliação (Esc)
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-sm border border-fx-linha bg-fx-nevoa/30 px-3 py-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {edicaoDisponivel && (
            <Button
              type="button"
              size="sm"
              variant={isEditing ? 'default' : 'outline'}
              onClick={() => void alternarModoEdicao()}
              aria-pressed={isEditing}
              title={isEditing ? 'Sair do modo de edição visual' : 'Habilitar edição visual do layout'}
            >
              <Move className="mr-1 h-3.5 w-3.5" />
              {isEditing ? 'Concluir Edição' : 'Editar Layout'}
            </Button>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={centralizarFluxo}
            title="Centralizar o fluxo na área visível"
          >
            <LayoutDashboard className="mr-1 h-3.5 w-3.5" /> Centralizar
          </Button>
          <span className="mx-1 hidden h-6 w-px bg-fx-linha sm:block" aria-hidden="true" />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setExactZoom('fit-viewport')}
            title="Ajustar o diagrama inteiro à tela"
          >
            <Maximize2 className="mr-1 h-3.5 w-3.5" /> Ajustar à Tela
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Diminuir zoom"
            title="Zoom -"
            onClick={() => zoomBy(-0.15)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Aumentar zoom"
            title="Zoom +"
            onClick={() => zoomBy(0.15)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={isExpanded ? 'default' : 'outline'}
            size="sm"
            aria-label={isExpanded ? 'Reduzir visualização do diagrama' : 'Ampliar visualização do diagrama'}
            aria-pressed={isExpanded}
            title={isExpanded ? 'Sair do modo ampliado (Esc)' : 'Ampliar o diagrama em tela cheia para facilitar a leitura'}
            onClick={toggleExpanded}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="mr-1.5 h-3.5 w-3.5" /> Reduzir Tela
              </>
            ) : (
              <>
                <Expand className="mr-1.5 h-3.5 w-3.5" /> Ampliar Diagrama
              </>
            )}
          </Button>
          {isEditing && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={desfazer}
              title="Desfazer último ajuste visual"
            >
              <Undo2 className="mr-1 h-3.5 w-3.5" /> Desfazer
            </Button>
          )}
          {statusPermiteEdicao && <Button
            type="button"
            size="sm"
            className="ml-auto"
            onClick={() => void salvarAjustes()}
            disabled={!dirty || ocupado || !edicaoDisponivel}
            title="Persistir o XML BPMN com o novo layout"
          >
            {isSaving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1 h-3.5 w-3.5" />
            )}
            Salvar Ajustes
          </Button>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-fx-cinza">
            {isEditing
              ? 'Modo edição visual: arraste elementos, linhas de conexão e divisórias das raias para reorganizar. Somente o layout é alterado — a lógica do processo permanece intacta.'
              : 'Modo visualização: use o scroll para navegar, Ctrl + scroll para ampliar ou clique em "Ampliar Diagrama" para leitura em tela cheia.'}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {dirty && <Badge variant="secondary">Ajustes não salvos</Badge>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => void baixarDiagrama('bpmn')}
              title="Baixar arquivo .bpmn"
            >
              <FileCode2 className="mr-1 h-3.5 w-3.5" /> Baixar BPMN
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={() => void baixarDiagrama('xml')}
              title="Baixar arquivo .xml"
            >
              <Download className="mr-1 h-3.5 w-3.5" /> Baixar XML
            </Button>
            <Button
              type="button"
              size="sm"
              aria-label="Baixar SVG"
              title="Baixar SVG"
              onClick={() => void exportSvg()}
            >
              <Download className="h-4 w-4" aria-hidden="true" /> SVG
            </Button>
            {status === 'Publicado' && processoId ? (
              <PdfFinalButton processoId={processoId} />
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-red-700 text-white hover:bg-red-800 focus-visible:ring-red-700"
                aria-label="Baixar PDF"
                title="Baixar PDF"
                onClick={() => void exportPdf()}
              >
                <FileDown className="h-4 w-4" aria-hidden="true" /> PDF
              </Button>
            )}
            {pdfDetails && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                title="Pré-visualizar o PDF que será exportado"
                onClick={() => void abrirPreviewPdf()}
              >
                <Eye className="h-4 w-4" aria-hidden="true" /> Pré-visualizar PDF
              </Button>
            )}
          </div>
        </div>
      </div>

      {!statusPermiteEdicao && !isExpanded && (
        <p className="rounded-sm border border-fx-linha bg-fx-nevoa/30 px-3 py-2 text-xs text-fx-cinza">
          {readOnly ? 'Este diagrama está disponível somente para consulta.' : MOTIVO_BLOQUEIO_EDICAO}
        </p>
      )}
      {statusPermiteEdicao && isSmallScreen && (
        <p className="rounded-sm border border-fx-linha bg-fx-nevoa/30 px-3 py-2 text-xs text-fx-cinza">
          {MOTIVO_BLOQUEIO_MOBILE}
        </p>
      )}

      <div
        ref={containerRef}
        data-editing={isEditing ? 'true' : 'false'}
        data-xml-len={normatizarXml(xmlVigente).length}
        className={
          isExpanded
            ? 'relative flex-1 min-h-0 overflow-hidden rounded-sm border border-fx-linha bg-white shadow-inner'
            : 'relative h-[60vh] min-h-100 overflow-hidden rounded-sm border border-fx-linha bg-white shadow-inner'
        }
      >
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 bg-white/95 shadow-xs backdrop-blur-xs hover:bg-fx-nevoa/60 text-xs font-medium"
            onClick={toggleExpanded}
            title={isExpanded ? 'Reduzir visualização (Esc)' : 'Ampliar visualização do diagrama'}
          >
            {isExpanded ? (
              <>
                <Minimize2 className="mr-1.5 h-3.5 w-3.5 text-fx-azul" /> Reduzir (Esc)
              </>
            ) : (
              <>
                <Expand className="mr-1.5 h-3.5 w-3.5 text-fx-azul" /> Ampliar
              </>
            )}
          </Button>
        </div>

        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-fx-papel/85 text-sm text-fx-cinza">
            Carregando diagrama...
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="absolute inset-x-3 top-3 z-20 rounded-sm bg-fx-alerta/10 p-3 text-sm text-fx-alerta"
          >
            {error}
          </div>
        )}
      </div>

      <BPMNLegenda />

      {pdfPreview && (
        <PdfPreviewDialog
          pdf={pdfPreview}
          title={processName ?? filename}
          onClose={fecharPreview}
          onDownload={status === 'Publicado' ? () => downloadBlob(`${filename}.pdf`, pdfPreview) : undefined}
        />
      )}
    </section>
  )
}
