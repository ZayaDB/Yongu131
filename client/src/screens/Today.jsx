import { useMemo } from 'react'
import { calcLoad } from '../../../shared/catalog.js'
import { todayYmd } from '../../../shared/model.js'
import { useApp } from '../context.jsx'
import { calendarMarks, koreanDate, markLabel, parseYmd, SLOT_ORDER } from '../format.js'
import { Ratio, Status, TeamLine } from '../components.jsx'

export function TodayScreen({ onOpen, onCreate, onCalendar }) {
  const { customers, canEdit, codes } = useApp()
  const today = todayYmd()
  const loads = useMemo(() => {
    const map = new Map()
    for (const customer of customers) map.set(customer.id, calcLoad(customer.inventory, customer.customItems))
    return map
  }, [customers])

  const marks = customers.flatMap((customer) => calendarMarks(customer))
  const todays = marks
    .filter((mark) => mark.date === today)
    .sort((a, b) => (SLOT_ORDER[a.customer.timeSlot] ?? 9) - (SLOT_ORDER[b.customer.timeSlot] ?? 9))
  const upcoming = marks
    .filter((mark) => mark.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.customer.name.localeCompare(b.customer.name, 'ko'))
    .slice(0, 3)
  const hasSeed = customers.some((customer) => String(customer.id).startsWith('seed-'))
  const week = buildWeek(today)

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">JH통운 · {canEdit ? '견적 사원' : '보기'}</p>
          <h1>{koreanDate(today)}</h1>
        </div>
        {canEdit && <button type="button" className="btn btn-primary btn-small" onClick={() => onCreate(today)}>견적 추가</button>}
      </header>

      <div className="week" aria-label="이번 주">
        {week.map((iso) => {
          const dayMarks = marks.filter((mark) => mark.date === iso)
          const job = dayMarks.find((mark) => mark.type === 'job')
          const other = dayMarks.find((mark) => mark.type !== 'job')
          const date = parseYmd(iso)
          return (
            <button type="button" key={iso} className={`week-day${iso === today ? ' on' : ''}${date.getDay() === 0 ? ' sun' : ''}${date.getDay() === 6 ? ' sat' : ''}`} onClick={() => onCalendar(iso)}>
              <span>{'일월화수목금토'[date.getDay()]}</span>
              <b>{date.getDate()}</b>
              {job ? <em>{job.customer.crewMale}:{job.customer.crewFemale}</em> : other ? <em className="soft">{markLabel(other.type)}</em> : <em className="soft"> </em>}
              {dayMarks.filter((mark) => mark.type === 'job').length > 1 && <i>+{dayMarks.filter((mark) => mark.type === 'job').length - 1}</i>}
            </button>
          )
        })}
      </div>

      <section>
        <div className="section-row">
          <h2>오늘 할 일</h2>
          <span>{todays.length}건</span>
        </div>
        {todays.length === 0 && <p className="empty">오늘 잡힌 일이 없습니다.</p>}
        <div className="stack">
          {todays.map((mark) => (
            <JobCard key={`${mark.customer.id}-${mark.type}`} mark={mark} load={loads.get(mark.customer.id)} onOpen={onOpen} />
          ))}
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="section-row">
            <h2>다음 일정</h2>
            <button type="button" className="text-btn" onClick={() => onCalendar(today)}>달력</button>
          </div>
          <div className="stack">
            {upcoming.map((mark) => (
              <JobCard key={`${mark.customer.id}-${mark.date}-${mark.type}`} mark={mark} load={loads.get(mark.customer.id)} onOpen={onOpen} showDate />
            ))}
          </div>
        </section>
      )}

      {canEdit && codes && (
        <section className="card invite-card">
          <h2>직원에게 알려 줄 코드</h2>
          <p><span>견적 사원</span><b>{codes.estimator}</b></p>
          <p><span>보기 직원</span><b>{codes.viewer}</b></p>
        </section>
      )}
      {!canEdit && <p className="footnote">보기 전용입니다. 견적 등록, 수정, 계약, 확정은 견적 사원이 합니다.</p>}
      {hasSeed && <p className="footnote">들어 있는 일정 일부는 연습 데이터입니다. 고객 화면에서 지우고 실제 견적부터 등록하면 됩니다.</p>}
    </div>
  )
}

function JobCard({ mark, load, onOpen, showDate = false }) {
  const customer = mark.customer
  const ton = load?.truck?.ton ? load.truck.name : '톤 미정'
  return (
    <button type="button" className="job" onClick={() => onOpen(customer.id, mark.type === 'quote' ? 'rooms' : 'info')}>
      <div className="job-main">
        <div className="who">
          <Status value={customer.status} />
          <strong>{customer.name}</strong>
        </div>
        <p className="addr">{route(customer)}</p>
        <p className="meta">
          {[showDate ? mark.date.slice(5).replace('-', '/') : '', markLabel(mark.type), customer.timeSlot, customer.pyeong ? `${customer.pyeong}평` : '', ton].filter(Boolean).join(' · ')}
        </p>
        {mark.type === 'job' && <TeamLine team={customer.team} />}
      </div>
      {mark.type === 'job'
        ? <Ratio male={customer.crewMale} female={customer.crewFemale} />
        : markLabel(mark.type) !== customer.status && <span className="wait-pill">{markLabel(mark.type)}</span>}
    </button>
  )
}

function route(customer) {
  const from = short(customer.fromAddress) || '출발지 미정'
  const to = short(customer.toAddress) || '도착지 미정'
  return `${from} → ${to}`
}

function short(address) {
  if (!address) return ''
  return address.replace(/서울특별시|서울 |경기도 |경기 |인천광역시 |인천 /g, '').trim()
}

function buildWeek(iso) {
  const date = parseYmd(iso)
  const start = new Date(date)
  start.setDate(date.getDate() - date.getDay())
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start)
    day.setDate(start.getDate() + index)
    const month = String(day.getMonth() + 1).padStart(2, '0')
    const num = String(day.getDate()).padStart(2, '0')
    return `${day.getFullYear()}-${month}-${num}`
  })
}
