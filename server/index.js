import express from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb, readDb, updateDb } from './store.js'
import { sanitizeCustomer } from '../shared/model.js'
import { roleFromCode } from '../shared/access.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')
const app = express()
app.use(express.json({ limit: '1mb' }))
app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

initDb()

const presence = new Map()
const PRESENCE_MS = 90_000

function listPresence() {
  const cutoff = Date.now() - PRESENCE_MS
  const byName = new Map()
  for (const [id, person] of presence) {
    if (person.seen < cutoff) {
      presence.delete(id)
      continue
    }
    const prev = byName.get(person.name)
    if (!prev || person.seen > prev.seen) byName.set(person.name, person)
  }
  return [...byName.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map(({ name, role }) => ({ name, role }))
}

function requireStaff(req, res, next) {
  const db = readDb()
  const role = roleFromCode(db.codes, req.get('x-office-code'))
  if (!role) return res.status(401).json({ error: '초대 코드를 다시 확인해 주세요.' })
  req.officeRole = role
  next()
}

function requireEstimator(req, res, next) {
  if (req.officeRole !== 'estimator') {
    return res.status(403).json({ error: '견적 사원만 견적서를 저장할 수 있습니다.' })
  }
  next()
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/join', (req, res) => {
  const db = readDb()
  const role = roleFromCode(db.codes, req.body?.code)
  const name = String(req.body?.name || '').trim().slice(0, 20)
  if (!role) return res.status(401).json({ error: '초대 코드가 맞지 않습니다.' })
  if (!name) return res.status(400).json({ error: '이름을 입력해 주세요.' })
  res.json({
    role,
    name,
    codes: role === 'estimator' ? db.codes : null,
  })
})

app.get('/api/bootstrap', requireStaff, (req, res) => {
  const db = readDb()
  res.json({
    customers: db.customers,
    codes: req.officeRole === 'estimator' ? db.codes : null,
  })
})

app.post('/api/customers', requireStaff, requireEstimator, async (req, res) => {
  const customer = sanitizeCustomer(req.body || {})
  if (!customer.name) return res.status(400).json({ error: '이름을 입력해 주세요.' })
  await updateDb((db) => {
    db.customers.push(customer)
  })
  res.status(201).json(customer)
})

app.put('/api/customers/:id', requireStaff, requireEstimator, async (req, res) => {
  let saved = null
  let missing = false
  await updateDb((db) => {
    const index = db.customers.findIndex((item) => item.id === req.params.id)
    if (index < 0) {
      missing = true
      return
    }
    saved = sanitizeCustomer(req.body || {}, db.customers[index])
    saved.id = db.customers[index].id
    if (!saved.name) {
      missing = 'name'
      saved = null
      return
    }
    db.customers[index] = saved
  })
  if (missing === 'name') return res.status(400).json({ error: '이름을 입력해 주세요.' })
  if (missing || !saved) return res.status(404).json({ error: '고객을 찾을 수 없습니다.' })
  res.json(saved)
})

app.delete('/api/customers/:id', requireStaff, requireEstimator, async (req, res) => {
  let removed = false
  await updateDb((db) => {
    const before = db.customers.length
    db.customers = db.customers.filter((item) => item.id !== req.params.id)
    removed = db.customers.length !== before
  })
  if (!removed) return res.status(404).json({ error: '고객을 찾을 수 없습니다.' })
  res.json({ ok: true })
})

app.post('/api/presence', requireStaff, (req, res) => {
  const name = String(req.body?.name || '').trim().slice(0, 20)
  const clientId = String(req.body?.clientId || '').trim().slice(0, 80)
  if (!name || !clientId) return res.status(400).json({ error: '이름을 확인해 주세요.' })
  presence.set(clientId, { name, role: req.officeRole, seen: Date.now() })
  res.json({ staff: listPresence() })
})

app.delete('/api/presence', requireStaff, (req, res) => {
  const clientId = String(req.body?.clientId || '').trim()
  if (clientId) presence.delete(clientId)
  res.json({ staff: listPresence() })
})

app.get('/api/messages', requireStaff, (_req, res) => {
  const messages = readDb().messages.slice(-300)
  res.json({ messages, staff: listPresence() })
})

app.post('/api/messages', requireStaff, async (req, res) => {
  const staffName = String(req.body?.staffName || '').trim().slice(0, 20)
  const text = String(req.body?.text || '').trim().slice(0, 1000)
  if (!staffName || !text) return res.status(400).json({ error: '이름과 내용을 입력해 주세요.' })
  const message = {
    id: crypto.randomUUID(),
    staffName,
    text,
    createdAt: new Date().toISOString(),
  }
  await updateDb((db) => {
    db.messages.push(message)
    if (db.messages.length > 500) db.messages = db.messages.slice(-500)
  })
  res.status(201).json(message)
})

if (process.env.NODE_ENV === 'production' && fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

const port = Number(process.env.PORT || 8787)
app.listen(port, '0.0.0.0', () => {
  console.log(`JH통운 API http://127.0.0.1:${port}`)
})
