import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { ProcessHistoryEntry } from '../types/process.types'

export function VersionHistory({ entries }: { entries: ProcessHistoryEntry[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Histórico de Versões</CardTitle>
        <CardDescription>Gerações e alterações registradas nesta sessão.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-fx-cinza">O histórico será criado após a primeira geração.</p>
        ) : (
          <ol className="space-y-3">
            {[...entries].reverse().map((entry) => (
              <li key={entry.id} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 border-b border-fx-linha/60 pb-3 last:border-0 last:pb-0">
                <span className="row-span-2 mt-1 h-2 w-2 rounded-full bg-fx-azul" aria-hidden="true" />
                <span className="text-xs font-semibold text-fx-marinho">v{entry.version} · {entry.reason}</span>
                <span className="text-[11px] text-fx-cinza">
                  {entry.user} · {new Date(entry.date).toLocaleString('pt-BR')}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}