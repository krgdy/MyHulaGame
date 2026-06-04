/**
 * @file hulaAI.ts
 * @description 훌라 카드 게임의 규칙(Rules) 검증 및 컴퓨터 차례 시 구동되는 AI 행동 탐색 순수 알고리즘 모음입니다.
 * - 트리플(동일 숫자), 스트레이트 플러시(동일 무늬 연속 숫자), 7 카드 등 훌라 독립 족보(Meld) 판정을 처리합니다.
 * - 바닥 세트에 카드를 덧붙일 수 있는지 여부(canLayoff)를 계산합니다.
 * - 컴퓨터 손패 중 버리기 적절한 카드를 선택하는 의사 결정 알고리즘(getDiscardCard)을 제공합니다.
 * - 컴퓨터 턴에 등록(Meld)과 붙이기(Layoff)를 자동 최적 탐색하는 행동 알고리즘(runComputerMeldsAndLayoffs)을 수행합니다.
 */
import { Card } from '../types/game';
import { CARD_VALUE_MAP } from '../constants/game';

function getCardNumericValue(card: Card): number {
  return CARD_VALUE_MAP[card.value] || 0;
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

  // 3. 같은 무늬 연속 숫자 3장 이상 (순환 스트레이트 플러시 포함)
  const suitGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!suitGroups[card.suit]) {
      suitGroups[card.suit] = [];
    }
    suitGroups[card.suit].push(card);
  }

  for (const suit in suitGroups) {
    const cardsOfSuit = suitGroups[suit];
    const len = cardsOfSuit.length;
    if (len < 3) continue;

    // 숫자 크기 순으로 오름차순 정렬
    cardsOfSuit.sort((a, b) => getCardNumericValue(a) - getCardNumericValue(b));

    // 순환형 슬라이딩 윈도우 (크기 3) 탐색
    for (let i = 0; i < len; i++) {
      const c1 = cardsOfSuit[i];
      const c2 = cardsOfSuit[(i + 1) % len];
      const c3 = cardsOfSuit[(i + 2) % len];

      if (isStraightFlush([c1, c2, c3])) {
        meldableIds.add(c1.id);
        meldableIds.add(c2.id);
        meldableIds.add(c3.id);
      }
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

    // 2. 두 개 연속 체크 (같은 무늬 && 숫자 차이 1 또는 12(K-A))
    if (other.suit === card.suit) {
      const otherVal = getCardNumericValue(other);
      const diff = Math.abs(otherVal - cardVal);
      if (diff === 1 || diff === 12) {
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
 * 카드들의 값 배열이 순환을 고려하여 연속적인 스트레이트 수열을 이루는지 검사합니다.
 */
function isCircularConsecutive(values: number[]): boolean {
  if (values.length < 3) return false;

  // 오름차순 정렬
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;

  // 1. 일반적인 연속 체크 (예: 3-4-5)
  const isNormal = sorted.every((val, idx) => idx === 0 || val === sorted[idx - 1] + 1);
  if (isNormal) return true;

  // 2. 순환형 연속 체크 (예: Q-K-A -> [1, 12, 13] 또는 K-A-2 -> [1, 2, 13])
  // 마지막 값과 첫 값의 순환 차이가 1이어야 함 (K(13) -> A(1)의 차이는 1)
  if ((sorted[0] + 13) - sorted[n - 1] !== 1) return false;

  // 불연속적인 경계면(갭이 1이 아닌 지점)이 단 한 곳만 존재해야 함
  let discontinuityCount = 0;
  for (let i = 1; i < n; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) {
      discontinuityCount++;
    }
  }

  return discontinuityCount === 1;
}

/**
 * 카드 3장을 받아 트리플(동일 숫자 3장)인지 검사합니다.
 */
export function isTriple(cards: Card[]): boolean {
  if (cards.length !== 3) return false;
  return cards.every(c => c.value === cards[0].value);
}

/**
 * 카드 3장을 받아 순환을 포함한 스트레이트 플러시(동일 무늬 연속 숫자 3장)인지 검사합니다.
 * (예: Q-K-A, K-A-2 순환 허용)
 */
export function isStraightFlush(cards: Card[]): boolean {
  if (cards.length !== 3) return false;

  // 모두 같은 무늬인지 확인
  const sameSuit = cards.every(c => c.suit === cards[0].suit);
  if (!sameSuit) return false;

  const values = cards.map(getCardNumericValue);
  return isCircularConsecutive(values);
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
  if (cards.length === 3 && isTriple(cards)) {
    return true;
  }
  if (cards.length === 4 && cards.every(c => c.value === cards[0].value)) {
    return true;
  }

  // 3. 스트레이트 플러시 (같은 무늬 연속된 숫자 3장 이상)
  if (cards.length === 3) {
    return isStraightFlush(cards);
  }
  if (cards.length >= 4) {
    const allSameSuit = cards.every(c => c.suit === cards[0].suit);
    if (allSameSuit) {
      const values = cards.map(getCardNumericValue);
      // 중복 체크
      const hasDuplicates = new Set(values).size !== values.length;
      if (!hasDuplicates) {
        return isCircularConsecutive(values);
      }
    }
  }

  return false;
}

/**
 * 등록된 카드 세트(Meld)가 스트레이트(시퀀스)인지 트리플(그룹)인지 판별합니다.
 * 로직:
 * 1. 길이가 3보다 작으면 스트레이트 (7로 처음 등록된 것)
 * 2. 모든 카드가 동일한 숫자(value)를 가졌는지 체크하여 맞으면 그룹, 아니면 스트레이트.
 */
export function getMeldType(meld: Card[]): 'sequence' | 'group' {
  if (meld.length < 3) return 'sequence';

  const allSameValue = meld.every(c => c.value === meld[0].value);
  if (allSameValue) return 'group';

  return 'sequence';
}

/**
 * 카드를 특정 등록 세트(Meld)에 붙일(Layoff) 수 있는지 검사하고 붙는 위치를 반환합니다.
 */
export function canLayoff(card: Card, meld: Card[]): 'front' | 'back' | 'group' | null {
  if (meld.length === 0) return null;

  const cardVal = getCardNumericValue(card);
  const meldType = getMeldType(meld);

  // 1. 그룹 세트 (트리플/포커)인 경우
  if (meldType === 'group') {
    // 숫자가 같고 무늬가 겹치지 않아야 함
    if (card.value === meld[0].value) {
      const hasSuitAlready = meld.some(c => c.suit === card.suit);
      if (!hasSuitAlready) {
        return 'group';
      }
    }
    return null;
  }

  // 2. 스트레이트(시퀀스) 세트인 경우
  if (meldType === 'sequence') {
    // 단일 7 카드 세트인 경우 (스트레이트의 시작점)
    if (meld.length === 1 && meld[0].value === '7') {
      if (card.suit === meld[0].suit) {
        const meldVal = getCardNumericValue(meld[0]); // 7
        if (cardVal === meldVal - 1) return 'front'; // 6
        if (cardVal === meldVal + 1) return 'back';  // 8
      }
      return null;
    }

    if (card.suit === meld[0].suit) {
      // 덧붙였을 때 순환을 포함한 연속적인 수열을 이루는지 확인
      const currentValues = meld.map(getCardNumericValue);
      if (isCircularConsecutive([...currentValues, cardVal])) {
        // 기존 세트 오름차순 정렬 후 시작점과 끝점 계산
        const sortedMeld = [...meld].sort((a, b) => getCardNumericValue(a) - getCardNumericValue(b));

        let discontinuityIndex = -1;
        for (let i = 1; i < sortedMeld.length; i++) {
          if (getCardNumericValue(sortedMeld[i]) !== getCardNumericValue(sortedMeld[i - 1]) + 1) {
            discontinuityIndex = i;
            break;
          }
        }

        let startVal: number;
        let endVal: number;

        if (discontinuityIndex !== -1) {
          // 순환형 시퀀스 (예: [1, 2, 13] -> K-A-2)
          startVal = getCardNumericValue(sortedMeld[discontinuityIndex]);
          endVal = getCardNumericValue(sortedMeld[discontinuityIndex - 1]);
        } else {
          // 일반 시퀀스 (예: [3, 4, 5])
          startVal = getCardNumericValue(sortedMeld[0]);
          endVal = getCardNumericValue(sortedMeld[sortedMeld.length - 1]);
        }

        const prevVal = startVal === 1 ? 13 : startVal - 1;
        const nextVal = endVal === 13 ? 1 : endVal + 1;

        if (cardVal === prevVal) return 'front';
        if (cardVal === nextVal) return 'back';
      }
    }
    return null;
  }

  return null;
}

/**
 * 컴퓨터의 턴 진행 시 등록(Meld)과 붙이기(Layoff) AI를 처리하는 로직입니다.
 */
export function runComputerMeldsAndLayoffs(
  cHand: Card[],
  pMelds: Card[][],
  cMelds: Card[][]
) {
  let hand = [...cHand];
  const registeredMelds: Card[][] = [];

  // 1. 등록 가능한 7 카드 추출
  const sevens = hand.filter(c => c.value === '7');
  for (const seven of sevens) {
    registeredMelds.push([seven]);
    hand = hand.filter(c => c.id !== seven.id);
  }

  // 2. 등록 가능한 트리플/포커 추출 (3장 이상 같은 숫자)
  const valueGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!valueGroups[card.value]) valueGroups[card.value] = [];
    valueGroups[card.value].push(card);
  }
  for (const val in valueGroups) {
    const group = valueGroups[val];
    if (group.length === 4 || (group.length === 3 && isTriple(group))) {
      registeredMelds.push(group);
      const ids = group.map(c => c.id);
      hand = hand.filter(c => !ids.includes(c.id));
    }
  }

  // 3. 등록 가능한 스트레이트 플러시 추출 (순환 스트레이트 포함)
  const suitGroups: Record<string, Card[]> = {};
  for (const card of hand) {
    if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
    suitGroups[card.suit].push(card);
  }
  for (const suit in suitGroups) {
    let suitCards = suitGroups[suit];
    // 크기 순 정렬
    suitCards.sort((a, b) => getCardNumericValue(a) - getCardNumericValue(b));

    let foundMeld = true;
    while (foundMeld && suitCards.length >= 3) {
      foundMeld = false;
      const len = suitCards.length;
      // 슬라이딩 윈도우로 3장 수열 탐색
      for (let i = 0; i < len; i++) {
        const c1 = suitCards[i];
        const c2 = suitCards[(i + 1) % len];
        const c3 = suitCards[(i + 2) % len];

        if (isStraightFlush([c1, c2, c3])) {
          const seq = [c1, c2, c3];
          registeredMelds.push(seq);
          const ids = seq.map(c => c.id);
          // 손패와 현재 suit 묶음에서 제거
          hand = hand.filter(c => !ids.includes(c.id));
          suitCards = suitCards.filter(c => !ids.includes(c.id));
          foundMeld = true;
          break;
        }
      }
    }
  }

  // 4. 붙이기(Layoff) 탐색
  let finalPMelds = pMelds.map(m => [...m]);
  let finalCMelds = [...cMelds, ...registeredMelds].map(m => [...m]);
  
  // 컴퓨터가 등록한 세트가 하나 이상 존재할 때만 붙이기 가능
  if (finalCMelds.length > 0) {
    let layoffFound = true;
    while (layoffFound) {
      layoffFound = false;
      for (let cardIdx = 0; cardIdx < hand.length; cardIdx++) {
        const card = hand[cardIdx];
        
        // 내(컴퓨터) 등록 세트와 플레이어 등록 세트 모두 검사
        const targetMelds = [...finalCMelds, ...finalPMelds];
        let foundIndex = -1;
        let pos: 'front' | 'back' | 'group' | null = null;
        
        for (let i = 0; i < targetMelds.length; i++) {
          pos = canLayoff(card, targetMelds[i]);
          if (pos) {
            foundIndex = i;
            break;
          }
        }
        
        if (foundIndex !== -1 && pos) {
          // 어떤 세트에 붙었는지 확인하여 실제 배열 업데이트
          const isComputerMeld = foundIndex < finalCMelds.length;
          const meldIndex = isComputerMeld ? foundIndex : foundIndex - finalCMelds.length;
          const targetMeld = isComputerMeld ? finalCMelds[meldIndex] : finalPMelds[meldIndex];
          
          if (pos === 'front') {
            targetMeld.unshift(card);
          } else {
            targetMeld.push(card);
          }
          
          const isSeq = targetMeld.every(c => c.suit === targetMeld[0].suit);
          if (isSeq) {
            targetMeld.sort((a, b) => getCardNumericValue(a) - getCardNumericValue(b));
          }
          
          hand.splice(cardIdx, 1);
          layoffFound = true;
          break;
        }
      }
    }
  }

  return {
    finalHand: hand,
    newPlayerMelds: finalPMelds,
    newComputerMelds: finalCMelds
  };
}