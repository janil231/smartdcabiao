export const ADMIN_EMAILS = [
  "jannelsuba06242004@gmail.com",
  "jannelsuba0624200@gmail.com"

]

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email)
}
