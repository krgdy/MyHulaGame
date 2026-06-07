import { useEffect } from 'react';
import { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Gesture } from 'react-native-gesture-handler';
import { Card } from '../types/game';

interface UseCardAnimationProps {
  card: Card;
  index: number;
  totalCards: number;
  onDiscard: (id: number) => void;
  gamePhase: string;
  deckX: number;
  deckY: number;
  discardX: number;
  discardY: number;
  playerAreaLayout: { x: number; y: number; width: number; height: number };
  onToggleSelect: (id: number) => void;
  onDragEnd: (cardId: number, x: number, y: number) => void;
  discarding: number;
}

export function useCardAnimation({
  card,
  index,
  totalCards,
  onDiscard,
  gamePhase,
  deckX,
  deckY,
  discardX,
  discardY,
  playerAreaLayout,
  onToggleSelect,
  onDragEnd,
  discarding
}: UseCardAnimationProps) {
  const translateX = useSharedValue(deckX);
  const translateY = useSharedValue(deckY);
  const scale = useSharedValue(1);
  const translateZ = useSharedValue(0);

  // 원래 정렬되어야 할 내 위치 (드래그 취소 시 복귀용)
  const homeX = useSharedValue(0);
  const homeY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // [1] 정렬 좌표 계산 및 업데이트
  useEffect(() => {
    const maxHandWidth = playerAreaLayout.width * 0.95;
    const defaultSpacing = 48;
    const spacing = totalCards > 1
      ? Math.min(defaultSpacing, (maxHandWidth - 68) / (totalCards - 1)) // CARD_WIDTH = 68
      : defaultSpacing;

    const handStartX = playerAreaLayout.x + (playerAreaLayout.width - (spacing * (totalCards - 1) + 68)) / 2;
    const targetX = handStartX + index * spacing;
    const targetY = playerAreaLayout.y + (playerAreaLayout.height - 100) / 2; // CARD_HEIGHT = 100

    homeX.value = targetX;
    homeY.value = targetY;

    // 드래그 중이 아닐 때만 정렬 위치로 이동
    if (!isDragging.value && card.id !== discarding) {
      translateX.value = withSpring(targetX);
      translateY.value = withSpring(targetY);
    }
  }, [index, totalCards, playerAreaLayout?.x, playerAreaLayout?.y, playerAreaLayout?.width, playerAreaLayout?.height, discarding]);

  // [2] 카드 버리기 애니메이션 구동
  useEffect(() => {
    if (discarding === 0 || card.id !== discarding) return;

    scale.value = withSpring(1.0);
    translateX.value = withSpring(discardX);
    translateY.value = withSpring(discardY, {}, (finished) => {
      if (finished) {
        scheduleOnRN(onDiscard, card.id);
      }
    });
  }, [discarding]);

  // [3] 드래그 제스처 정의 (PLAYER_DISCARD 턴에서만 작동)
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const dragGesture = Gesture.Pan()
    .enabled(gamePhase === 'PLAYER_DISCARD')
    .onStart(() => {
      isDragging.value = true;
      startX.value = translateX.value;
      startY.value = translateY.value;
      scale.value = withSpring(1.12);
      translateZ.value = 100;
    })
    .onUpdate((e) => {
      translateX.value = startX.value + e.translationX;
      translateY.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      isDragging.value = false;
      scale.value = withSpring(1.0);
      translateZ.value = 0;

      // 부모 컴포넌트에 드롭 위치 보고
      scheduleOnRN(onDragEnd, card.id, translateX.value, translateY.value);

      // 원래 위치로 복귀 애니메이션 실행 (만약 layoff가 성공하면 컴포넌트가 unmount됨)
      translateX.value = withSpring(homeX.value);
      translateY.value = withSpring(homeY.value);
    });

  // [4] 탭 제스처 정의 (카드 선택 토글 - 땡큐 등록을 위해 PLAYER_DRAW에서도 가능하도록 허용)
  const tapGesture = Gesture.Tap()
    .enabled(gamePhase === 'PLAYER_DISCARD' || gamePhase === 'PLAYER_DRAW')
    .onEnd(() => {
      scheduleOnRN(onToggleSelect, card.id);
    });

  // 드래그와 탭을 조합 (우선순위 부여)
  const composedGesture = (gamePhase === 'PLAYER_DRAW') ?
    tapGesture :
    Gesture.Exclusive(dragGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      zIndex: translateZ.value,
      elevation: translateZ.value,
    };
  });

  return {
    composedGesture,
    animatedStyle
  };
}
