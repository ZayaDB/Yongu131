const CODE_KEY = 'jh-office-code'

export function officeCode() {
  return localStorage.getItem(CODE_KEY) || ''
}

export function saveOfficeSession({ name, code, role }) {
  localStorage.setItem('jh-office-staff', name)
  localStorage.setItem(CODE_KEY, code)
  localStorage.setItem('jh-office-role', role)
}

export function clearOfficeSession() {
  localStorage.removeItem('jh-office-staff')
  localStorage.removeItem(CODE_KEY)
  localStorage.removeItem('jh-office-role')
}

export function officeClientId() {
  const key = 'jh-office-client'
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      'x-office-code': officeCode(),
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error(data.error || (response.status === 404
      ? '서버에 연결하지 못했습니다. 사이트를 다시 배포해 주세요.'
      : '요청에 실패했습니다.'))
    error.status = response.status
    throw error
  }
  return data
}

export const api = {
  join: (body) => request('/api/join', { method: 'POST', body }),
  bootstrap: () => request('/api/bootstrap'),
  createCustomer: (body) => request('/api/customers', { method: 'POST', body }),
  updateCustomer: (id, body) => request(`/api/customers/${id}`, { method: 'PUT', body }),
  saveTeam: (id, body) => request(`/api/customers/${id}/team`, { method: 'PUT', body }),
  removeCustomer: (id) => request(`/api/customers/${id}`, { method: 'DELETE' }),
  messages: () => request('/api/messages'),
  sendMessage: (body) => request('/api/messages', { method: 'POST', body }),
  presence: (body) => request('/api/presence', { method: 'POST', body }),
  leavePresence: (clientId) => request('/api/presence', { method: 'DELETE', body: { clientId } }),
}
