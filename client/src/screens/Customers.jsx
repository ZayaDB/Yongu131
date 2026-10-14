import { useMemo, useState } from 'react'
import { calcLoad } from '../../../shared/catalog.js'
import { useApp } from '../context.jsx'
import { sortCustomers } from '../format.js'
import { Ratio, Status } from '../components.jsx'

const FILTERS = ['전체', '견적', '확정', '완료', '취소']

export function CustomersScreen({ onOpen, onCreate }) {
  const { customers, canEdit } = useApp()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('전체')
  const loads = useMemo(() => {
    const map = new Map()
    for (const customer of customers) map.set(customer.id, calcLoad(customer.inventory, customer.customItems))
    return map
  }, [customers])

  const shown = sortCustomers(customers).filter((customer) => {
    if (filter !== '전체' && customer.status !== filter) return false
    const hay = `${customer.name} ${customer.phone} ${customer.fromAddress} ${customer.toAddress}`.toLowerCase()
    return hay.includes(query.trim().toLowerCase())
  })

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">고객 · 집</p>
          <h1>고객</h1>
        </div>
        {canEdit && <button type="button" className="btn btn-primary btn-small" onClick={() => onCreate()}>새 고객</button>}
      </header>
      <input
        className="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="이름, 전화, 주소"
        aria-label="고객 검색"
      />
      <div className="filters">
        {FILTERS.map((item) => (
          <button type="button" key={item} className={filter === item ? 'chip on' : 'chip'} onClick={() => setFilter(item)}>
            {item}
          </button>
        ))}
      </div>
      {shown.length === 0 && <p className="empty">해당하는 고객이 없습니다.</p>}
      <div className="stack">
        {shown.map((customer) => {
          const load = loads.get(customer.id)
          const ton = load?.truck?.ton ? load.truck.name : '톤 미정'
          return (
            <article key={customer.id} className="person">
              <button type="button" className="person-main" onClick={() => onOpen(customer.id, 'info')}>
                <div className="who">
                  <Status value={customer.status} />
                  <strong>{customer.name}</strong>
                </div>
                <p className="addr">{customer.fromAddress || '출발지 없음'} → {customer.toAddress || '도착지 없음'}</p>
                <p className="meta">
                  {[customer.moveDate ? customer.moveDate.slice(5).replace('-', '/') : '날짜 없음', customer.timeSlot, customer.houseType, customer.pyeong ? `${customer.pyeong}평` : '', ton].filter(Boolean).join(' · ')}
                </p>
              </button>
              {(customer.status === '확정' || customer.status === '완료' || customer.phone) && (
                <div className="person-side">
                  {(customer.status === '확정' || customer.status === '완료') && (
                    <Ratio male={customer.crewMale} female={customer.crewFemale} />
                  )}
                  {customer.phone && (
                    <a className="text-btn" href={`tel:${customer.phone}`} onClick={(event) => event.stopPropagation()}>전화</a>
                  )}
                </div>
              )}
            </article>
          )
        })}
      </div>
    </div>
  )
}
