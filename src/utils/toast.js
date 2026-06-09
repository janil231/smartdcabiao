let toastContainer = null

function ensureContainer() {
  if (toastContainer) return toastContainer
  toastContainer = document.createElement('div')
  toastContainer.id = 'app-toast-container'
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `
  document.body.appendChild(toastContainer)
  return toastContainer
}

export function showToast(message, type = 'success', duration = 4000) {
  const container = ensureContainer()

  const toast = document.createElement('div')
  const colors = {
    success: 'background: #059669; color: white;',
    error: 'background: #dc2626; color: white;',
    info: 'background: #2563eb; color: white;',
    warning: 'background: #d97706; color: white;',
  }

  toast.style.cssText = `
    ${colors[type] || colors.success}
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    font-size: 14px;
    font-weight: 500;
    max-width: 360px;
    pointer-events: auto;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 200ms, transform 200ms;
  `
  toast.textContent = message

  container.appendChild(toast)

  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateY(0)'
  })

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateY(20px)'
    setTimeout(() => toast.remove(), 200)
  }, duration)
}
