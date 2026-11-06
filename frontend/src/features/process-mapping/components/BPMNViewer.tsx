import * as React from 'react'
import { Download, Expand, FileCode2, FileDown, Maximize2, Minus, Plus } from 'lucide-react'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import { Button } from '@/components/ui/button'

interface CanvasControls {
  zoom: (value: number | 'fit-viewport') => number
  viewbox: () => { scale: number }
}

function downloadFile(filename: string, contents: string, contentType: string) {
  downloadBlob(filename, new Blob([contents], { type: contentType }))
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BPMNViewer({ xml, filename }: { xml: string; filename: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewerRef = React.useRef<NavigatedViewer | null>(null)
  const importGenerationRef = React.useRef(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!containerRef.current) return
    const viewer = new NavigatedViewer({ container: containerRef.current })
    viewerRef.current = viewer
    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [])

  React.useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !xml) return
    const importGeneration = importGenerationRef.current + 1
    importGenerationRef.current = importGeneration
    setLoading(true)
    setError(null)

    viewer.importXML(xml)
      .then(() => {
        if (importGenerationRef.current !== importGeneration) return
        const canvas = viewer.get<CanvasControls>('canvas')
        canvas.zoom('fit-viewport')
        const currentScale = canvas.viewbox().scale
        // Se o fit-viewport resultar em zoom excessivamente reduzido (< 0.65), ajusta para leitura confortável
        if (currentScale < 0.65) {
          canvas.zoom(0.75)
        }
        setLoading(false)
      })
      .catch((cause: unknown) => {
        if (importGenerationRef.current !== importGeneration) return
        setError(cause instanceof Error ? cause.message : 'Não foi possível exibir o diagrama BPMN.')
        setLoading(false)
      })
    return () => { importGenerationRef.current += 1 }
  }, [xml])

  function zoomBy(amount: number) {
    const canvas = viewerRef.current?.get<CanvasControls>('canvas')
    if (!canvas) return
    const nextScale = Math.min(2.5, Math.max(0.15, canvas.viewbox().scale + amount))
    canvas.zoom(nextScale)
  }

  function setExactZoom(targetScale: number | 'fit-viewport') {
    const canvas = viewerRef.current?.get<CanvasControls>('canvas')
    if (!canvas) return
    canvas.zoom(targetScale)
  }

  async function exportXml() {
    const result = await viewerRef.current?.saveXML({ format: true })
    if (result?.xml) downloadFile(`${filename}.bpmn`, result.xml, 'application/xml')
  }

  async function exportSvg() {
    const result = await viewerRef.current?.saveSVG()
    if (result?.svg) downloadFile(`${filename}.svg`, result.svg, 'image/svg+xml')
  }

  async function exportPdf() {
    try {
      const result = await viewerRef.current?.saveSVG()
      if (!result?.svg) return

      const svgUrl = URL.createObjectURL(new Blob([result.svg], { type: 'image/svg+xml' }))
      const image = new Image()
      image.src = svgUrl
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve()
        image.onerror = () => reject(new Error('Não foi possível preparar o diagrama para PDF.'))
      })

      const canvas = document.createElement('canvas')
      canvas.width = (image.naturalWidth || 1200) * 2
      canvas.height = (image.naturalHeight || 600) * 2
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Não foi possível criar a imagem do diagrama.')
      context.fillStyle = '#ffffff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(svgUrl)

      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: canvas.width >= canvas.height ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const scale = Math.min((pageWidth - 48) / canvas.width, (pageHeight - 48) / canvas.height)
      const width = canvas.width * scale
      const height = canvas.height * scale
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageWidth - width) / 2, (pageHeight - height) / 2, width, height)
      downloadBlob(`${filename}.pdf`, pdf.output('blob'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível exportar o PDF.')
    }
  }

  async function toggleFullscreen() {
    const element = containerRef.current
    if (!element) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await element.requestFullscreen()
  }

  return (
    <section aria-label="Diagrama BPMN" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fx-cinza">Arraste para navegar pelo fluxo. Use os botões de zoom para ampliar detalhes ou ajustar à tela.</p>
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs"
            title="Ajustar diagrama inteiro na tela"
            onClick={() => setExactZoom('fit-viewport')}
          >
            <Maximize2 className="h-3.5 w-3.5 mr-1 text-fx-azul" /> Ajustar
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2 text-xs font-mono font-medium"
            title="Zoom 100% tamanho real"
            onClick={() => setExactZoom(1.0)}
          >
            100%
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => zoomBy(-0.15)}>
            <Minus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => zoomBy(0.15)}>
            <Plus className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Tela cheia" title="Tela cheia" onClick={() => void toggleFullscreen()}>
            <Expand className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void exportXml()}>
            <FileCode2 className="h-3.5 w-3.5" /> XML / BPMN
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-8 w-8" aria-label="Baixar SVG" title="Baixar SVG" onClick={() => void exportSvg()}>
            <Download className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Baixar PDF" title="Baixar PDF" onClick={() => void exportPdf()}>
            <FileDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative h-125 overflow-hidden rounded-sm border border-fx-linha bg-white sm:h-160 shadow-inner" ref={containerRef}>
        {loading && <div className="absolute inset-0 z-10 flex items-center justify-center bg-fx-papel/85 text-sm text-fx-cinza">Carregando diagrama...</div>}
        {error && <div role="alert" className="absolute inset-x-3 top-3 z-20 rounded-sm bg-fx-alerta/10 p-3 text-sm text-fx-alerta">{error}</div>}
      </div>
    </section>
  )
}
