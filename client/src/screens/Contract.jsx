import { COMPANY, PAY_METHODS, PROMISES, quoteTotals } from '../../../shared/model.js'
import { calcLoad, displayCbm, displayTon } from '../../../shared/catalog.js'
import { koreanDate, won } from '../format.js'
import { useApp } from '../context.jsx'
import { MoneyField, Ratio, Seg } from '../components.jsx'

export function ContractPane({ draft, patch, staffName, onConfirm, onStatus }) {
  const { canEdit } = useApp()
  const load = calcLoad(draft.inventory, draft.customItems)
  const ton = displayTon(draft, load)
  const cbm = displayCbm(draft, load)
  const totals = quoteTotals(draft.pricing)
  const groups = groupLines(load.lines)
  const manual = draft.tonManual || draft.cbmManual

  function setPricing(partial) {
    patch((current) => ({ pricing: { ...current.pricing, ...partial } }))
  }

  function setExtra(id, amount) {
    patch((current) => ({
      pricing: {
        ...current.pricing,
        extras: current.pricing.extras.map((extra) => (extra.id === id ? { ...extra, amount } : extra)),
      },
    }))
  }

  return (
    <div className="contract">
      <article className="paper">
        <header className="paper-top">
          <div>
            <p className="kicker">{COMPANY.brand}</p>
            <h2>견적 및 계약서</h2>
            <p className="paper-en">ESTIMATE REPORT</p>
          </div>
          {(draft.status === '확정' || draft.status === '완료') && <div className="stamp">{draft.status}</div>}
        </header>

        <dl className="company-dl">
          <div><dt>상호</dt><dd>{COMPANY.legalName}</dd></div>
          <div><dt>사업자</dt><dd>{COMPANY.bizNo}</dd></div>
          <div><dt>대표</dt><dd>{COMPANY.owner}</dd></div>
          <div><dt>연락처</dt><dd><a href={`tel:${COMPANY.phone}`}>{COMPANY.phone}</a></dd></div>
        </dl>

        <h3>고객</h3>
        <dl className="info-dl">
          <div><dt>고객명</dt><dd>{draft.name || '-'}</dd></div>
          <div><dt>전화</dt><dd>{draft.phone ? <a href={`tel:${draft.phone}`}>{draft.phone}</a> : '-'}</dd></div>
          <div><dt>담당</dt><dd>{draft.manager || staffName || '-'}</dd></div>
          <div><dt>견적일</dt><dd>{draft.estimateDate ? koreanDate(draft.estimateDate) : '-'}</dd></div>
          <div><dt>방문일</dt><dd>{draft.visitDate ? koreanDate(draft.visitDate) : '-'}</dd></div>
          <div><dt>서비스일</dt><dd>{draft.serviceDate ? koreanDate(draft.serviceDate) : '-'}</dd></div>
          <div><dt>운송일</dt><dd>{draft.moveDate ? `${koreanDate(draft.moveDate)} ${draft.timeSlot}` : '-'}</dd></div>
        </dl>

        <h3>집</h3>
        <div className="route-box">
          <p><span>출발</span>{draft.fromAddress || '주소 없음'}</p>
          <small>{placeMeta(draft, 'from')}</small>
          <p><span>도착</span>{draft.toAddress || '주소 없음'}</p>
          <small>{placeMeta(draft, 'to')}</small>
          <small>{[draft.houseType, draft.pyeong ? `${draft.pyeong}평` : ''].filter(Boolean).join(' · ')}</small>
        </div>

        <h3>적재</h3>
        <div className="load-hero">
          <span>추천 용차</span>
          <strong>{ton.name}</strong>
          <em>참고 무게 {load.weightTon}톤 ({load.kg.toLocaleString('ko-KR')}kg)</em>
        </div>
        <div className="grid-2 no-print">
          <label className="field">
            <span>총적재량 (톤)</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={draft.tonManual ? draft.quotedTon ?? '' : ton.ton || ''}
              onChange={(event) => {
                const value = event.target.value
                patch({
                  tonManual: true,
                  quotedTon: value === '' ? null : Number(value),
                })
              }}
            />
          </label>
          <label className="field">
            <span>CBM</span>
            <input
              type="number"
              min="0"
              step="0.1"
              value={draft.cbmManual ? draft.quotedCbm ?? '' : cbm || ''}
              onChange={(event) => {
                const value = event.target.value
                patch({
                  cbmManual: true,
                  quotedCbm: value === '' ? null : Number(value),
                })
              }}
            />
          </label>
        </div>
        <p className="print-only load-print">총적재량 {ton.ton || '-'} Ton · {cbm || 0} CBM</p>
        {manual && (
          <button
            type="button"
            className="text-btn no-print"
            onClick={() => patch({ tonManual: false, cbmManual: false, quotedTon: null, quotedCbm: null })}
          >
            방별 짐 계산({load.truck.name}, {load.cbm}㎥)으로 맞추기
          </button>
        )}
        {load.truck.detail && <p className="meta">{load.truck.detail}</p>}

        <h3>방별 짐</h3>
        {groups.length === 0 && <p className="empty tight">아직 체크한 짐이 없습니다.</p>}
        {groups.map((group) => (
          <p key={group.room} className="room-line">
            <b>{group.room}</b>
            {group.items.map((item) => `${item.name} ${item.qty}`).join(' · ')}
          </p>
        ))}

        <h3>인원</h3>
        {draft.status === '확정' || draft.status === '완료' ? (
          <div className="crew-row">
            <Ratio male={draft.crewMale} female={draft.crewFemale} />
            <p>달력에는 <b>{draft.crewMale}:{draft.crewFemale}</b> 로 표시됩니다.</p>
          </div>
        ) : (
          <p className="meta">확정하면 달력에 남자:여자 인원이 올라갑니다.</p>
        )}

        <h3>이사 비용</h3>
        <div className="no-print money-fields">
          <MoneyField label="이사 금액" value={draft.pricing.moveFee} onChange={(moveFee) => setPricing({ moveFee })} />
          {draft.pricing.extras.map((extra) => (
            <MoneyField key={extra.id} label={extra.name} value={extra.amount} onChange={(amount) => setExtra(extra.id, amount)} />
          ))}
          <MoneyField label="계약금" value={draft.pricing.deposit} onChange={(deposit) => setPricing({ deposit })} />
          <label className="checkline">
            <input
              type="checkbox"
              checked={draft.pricing.vat !== false}
              onChange={(event) => setPricing({ vat: event.target.checked })}
            />
            부가세 10%
          </label>
          <FieldLabel label="결제">
            <Seg
              label="결제"
              value={draft.pricing.payMethod}
              onChange={(payMethod) => setPricing({ payMethod })}
              options={PAY_METHODS.map((method) => ({ value: method, label: method }))}
            />
          </FieldLabel>
        </div>
        <div className="totals">
          <p><span>공급가</span><b>{won(totals.base)}</b></p>
          <p><span>부가세</span><b>{won(totals.vatAmt)}</b></p>
          <p className="grand"><span>합계</span><b>{won(totals.total)}</b></p>
          <p><span>계약금</span><b>{won(totals.deposit)}</b></p>
          <p className={totals.balance < 0 ? 'bad' : ''}><span>잔금</span><b>{won(totals.balance)}</b></p>
        </div>

        <h3>{COMPANY.brand}의 약속</h3>
        <ul className="promises">
          {PROMISES.map(([id, text]) => (
            <li key={id}>
              <label>
                <input
                  type="checkbox"
                  checked={draft.promises?.[id] !== false}
                  onChange={(event) => patch((current) => ({
                    promises: { ...current.promises, [id]: event.target.checked },
                  }))}
                />
                {text}
              </label>
            </li>
          ))}
        </ul>

        <h3>특이사항</h3>
        <textarea
          className="memo"
          rows={4}
          value={draft.memo}
          onChange={(event) => patch({ memo: event.target.value })}
          placeholder="포장, 분해, 도착 시간, 고객 요청"
        />

        <div className="bank">
          <strong>잔금 입금</strong>
          <p>{COMPANY.bank} {COMPANY.account}</p>
          <p>예금주 {COMPANY.holder}</p>
        </div>
      </article>

      <div className="action-stack no-print">
        {canEdit && draft.status === '견적' && (
          <button type="button" className="btn btn-primary btn-block" onClick={onConfirm}>인원 확정하고 달력에 올리기</button>
        )}
        {canEdit && draft.status === '확정' && (
          <>
            <button type="button" className="btn btn-primary btn-block" onClick={onConfirm}>인원 수정</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => onStatus('완료')}>운송 완료</button>
            <button type="button" className="btn btn-ghost btn-block" onClick={() => onStatus('견적')}>확정 취소</button>
          </>
        )}
        {canEdit && draft.status === '완료' && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onStatus('확정')}>완료 취소</button>
        )}
        {canEdit && draft.status !== '취소' && draft.status !== '견적' && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onStatus('취소')}>일정 취소</button>
        )}
        {canEdit && draft.status === '취소' && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onStatus('견적')}>견적으로 되돌리기</button>
        )}
        {canEdit && draft.status === '견적' && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => onStatus('취소')}>견적 취소</button>
        )}
        <button type="button" className="btn btn-ghost btn-block" onClick={() => window.print()}>계약서 인쇄</button>
      </div>
    </div>
  )
}

function FieldLabel({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  )
}

function placeMeta(draft, prefix) {
  const floor = draft[`${prefix}Floor`]
  const elevator = draft[`${prefix}Elevator`] ? '엘리베이터' : '엘리베이터 없음'
  const stairs = draft[`${prefix}Stairs`] ? '계단 작업' : ''
  return [floor ? `${floor}층` : '', elevator, stairs].filter(Boolean).join(' · ')
}

function groupLines(lines) {
  const map = new Map()
  for (const line of lines) {
    if (!map.has(line.room)) map.set(line.room, [])
    map.get(line.room).push(line)
  }
  return [...map.entries()].map(([room, items]) => ({ room, items }))
}
