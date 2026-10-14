import { useEffect, useRef, useState } from 'react'
import { ROOMS } from '../../../shared/catalog.js'
import { HOUSE_TYPES, SLOTS } from '../../../shared/model.js'
import { api } from '../api.js'
import { useApp } from '../context.jsx'
import { Field, IconBack, Seg, Status } from '../components.jsx'
import { CrewSheet } from '../sheets.jsx'
import { RoomsBar, RoomsPane } from './Rooms.jsx'
import { ContractPane } from './Contract.jsx'

const PANES = [
  ['info', '정보'],
  ['rooms', '방별 짐'],
  ['contract', '계약서'],
]

export function Editor({ customer, staffName, initialPane = 'info', onBack }) {
  const { saveCustomer, dropCustomer, canEdit } = useApp()
  const [draft, setDraft] = useState(customer)
  const [pane, setPane] = useState(initialPane)
  const [roomId, setRoomId] = useState('master')
  const [saveState, setSaveState] = useState('saved')
  const [crewOpen, setCrewOpen] = useState(false)
  const last = useRef(JSON.stringify(customer))
  const saveSeq = useRef(0)
  const bodyRef = useRef(null)
  const alive = useRef(true)

  useEffect(() => () => {
    alive.current = false
  }, [])

  useEffect(() => {
    bodyRef.current?.scrollTo(0, 0)
  }, [pane, roomId])

  useEffect(() => {
    if (!canEdit) return undefined
    const serial = JSON.stringify(draft)
    if (serial === last.current) return undefined
    const seq = ++saveSeq.current
    setSaveState('dirty')
    const timer = setTimeout(async () => {
      if (seq !== saveSeq.current || !alive.current) return
      try {
        setSaveState('saving')
        const saved = await api.updateCustomer(draft.id, draft)
        if (seq !== saveSeq.current || !alive.current) return
        last.current = serial
        setSaveState('saved')
        saveCustomer(saved)
      } catch {
        if (alive.current && seq === saveSeq.current) setSaveState('error')
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [draft, saveCustomer, canEdit])

  function patch(partial) {
    if (!canEdit) return
    setDraft((current) => {
      const next = typeof partial === 'function' ? partial(current) : partial
      return { ...current, ...next }
    })
  }

  async function flush(next) {
    const serial = JSON.stringify(next)
    if (serial === last.current) return next
    const seq = ++saveSeq.current
    setSaveState('saving')
    const saved = await api.updateCustomer(next.id, next)
    if (!alive.current || seq !== saveSeq.current) return saved
    last.current = serial
    setSaveState('saved')
    saveCustomer(saved)
    return saved
  }

  async function confirm(next) {
    const updated = { ...draft, ...next }
    setDraft(updated)
    setCrewOpen(false)
    try {
      await flush(updated)
    } catch {
      if (alive.current) setSaveState('error')
    }
  }

  async function handleBack() {
    if (!canEdit) {
      onBack()
      return
    }
    try {
      await flush(draft)
      onBack()
    } catch {
      if (alive.current) setSaveState('error')
    }
  }

  async function remove() {
    if (!window.confirm(`${draft.name || '이 고객'} 정보를 삭제할까요?`)) return
    alive.current = false
    await api.removeCustomer(draft.id)
    dropCustomer(draft.id)
    onBack()
  }

  const saveLabel = canEdit
    ? { dirty: '변경됨', saving: '저장 중', saved: '저장됨', error: '저장 실패' }[saveState]
    : '보기'

  return (
    <div className={canEdit ? 'editor' : 'editor view-lock'}>
      <div className="editor-sticky no-print">
        <header className="editor-head">
          <button type="button" className="icon-btn" onClick={handleBack} aria-label="뒤로">
            <IconBack />
          </button>
          <div className="editor-title">
            <strong>{draft.name || '고객'}</strong>
            <span className={saveState === 'error' ? 'save-state bad' : 'save-state'}>{saveLabel}</span>
          </div>
          <Status value={draft.status} />
        </header>
        <div className="tabs" role="tablist">
          {PANES.map(([id, label]) => (
            <button type="button" key={id} role="tab" aria-selected={pane === id} className={pane === id ? 'tab on' : 'tab'} onClick={() => setPane(id)}>
              {label}
            </button>
          ))}
        </div>
        {pane === 'rooms' && (
          <div className="room-tabs">
            {ROOMS.map((room) => {
              const count = countRoom(draft, room.id)
              return (
                <button type="button" key={room.id} className={roomId === room.id ? 'room-tab on' : 'room-tab'} onClick={() => setRoomId(room.id)}>
                  {room.name}
                  {count > 0 && <b>{count}</b>}
                </button>
              )
            })}
          </div>
        )}
      </div>
      <div className="editor-body" ref={bodyRef}>
        {pane === 'info' && <InfoPane draft={draft} patch={patch} onDelete={remove} />}
        {pane === 'rooms' && <RoomsPane draft={draft} patch={patch} roomId={roomId} />}
        {pane === 'contract' && (
          <ContractPane
            draft={draft}
            patch={patch}
            staffName={staffName}
            onConfirm={() => setCrewOpen(true)}
            onStatus={(status) => confirm({ status })}
          />
        )}
      </div>
      {pane === 'rooms' && <RoomsBar draft={draft} onContract={() => setPane('contract')} />}
      {crewOpen && (
        <CrewSheet
          customer={draft}
          staffName={staffName}
          onClose={() => setCrewOpen(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  )
}

function countRoom(draft, roomId) {
  const inventory = Object.entries(draft.inventory || {}).reduce((sum, [key, qty]) => (
    key.startsWith(`${roomId}:`) ? sum + Number(qty) : sum
  ), 0)
  const custom = (draft.customItems || []).reduce((sum, item) => (
    item.roomId === roomId ? sum + Number(item.qty || 0) : sum
  ), 0)
  return inventory + custom
}

function InfoPane({ draft, patch, onDelete }) {
  const { canEdit } = useApp()
  const field = (key) => (event) => patch({ [key]: event.target.value })
  const ladder = !draft.fromElevator || draft.fromStairs || !draft.toElevator || draft.toStairs
  return (
    <div className="form">
      <section className="card block">
        <h2>고객</h2>
        <Field label="이름">
          <input value={draft.name} onChange={field('name')} />
        </Field>
        <Field label="전화">
          <input value={draft.phone} onChange={field('phone')} inputMode="tel" />
        </Field>
        {draft.phone && <a className="text-btn" href={`tel:${draft.phone}`}>전화 걸기</a>}
        <Field label="담당자">
          <input value={draft.manager} onChange={field('manager')} />
        </Field>
      </section>

      <section className="card block">
        <h2>날짜</h2>
        <div className="grid-2">
          <Field label="견적일">
            <input type="date" value={draft.estimateDate || ''} onChange={field('estimateDate')} />
          </Field>
          <Field label="방문일">
            <input type="date" value={draft.visitDate || ''} onChange={field('visitDate')} />
          </Field>
          <Field label="서비스일">
            <input type="date" value={draft.serviceDate || ''} onChange={field('serviceDate')} />
          </Field>
          <Field label="운송일">
            <input type="date" value={draft.moveDate || ''} onChange={field('moveDate')} />
          </Field>
        </div>
        <Field label="시간대">
          <Seg
            label="시간대"
            value={draft.timeSlot}
            onChange={(value) => patch({ timeSlot: value })}
            options={SLOTS.map((slot) => ({ value: slot, label: slot }))}
          />
        </Field>
      </section>

      <PlaceCard title="출발" prefix="from" draft={draft} patch={patch} />
      <PlaceCard title="도착" prefix="to" draft={draft} patch={patch} />
      {ladder && <p className="hint">엘리베이터가 없거나 계단이 있습니다. 사다리차와 인원을 계약서에서 잡아 주세요.</p>}

      <section className="card block">
        <h2>집</h2>
        <div className="grid-2">
          <Field label="종류">
            <select value={draft.houseType} onChange={field('houseType')}>
              {HOUSE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
          <Field label="평수">
            <input value={draft.pyeong} onChange={field('pyeong')} inputMode="decimal" placeholder="32" />
          </Field>
        </div>
      </section>

      {canEdit && <button type="button" className="btn btn-danger btn-block" onClick={onDelete}>이 고객 삭제</button>}
    </div>
  )
}

function PlaceCard({ title, prefix, draft, patch }) {
  const address = `${prefix}Address`
  const floor = `${prefix}Floor`
  const elevator = `${prefix}Elevator`
  const stairs = `${prefix}Stairs`
  return (
    <section className="card block">
      <h2>{title}</h2>
      <Field label="주소">
        <textarea rows={2} value={draft[address]} onChange={(event) => patch({ [address]: event.target.value })} />
      </Field>
      <div className="grid-2">
        <Field label="층">
          <input value={draft[floor]} onChange={(event) => patch({ [floor]: event.target.value })} placeholder="15, 반지하" />
        </Field>
        <Field label="엘리베이터">
          <Seg
            label={`${title} 엘리베이터`}
            value={draft[elevator]}
            onChange={(value) => patch({ [elevator]: value })}
            options={[{ value: true, label: '있음' }, { value: false, label: '없음' }]}
          />
        </Field>
      </div>
      <label className="checkline">
        <input type="checkbox" checked={Boolean(draft[stairs])} onChange={(event) => patch({ [stairs]: event.target.checked })} />
        계단 작업
      </label>
    </section>
  )
}
