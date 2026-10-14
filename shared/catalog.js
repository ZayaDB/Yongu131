// 추천 용차는 부피(㎥)와 무게(톤) 중 더 큰 쪽으로 고릅니다.
// 가구는 보통 부피가 먼저 차고, 책 박스처럼 무거운 짐은 무게로 차를 올립니다.
// 1톤 ≈ 4.2㎥ · 1,000kg / 2.5톤 ≈ 11㎥ / 5톤 ≈ 22㎥.

function item(id, name, kg, cbm) {
  return { id, name, kg, cbm }
}

const BEDROOM = [
  item('wardrobe', '장롱·옷장', 80, 1.2),
  item('dressing', '화장대', 25, 0.4),
  item('bed', '침대', 70, 1.45),
  item('nightstand', '협탁·문갑', 8, 0.12),
  item('desk', '책상', 25, 0.5),
  item('chair', '의자', 7, 0.15),
  item('shelf', '책장·책꽂이', 36, 0.7),
  item('drawer', '서랍장', 32, 0.45),
  item('tv', 'TV', 16, 0.28),
  item('tvstand', 'TV장·선반', 28, 0.42),
  item('pc', '컴퓨터', 8, 0.08),
  item('clothBox', '옷·침구 박스', 11, 0.12),
  item('bookBox', '책 박스', 18, 0.08),
  item('acWall', '벽걸이 에어컨', 12, 0.18),
]

export const ROOMS = [
  { id: 'master', name: '안방', items: BEDROOM },
  { id: 'room1', name: '방1', items: BEDROOM },
  { id: 'room2', name: '방2', items: BEDROOM },
  { id: 'room3', name: '방3', items: BEDROOM },
  {
    id: 'kitchen',
    name: '주방',
    items: [
      item('table', '식탁', 35, 0.8),
      item('chair', '식탁 의자', 6, 0.12),
      item('cabinet', '그릇장', 50, 0.85),
      item('fridge', '냉장고', 68, 0.95),
      item('fridgeLarge', '양문형 냉장고', 105, 1.35),
      item('kimchi', '김치냉장고', 58, 0.72),
      item('gas', '가스·오븐레인지', 18, 0.28),
      item('microwave', '전자레인지', 12, 0.1),
      item('dishwasher', '식기세척기', 45, 0.4),
      item('purifier', '정수기', 16, 0.15),
      item('freezer', '냉동고', 48, 0.6),
      item('box', '주방 박스', 14, 0.12),
    ],
  },
  {
    id: 'living',
    name: '거실',
    items: [
      item('sofa', '소파', 48, 1.6),
      item('sofaBig', '카우치 소파', 72, 2.2),
      item('table', '테이블', 16, 0.32),
      item('audio', '오디오', 14, 0.2),
      item('tv', 'TV·홈시어터', 22, 0.35),
      item('decor', '장식장', 40, 0.7),
      item('tank', '수족관', 28, 0.45),
      item('shelf', '책장·책꽂이', 36, 0.7),
      item('gym', '운동기구', 40, 0.6),
      item('ac', '스탠드 에어컨', 38, 0.4),
      item('piano', '피아노', 230, 1.6),
      item('tvstand', '거실장', 42, 0.75),
      item('styler', '스타일러', 85, 0.55),
      item('massage', '안마의자', 92, 1.0),
      item('bookBox', '책 박스', 18, 0.08),
    ],
  },
  {
    id: 'balcony',
    name: '베란다',
    items: [
      item('washerTop', '세탁기·통돌이', 42, 0.42),
      item('washerDrum', '세탁기·드럼', 72, 0.52),
      item('dryer', '건조기', 52, 0.46),
      item('bike', '자전거', 15, 0.35),
      item('plant', '화분', 8, 0.1),
      item('jar', '항아리', 16, 0.15),
      item('shelf', '선반·앵글', 14, 0.3),
      item('cabinet', '수납장', 28, 0.45),
    ],
  },
  {
    id: 'other',
    name: '기타',
    items: [
      item('shoe', '신발장', 22, 0.35),
      item('clothBox', '옷 박스', 11, 0.12),
      item('beddingBox', '이불 박스', 8, 0.12),
      item('bookBox', '책 박스', 18, 0.08),
      item('miscBox', '잡화 박스', 15, 0.12),
      item('mirror', '거울', 12, 0.15),
    ],
  },
]

export function roomName(roomId) {
  return ROOMS.find((room) => room.id === roomId)?.name || '기타'
}

export function recommendTruck(cbm, kg) {
  if (cbm <= 0 && kg <= 0) {
    return { ton: 0, name: '미정', trucks: 1, detail: '짐을 입력하면 톤수가 나옵니다' }
  }
  const score = Math.max(cbm / 4.2, kg / 1000)
  if (score <= 1.15) return { ton: 1, name: '1톤', trucks: 1, detail: '포터·1톤으로 실립니다' }
  if (score <= 2.6) return { ton: 2.5, name: '2.5톤', trucks: 1, detail: '2.5톤 한 대' }
  if (score <= 5.3) return { ton: 5, name: '5톤', trucks: 1, detail: '5톤 한 대' }
  if (score <= 8.5) return { ton: 5, name: '5톤 2대', trucks: 2, detail: '5톤 한 대에는 빠듯합니다' }
  return { ton: 11, name: '11톤', trucks: 1, detail: '11톤 또는 차량을 나눕니다' }
}

export function suggestCrew(truck) {
  if (!truck?.ton) return { male: 2, female: 0 }
  if (truck.trucks === 2) return { male: 5, female: 1 }
  if (truck.ton <= 1) return { male: 2, female: 0 }
  if (truck.ton <= 2.5) return { male: 2, female: 1 }
  if (truck.ton <= 5) return { male: 3, female: 1 }
  return { male: 4, female: 1 }
}

export function calcLoad(inventory = {}, customItems = []) {
  const lines = []
  let kg = 0
  let cbm = 0
  for (const room of ROOMS) {
    for (const entry of room.items) {
      const qty = Number(inventory[`${room.id}:${entry.id}`] || 0)
      if (qty <= 0) continue
      const line = {
        key: `${room.id}:${entry.id}`,
        roomId: room.id,
        room: room.name,
        name: entry.name,
        qty,
        kg: entry.kg * qty,
        cbm: entry.cbm * qty,
      }
      lines.push(line)
      kg += line.kg
      cbm += line.cbm
    }
  }
  for (const custom of customItems || []) {
    const qty = Number(custom.qty || 0)
    if (qty <= 0 || !custom.name) continue
    const eachKg = Number(custom.kg) || 0
    const eachCbm = Number(custom.cbm) > 0 ? Number(custom.cbm) : eachKg / 150
    const line = {
      key: custom.id,
      roomId: custom.roomId || 'other',
      room: roomName(custom.roomId),
      name: custom.name,
      qty,
      kg: eachKg * qty,
      cbm: eachCbm * qty,
      custom: true,
    }
    lines.push(line)
    kg += line.kg
    cbm += line.cbm
  }
  const truck = recommendTruck(cbm, kg)
  return {
    lines,
    kg: Math.round(kg),
    cbm: Math.round(cbm * 10) / 10,
    weightTon: Math.round((kg / 1000) * 10) / 10,
    truck,
    count: lines.reduce((sum, line) => sum + line.qty, 0),
  }
}

export function displayTon(customer, load) {
  if (customer?.tonManual && customer.quotedTon != null) {
    return {
      name: `${customer.quotedTon}톤`,
      ton: customer.quotedTon,
      manual: true,
    }
  }
  return {
    name: load.truck.name,
    ton: load.truck.ton,
    manual: false,
  }
}

export function displayCbm(customer, load) {
  if (customer?.cbmManual && customer.quotedCbm != null) return customer.quotedCbm
  return load.cbm
}
