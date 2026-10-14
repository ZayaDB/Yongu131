export const COMPANY = {
  brand: '영구크린',
  legalName: '제이에이치(JH)통운',
  bizNo: '619-20-64164',
  owner: '박지환',
  phone: '010-8578-3676',
  bank: '우리은행',
  account: '1002-838837-079',
  holder: '박지환',
}

export const STATUSES = ['견적', '확정', '완료', '취소']
export const SLOTS = ['오전', '오후', '종일', '협의']
export const HOUSE_TYPES = ['아파트', '빌라·연립', '주택', '오피스텔', '상가']
export const PAY_METHODS = ['계좌이체', '현금', '카드']

export const PROMISES = [
  ['time', '약속한 도착 시간을 지킵니다'],
  ['pack', '의류·이불은 비닐로 포장합니다'],
  ['fridge', '냉장고 내부를 청소합니다'],
  ['shoes', '도착지에서는 일회용 덧신을 신습니다'],
  ['floor', '마무리 후 바닥을 청소합니다'],
  ['assemble', '필요한 가구는 분해하고 조립합니다'],
  ['cover', '바닥을 보양하고 작업합니다'],
  ['glass', '유리·그릇류는 안전하게 포장합니다'],
  ['noextra', '견적 실수로 추가 비용을 받지 않습니다'],
]

export function defaultExtras() {
  return [
    { id: 'ladder', name: '사다리차', amount: 0 },
    { id: 'aircon', name: '에어컨 분해·설치', amount: 0 },
    { id: 'walltv', name: '벽걸이 TV', amount: 0 },
    { id: 'piano', name: '피아노 운반', amount: 0 },
    { id: 'packing', name: '포장 서비스', amount: 0 },
    { id: 'storage', name: '창고 보관', amount: 0 },
    { id: 'other', name: '기타', amount: 0 },
  ]
}

export function todayYmd(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function blankCustomer(partial = {}) {
  const now = new Date().toISOString()
  const base = {
    id: partial.id || crypto.randomUUID(),
    name: '',
    phone: '',
    manager: '',
    status: '견적',
    estimateDate: todayYmd(),
    visitDate: '',
    serviceDate: '',
    moveDate: '',
    timeSlot: '오전',
    fromAddress: '',
    fromFloor: '',
    fromElevator: true,
    fromStairs: false,
    toAddress: '',
    toFloor: '',
    toElevator: true,
    toStairs: false,
    houseType: '아파트',
    pyeong: '',
    crewMale: 0,
    crewFemale: 0,
    inventory: {},
    customItems: [],
    quotedTon: null,
    quotedCbm: null,
    tonManual: false,
    cbmManual: false,
    pricing: {
      moveFee: 0,
      deposit: 0,
      vat: true,
      payMethod: '계좌이체',
      extras: defaultExtras(),
    },
    promises: Object.fromEntries(PROMISES.map(([id]) => [id, true])),
    memo: '',
    createdAt: now,
    updatedAt: now,
  }
  return {
    ...base,
    ...partial,
    pricing: {
      ...base.pricing,
      ...(partial.pricing || {}),
      extras: partial.pricing?.extras || base.pricing.extras,
    },
    promises: { ...base.promises, ...(partial.promises || {}) },
    inventory: { ...(partial.inventory || {}) },
    customItems: partial.customItems || [],
  }
}

export function quoteTotals(pricing = {}) {
  const extras = Array.isArray(pricing.extras) ? pricing.extras : []
  const extraSum = extras.reduce((sum, extra) => sum + (Number(extra.amount) || 0), 0)
  const moveFee = Number(pricing.moveFee) || 0
  const base = moveFee + extraSum
  const vatOn = pricing.vat !== false
  const vatAmt = vatOn ? Math.round(base * 0.1) : 0
  const total = base + vatAmt
  const deposit = Number(pricing.deposit) || 0
  const balance = total - deposit
  return { extraSum, moveFee, base, vatAmt, total, deposit, balance }
}

function clamp(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.round(n)))
}

function cleanInventory(inventory) {
  const out = {}
  if (!inventory || typeof inventory !== 'object') return out
  for (const [key, value] of Object.entries(inventory)) {
    if (!/^[\w:-]+$/.test(key)) continue
    const qty = clamp(value, 0, 99)
    if (qty > 0) out[key] = qty
  }
  return out
}

function cleanCustomItems(items) {
  if (!Array.isArray(items)) return []
  return items.slice(0, 40).map((item) => ({
    id: String(item.id || crypto.randomUUID()),
    roomId: String(item.roomId || 'other').slice(0, 20),
    name: String(item.name || '').trim().slice(0, 40),
    qty: clamp(item.qty, 1, 99),
    kg: clamp(item.kg, 0, 2000),
    cbm: Math.min(20, Math.max(0, Math.round((Number(item.cbm) || 0) * 100) / 100)),
  })).filter((item) => item.name)
}

export function sanitizeCustomer(input = {}, prev) {
  const customer = blankCustomer({ ...prev, ...input })
  customer.id = prev?.id || input.id || crypto.randomUUID()
  customer.createdAt = prev?.createdAt || new Date().toISOString()
  customer.updatedAt = new Date().toISOString()
  customer.name = String(customer.name || '').trim().slice(0, 40)
  customer.phone = String(customer.phone || '').trim().slice(0, 24)
  customer.manager = String(customer.manager || '').trim().slice(0, 20)
  customer.memo = String(customer.memo || '').slice(0, 2000)
  customer.fromAddress = String(customer.fromAddress || '').trim().slice(0, 120)
  customer.toAddress = String(customer.toAddress || '').trim().slice(0, 120)
  customer.fromFloor = String(customer.fromFloor || '').trim().slice(0, 12)
  customer.toFloor = String(customer.toFloor || '').trim().slice(0, 12)
  customer.pyeong = String(customer.pyeong || '').trim().slice(0, 6)
  customer.crewMale = clamp(customer.crewMale, 0, 20)
  customer.crewFemale = clamp(customer.crewFemale, 0, 20)
  if (!STATUSES.includes(customer.status)) customer.status = '견적'
  if (!SLOTS.includes(customer.timeSlot)) customer.timeSlot = '오전'
  if (!HOUSE_TYPES.includes(customer.houseType)) customer.houseType = '아파트'
  if (!PAY_METHODS.includes(customer.pricing.payMethod)) customer.pricing.payMethod = '계좌이체'
  customer.pricing.moveFee = clamp(customer.pricing.moveFee, 0, 100000000)
  customer.pricing.deposit = clamp(customer.pricing.deposit, 0, 100000000)
  customer.pricing.vat = customer.pricing.vat !== false
  customer.pricing.extras = defaultExtras().map((extra) => {
    const found = (customer.pricing.extras || []).find((item) => item.id === extra.id)
    return { ...extra, amount: clamp(found?.amount || 0, 0, 100000000) }
  })
  customer.inventory = cleanInventory(customer.inventory)
  customer.customItems = cleanCustomItems(input.customItems || prev?.customItems || [])
  const promises = {}
  for (const [id] of PROMISES) promises[id] = customer.promises?.[id] !== false
  customer.promises = promises
  for (const key of ['estimateDate', 'visitDate', 'serviceDate', 'moveDate']) {
    const value = String(customer[key] || '')
    customer[key] = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''
  }
  if (!customer.estimateDate) customer.estimateDate = todayYmd()
  if (customer.tonManual) {
    const ton = Number(customer.quotedTon)
    customer.quotedTon = Number.isFinite(ton) ? Math.min(40, Math.max(0, Math.round(ton * 10) / 10)) : null
  } else {
    customer.quotedTon = null
  }
  if (customer.cbmManual) {
    const cbm = Number(customer.quotedCbm)
    customer.quotedCbm = Number.isFinite(cbm) ? Math.min(200, Math.max(0, Math.round(cbm * 10) / 10)) : null
  } else {
    customer.quotedCbm = null
  }
  customer.tonManual = Boolean(customer.tonManual)
  customer.cbmManual = Boolean(customer.cbmManual)
  customer.fromElevator = customer.fromElevator !== false
  customer.toElevator = customer.toElevator !== false
  customer.fromStairs = Boolean(customer.fromStairs)
  customer.toStairs = Boolean(customer.toStairs)
  return customer
}
