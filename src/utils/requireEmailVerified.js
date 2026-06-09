export function requireEmailVerified(user, showToast) {
  if (!user) return false

  const isOAuth = user.providerData?.some(p =>
    p.providerId === 'google.com' || p.providerId === 'facebook.com'
  )
  if (isOAuth) return true

  if (!user.emailVerified) {
    showToast('Please verify your email first. Check your inbox.', 'error')
    return false
  }
  return true
}
