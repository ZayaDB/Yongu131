import { useState } from 'react'
import { blankCustomer, HOUSE_TYPES, SLOTS, todayYmd } from '../../shared/model.js'
import { calcLoad, suggestCrew } from '../../shared/catalog.js'
import { api } from './api.js'
import { useApp } from './context.jsx'
import { Field, Ratio, Seg, Stepper } from './components.jsx'

export function JoinGate({ onEnter }) {
  const [name, setName] = useState(() => localStorage.getItem('jh-office-staff') || '')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function submit(event) {
    event.preventDefault()
    const nextName = name.trim()
    if (!nextName || !code.trim()) {
      setError('이름과 초대 코드를 입력해 주세요.')
      return
    }
    setPending(true)
    setError('')
    try {
      const result = await api.join({ name: nextName, code: code.trim() })
      onEnter({ name: result.name, code: code.trim(), role: result.role })
    } catch (err) {
      setError(err.message)
      setPending(false)
    }
  }

  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <p className="kicker">JH통운 사무실</p>
        <h2>초대 코드로 들어가기</h2>
        <p className="lead">견적 사원 코드로 들어가면 견적을 등록하고 확정할 수 있습니다. 다른 직원 코드는 일정과 계약서를 보기만 합니다.</p>
        <Field label="직원 이름">
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={20} autoFocus placeholder="이름" />
        </Field>
        <Field label="초대 코드">
          <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="off" placeholder="코드 4자리" />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={pending}>{pending ? '확인 중' : '들어가기'}</button>
      </form>
    </div>
  )
}

export function RenameSheet({ name, onClose, onSave }) {
  const [value, setValue] = useState(name)
  return (
    <div className="backdrop" onClick={onClose}>
      <form
        className="sheet"
        onClick={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault()
          const next = value.trim()
          if (!next) return
          onSave(next.slice(0, 20))
        }}
      >
        <h2>이름 바꾸기</h2>
        <Field label="직원 이름">
          <input value={value} onChange={(event) => setValue(event.target.value)} maxLength={20} autoFocus />
        </Field>
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>닫기</button>
          <button type="submit" className="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  )
}

export function NewCustomerSheet({ presetDate, staffName, onClose, onCreated }) {
  const { saveCustomer } = useApp()
  const [form, setForm] = useState({
    name: '',
    phone: '',
    fromAddress: '',
    toAddress: '',
    moveDate: presetDate || todayYmd(),
    timeSlot: '오전',
    houseType: '아파트',
  })
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  function set(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function submit(event) {
    event.preventDefault()
    if (!form.name.trim()) {
      setError('고객 이름을 입력해 주세요.')
      return
    }
    setPending(true)
    setError('')
    try {
      const created = await api.createCustomer(blankCustomer({
        ...form,
        name: form.name.trim(),
        manager: staffName,
        status: '견적',
      }))
      saveCustomer(created)
      onCreated(created)
    } catch (err) {
      setError(err.message)
      setPending(false)
    }
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <form className="sheet" onClick={(event) => event.stopPropagation()} onSubmit={submit}>
        <p className="kicker">새 견적</p>
        <h2>고객 등록</h2>
        <Field label="고객 이름">
          <input value={form.name} onChange={(event) => set('name', event.target.value)} autoFocus placeholder="이름" />
        </Field>
        <Field label="전화">
          <input value={form.phone} onChange={(event) => set('phone', event.target.value)} inputMode="tel" placeholder="010-" />
        </Field>
        <Field label="출발지">
          <input value={form.fromAddress} onChange={(event) => set('fromAddress', event.target.value)} placeholder="주소" />
        </Field>
        <Field label="도착지">
          <input value={form.toAddress} onChange={(event) => set('toAddress', event.target.value)} placeholder="주소" />
        </Field>
        <div className="grid-2">
          <Field label="운송일">
            <input type="date" value={form.moveDate} onChange={(event) => set('moveDate', event.target.value)} />
          </Field>
          <Field label="집 종류">
            <select value={form.houseType} onChange={(event) => set('houseType', event.target.value)}>
              {HOUSE_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </Field>
        </div>
        <Field label="시간대">
          <Seg
            label="시간대"
            value={form.timeSlot}
            onChange={(value) => set('timeSlot', value)}
            options={SLOTS.map((slot) => ({ value: slot, label: slot }))}
          />
        </Field>
        {error && <p className="form-error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>닫기</button>
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? '등록 중' : '등록하고 짐 입력'}</button>
        </div>
      </form>
    </div>
  )
}

export function CrewSheet({ customer, staffName, onClose, onConfirm }) {
  const load = calcLoad(customer.inventory, customer.customItems)
  const suggested = suggestCrew(load.truck)
  const [male, setMale] = useState(customer.crewMale || suggested.male || 0)
  const [female, setFemale] = useState(customer.crewFemale || 0)
  const [date, setDate] = useState(customer.moveDate || todayYmd())
  const [slot, setSlot] = useState(customer.timeSlot || '오전')
  const [error, setError] = useState('')

  function confirm() {
    if (!date) {
      setError('운송일을 선택해 주세요.')
      return
    }
    if (male + female < 1) {
      setError('남자 또는 여자 인원을 한 명 이상 넣어 주세요.')
      return
    }
    onConfirm({
      status: '확정',
      crewMale: male,
      crewFemale: female,
      moveDate: date,
      timeSlot: slot,
      manager: customer.manager || staffName,
    })
  }

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="sheet" onClick={(event) => event.stopPropagation()}>
        <p className="kicker">{customer.name}</p>
        <h2>{customer.status === '확정' ? '인원 수정' : '견적 확정'}</h2>
        <div className="crew-preview">
          <Ratio male={male} female={female} />
          <p>달력에는 <b>{male}:{female}</b> 로 보입니다. 남자 {male}명, 여자 {female}명입니다.</p>
        </div>
        {load.truck.ton > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-block"
            onClick={() => {
              setMale(suggested.male)
              setFemale(suggested.female)
            }}
          >
            이 짐량이면 보통 {suggested.male}:{suggested.female}
          </button>
        )}
        <div className="crew-grid">
          <div>
            <span>남자</span>
            <Stepper label="남자" value={male} max={12} onChange={setMale} />
          </div>
          <div>
            <span>여자</span>
            <Stepper label="여자" value={female} max={12} onChange={setFemale} />
          </div>
        </div>
        <div className="grid-2">
          <Field label="운송일">
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
          <Field label="시간대">
            <select value={slot} onChange={(event) => setSlot(event.target.value)}>
              {SLOTS.map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="sheet-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>닫기</button>
          <button type="button" className="btn btn-primary" onClick={confirm}>달력에 올리기</button>
        </div>
      </div>
    </div>
  )
}
