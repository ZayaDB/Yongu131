export const DEFAULT_CODES = {
  estimator: '1909',
  viewer: '2411',
}

export function roleFromCode(codes = {}, code) {
  const entered = String(code || '').trim().toUpperCase()
  if (!entered) return ''
  if (entered === String(codes.estimator || '').trim().toUpperCase()) return 'estimator'
  if (entered === String(codes.viewer || '').trim().toUpperCase()) return 'viewer'
  return ''
}
