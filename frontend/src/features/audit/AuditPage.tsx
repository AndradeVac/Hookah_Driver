import { AlertCircle, Clock3, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { orderStatusLabels } from '../../lib/format'
import { getAuditLogs, type AuditLog } from '../../services/audit'
import type { OrderStatus } from '../../types'

const actionLabels: Record<string, string> = {
  ORDER_STATUS_CHANGED: 'Status do pedido alterado',
  ORDER_DELETED: 'Pedido removido',
  ORDERS_CLEARED: 'Pedidos limpos',
  USER_STATUS_CHANGED: 'Acesso de usuário alterado',
}

const entityLabels: Record<string, string> = { ORDER: 'Pedido', USER: 'Usuário' }

function describe(log: AuditLog) {
  const [key, value] = (log.details ?? '').split('=')
  switch (`${log.action}:${key}`) {
    case 'ORDER_STATUS_CHANGED:status': return `Novo status: ${orderStatusLabels[value as OrderStatus] ?? value}`
    case 'ORDER_DELETED:order_number': return `Pedido #${value}`
    case 'ORDERS_CLEARED:deleted_count': return `${value} ${value === '1' ? 'pedido removido' : 'pedidos removidos'}`
    case 'USER_STATUS_CHANGED:active': return value === 'True' ? 'Usuário ativado' : 'Usuário desativado'
    default: return log.details ?? ''
  }
}

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    getAuditLogs()
      .then(setLogs)
      .catch(() => setError('Não foi possível carregar a auditoria.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="page-content simple-page">
      <div className="page-heading"><div><span className="eyebrow">Administração</span><h1>Auditoria</h1><p>Histórico de ações administrativas e operacionais.</p></div></div>
      {error && <div className="api-error"><AlertCircle size={16} />{error}</div>}
      <div className="resource-list audit-list">
        <div className="resource-list-header"><div><strong>Ações recentes</strong><span>{logs.length} registros</span></div><ShieldCheck size={17} /></div>
        {loading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando auditoria...</div>
          : logs.length === 0 ? <div className="resource-state">Nenhuma ação registrada.</div>
          : logs.map((log) => {
            const detail = describe(log)
            return (
              <article className="resource-row audit-row" key={log.id}>
                <Clock3 size={16} />
                <div>
                  <strong>{actionLabels[log.action] ?? log.action}</strong>
                  <span>{log.actor_name ?? 'Sistema'} · {entityLabels[log.entity_type] ?? log.entity_type}{detail && ` · ${detail}`}</span>
                </div>
                <time dateTime={log.created_at}>{new Date(log.created_at).toLocaleString('pt-BR')}</time>
              </article>
            )
          })}
      </div>
    </section>
  )
}
