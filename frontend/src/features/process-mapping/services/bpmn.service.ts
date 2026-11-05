import type { InterviewAnswerKey, ProcessInfo } from '../types/process.types'

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

function getActivities(answer: string): string[] {
  const activities = answer
    .split(/\r?\n|[.;]/)
    .map((activity) => activity.trim().replace(/^[-*\d.)\s]+/, ''))
    .filter(Boolean)
    .slice(0, 6)

  return activities.length > 0 ? activities : ['Executar atividades do processo']
}

export function generateProcessBpmn(
  info: ProcessInfo,
  answers: Record<InterviewAnswerKey, string>,
): string {
  const processId = `Process_${crypto.randomUUID().replaceAll('-', '')}`
  const activities = getActivities(answers.activities)
  const taskIds = activities.map((_, index) => `Activity_${index + 1}`)
  const flowIds = Array.from({ length: taskIds.length + 1 }, (_, index) => `Flow_${index + 1}`)
  const shapes = [
    '<bpmndi:BPMNShape id="StartEvent_di" bpmnElement="StartEvent"><dc:Bounds x="100" y="190" width="36" height="36" /></bpmndi:BPMNShape>',
    ...activities.map((_, index) =>
      `<bpmndi:BPMNShape id="${taskIds[index]}_di" bpmnElement="${taskIds[index]}"><dc:Bounds x="${200 + index * 180}" y="168" width="130" height="80" /></bpmndi:BPMNShape>`,
    ),
    `<bpmndi:BPMNShape id="EndEvent_di" bpmnElement="EndEvent"><dc:Bounds x="${200 + activities.length * 180}" y="190" width="36" height="36" /></bpmndi:BPMNShape>`,
  ].join('')

  const edges = flowIds.map((flowId, index) => {
    const sourceX = index === 0 ? 136 : 330 + (index - 1) * 180
    const targetX = index === activities.length ? 200 + activities.length * 180 : 200 + index * 180
    return `<bpmndi:BPMNEdge id="${flowId}_di" bpmnElement="${flowId}"><di:waypoint x="${sourceX}" y="208" /><di:waypoint x="${targetX}" y="208" /></bpmndi:BPMNEdge>`
  }).join('')

  const tasksXml = activities.map((activity, index) =>
    `<bpmn:task id="${taskIds[index]}" name="${escapeXml(activity)}" />`,
  ).join('')
  const flowsXml = flowIds.map((flowId, index) => {
    const sourceRef = index === 0 ? 'StartEvent' : taskIds[index - 1]
    const targetRef = index === activities.length ? 'EndEvent' : taskIds[index]
    return `<bpmn:sequenceFlow id="${flowId}" sourceRef="${sourceRef}" targetRef="${targetRef}" />`
  }).join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_${crypto.randomUUID().replaceAll('-', '')}" targetNamespace="https://fluxoia.gov.br/bpmn">
  <bpmn:process id="${processId}" name="${escapeXml(info.name)}" isExecutable="false">
    <bpmn:documentation>Áreas envolvidas: ${escapeXml(answers.areasInvolved || 'Não informado')}</bpmn:documentation>
    <bpmn:startEvent id="StartEvent" name="${escapeXml(answers.trigger || 'Início')}" />
    ${tasksXml}
    <bpmn:endEvent id="EndEvent" name="${escapeXml(answers.completion || 'Processo concluído')}" />
    ${flowsXml}
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">
      ${shapes}${edges}
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`
}