import { useEffect, useMemo, useState } from 'react'
import { todayYmd } from '../../../shared/model.js'
import { api } from '../api.js'
import { useApp } from '../context.jsx'
import { calendarMarks, koreanDate, markLabel, monthTitle, parseYmd, SLOT_ORDER } from '../format.js'
import { Ratio, Status, TeamLine } from '../components.jsx'
import { CrewSheet, TeamSheet } from '../sheets.jsx'

const DOW = ['일', '월', '화', '수', '목', '금', '토']

export function CalendarScreen({ focusDate, staffName, onOpen, onCreate }) {
  const { customers, saveCustomer, canEdit } = useApp()
  const today = todayYmd()
  const start = parseYmd(focusDate || today)
  const [cursor, setCursor] = useState({ year: start.getFullYear(), month: start.getMonth() })
  const [selected, setSelected] = useState(focusDate || today)
  const [crewFor, setCrewFor] = useState(null)
  const [teamFor, setTeamFor] = useState(null)

  useEffect(() => {
    if (!focusDate) return
    const date = parseYmd(focusDate)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
    setSelected(focusDate)
  }, [focusDate])

  const byDay = useMemo(() => {
    const map = new Map()
    for (const customer of customers) {
      for (const mark of calendarMarks(customer)) {
        if (!map.has(mark.date)) map.set(mark.date, [])
        map.get(mark.date).push(mark)
      }
    }
    for (const list of map.values()) {
      list.sort((a, b) => (SLOT_ORDER[a.customer.timeSlot] ?? 9) - (SLOT_ORDER[b.customer.timeSlot] ?? 9))
    }
    return map
  }, [customers])

  const weeks = buildWeeks(cursor.year, cursor.month)
  const selectedMarks = byDay.get(selected) || []

  function shift(delta) {
    const date = new Date(cursor.year, cursor.month + delta, 1)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
  }

  function goToday() {
    const date = parseYmd(today)
    setCursor({ year: date.getFullYear(), month: date.getMonth() })
    setSelected(today)
  }

  async function confirm(next) {
    const updated = { ...crewFor, ...next }
    setCrewFor(null)
    try {
      const saved = await api.updateCustomer(updated.id, updated)
      saveCustomer(saved)
    } catch (error) {
      window.alert(error.message)
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">월별 일정</p>
          <h1>{monthTitle(cursor.year, cursor.month)}</h1>
        </div>
        {canEdit && <button type="button" className="btn btn-primary btn-small" onClick={() => onCreate(selected)}>이 날 견적</button>}
      </header>

      <div className="cal-nav">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="이전 달">‹</button>
        <button type="button" className="btn btn-ghost btn-small" onClick={goToday}>오늘</button>
        <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="다음 달">›</button>
      </div>

      <div className="dow">
        {DOW.map((name, index) => <span key={name} className={index === 0 ? 'sun' : index === 6 ? 'sat' : ''}>{name}</span>)}
      </div>
      <div className="cal-grid">
        {weeks.map((week) => week.map((date) => {
          const iso = ymdFrom(date)
          const marks = byDay.get(iso) || []
          const outside = date.getMonth() !== cursor.month
          const jobs = marks.filter((mark) => mark.type === 'job')
          const other = marks.find((mark) => mark.type !== 'job')
          const className = [
            'cell',
            outside ? 'out' : '',
            iso === today ? 'today' : '',
            iso === selected ? 'selected' : '',
            date.getDay() === 0 ? 'sun' : '',
            date.getDay() === 6 ? 'sat' : '',
          ].filter(Boolean).join(' ')
          return (
            <button type="button" key={iso} className={className} onClick={() => setSelected(iso)}>
              <span className="num">{date.getDate()}</span>
              <span className="cell-marks">
                {jobs.slice(0, 2).map((mark) => (
                  <b key={mark.customer.id}>{mark.customer.crewMale}:{mark.customer.crewFemale}</b>
                ))}
                {jobs.length > 2 && <b>+{jobs.length - 2}</b>}
                {jobs.length === 0 && other && <em>{markLabel(other.type)}</em>}
                {jobs.length > 0 && other && <em>외</em>}
              </span>
            </button>
          )
        }))}
      </div>
      <p className="legend">3:1 은 남자 3명, 여자 1명입니다. 그 숫자를 누르면 팀장과 직원 이름을 적습니다. 고객 이름을 누르면 견적입니다.</p>

      <section className="day-panel">
        <div className="section-row">
          <h2>{koreanDate(selected)}</h2>
          <span>{selectedMarks.length}건</span>
        </div>
        {selectedMarks.length === 0 && <p className="empty">이 날은 일정이 없습니다.</p>}
        <div className="stack">
          {selectedMarks.map((mark) => (
            <article key={`${mark.customer.id}-${mark.type}`} className="day-card">
              <button type="button" className="person-main" onClick={() => onOpen(mark.customer.id, 'contract')}>
                <div className="who">
                  <Status value={mark.customer.status} />
                  <strong>{mark.customer.name}</strong>
                </div>
                <p className="meta">{[markLabel(mark.type), mark.customer.timeSlot, mark.customer.fromAddress].filter(Boolean).join(' · ')}</p>
                {mark.type === 'job' && <TeamLine team={mark.customer.team} />}
              </button>
              <div className="person-side">
                {mark.type === 'job'
                  ? <Ratio male={mark.customer.crewMale} female={mark.customer.crewFemale} onClick={() => setTeamFor(mark.customer)} />
                  : markLabel(mark.type) !== mark.customer.status && <span className="wait-pill">{markLabel(mark.type)}</span>}
                {canEdit && mark.customer.status === '견적' && mark.type !== 'service' && (
                  <button type="button" className="text-btn" onClick={() => setCrewFor(mark.customer)}>인원 확정</button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {teamFor && (
        <TeamSheet
          customer={teamFor}
          onClose={() => setTeamFor(null)}
          onOpenEstimate={() => {
            const id = teamFor.id
            setTeamFor(null)
            onOpen(id, 'contract')
          }}
          onSave={async (team) => {
            const saved = await api.saveTeam(teamFor.id, team)
            saveCustomer(saved)
            setTeamFor(null)
          }}
        />
      )}

      {crewFor && (
        <CrewSheet
          customer={crewFor}
          staffName={staffName}
          onClose={() => setCrewFor(null)}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}

function buildWeeks(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const weeks = []
  for (let week = 0; week < 6; week += 1) {
    const days = []
    for (let day = 0; day < 7; day += 1) {
      const date = new Date(start)
      date.setDate(start.getDate() + week * 7 + day)
      days.push(date)
    }
    weeks.push(days)
  }
  return weeks.filter((week, index) => index < 5 || week.some((date) => date.getMonth() === month))
}

function ymdFrom(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
