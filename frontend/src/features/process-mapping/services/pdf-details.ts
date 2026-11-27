/**
 * Conteúdo complementar do PDF do processo (informações, ficha técnica e prazos).
 *
 * Só usa dados que a API entrega a qualquer leitor do processo: campos do processo e
 * a ficha técnica salva na versão BPMN. As respostas da entrevista ficam de fora porque
 * a API só as envia ao autor, e o PDF oficial não pode variar conforme quem o exporta.
 * Este módulo não importa o jsPDF, para não carregá-lo junto das telas.
 */

export interface FichaTecnicaPdf {
  informacoesGerais: string
  observacoesPrazo: string
  sistemas: string[]
  documentacao: string[]
  taxas: string[]
}

export interface BpmnPdfDetails {
  informacoes: Array<{ rotulo: string; valor: string }>
  ficha: FichaTecnicaPdf
}

/** Ficha técnica como a IA a grava em `versoes_bpmn[].estrutura_json`. */
export interface FichaTecnicaApi {
  observacoes_prazo?: string
  informacoes_gerais?: string
  sistemas?: string[]
  documentacao?: string[]
  taxas?: string[]
}

export interface VersaoComFicha {
  estrutura_json?: { ficha_tecnica?: FichaTecnicaApi | null } | null
}

const NAO_INFORMADO = 'Não informado'

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function lista(valor: unknown): string[] {
  return Array.isArray(valor) ? valor.map(texto).filter(Boolean) : []
}

/** Ficha da versão mais recente (a última da lista), com padrões fixos para campos vazios. */
export function extrairFichaTecnica(versoes: VersaoComFicha[] | null | undefined): FichaTecnicaPdf {
  const ficha = versoes?.[versoes.length - 1]?.estrutura_json?.ficha_tecnica ?? {}
  const sistemas = lista(ficha.sistemas)
  const documentacao = lista(ficha.documentacao)
  const taxas = lista(ficha.taxas)
  return {
    informacoesGerais: texto(ficha.informacoes_gerais) || NAO_INFORMADO,
    observacoesPrazo: texto(ficha.observacoes_prazo) || 'Conforme prazo regimental',
    sistemas: sistemas.length > 0 ? sistemas : [NAO_INFORMADO],
    documentacao: documentacao.length > 0 ? documentacao : [NAO_INFORMADO],
    taxas: taxas.length > 0 ? taxas : ['Não se aplica / Processo sem taxas'],
  }
}

export interface DadosProcessoPdf {
  setor?: string | null
  secretaria?: string | null
  versao?: string | null
  autor?: string | null
  homologadoPor?: string | null
  homologadoEm?: string | null
  publicadoPor?: string | null
  publicadoEm?: string | null
  objetivo?: string | null
  descricao?: string | null
  legislacao?: string | null
  ficha: FichaTecnicaPdf
}

function responsavel(
  nome: string | null | undefined,
  data: string | null | undefined,
  pendente: string,
): string {
  const quem = texto(nome)
  if (!quem) return pendente
  return data ? `${quem} em ${new Date(data).toLocaleDateString('pt-BR')}` : quem
}

export function montarDetalhesPdf(dados: DadosProcessoPdf): BpmnPdfDetails {
  const versao = texto(dados.versao)
  return {
    informacoes: [
      { rotulo: 'Setor', valor: texto(dados.setor) || NAO_INFORMADO },
      { rotulo: 'Secretaria', valor: texto(dados.secretaria) || NAO_INFORMADO },
      { rotulo: 'Versão', valor: versao ? `v${versao}` : NAO_INFORMADO },
      { rotulo: 'Autor', valor: texto(dados.autor) || NAO_INFORMADO },
      { rotulo: 'Homologado por', valor: responsavel(dados.homologadoPor, dados.homologadoEm, 'Aguardando homologação') },
      { rotulo: 'Publicado por', valor: responsavel(dados.publicadoPor, dados.publicadoEm, 'Aguardando publicação') },
      { rotulo: 'Objetivo', valor: texto(dados.objetivo) || NAO_INFORMADO },
      { rotulo: 'Descrição', valor: texto(dados.descricao) || NAO_INFORMADO },
      { rotulo: 'Legislação / norma', valor: texto(dados.legislacao) || NAO_INFORMADO },
    ],
    ficha: dados.ficha,
  }
}

/** Campos do processo como a API os entrega, suficientes para o PDF. */
export interface ProcessoApiPdf {
  setor?: string | null
  secretaria?: string | null
  versao_atual?: string | null
  criado_por_nome?: string | null
  aprovado_por_nome?: string | null
  aprovado_em?: string | null
  publicado_por_nome?: string | null
  publicado_em?: string | null
  objetivo?: string | null
  descricao?: string | null
  legislacao?: string | null
  versoes_bpmn?: VersaoComFicha[] | null
}

export function detalhesPdfDaApi(processo: ProcessoApiPdf): BpmnPdfDetails {
  return montarDetalhesPdf({
    setor: processo.setor,
    secretaria: processo.secretaria,
    versao: processo.versao_atual,
    autor: processo.criado_por_nome,
    homologadoPor: processo.aprovado_por_nome,
    homologadoEm: processo.aprovado_em,
    publicadoPor: processo.publicado_por_nome,
    publicadoEm: processo.publicado_em,
    objetivo: processo.objetivo,
    descricao: processo.descricao,
    legislacao: processo.legislacao,
    ficha: extrairFichaTecnica(processo.versoes_bpmn),
  })
}
