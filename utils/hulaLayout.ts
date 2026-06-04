import { Card } from '../types/game';
import { canLayoff } from './hulaAI';

/**
 * 특정 등록 패 영역에서 가장 가까운 유효 등록 그룹 인덱스 반환
 */
export function findClosestValidMeld(
  card: Card,
  scrollDropX: number,
  melds: Card[][],
  expandedMeldIdx: number | null
): number {
  let currentX = 12; // paddingHorizontal
  let closestIdx = -1;
  let minDistance = 99999;

  for (let i = 0; i < melds.length; i++) {
    const meld = melds[i];
    const isExpanded = i === expandedMeldIdx;
    const cardSpacing = isExpanded ? 36 : 14; // 펼쳤을 때(32+4) vs 겹쳤을 때(32-18)
    const width = 32 + (meld.length - 1) * cardSpacing + 8;

    const leftBound = currentX - 30;
    const rightBound = currentX + width + 30;

    // 가로 바운더리 내에 존재하고 붙이기가 가능할 때만 거리 비교 수행
    if (scrollDropX >= leftBound && scrollDropX <= rightBound) {
      if (canLayoff(card, meld)) {
        const centerX = currentX + width / 2;
        const dist = Math.abs(centerX - scrollDropX);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = i;
        }
      }
    }
    currentX += width + 12; // gap(12)
  }

  return closestIdx;
}

/**
 * 내 손패 카드 슬롯 중 가장 가까운 인덱스 반환
 */
export function findClosestHandSlot(
  cardCenterX: number,
  playerAreaLayout: { x: number; y: number; width: number; height: number } | null,
  playerHandLength: number
): number {
  if (!playerAreaLayout) return -1;
  if (playerHandLength <= 1) return -1;

  const maxHandWidth = playerAreaLayout.width * 0.85;
  const spacing = Math.min(42, (maxHandWidth - 68) / (playerHandLength - 1)); // CARD_WIDTH = 68
  const handStartX = playerAreaLayout.x + (playerAreaLayout.width - (spacing * (playerHandLength - 1) + 68)) / 2;

  let closestIdx = 0;
  let minDistance = 99999;

  for (let i = 0; i < playerHandLength; i++) {
    const slotCenterX = handStartX + i * spacing + 34; // CARD_WIDTH / 2
    const dist = Math.abs(slotCenterX - cardCenterX);
    if (dist < minDistance) {
      minDistance = dist;
      closestIdx = i;
    }
  }

  return closestIdx;
}
