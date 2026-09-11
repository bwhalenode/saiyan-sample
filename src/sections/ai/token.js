/* Session token storage. Mobile browsers (Safari especially) block cross-site
   cookies entirely, so the signed session token is also kept in localStorage
   and sent as a Bearer header. The server accepts either transport. */

const KEY = 'saiyan_tg_token'

export function getToken() {
  try {
    return localStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(t) {
  try {
    if (t) localStorage.setItem(KEY, t)
    else localStorage.removeItem(KEY)
  } catch {
    /* storage unavailable: cookies remain the fallback */
  }
}

export function authHeaders() {
  const t = getToken()
  return t ? { authorization: `Bearer ${t}` } : {}
}
