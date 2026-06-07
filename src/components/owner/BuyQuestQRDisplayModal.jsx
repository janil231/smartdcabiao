import { useEffect, useRef } from 'react'

export default function BuyQuestQRDisplayModal({ quest, business, onClose }) {
  const canvasRef = useRef(null)

  const qrContent = quest?.qrToken
    ? JSON.stringify({ questId: quest.id, qrToken: quest.qrToken })
    : ''

  useEffect(() => {
    if (!qrContent || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const size = 280

    canvas.width = size
    canvas.height = size

    const moduleSize = Math.floor(size / 25)
    const offset = (size - moduleSize * 25) / 2

    const qr = generateQRCode(qrContent, 25)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    ctx.fillStyle = '#111827'
    for (let row = 0; row < qr.length; row++) {
      for (let col = 0; col < qr[row].length; col++) {
        if (qr[row][col]) {
          ctx.fillRect(offset + col * moduleSize, offset + row * moduleSize, moduleSize, moduleSize)
        }
      }
    }
  }, [qrContent])

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 text-center">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Quest QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {quest && (
          <p className="text-sm font-medium text-gray-700 mb-4">
            {quest.title}
          </p>
        )}

        {qrContent ? (
          <div className="flex justify-center mb-4">
            <canvas
              ref={canvasRef}
              className="border-2 border-gray-200 rounded-xl"
              width={280}
              height={280}
            />
          </div>
        ) : (
          <div className="flex justify-center mb-4">
            <div className="w-[280px] h-[280px] bg-gray-100 rounded-xl flex items-center justify-center">
              <p className="text-sm text-gray-500">No QR token generated</p>
            </div>
          </div>
        )}

        <p className="text-xs text-gray-600 mb-4">
          Customer scans this to claim their reward
        </p>

        <button
          onClick={onClose}
          className="w-full bg-emerald-600 text-white font-semibold py-2.5 rounded-lg hover:bg-emerald-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}

function generateQRCode(text, version) {
  const size = version
  const matrix = Array.from({ length: size }, () => Array(size).fill(false))

  addFinderPatterns(matrix, size)
  addTimingPatterns(matrix, size)
  addDataBits(matrix, text)
  addMask(matrix, size)

  return matrix
}

function addFinderPatterns(matrix, size) {
  const positions = [[0, 0], [0, size - 7], [size - 7, 0]]
  for (const [row, col] of positions) {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const nr = row + r, nc = col + c
        if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue
        const outerRing = r >= 0 && r <= 6 && c >= 0 && c <= 6
        const innerRing = r >= 1 && r <= 5 && c >= 1 && c <= 5
        matrix[nr][nc] = outerRing && !innerRing
      }
    }
  }
}

function addTimingPatterns(matrix, size) {
  for (let i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0
    matrix[i][6] = i % 2 === 0
  }
}

function addDataBits(matrix, text) {
  let idx = 0
  const data = text.split('').map(c => c.charCodeAt(0))

  for (let row = 0; row < matrix.length && idx < data.length; row++) {
    for (let col = 0; col < matrix[row].length && idx < data.length; col++) {
      if (!matrix[row][col]) {
        const bit = (data[idx] >> (7 - (col % 8))) & 1
        matrix[row][col] = bit === 1
        if (col % 8 === 7) idx++
      }
    }
  }
}

function addMask(matrix, size) {
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!isReserved(row, col, size)) {
        if ((row + col) % 2 === 0) {
          matrix[row][col] = !matrix[row][col]
        }
      }
    }
  }
}

function isReserved(row, col, size) {
  if (row < 8 && col < 8) return true
  if (row < 8 && col >= size - 8) return true
  if (row >= size - 8 && col < 8) return true
  if (row === 6 || col === 6) return true
  return false
}
