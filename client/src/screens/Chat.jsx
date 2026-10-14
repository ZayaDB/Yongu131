import { useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { clock, dayKey, dayLabel } from '../format.js'

const PHRASES = ['도착했습니다', '인원 확인 부탁해요', '견적 확정했습니다', '사다리 필요합니다']

export function ChatScreen({ staffName, onRename, onLeave, onRead }) {
  const [messages, setMessages] = useState([])
  const [staff, setStaff] = useState([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const logRef = useRef(null)
  const stick = useRef(true)
  const onReadRef = useRef(onRead)
  onReadRef.current = onRead

  async function load() {
    const data = await api.messages()
    setMessages(data.messages)
    setStaff(data.staff || [])
    const latest = data.messages.at(-1)
    if (latest) onReadRef.current(latest.id)
  }

  useEffect(() => {
    let stop = false
    async function tick() {
      try {
        const data = await api.messages()
        if (stop) return
        setMessages(data.messages)
        setStaff(data.staff || [])
        setError('')
        const latest = data.messages.at(-1)
        if (latest) onReadRef.current(latest.id)
      } catch {
        if (!stop) setError('대화를 불러오지 못했습니다.')
      }
    }
    tick()
    const timer = setInterval(tick, 2500)
    return () => {
      stop = true
      clearInterval(timer)
    }
  }, [])

  useEffect(() => {
    if (!stick.current) return
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  function onScroll() {
    const el = logRef.current
    if (!el) return
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function send(event) {
    event?.preventDefault()
    const body = text.trim()
    if (!body || sending) return
    setSending(true)
    setError('')
    try {
      await api.sendMessage({ staffName, text: body })
      setText('')
      stick.current = true
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  const here = staff.some((person) => person.name === staffName)
    ? staff
    : [{ name: staffName, role: '' }, ...staff]

  return (
    <div className="chat">
      <header className="chat-head">
        <div>
          <p className="kicker">사무실</p>
          <h1>채팅</h1>
        </div>
        <div className="chat-actions">
          <button type="button" className="text-btn" onClick={onRename}>{staffName}</button>
          <button type="button" className="text-btn" onClick={onLeave}>나가기</button>
        </div>
      </header>
      <section className="online" aria-label="지금 있는 직원">
        <p>지금 {here.length}명</p>
        <ul>
          {here.map((person) => (
            <li key={person.name}>
              <i aria-hidden="true" />
              <b>{person.name}{person.name === staffName ? ' (나)' : ''}</b>
              {person.role === 'estimator' && <span>견적</span>}
              {person.role === 'viewer' && <span>보기</span>}
            </li>
          ))}
        </ul>
      </section>
      <div className="log" ref={logRef} onScroll={onScroll}>
        {messages.length === 0 && <p className="empty">아직 대화가 없습니다. 인원, 시간, 현장 얘기를 여기에 남겨 두세요.</p>}
        {messages.map((message, index) => {
          const prev = messages[index - 1]
          const showDay = !prev || dayKey(prev.createdAt) !== dayKey(message.createdAt)
          const mine = message.staffName === staffName
          const showName = !mine && (!prev || prev.staffName !== message.staffName || showDay)
          return (
            <div key={message.id}>
              {showDay && <p className="day-split">{dayLabel(message.createdAt)}</p>}
              <div className={mine ? 'bubble mine' : 'bubble'}>
                {showName && <b>{message.staffName}</b>}
                <p>{message.text}</p>
                <time>{clock(message.createdAt)}</time>
              </div>
            </div>
          )
        })}
      </div>
      {error && <p className="form-error chat-error">{error}</p>}
      <div className="phrases">
        {PHRASES.map((phrase) => (
          <button type="button" key={phrase} onClick={() => setText((current) => (current.trim() ? `${current.trim()} ${phrase}` : phrase))}>
            {phrase}
          </button>
        ))}
      </div>
      <form className="composer" onSubmit={send}>
        <textarea
          rows={2}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지"
          maxLength={1000}
          aria-label="메시지"
        />
        <button type="submit" className="btn btn-primary" disabled={!text.trim() || sending}>{sending ? '전송' : '보내기'}</button>
      </form>
    </div>
  )
}
