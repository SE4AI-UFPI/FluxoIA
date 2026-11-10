import { FileCode2, FileText, Link2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessoBiblioteca } from '../types/bpmnViewer.types'

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  link.click()
  URL.revokeObjectURL(url)
}

/** Anexos e documentação institucional associados ao processo. */
export function BPMNDownloads({ processo }: { processo: ProcessoBiblioteca }) {
  const documentos = processo.documentos.length > 0 ? processo.documentos : []

  function baixarFichaTecnica() {
    const linhas = [
      `Processo: ${processo.nome}`,
      `Código: ${processo.codigo}`,
      `Setor: ${processo.setor}`,
      `Categoria: ${processo.categoria}`,
      `Status: ${processo.status}`,
      `Versão atual: v${processo.versaoAtual}`,
      `Autor: ${processo.autor}`,
      `Supervisor aprovador: ${processo.supervisorAprovador || '—'}`,
      '',
      `Objetivo: ${processo.objetivo}`,
      `Legislação: ${processo.legislacao || '—'}`,
      `Sistemas: ${processo.sistemas.join('; ') || '—'}`,
      `Prazos e Regras: ${processo.prazos || 'Conforme prazo regimental'}`,
      '',
      'Checklist de Documentos Exigidos:',
      ...(documentos.length > 0 ? documentos.map((doc, idx) => `  [ ] ${idx + 1}. ${doc}`) : ['  —']),
    ].join('\n')
    baixar(`${processo.codigo}-ficha-tecnica.txt`, linhas, 'text/plain;charset=utf-8')
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Artefatos e Requisitos Documentais</CardTitle>
        <p className="text-xs text-fx-cinza">
          Exportação do fluxo e relação de documentos exigidos na instrução do processo.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="flex flex-wrap gap-2">
          {processo.bpmnXml && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => baixar(`${processo.codigo}.bpmn`, processo.bpmnXml ?? '', 'application/xml')}
            >
              <FileCode2 className="mr-1.5 h-4 w-4" /> Diagrama BPMN (.bpmn)
            </Button>
          )}
          <Button type="button" size="sm" variant="outline" onClick={baixarFichaTecnica}>
            <FileText className="mr-1.5 h-4 w-4" /> Ficha técnica e checklist (.txt)
          </Button>
        </div>

        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-fx-cinza">
            <Link2 className="h-3.5 w-3.5" /> Requisitos documentais informados na entrevista
          </p>
          {documentos.length === 0 ? (
            <p className="text-sm text-fx-cinza">
              Nenhum documento foi informado na entrevista guiada deste processo.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {documentos.map((documento) => (
                <li
                  key={documento}
                  className="flex items-center justify-between gap-2 rounded-sm border border-fx-linha bg-white px-3 py-2 text-sm"
                >
                  <span className="flex min-w-0 items-center gap-2 text-fx-grafite">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-fx-sucesso" />
                    <span className="truncate">{documento}</span>
                  </span>
                  <span className="shrink-0 rounded-sm bg-fx-nevoa/60 px-2 py-0.5 text-[11px] font-medium text-fx-marinho">
                    Requisito
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
