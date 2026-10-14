import { useEffect, useState } from 'react'
import { todayYmd } from '../../shared/model.js'
import { api } from './api.js'
import { AppProvider, useApp } from './context.jsx'
import { IconCal, IconChat, IconPeople, IconToday } from './components.jsx'
import { JoinGate, NewCustomerSheet, RenameSheet } from './sheets.jsx'
import { TodayScreen } from './screens/Today.jsx'
import { CustomersScreen } from './screens/Customers.jsx'
import { CalendarScreen } from './screens/Calendar.jsx'
import { ChatScreen } from './screens/Chat.jsx'
import { Editor } from './screens/Editor.jsx'

const READ_KEY = 'jh-chat-read'

const NAV = [
  ['today', '오늘', IconToday],
  ['customers', '고객', IconPeople],
  ['calendar', '달력', IconCal],
  ['chat', '채팅', IconChat],
]

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}

function Shell() {
  const { customers, loaded, error, reload, session, canEdit, enter, leave, rename } = useApp()
  const [tab, setTab] = useState('today')
  const [open, setOpen] = useState(null)
  const [focusDate, setFocusDate] = useState('')
  const [creating, setCreating] = useState(null)
  const [renaming, setRenaming] = useState(false)
  const [lastRead, setLastRead] = useState(() => localStorage.getItem(READ_KEY) || '')
  const [latestId, setLatestId] = useState('')
  const staffName = session?.name || ''

  useEffect(() => {
    if (!session || tab === 'chat' || open) return undefined
    let stop = false
    async function tick() {
      try {
        const { messages } = await api.messages()
        if (!stop) setLatestId(messages.at(-1)?.id || '')
      } catch {
        /* 채팅 배지는 다음 주기에 다시 확인합니다. */
      }
    }
    tick()
    const timer = setInterval(tick, 8000)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [tab, open, session])

  function markRead(id) {
    if (!id) return
    setLastRead(id)
    setLatestId(id)
    localStorage.setItem(READ_KEY, id)
  }

  function openCustomer(id, pane = 'info') {
    setOpen({ id, pane })
  }

  function openCalendar(date) {
    setFocusDate(date || todayYmd())
    setTab('calendar')
    setOpen(null)
  }

  const customer = open ? customers.find((item) => item.id === open.id) : null
  const unread = Boolean(latestId && latestId !== lastRead)
  const shellClass = `shell${open ? ' editing' : ''}${tab === 'chat' && !open ? ' chat-mode' : ''}`

  if (!session) {
    return (
      <div className={shellClass}>
        <JoinGate onEnter={enter} />
      </div>
    )
  }

  return (
    <div className={shellClass}>
      <nav className="nav no-print" aria-label="주요 메뉴">
        <div className="brand">
          <strong>JH통운</strong>
          <span>사무실</span>
        </div>
        {NAV.map(([id, label, Icon]) => (
          <button
            type="button"
            key={id}
            className={tab === id && !open ? 'nav-btn on' : 'nav-btn'}
            onClick={() => {
              setTab(id)
              setOpen(null)
            }}
          >
            <Icon />
            <span>{label}</span>
            {id === 'chat' && unread && <i className="dot" aria-label="새 메시지" />}
          </button>
        ))}
      </nav>
      <main className="main">
        {error && (
          <div className="error-banner">
            <p>{error}</p>
            <button type="button" className="btn btn-ghost btn-small" onClick={reload}>다시 시도</button>
          </div>
        )}
        {!loaded && <p className="loading">장부를 불러오는 중입니다.</p>}
        {loaded && !open && tab === 'today' && (
          <TodayScreen onOpen={openCustomer} onCreate={(date) => setCreating({ moveDate: date || todayYmd() })} onCalendar={openCalendar} />
        )}
        {loaded && !open && tab === 'customers' && (
          <CustomersScreen onOpen={openCustomer} onCreate={() => setCreating({ moveDate: todayYmd() })} />
        )}
        {loaded && !open && tab === 'calendar' && (
          <CalendarScreen
            focusDate={focusDate}
            staffName={staffName}
            onOpen={openCustomer}
            onCreate={(date) => setCreating({ moveDate: date || todayYmd() })}
          />
        )}
        {loaded && !open && tab === 'chat' && (
          <ChatScreen staffName={staffName || '직원'} onRename={() => setRenaming(true)} onLeave={leave} onRead={markRead} />
        )}
        {loaded && open && customer && (
          <Editor
            key={customer.id}
            customer={customer}
            staffName={staffName}
            initialPane={open.pane}
            onBack={() => setOpen(null)}
          />
        )}
        {loaded && open && !customer && <p className="empty">고객을 찾을 수 없습니다.</p>}
      </main>
      {renaming && <RenameSheet name={staffName} onClose={() => setRenaming(false)} onSave={(name) => { rename(name); setRenaming(false) }} />}
      {canEdit && creating && (
        <NewCustomerSheet
          presetDate={creating.moveDate}
          staffName={staffName}
          onClose={() => setCreating(null)}
          onCreated={(created) => {
            setCreating(null)
            setOpen({ id: created.id, pane: 'rooms' })
            setTab('customers')
          }}
        />
      )}
    </div>
  )
}
