import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { DEFAULT_CODES } from '../shared/access.js'

const root = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(root, 'data', 'db.json')

function seed() {
  return {
    customers: [],
    messages: [],
  }
}

function read() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function write(db) {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, file)
}

let queue = Promise.resolve()

export function initDb() {
  if (!read()) write(seed())
}

export function readDb() {
  initDb()
  const db = read()
  db.customers ||= []
  db.messages ||= []
  if (!db.codes?.estimator || !db.codes?.viewer) {
    db.codes = { ...DEFAULT_CODES, ...(db.codes || {}) }
    write(db)
  }
  return db
}

export function updateDb(mutator) {
  const run = queue.then(() => {
    const db = readDb()
    const result = mutator(db)
    write(db)
    return result
  })
  queue = run.then(() => {}, () => {})
  return run
}
