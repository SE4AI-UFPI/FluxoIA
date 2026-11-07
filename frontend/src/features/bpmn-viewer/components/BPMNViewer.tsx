import * as React from 'react'
import {
  Expand,
  FileCode2,
  ImageDown,
  Loader2,
  Maximize2,
  Minus,
  Move,
  Plus,
  Printer,
} from 'lucide-react'
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer'
import 'bpmn-js/dist/assets/diagram-js.css'
import 'bpmn-js/dist/assets/bpmn-js.css'
import { Button } from '@/components/ui/button'

interface ElementoBpmn {
  x?: number
  y?: number
  width?: number
  height?: number
}

interface ElementRegistryService {
  getAll: () => ElementoBpmn[]
}

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

function baixarBlob(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}

function baixarTexto(nome: string, conteudo: string, tipo: string) {
  baixarBlob(nome, new Blob([conteudo], { type: tipo }))
}

/**
 * Visualizador BPMN institucional — SOMENTE LEITURA (NavigatedViewer, sem Modeler).
 * Toda edição permanece no módulo de Mapeamento de Processos.
 */
export default function BPMNViewer({ xml, nomeArquivo }: { xml: string; nomeArquivo: string }) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const viewerRef = React.useRef<NavigatedViewer | null>(null)
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)

  const ajustarTela = React.useCallback(() => {
    const viewer = viewerRef.current
    const container = containerRef.current
    if (!viewer || !container || container.clientWidth === 0 || container.clientHeight === 0) return

    const canvas = viewer.get<CanvasService>('canvas')
    const registry = viewer.get<ElementRegistryService>('elementRegistry')
    canvas.resized()

    // Enquadra e centraliza o diagrama a partir do bounding box real dos elementos.
    const elementos = registry
      .getAll()
      .filter(
        (elemento): elemento is Required<ElementoBpmn> =>
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
    const larguraVisivel = container.clientWidth / escala
    const alturaVisivel = container.clientHeight / escala

    // Centraliza o conteúdo no meio da área visível.
    canvas.viewbox({
      x: (minX + maxX) / 2 - larguraVisivel / 2,
      y: (minY + maxY) / 2 - alturaVisivel / 2,
      width: larguraVisivel,
      height: alturaVisivel,
    })
  }, [])

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
    let ativo = true
    setCarregando(true)
    setErro(null)

    viewer
      .importXML(xml)
      .then(() => {
        if (!ativo) return
        window.requestAnimationFrame(() => {
          if (ativo) ajustarTela()
        })
      })
      .catch((causa: unknown) => {
        if (!ativo) return
        setErro(
          causa instanceof Error ? causa.message : 'Não foi possível exibir o diagrama BPMN.',
        )
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [xml, ajustarTela])

  React.useEffect(() => {
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => ajustarTela())
    observer.observe(container)
    return () => observer.disconnect()
  }, [ajustarTela])

  function zoomPor(delta: number) {
    const canvas = viewerRef.current?.get<CanvasService>('canvas')
    if (!canvas) return
    canvas.zoom(Math.min(3, Math.max(0.15, canvas.viewbox().scale + delta)))
  }

  function centralizar() {
    ajustarTela()
  }

  async function telaCheia() {
    const elemento = containerRef.current
    if (!elemento) return
    if (document.fullscreenElement) await document.exitFullscreen()
    else await elemento.requestFullscreen()
  }

  async function baixarXml() {
    const resultado = await viewerRef.current?.saveXML({ format: true })
    if (resultado?.xml) baixarTexto(`${nomeArquivo}.bpmn`, resultado.xml, 'application/xml')
  }

  async function baixarSvg() {
    const resultado = await viewerRef.current?.saveSVG()
    if (resultado?.svg) baixarTexto(`${nomeArquivo}.svg`, resultado.svg, 'image/svg+xml')
  }

  async function baixarPng() {
    try {
      const resultado = await viewerRef.current?.saveSVG()
      if (!resultado?.svg) return
      const url = URL.createObjectURL(new Blob([resultado.svg], { type: 'image/svg+xml' }))
      const imagem = new Image()
      imagem.src = url
      await new Promise<void>((resolve, reject) => {
        imagem.onload = () => resolve()
        imagem.onerror = () => reject(new Error('Falha ao preparar a imagem do diagrama.'))
      })
      const canvas = document.createElement('canvas')
      canvas.width = (imagem.naturalWidth || 1200) * 2
      canvas.height = (imagem.naturalHeight || 600) * 2
      const contexto = canvas.getContext('2d')
      if (!contexto) throw new Error('Falha ao gerar a imagem do diagrama.')
      contexto.fillStyle = '#ffffff'
      contexto.fillRect(0, 0, canvas.width, canvas.height)
      contexto.drawImage(imagem, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (blob) baixarBlob(`${nomeArquivo}.png`, blob)
    } catch (causa) {
      setErro(causa instanceof Error ? causa.message : 'Não foi possível baixar o PNG.')
    }
  }

  async function imprimir() {
    const resultado = await viewerRef.current?.saveSVG()
    if (!resultado?.svg) return
    const janela = window.open('', '_blank', 'width=1200,height=800')
    if (!janela) return
    janela.document.write(
      `<html lang="pt-BR"><head><title>${nomeArquivo}</title><style>body{margin:24px;font-family:sans-serif}svg{max-width:100%;height:auto}</style></head><body>${resultado.svg}</body></html>`,
    )
    janela.document.close()
    janela.focus()
    janela.print()
  }

  return (
    <section aria-label="Visualizador BPMN" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-fx-linha bg-fx-nevoa/30 px-3 py-2">
        <p className="text-[11px] text-fx-cinza">
          Modo consulta: use o scroll para navegar, Ctrl + scroll para ampliar ou os botões de zoom.
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={centralizar} title="Centralizar fluxo">
            <Move className="mr-1 h-3.5 w-3.5" /> Centralizar
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => viewerRef.current?.get<CanvasService>('canvas')?.zoom('fit-viewport')}
            title="Ajustar à tela"
          >
            <Maximize2 className="mr-1 h-3.5 w-3.5" /> Ajustar
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Diminuir zoom"
            title="Zoom -"
            onClick={() => zoomPor(-0.15)}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Aumentar zoom"
            title="Zoom +"
            onClick={() => zoomPor(0.15)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8"
            aria-label="Tela cheia"
            title="Fullscreen"
            onClick={() => void telaCheia()}
          >
            <Expand className="h-4 w-4" />
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => void baixarXml()} title="Baixar XML BPMN">
            <FileCode2 className="mr-1 h-3.5 w-3.5" /> XML
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label="Baixar SVG" title="Baixar SVG" onClick={() => void baixarSvg()}>
            <ImageDown className="h-4 w-4" />
          </Button>
          <Button type="button" size="icon" variant="outline" className="h-8 w-8" aria-label="Baixar PNG" title="Baixar PNG" onClick={() => void baixarPng()}>
            <ImageDown className="h-4 w-4 rotate-180" />
          </Button>
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Imprimir" title="Imprimir" onClick={() => void imprimir()}>
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative h-[55vh] min-h-80 overflow-hidden rounded-sm border border-fx-linha bg-white shadow-inner"
      >
        {carregando && (
          <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-fx-papel/85 text-sm text-fx-cinza">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando diagrama...
          </div>
        )}
        {erro && (
          <div role="alert" className="absolute inset-x-3 top-3 z-20 rounded-sm bg-fx-alerta/10 p-3 text-sm text-fx-alerta">
            {erro}
          </div>
        )}
      </div>
    </section>
  )
}
