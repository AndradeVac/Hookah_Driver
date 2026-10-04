import { LoaderCircle, X } from 'lucide-react'
import { useState } from 'react'
import { catalogImage } from '../../lib/images'

const MAX_IMAGE_BYTES = 256 * 1024

async function optimizePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('Selecione uma foto JPG, PNG ou WebP.')
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Selecione uma foto de até 10 MB.')
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1200 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Não foi possível preparar a foto neste navegador.')
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    for (const quality of [0.8, 0.65, 0.5, 0.35]) {
      const url = canvas.toDataURL('image/webp', quality)
      if (!url.startsWith('data:image/webp;base64,')) throw new Error('Este navegador não suporta otimização WebP. Use um navegador atualizado.')
      const encoded = url.split(',')[1]
      if (Math.floor(encoded.length * 3 / 4) <= MAX_IMAGE_BYTES) return encoded
    }
    throw new Error('A foto ainda está muito grande. Selecione uma imagem menor.')
  } finally {
    bitmap.close()
  }
}

type Props = {
  currentUrl?: string | null
  value: string | null | undefined
  onChange: (value: string | null) => void
  onBusyChange: (busy: boolean) => void
  disabled: boolean
}

export function ProductPhotoInput({ currentUrl, value, onChange, onBusyChange, disabled }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const preview = value ? `data:image/webp;base64,${value}` : value === null ? null : currentUrl

  return (
    <div className="product-photo-input">
      <img {...catalogImage(preview)} alt="Prévia da foto do produto" />
      <div>
        <label>
          Foto do produto
          <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ''
              if (!file) return
              setError('')
              setBusy(true)
              onBusyChange(true)
              try {
                const photo = await optimizePhoto(file)
                onChange(photo)
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Não foi possível ler a foto. Selecione outra imagem.')
              } finally {
                setBusy(false)
                onBusyChange(false)
              }
            }} />
        </label>
        <small>JPG, PNG ou WebP até 10 MB. Otimização automática para até 256 KB.</small>
        {busy && <span role="status"><LoaderCircle className="spin" size={14} /> Preparando foto...</span>}
        {error && <span className="photo-error" role="alert">{error}</span>}
        {preview && <button className="resource-filter" type="button" disabled={disabled || busy} onClick={() => { onChange(null); setError('') }}><X size={14} /> Remover foto</button>}
      </div>
    </div>
  )
}
