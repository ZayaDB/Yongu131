import test from 'node:test'
import assert from 'node:assert/strict'
import { calcLoad, recommendTruck } from './catalog.js'
import { quoteTotals, sanitizeCustomer } from './model.js'

test('빈 짐은 톤수를 정하지 않는다', () => {
  const load = calcLoad({}, [])
  assert.equal(load.truck.ton, 0)
  assert.equal(load.kg, 0)
})

test('짐이 늘면 부피와 차량이 커진다', () => {
  const small = calcLoad({ 'master:bed': 1, 'kitchen:fridge': 1 }, [])
  const big = calcLoad({
    'master:wardrobe': 1,
    'master:bed': 1,
    'master:dressing': 1,
    'room1:bed': 1,
    'room1:desk': 1,
    'room2:bed': 1,
    'kitchen:fridgeLarge': 1,
    'kitchen:kimchi': 1,
    'kitchen:table': 1,
    'kitchen:chair': 4,
    'kitchen:cabinet': 1,
    'living:sofa': 1,
    'living:tvstand': 1,
    'living:styler': 1,
    'living:ac': 1,
    'balcony:washerDrum': 1,
    'balcony:dryer': 1,
    'other:miscBox': 6,
    'other:clothBox': 4,
    'other:bookBox': 3,
  }, [])
  assert.ok(big.cbm > small.cbm)
  assert.ok(big.kg > small.kg)
  assert.ok(big.truck.ton >= small.truck.ton)
  assert.equal(big.truck.name, '5톤')
})

test('책 박스가 무거우면 부피보다 무게로 차를 올린다', () => {
  const byWeight = recommendTruck(2, 3200)
  assert.equal(byWeight.name, '5톤')
})

test('견적 합계는 부가세와 잔금을 나눈다', () => {
  const totals = quoteTotals({
    moveFee: 1000000,
    deposit: 100000,
    vat: true,
    extras: [{ amount: 50000 }],
  })
  assert.equal(totals.base, 1050000)
  assert.equal(totals.vatAmt, 105000)
  assert.equal(totals.total, 1155000)
  assert.equal(totals.balance, 1055000)
})

test('고객 저장값은 이름과 인원을 정리한다', () => {
  const saved = sanitizeCustomer({ name: '  정하늘  ', crewMale: 3, crewFemale: 1, status: '확정' })
  assert.equal(saved.name, '정하늘')
  assert.equal(saved.crewMale, 3)
  assert.equal(saved.status, '확정')
})

test('팀 이름은 팀장과 직원만 남긴다', () => {
  const saved = sanitizeCustomer({
    name: '정하늘',
    team: { leader: '  박팀장 ', members: [' 홍길동 ', '', '김철수'] },
  })
  assert.equal(saved.team.leader, '박팀장')
  assert.deepEqual(saved.team.members, ['홍길동', '김철수'])
})
