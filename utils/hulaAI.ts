import { Card } from '../types/game';

const VALUE_MAP: Record<string, number> = {
  'A': 1,
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  'J': 11,
  'Q': 12,
  'K': 13
};

function getCardNumericValue(card: Card): number {
  return VALUE_MAP[card.value] || 0;
}

/**
 * 패에서 등록 가능한 카드들을 찾아 그 ID들의 Set을 반환합니다.
 * 훌라 규칙:
 * 1. 7 카드는 무조건 단독 등록 가능.
 * 2. 숫자가 같은 카드 3장 이상 (Triple/Quadruple).
 * 3. 같은 무늬이면서 연속된 숫자 3장 이상 (Straight Flush).
 */
function findMeldableCards(hand: Card[]): Set<number> {
  const meldableIds = new Set<number>();

  // 1. 7 카드 분류
  for (const card of hand) {
    if (card.value === '7') {
      meldableIds.add(card.id);
    }
  }

  // 2. 숫자가 같은 카드 3장 이상 (Triple 이상)
  const valueGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!valueGroups[card.value]) {
      valueGroups[card.value] = [];
    }
    valueGroups[card.value].push(card);
  }

  for (const value in valueGroups) {
    if (valueGroups[value].length >= 3) {
      for (const card of valueGroups[value]) {
        meldableIds.add(card.id);
      }
    }
  }

  // 3. 같은 무늬 연속 숫자 3장 이상
  const suitGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!suitGroups[card.suit]) {
      suitGroups[card.suit] = [];
    }
    suitGroups[card.suit].push(card);
  }

  for (const suit in suitGroups) {
    const cardsOfSuit = suitGroups[suit];
    // 숫자 크기 순으로 오름차순 정렬
    cardsOfSuit.sort((a, b) => getCardNumericValue(a) - getCardNumericValue(b));

    let i = 0;
    while (i < cardsOfSuit.length) {
      let j = i;
      while (j + 1 < cardsOfSuit.length && 
             getCardNumericValue(cardsOfSuit[j + 1]) === getCardNumericValue(cardsOfSuit[j]) + 1) {
        j++;
      }

      // 연속된 카드가 3장 이상인 경우 등록 가능 처리
      if (j - i + 1 >= 3) {
        for (let k = i; k <= j; k++) {
          meldableIds.add(cardsOfSuit[k].id);
        }
      }
      i = j + 1;
    }
  }

  return meldableIds;
}

/**
 * 카드가 등록 가능한 조합에 들어가지는 않지만, 다른 카드와 페어(같은 숫자)를 이루거나
 * 같은 무늬의 인접한 숫자(연속 2장)를 이루고 있는지 검사합니다.
 */
function isPairOrRun(card: Card, hand: Card[], meldableIds: Set<number>): boolean {
  if (meldableIds.has(card.id)) return false;

  const cardVal = getCardNumericValue(card);

  for (const other of hand) {
    if (other.id === card.id) continue;

    // 1. 페어 체크 (같은 숫자)
    if (other.value === card.value) {
      return true;
    }

    // 2. 두 개 연속 체크 (같은 무늬 && 숫자 차이 1)
    if (other.suit === card.suit) {
      const otherVal = getCardNumericValue(other);
      if (Math.abs(otherVal - cardVal) === 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 카드를 내림차순(K -> A)으로 정렬하여 반환합니다.
 */
function sortCardsDescending(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => getCardNumericValue(b) - getCardNumericValue(a));
}

/**
 * 컴퓨터 패를 분석하여 버릴 카드의 ID를 결정합니다.
 * 우선순위:
 * 1. 나머지(Rest) 카드 중 가장 숫자가 큰 카드
 * 2. 페어/연속2장 카드 중 가장 숫자가 큰 카드
 * 3. 등록 가능 카드 중 가장 숫자가 큰 카드
 */
export function getDiscardCard(computerHand: Card[]): number {
  if (computerHand.length === 0) return -1;

  const meldableIds = findMeldableCards(computerHand);
  const meldableCards: Card[] = [];
  const pairOrRunCards: Card[] = [];
  const restCards: Card[] = [];

  for (const card of computerHand) {
    if (meldableIds.has(card.id)) {
      meldableCards.push(card);
    } else if (isPairOrRun(card, computerHand, meldableIds)) {
      pairOrRunCards.push(card);
    } else {
      restCards.push(card);
    }
  }

  // 1. 나머지 카드군에서 숫자 가장 큰 카드 선택
  if (restCards.length > 0) {
    return sortCardsDescending(restCards)[0].id;
  }

  // 2. 페어/연속2장 카드군에서 숫자 가장 큰 카드 선택
  if (pairOrRunCards.length > 0) {
    return sortCardsDescending(pairOrRunCards)[0].id;
  }

  // 3. 모두 등록 가능하면 그 중 숫자 가장 큰 카드 선택
  return sortCardsDescending(meldableCards)[0].id;
}

/**
 * 선택된 카드 묶음이 독립적인 등록(Meld) 조건을 만족하는지 검사합니다.
 */
export function isValidMeld(cards: Card[]): boolean {
  if (cards.length === 0) return false;

  // 1. 7 카드는 단독 등록 가능
  if (cards.length === 1) {
    return cards[0].value === '7';
  }

  // 2. 트리플 / 포커 (같은 숫자 3장 이상)
  const allSameValue = cards.every(c => c.value === cards[0].value);
  if (allSameValue && cards.length >= 3) {
    return true;
  }

  // 3. 스트레이트 플러시 (같은 무늬 연속된 숫자 3장 이상)
  const allSameSuit = cards.every(c => c.suit === cards[0].suit);
  if (allSameSuit && cards.length >= 3) {
    const values = cards.map(getCardNumericValue).sort((a, b) => a - b);
    const isConsecutive = values.every((val, idx) => idx === 0 || val === values[idx - 1] + 1);
    if (isConsecutive) {
      return true;
    }
  }

  return false;
}

/**
 * 카드를 특정 등록 세트(Meld)에 붙일(Layoff) 수 있는지 검사하고 붙는 위치를 반환합니다.
 */
export function canLayoff(card: Card, meld: Card[]): 'front' | 'back' | 'group' | null {
  if (meld.length === 0) return null;

  const cardVal = getCardNumericValue(card);

  // 1. 단일 7 카드 세트인 경우 (스트레이트의 시작점)
  if (meld.length === 1 && meld[0].value === '7') {
    if (card.suit === meld[0].suit) {
      const meldVal = getCardNumericValue(meld[0]); // 7
      if (cardVal === meldVal - 1) return 'front'; // 6
      if (cardVal === meldVal + 1) return 'back';  // 8
    }
    return null;
  }

  // 2. 그룹 세트 (트리플/포커)인지 확인
  const isGroup = meld.every(c => c.value === meld[0].value);
  if (isGroup) {
    // 숫자가 같고 무늬가 겹치지 않아야 함
    if (card.value === meld[0].value) {
      const hasSuitAlready = meld.some(c => c.suit === card.suit);
      if (!hasSuitAlready) {
        return 'group';
      }
    }
    return null;
  }

  // 3. 시퀀스 세트 (동일 무늬 연속 숫자)인지 확인
  const isSequence = meld.every(c => c.suit === meld[0].suit);
  if (isSequence) {
    if (card.suit === meld[0].suit) {
      const sortedMeld = [...meld].sort((a, b) => getCardNumericValue(a) - getCardNumericValue(b));
      const minVal = getCardNumericValue(sortedMeld[0]);
      const maxVal = getCardNumericValue(sortedMeld[sortedMeld.length - 1]);

      if (cardVal === minVal - 1) return 'front';
      if (cardVal === maxVal + 1) return 'back';
    }
    return null;
  }

  return null;
}