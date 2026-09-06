import { api } from './api'

export type AuditLog = { id: string; actor_name: string | null; action: string; entity_type: string; entity_id: string | null; details: string | null; created_at: string }

export async function getAuditLogs() {
  const { data } = await api.get<AuditLog[]>('/audit')
  return data
}
