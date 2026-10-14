import { useState } from 'react'
import { ROOMS, calcLoad, displayCbm, displayTon } from '../../../shared/catalog.js'
import { Stepper } from '../components.jsx'

export function RoomsPane({ draft, patch, roomId }) {
  const room = ROOMS.find((item) => item.id === roomId) || ROOMS[0]
  const load = calcLoad(draft.inventory, draft.customItems)
  const lines = load.lines.filter((line) => line.roomId === room.id)
  const kg = Math.round(lines.reduce((sum, line) => sum + line.kg, 0))
  const cbm = Math.round(lines.reduce((sum, line) => sum + line.cbm, 0) * 10) / 10
  const customs = (draft.customItems || []).filter((item) => item.roomId === room.id)

  function setQty(itemId, qty) {
    const key = `${room.id}:${itemId}`
    patch((current) => {
      const inventory = { ...current.inventory }
      if (qty <= 0) delete inventory[key]
      else inventory[key] = qty
      return { inventory }
    })
  }

  function addCustom(entry) {
    patch((current) => ({
      customItems: [...(current.customItems || []), entry],
    }))
  }

  function removeCustom(id) {
    patch((current) => ({
      customItems: (current.customItems || []).filter((item) => item.id !== id),
    }))
  }

  return (
    <div className="rooms">
      <p className="room-sum">
        {room.name} · {kg.toLocaleString('ko-KR')}kg · {cbm}㎥
      </p>
      <div className="item-list">
        {room.items.map((item) => {
          const qty = Number(draft.inventory?.[`${room.id}:${item.id}`] || 0)
          return (
            <div key={item.id} className={qty > 0 ? 'item on' : 'item'}>
              <div className="item-text">
                <strong>{item.name}</strong>
                <small>개당 약 {item.kg}kg · {item.cbm}㎥</small>
              </div>
              <Stepper label={item.name} value={qty} onChange={(next) => setQty(item.id, next)} />
            </div>
          )
        })}
        {customs.map((item) => (
          <div key={item.id} className="item on">
            <div className="item-text">
              <strong>{item.name}</strong>
              <small>직접 추가 · 개당 {item.kg || 0}kg</small>
            </div>
            <div className="custom-side">
              <b>{item.qty}</b>
              <button type="button" className="text-btn" onClick={() => removeCustom(item.id)}>삭제</button>
            </div>
          </div>
        ))}
      </div>
      <CustomAdder roomId={room.id} onAdd={addCustom} />
      <p className="footnote">무게와 부피는 품목 기준 예상치입니다. 계약서의 톤수는 직접 고칠 수 있습니다.</p>
    </div>
  )
}

function CustomAdder({ roomId, onAdd }) {
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [kg, setKg] = useState('')

  function add(event) {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const eachKg = Number(kg) || 0
    onAdd({
      id: crypto.randomUUID(),
      roomId,
      name: trimmed,
      qty: Math.max(1, Number(qty) || 1),
      kg: eachKg,
      cbm: eachKg > 0 ? Math.round((eachKg / 150) * 100) / 100 : 0.15,
    })
    setName('')
    setQty(1)
    setKg('')
  }

  return (
    <form className="custom-add" onSubmit={add}>
      <h2>이 방에 없는 짐</h2>
      <div className="custom-grid">
        <label>
          <span>품목</span>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="이름" aria-label="품목 이름" />
        </label>
        <label>
          <span>개수</span>
          <input value={qty} onChange={(event) => setQty(event.target.value)} inputMode="numeric" aria-label="개수" />
        </label>
        <label>
          <span>kg</span>
          <input value={kg} onChange={(event) => setKg(event.target.value)} inputMode="decimal" placeholder="0" aria-label="개당 무게" />
        </label>
      </div>
      <button type="submit" className="btn btn-ghost btn-block">직접 추가</button>
    </form>
  )
}

export function RoomsBar({ draft, onContract }) {
  const load = calcLoad(draft.inventory, draft.customItems)
  const ton = displayTon(draft, load)
  const cbm = displayCbm(draft, load)
  return (
    <div className="tonbar no-print">
      <div>
        <span>추천 용차</span>
        <strong>{ton.name}</strong>
        <em>
          {load.kg > 0
            ? `무게 ${load.weightTon}톤 · ${cbm}㎥ · ${load.count}개`
            : '짐을 체크하면 톤수가 나옵니다'}
        </em>
      </div>
      <button type="button" className="btn btn-primary btn-small" onClick={onContract}>계약서</button>
    </div>
  )
}
