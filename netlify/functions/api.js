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
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) connectLambda(event)
  return handle(withApiPath(event), context)
}
