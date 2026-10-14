import { todayYmd } from '../../shared/model.js'

export function parseYmd(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function koreanDate(iso) {
  if (!iso) return '날짜 없음'
  const date = parseYmd(iso)
  const week = '일월화수목금토'[date.getDay()]
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${week}요일`
}

export function monthTitle(year, month) {
  return `${year}년 ${month + 1}월`
}

export function won(value) {
  return `${Math.round(Number(value) || 0).toLocaleString('ko-KR')}원`
}

export function clock(iso) {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
}

export function dayKey(iso) {
  return todayYmd(new Date(iso))
}

export function dayLabel(iso) {
  const key = dayKey(iso)
  if (key === todayYmd()) return '오늘'
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  if (key === todayYmd(yesterday)) return '어제'
  return koreanDate(key)
}

const TYPE_RANK = { service: 1, visit: 2, quote: 3, job: 4 }

export function calendarMarks(customer) {
  if (!customer || customer.status === '취소') return []
  const byDate = new Map()
  const put = (date, type) => {
    if (!date) return
    const rank = TYPE_RANK[type]
    const prev = byDate.get(date)
    if (!prev || rank > prev.rank) byDate.set(date, { date, type, rank, customer })
  }
  put(customer.serviceDate, 'service')
  if (customer.status === '견적') {
    put(customer.visitDate, 'visit')
    put(customer.moveDate, 'quote')
  } else {
    put(customer.visitDate, 'visit')
    put(customer.moveDate, 'job')
  }
  return [...byDate.values()]
}

export function markLabel(type) {
  if (type === 'visit') return '방문'
  if (type === 'service') return '서비스'
  if (type === 'quote') return '견적'
  return '운송'
}

export function sortCustomers(list) {
  const today = todayYmd()
  return list.slice().sort((a, b) => {
    const da = a.moveDate || a.visitDate || ''
    const db = b.moveDate || b.visitDate || ''
    const pastA = !da || da < today
    const pastB = !db || db < today
    if (pastA !== pastB) return pastA ? 1 : -1
    return (da || '9999-99-99').localeCompare(db || '9999-99-99')
      || (SLOT_ORDER[a.timeSlot] ?? 9) - (SLOT_ORDER[b.timeSlot] ?? 9)
      || a.name.localeCompare(b.name, 'ko')
  })
}

export const SLOT_ORDER = { 오전: 0, 종일: 1, 오후: 2, 협의: 3 }
