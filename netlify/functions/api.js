import serverless from 'serverless-http'
import { connectLambda } from '@netlify/blobs'
import { app } from '../../server/app.js'

const handle = serverless(app)

function withApiPath(event) {
  const next = {
    ...event,
    headers: event.headers || {},
    body: event.body ?? '',
    requestContext: event.requestContext || { identity: { sourceIp: '0.0.0.0' } },
  }
  const original = next.path || next.rawPath || '/'
  let path = original
  const marker = '/.netlify/functions/api'
  if (!path.startsWith('/api/') && path !== '/api') {
    if (path.startsWith(marker)) {
      const rest = path.slice(marker.length)
      path = `/api${rest.startsWith('/') ? rest : `/${rest}`}`
    } else {
      path = `/api${path.startsWith('/') ? path : `/${path}`}`
    }
  }
  if (path.length > 4 && path.endsWith('/')) path = path.slice(0, -1)
  next.path = path
  if (next.rawPath) next.rawPath = path
  return next
}

export const handler = async (event, context) => {
  try {
    if (event?.blobs) connectLambda(event)
    return await handle(withApiPath(event), context)
  } catch (error) {
    console.error(error)
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ error: '서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.' }),
    }
  }
}
