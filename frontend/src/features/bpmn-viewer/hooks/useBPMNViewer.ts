import * as React from 'react'
import { fetchBiblioteca, processosRelacionados } from '../services/bpmnViewer.service'
import {
  FILTROS_INICIAIS,
  type FiltrosBiblioteca,
  type OpcoesFiltro,
  type ProcessoBiblioteca,
} from '../types/bpmnViewer.types'

const FAVORITOS_KEY = 'fluxoia_bpmn_favoritos_v1'

function lerFavoritos(userId: string): string[] {
  try {
    const raw = localStorage.getItem(`${FAVORITOS_KEY}:${userId}`)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

function salvarFavoritos(userId: string, ids: string[]) {
  localStorage.setItem(`${FAVORITOS_KEY}:${userId}`, JSON.stringify(ids))
}

function dentroDoPeriodo(data: string, periodo: string): boolean {
  if (!periodo) return true
  const dias = Number(periodo)
  if (!Number.isFinite(dias)) return true
  const limite = Date.now() - dias * 86_400_000
  return new Date(data).getTime() >= limite
}

export function useBPMNViewer(userId: string) {
  const [processos, setProcessos] = React.useState<ProcessoBiblioteca[]>([])
  const [filtros, setFiltros] = React.useState<FiltrosBiblioteca>(FILTROS_INICIAIS)
  const [selecionadoId, setSelecionadoId] = React.useState<string | null>(null)
  const [favoritos, setFavoritos] = React.useState<string[]>(() => lerFavoritos(userId))
  const [carregando, setCarregando] = React.useState(true)
  const [erro, setErro] = React.useState<string | null>(null)
  const [versao, setVersao] = React.useState(0)

  React.useEffect(() => {
    let ativo = true
    setCarregando(true)
    setErro(null)

    fetchBiblioteca()
      .then((dados) => {
        if (!ativo) return
        setProcessos(dados)
      })
      .catch((causa: unknown) => {
        if (!ativo) return
        setErro(
          causa instanceof Error
            ? causa.message
            : 'Não foi possível carregar a biblioteca de processos.',
        )
        setProcessos([])
      })
      .finally(() => {
        if (ativo) setCarregando(false)
      })

    return () => {
      ativo = false
    }
  }, [versao])

  const opcoes: OpcoesFiltro = React.useMemo(
    () => ({
      setores: [...new Set(processos.map((item) => item.setor))].sort((a, b) => a.localeCompare(b)),
      responsaveis: [...new Set(processos.map((item) => item.autor))].sort((a, b) =>
        a.localeCompare(b),
      ),
      categorias: [...new Set(processos.map((item) => item.categoria))].sort((a, b) =>
        a.localeCompare(b),
      ),
      versoes: [...new Set(processos.map((item) => item.versaoAtual))].sort((a, b) =>
        a.localeCompare(b),
      ),
    }),
    [processos],
  )

  const filtrados = React.useMemo(() => {
    const termo = filtros.busca.trim().toLowerCase()

    return processos.filter((processo) => {
      const alvo =
        `${processo.nome} ${processo.codigo} ${processo.autor} ${processo.setor} ${processo.categoria} ${processo.legislacao} ${processo.objetivo}`.toLowerCase()
      const combinaBusca = !termo || alvo.includes(termo)
      const combinaSetor = !filtros.setor || processo.setor === filtros.setor
      const combinaStatus = !filtros.status || processo.status === filtros.status
      const combinaResponsavel = !filtros.responsavel || processo.autor === filtros.responsavel
      const combinaCategoria = !filtros.categoria || processo.categoria === filtros.categoria
      const combinaVersao = !filtros.versao || processo.versaoAtual === filtros.versao
      const combinaPeriodo = dentroDoPeriodo(processo.atualizadoEm, filtros.periodo)
      const combinaFavoritos = !filtros.apenasFavoritos || favoritos.includes(processo.id)

      return (
        combinaBusca &&
        combinaSetor &&
        combinaStatus &&
        combinaResponsavel &&
        combinaCategoria &&
        combinaVersao &&
        combinaPeriodo &&
        combinaFavoritos
      )
    })
  }, [processos, filtros, favoritos])

  const selecionado = React.useMemo(
    () => processos.find((item) => item.id === selecionadoId) ?? null,
    [processos, selecionadoId],
  )

  const relacionados = React.useMemo(
    () => (selecionado ? processosRelacionados(selecionado, processos) : []),
    [processos, selecionado],
  )

  function atualizarFiltro<Key extends keyof FiltrosBiblioteca>(
    chave: Key,
    valor: FiltrosBiblioteca[Key],
  ) {
    setFiltros((atual) => ({ ...atual, [chave]: valor }))
  }

  function limparFiltros() {
    setFiltros(FILTROS_INICIAIS)
  }

  function alternarFavorito(processoId: string) {
    setFavoritos((atual) => {
      const proximo = atual.includes(processoId)
        ? atual.filter((id) => id !== processoId)
        : [...atual, processoId]
      salvarFavoritos(userId, proximo)
      return proximo
    })
  }

  return {
    processos,
    filtrados,
    opcoes,
    filtros,
    atualizarFiltro,
    limparFiltros,
    selecionado,
    selecionar: (id: string | null) => setSelecionadoId(id),
    favoritos,
    alternarFavorito,
    relacionados,
    carregando,
    erro,
    recarregar: () => setVersao((atual) => atual + 1),
  }
}
