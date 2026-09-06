import { ArrowRight, Camera, QrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export function CustomerQrScannerPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [value, setValue] = useState('')
  const [cameraError, setCameraError] = useState('')

  useEffect(() => {
    let stream: MediaStream | undefined
    let active = true
    async function scan() {
      const Detector = (globalThis as typeof globalThis & { BarcodeDetector?: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector
      if (!Detector || !videoRef.current) return
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        const detector = new Detector({ formats: ['qr_code'] })
        while (active) {
          const codes = await detector.detect(videoRef.current)
          if (codes[0]?.rawValue) { openQr(codes[0].rawValue); break }
          await new Promise((resolve) => window.setTimeout(resolve, 400))
        }
      } catch {
        setCameraError('Não foi possível abrir a câmera. Cole o link do QR abaixo.')
      }
    }
    void scan()
    return () => { active = false; stream?.getTracks().forEach((track) => track.stop()) }
  }, [])

  function openQr(rawValue: string) {
    try {
      const url = new URL(rawValue, window.location.origin)
      navigate(`${url.pathname}${url.search}`)
    } catch {
      setCameraError('QR inválido. Use um link do Hookah Driver.')
    }
  }

  return <main className="customer-app customer-scanner"><div className="customer-scanner-card"><div className="success-mark"><QrCode size={30} /></div><span className="customer-kicker">Hookah Driver</span><h1>Aponte para o QR Code</h1><p>Vamos abrir o cardápio da sua mesa.</p><div className="scanner-frame"><video ref={videoRef} muted playsInline /><Camera size={28} /></div>{cameraError && <div className="customer-error">{cameraError}</div>}<label>Ou cole o link do QR Code<input value={value} onChange={(event) => setValue(event.target.value)} placeholder="https://.../cliente?mesa=12" /></label><button className="customer-primary" type="button" disabled={!value.trim()} onClick={() => openQr(value)}>Abrir cardápio <ArrowRight size={16} /></button></div></main>
}
