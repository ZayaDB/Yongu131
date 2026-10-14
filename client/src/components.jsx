import { useState } from 'react'

export function IconToday() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 8v4.5l3 2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconPeople() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M4.8 17.5c.6-2.2 2.2-3.4 4.2-3.4s3.6 1.2 4.2 3.4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16.2" cy="9.2" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M15.2 14.2c1.5.2 2.7 1.1 3.3 2.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconCal() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 3.5v3M16 3.5v3M4 10h16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export function IconChat() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 16.5 4.5 19.5l4-1.6A8 8 0 1 0 6 16.5Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  )
}

export function IconBack() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M15 5 8 12l7 7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function TeamLine({ team }) {
  const leader = team?.leader || ''
  const members = Array.isArray(team?.members) ? team.members : []
  if (!leader && members.length === 0) return <p className="team-line muted">팀원 이름을 아직 안 적었습니다.</p>
  return (
    <p className="team-line">
      {leader ? `팀장 ${leader}` : '팀장 미정'}
      {members.length > 0 ? ` · ${members.join(', ')}` : ''}
    </p>
  )
}

export function Status({ value }) {
  return <span className={`status status-${value}`}>{value}</span>
}

export function Ratio({ male = 0, female = 0, onClick }) {
  if (!male && !female) return <span className="unassigned">인원 미정</span>
  const label = `남자 ${male}명, 여자 ${female}명. 팀원 이름 적기`
  if (!onClick) {
    return (
      <div className="ratio" aria-label={`남자 ${male}명, 여자 ${female}명`}>
        <div className="male"><b>{male}</b><small>남</small></div>
        <i>:</i>
        <div className="female"><b>{female}</b><small>여</small></div>
      </div>
    )
  }
  return (
    <button type="button" className="ratio" onClick={onClick} aria-label={label}>
      <div className="male"><b>{male}</b><small>남</small></div>
      <i>:</i>
      <div className="female"><b>{female}</b><small>여</small></div>
    </button>
  )
}

export function Stepper({ value, onChange, label, max = 99 }) {
  const count = Number(value) || 0
  return (
    <div className="stepper">
      <button type="button" aria-label={`${label} 줄이기`} onClick={() => onChange(Math.max(0, count - 1))} disabled={count <= 0}>−</button>
      <strong>{count}</strong>
      <button type="button" aria-label={`${label} 늘리기`} onClick={() => onChange(Math.min(max, count + 1))} disabled={count >= max}>+</button>
    </div>
  )
}

export function Field({ label, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      <span>{label}</span>
      {children}
    </div>
  )
}

export function Seg({ value, options, onChange, label }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={String(option.value)}
          className={value === option.value ? 'on' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export function MoneyField({ label, value, onChange }) {
  const [focused, setFocused] = useState(false)
  const shown = focused || !value ? String(value || '') : Number(value).toLocaleString('ko-KR')
  return (
    <Field label={label}>
      <input
        inputMode="numeric"
        value={shown}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={(event) => onChange(Number(event.target.value.replace(/[^\d]/g, '')) || 0)}
      />
    </Field>
  )
}
