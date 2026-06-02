import { useEffect } from 'react'
import { createPortal } from 'react-dom'

const getQRImageURL = (payload, size = 400) => {
  const encoded = encodeURIComponent(payload)
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`
}

export default function QRDisplayModal({ quest, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  useEffect(() => {
    const handler = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleDownload = async () => {
    try {
      const url = getQRImageURL(quest.qrPayload, 800)
      const response = await fetch(url)
      const blob = await response.blob()
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `quest-${quest.id}-qr.png`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (err) {
      alert('Download failed. Try again.')
    }
  }

  const handlePrint = () => {
    const win = window.open('', '_blank')
    if (!win) {
      alert('Please allow pop-ups for this site to print.')
      return
    }
    win.document.write(`
      <html>
        <head>
          <title>QR Poster - ${quest.title}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            h1 { color: #047857; margin-bottom: 8px; }
            h2 { color: #374151; margin-top: 0; }
            .qr { margin: 30px auto; }
            .instructions { font-size: 18px; color: #4b5563; margin-top: 20px; }
            .footer { margin-top: 40px; font-size: 14px; color: #9ca3af; }
          </style>
        </head>
        <body>
          <h1>SMARTDCABIAO Quest</h1>
          <h2>${quest.title}</h2>
          <img class="qr" src="${getQRImageURL(quest.qrPayload, 600)}" />
          <p class="instructions">
            📱 Scan this QR code with the SMARTDCABIAO app to verify your quest!
          </p>
          <p class="footer">Earn ${quest.points} QP · Cabiao Tourism</p>
        </body>
      </html>
    `)
    win.document.close()
    setTimeout(() => win.print(), 500)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-lg">📱 QR Code</h3>
            <p className="text-sm text-gray-500">{quest.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 w-9 h-9 rounded-lg flex items-center justify-center">
            ✕
          </button>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-4 flex justify-center my-4">
          <img
            src={getQRImageURL(quest.qrPayload, 400)}
            alt="Quest QR Code"
            className="w-64 h-64"
          />
        </div>

        <div className="bg-gray-50 rounded-xl p-3 mb-4">
          <p className="text-xs text-gray-500 mb-1">Payload:</p>
          <code className="text-xs break-all">{quest.qrPayload}</code>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleDownload}
            className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
          >
            📥 Download PNG
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2.5 border border-gray-300 hover:bg-gray-50 rounded-xl font-semibold"
          >
            🖨️ Print Poster
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
