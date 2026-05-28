import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { Card } from '../types/game';

const CARD_WIDTH = 68;
const CARD_HEIGHT = 100;

interface PlayerCardProps {
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
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onDragEnd: (cardId: number, x: number, y: number) => void;
  discarding: number;
}

export default function PlayerCard({
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
  isSelected,
  onToggleSelect,
  onDragEnd,
  discarding
}: PlayerCardProps) {
  // [1] 태어날 때 초기값은 덱의 좌표로 고정
  const translateX = useSharedValue(deckX);
  const translateY = useSharedValue(deckY);
  const scale = useSharedValue(1);
  const translateZ = useSharedValue(0);

  // 원래 정렬되어야 할 내 위치 (드래그 취소 시 복귀용)
  const homeX = useSharedValue(0);
  const homeY = useSharedValue(0);
  const isDragging = useSharedValue(false);

  // [2] 정렬 좌표 계산 및 업데이트
  useEffect(() => {
    const maxHandWidth = playerAreaLayout.width * 0.85;
    const defaultSpacing = 42;
    const spacing = totalCards > 1
      ? Math.min(defaultSpacing, (maxHandWidth - CARD_WIDTH) / (totalCards - 1))
      : defaultSpacing;

    const handStartX = playerAreaLayout.x + (playerAreaLayout.width - (spacing * (totalCards - 1) + CARD_WIDTH)) / 2;
    const targetX = handStartX + index * spacing;
    const targetY = playerAreaLayout.y + (playerAreaLayout.height - CARD_HEIGHT) / 2;

    homeX.value = targetX;
    homeY.value = targetY;

    // 드래그 중이 아닐 때만 정렬 위치로 이동
    if (!isDragging.value && card.id !== discarding) {
      translateX.value = withSpring(targetX);
      translateY.value = withSpring(targetY);
    }
  }, [index, totalCards, playerAreaLayout?.x, playerAreaLayout?.y, playerAreaLayout?.width, playerAreaLayout?.height, discarding]);

  // [3] 카드 버리기 애니메이션 구동
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

  // [4] 드래그 제스처 정의 (PLAYER_DISCARD 턴에서만 작동)
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

      // 일단 원래 위치로 복귀 애니메이션 실행 (만약 layoff가 성공하면 컴포넌트가 unmount됨)
      translateX.value = withSpring(homeX.value);
      translateY.value = withSpring(homeY.value);
    });

  // [5] 탭 제스처 정의 (카드 선택 토글)
  const tapGesture = Gesture.Tap()
    .enabled(gamePhase === 'PLAYER_DISCARD')
    .onEnd(() => {
      scheduleOnRN(onToggleSelect, card.id);
    });

  // 드래그와 탭을 조합 (우선순위 부여)
  const composedGesture = Gesture.Exclusive(dragGesture, tapGesture);

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

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View
        style={[
          styles.card,
          isSelected && styles.selectedCard,
          animatedStyle
        ]}
      >
        <Text style={[styles.suitText, { color: card.color }]}>{card.suit}</Text>
        <Text style={[styles.valueText, { color: card.color }]}>{card.value}</Text>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#d4af37',
    padding: 6,
    justifyContent: 'space-between',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  selectedCard: {
    borderColor: '#00e5ff',
    borderWidth: 3,
    shadowColor: '#00e5ff',
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8,
  },
  suitText: { fontSize: 20, fontWeight: 'bold' },
  valueText: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', alignSelf: 'center' }
});
