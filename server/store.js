import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getStore } from '@netlify/blobs'
import { DEFAULT_CODES } from '../shared/access.js'

const BLOB_KEY = 'db'

function dbFile() {
  const url = import.meta.url
  if (typeof url !== 'string' || !url) return path.join(process.cwd(), 'server', 'data', 'db.json')
  return path.join(path.dirname(fileURLToPath(url)), 'data', 'db.json')
}

function seed() {
  return {
    customers: [],
    messages: [],
    presence: {},
  }
}

function normalize(db) {
  const next = db && typeof db === 'object' ? db : seed()
  next.customers ||= []
  next.messages ||= []
  next.presence ||= {}
  if (!next.codes?.estimator || !next.codes?.viewer) {
    next.codes = { ...DEFAULT_CODES, ...(next.codes || {}) }
  }
  return next
}

export function usingBlobs() {
  return Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
}

function readFileDb() {
  try {
    return JSON.parse(fs.readFileSync(dbFile(), 'utf8'))
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function writeFileDb(db) {
  const file = dbFile()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  const tmp = `${file}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
  fs.renameSync(tmp, file)
}

function blobStore() {
  return getStore('jh-office', { consistency: 'strong' })
}

async function readBlob() {
  const store = blobStore()
  const result = await store.getWithMetadata(BLOB_KEY, { type: 'json' })
  if (!result) return { db: normalize(null), etag: '' }
  return { db: normalize(result.data), etag: result.etag || '' }
}

let queue = Promise.resolve()

export async function readDb() {
  if (usingBlobs()) {
    const { db, etag } = await readBlob()
    if (!etag) {
      await blobStore().setJSON(BLOB_KEY, db, { onlyIfNew: true })
    }
    return db
  }

  const raw = readFileDb()
  const db = normalize(raw)
  if (!raw || !raw.codes?.estimator || !raw.codes?.viewer) writeFileDb(db)
  return db
}

export function updateDb(mutator) {
  const run = queue.then(() => writeUpdate(mutator))
  queue = run.then(() => {}, () => {})
  return run
}

async function writeUpdate(mutator) {
  if (!usingBlobs()) {
    const db = await readDb()
    const result = mutator(db)
    writeFileDb(db)
    return result
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { db, etag } = await readBlob()
    const result = mutator(db)
    const written = await blobStore().setJSON(BLOB_KEY, normalize(db), etag ? { onlyIfMatch: etag } : { onlyIfNew: true })
    if (written.modified) return result
  }
  throw new Error('저장이 겹쳤습니다. 다시 시도해 주세요.')
}
