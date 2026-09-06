import { Clock3, LoaderCircle, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { getAuditLogs, type AuditLog } from '../../services/audit'

const labels: Record<string, string> = { ORDER_STATUS_CHANGED: 'Status do pedido alterado', USER_STATUS_CHANGED: 'Status de usuário alterado' }

export function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { getAuditLogs().then(setLogs).finally(() => setLoading(false)) }, [])
  return <section className="page-content simple-page"><div className="page-heading"><div><span className="eyebrow">Administração</span><h1>Auditoria</h1><p>Histórico de ações administrativas e operacionais.</p></div></div><div className="resource-list audit-list"><div className="resource-list-header"><div><strong>Ações recentes</strong><span>{logs.length} registros</span></div><ShieldCheck size={17} /></div>{loading ? <div className="resource-state"><LoaderCircle className="spin" size={20} />Carregando auditoria...</div> : logs.length === 0 ? <div className="resource-state">Nenhuma ação registrada.</div> : logs.map((log) => <article className="resource-row audit-row" key={log.id}><Clock3 size={16} /><div><strong>{labels[log.action] ?? log.action}</strong><span>{log.actor_name ?? 'Sistema'} · {log.entity_type} · {log.details ?? 'Sem detalhes'}</span></div><time>{new Date(log.created_at).toLocaleString('pt-BR')}</time></article>)}</div></section>
}
