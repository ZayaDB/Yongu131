import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import { app } from './app.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(__dirname, '..', 'dist')

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
