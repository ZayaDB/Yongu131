import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, clearOfficeSession, officeClientId, saveOfficeSession } from './api.js'

const AppContext = createContext(null)

function readSession() {
  const name = localStorage.getItem('jh-office-staff') || ''
  const code = localStorage.getItem('jh-office-code') || ''
  const role = localStorage.getItem('jh-office-role') || ''
  if (!name || !code || (role !== 'estimator' && role !== 'viewer')) return null
  return { name, code, role }
}

export function AppProvider({ children }) {
  const [session, setSession] = useState(readSession)
  const [customers, setCustomers] = useState([])
  const [codes, setCodes] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState('')
  const canEdit = session?.role === 'estimator'

  const reload = useCallback(async () => {
    if (!session) {
      setCustomers([])
      setCodes(null)
      setLoaded(true)
      return
    }
    try {
      const data = await api.bootstrap()
      setCustomers(data.customers)
      setCodes(data.codes || null)
      setError('')
    } catch (err) {
      if (err.status === 401 || err.status === 403) {
        clearOfficeSession()
        setSession(null)
        setCustomers([])
        setCodes(null)
        setError('')
      } else {
        setError('서버에 연결하지 못했습니다. 앱을 다시 켜 주세요.')
      }
    } finally {
      setLoaded(true)
    }
  }, [session])

  useEffect(() => {
    reload()
  }, [reload])

  useEffect(() => {
    if (!session) return undefined
    let stop = false
    async function ping() {
      try {
        await api.presence({ clientId: officeClientId(), name: session.name })
      } catch (err) {
        if (!stop && (err.status === 401 || err.status === 403)) {
          clearOfficeSession()
          setSession(null)
        }
      }
    }
    ping()
    const timer = setInterval(ping, 12000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [session])

  const enter = useCallback((next) => {
    saveOfficeSession(next)
    setSession(next)
    setLoaded(false)
  }, [])

  const leave = useCallback(() => {
    const clientId = officeClientId()
    api.leavePresence(clientId).catch(() => {})
    clearOfficeSession()
    setSession(null)
    setCustomers([])
    setCodes(null)
    setError('')
    setLoaded(true)
  }, [])

  const rename = useCallback((name) => {
    setSession((current) => {
      if (!current) return current
      const next = { ...current, name }
      saveOfficeSession(next)
      return next
    })
  }, [])

  const saveCustomer = useCallback((customer) => {
    setCustomers((list) => {
      const index = list.findIndex((item) => item.id === customer.id)
      if (index < 0) return [customer, ...list]
      const next = list.slice()
      next[index] = customer
      return next
    })
  }, [])

  const dropCustomer = useCallback((id) => {
    setCustomers((list) => list.filter((item) => item.id !== id))
  }, [])

  return (
    <AppContext.Provider value={{
      customers,
      codes,
      session,
      canEdit,
      loaded,
      error,
      reload,
      enter,
      leave,
      rename,
      saveCustomer,
      dropCustomer,
    }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  return useContext(AppContext)
}
