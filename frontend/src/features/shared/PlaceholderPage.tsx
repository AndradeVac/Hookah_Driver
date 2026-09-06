import { ArrowUpRight, Plus } from 'lucide-react'

type Props = { title: string; description: string }

export function PlaceholderPage({ title, description }: Props) {
  return (
    <section className="page-content simple-page">
      <div className="page-heading"><div><span className="eyebrow">Módulo</span><h1>{title}</h1><p>{description}</p></div><button className="primary-button"><Plus size={17} /> Novo registro</button></div>
      <div className="empty-state"><div className="empty-icon"><ArrowUpRight size={24} /></div><h2>Área pronta para receber dados</h2><p>A conexão com a API será ativada neste módulo na próxima etapa.</p></div>
    </section>
  )
}
