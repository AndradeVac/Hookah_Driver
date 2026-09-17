import { useEffect, useRef, useState } from 'react'

const SDK_SRC = 'https://sdk.mercadopago.com/js/v2'
const CONTAINER_ID = 'walletBrick_container'

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
      bricks: () => { create: (brick: string, container: string, settings: unknown) => Promise<{ unmount: () => void }> }
    }
  }
}

function loadSdk(): Promise<void> {
  if (window.MercadoPago) return Promise.resolve()
  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SDK_SRC}"]`)
  if (existing) return new Promise((resolve, reject) => { existing.addEventListener('load', () => resolve()); existing.addEventListener('error', () => reject(new Error('sdk'))) })
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SDK_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('sdk'))
    document.body.appendChild(script)
  })
}

export function MercadoPagoWallet({ preferenceId, publicKey }: { preferenceId: string; publicKey: string }) {
  const [failed, setFailed] = useState(false)
  const controller = useRef<{ unmount: () => void } | null>(null)

  useEffect(() => {
    let active = true
    loadSdk().then(async () => {
      if (!active || !window.MercadoPago) return
      const mp = new window.MercadoPago(publicKey, { locale: 'pt-BR' })
      controller.current = await mp.bricks().create('wallet', CONTAINER_ID, {
        initialization: { preferenceId, redirectMode: 'blank' },
        callbacks: { onError: () => setFailed(true) },
      })
    }).catch(() => { if (active) setFailed(true) })
    return () => { active = false; controller.current?.unmount(); controller.current = null }
  }, [preferenceId, publicKey])

  return <div className="customer-payment-brick">
    <div id={CONTAINER_ID} />
    {failed && <a className="customer-primary" href={`https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`} target="_blank" rel="noreferrer">Pagar com Mercado Pago</a>}
  </div>
}
