import { LoaderCircle } from 'lucide-react'
import { useEffect, useId, type PropsWithChildren, type ReactNode } from 'react'

type ConfirmDialogProps = PropsWithChildren<{
  title: string
  description?: ReactNode
  icon: ReactNode
  confirmLabel: string
  busyLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'primary'
  isBusy?: boolean
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}>

export function ConfirmDialog({
  title,
  description,
  icon,
  confirmLabel,
  busyLabel = 'Aguarde...',
  cancelLabel = 'Cancelar',
  tone = 'danger',
  isBusy = false,
  confirmDisabled = false,
  onConfirm,
  onCancel,
  children,
}: ConfirmDialogProps) {
  const titleId = useId()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !isBusy) onCancel() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [isBusy, onCancel])

  return (
    <div className="modal-overlay" role="presentation" onClick={() => { if (!isBusy) onCancel() }}>
      <div className={`modal-content ${tone === 'danger' ? 'modal-danger' : ''}`} role="alertdialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <div className={`modal-icon ${tone === 'primary' ? 'modal-icon-primary' : ''}`}>{icon}</div>
        <h2 id={titleId}>{title}</h2>
        {description && <p>{description}</p>}
        {children}
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={isBusy} autoFocus>{cancelLabel}</button>
          <button type="button" className={tone === 'danger' ? 'danger-button' : 'primary-button'} onClick={onConfirm} disabled={isBusy || confirmDisabled}>
            {isBusy && <LoaderCircle className="spin" size={16} />}
            {isBusy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
