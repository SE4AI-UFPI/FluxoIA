declare module 'bpmn-auto-layout' {
  /**
   * Recalcula o layout visual (DI) de um diagrama BPMN 2.0 e devolve o XML
   * atualizado. A semântica do processo (elementos e conexões) é preservada.
   */
  export function layoutProcess(bpmnXml: string): Promise<string>
}
