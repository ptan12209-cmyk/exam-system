/** Official support contacts — StudyHub / luyende.id.vn */

export const SUPPORT_ZALO = "0975744812"
export const SUPPORT_EMAIL = "aptan872@gmail.com"

export const SUPPORT_ZALO_URL = `https://zalo.me/${SUPPORT_ZALO}`
export const SUPPORT_EMAIL_URL = `mailto:${SUPPORT_EMAIL}`

export function supportZaloUrlWithText(text: string): string {
  return `${SUPPORT_ZALO_URL}?text=${encodeURIComponent(text)}`
}
