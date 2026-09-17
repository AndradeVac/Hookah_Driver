import { ExternalLink } from 'lucide-react'

export function MercadoPagoWallet({ preferenceId, publicKey }: { preferenceId: string; publicKey: string }) {
  const checkoutUrl = `https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=${preferenceId}`
  return <button className="customer-primary" onClick={() => window.open(checkoutUrl, '_blank', 'noopener,noreferrer')}>
    <ExternalLink size={16} /> Pagar com Mercado Pago
  </button>
}
