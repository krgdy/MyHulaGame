import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import { scheduleOnRN } from 'react-native-worklets';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { Card } from '../types/game';

const CARD_WIDTH = 56;
const CARD_HEIGHT = 82;


interface OpponentCardProps {
  card: Card;
  index: number;
  totalCards: number;
  onDiscard: (id: number) => void;
  gamePhase: string;
  deckX: number;
  deckY: number;
  discardX : number;
  discardY : number;
  discarding : number;
  opponentAreaLayout: { x: number; y: number; width: number; height: number };
}

export default function OpponentCard({
  card,
  index,
  totalCards,
  onDiscard,
  gamePhase,
  deckX,
  deckY,
  discardX,
  discardY,
  discarding,
  opponentAreaLayout
}: OpponentCardProps) {
  // 덱 위치에서 탄생
  const translateX = useSharedValue(deckX);
  const translateY = useSharedValue(deckY);
  const scale = useSharedValue(1.2); // 생성시 덱의 카드 크기와 맞추기 위해

  // 생성 이후 정렬
  useEffect(() => {
    const maxHandWidth = opponentAreaLayout.width * 0.8;
    const defaultSpacing = 30;
    const spacing = totalCards > 1
      ? Math.min(defaultSpacing, (maxHandWidth - CARD_WIDTH) / (totalCards - 1))
      : defaultSpacing;

    const handStartX = opponentAreaLayout.x + (opponentAreaLayout.width - (spacing * (totalCards - 1) + CARD_WIDTH)) / 2;
    const targetX = handStartX + index * spacing;
    const targetY = opponentAreaLayout.y + (opponentAreaLayout.height - CARD_HEIGHT) / 2;

    scale.value = withSpring(1);
    translateX.value = withSpring(targetX);
    translateY.value = withSpring(targetY);
  }, [index, totalCards, opponentAreaLayout]);

  // 버려질 때 애니메이션
  useEffect(() => {
    if (discarding === 0 || card.id !== discarding) return;
    
    // 1. 덱과 비슷한 크기로 카드의 크기를 변경
    scale.value = withSpring(1.2);
    // 2. 버림 카드 더미 좌표로 카드를 날립니다.
    translateX.value = withSpring(discardX);
    translateY.value = withSpring(discardY, {}, (finished) => {
      if (finished) {
        // 3. 애니메이션이 끝난 후 안전하게 부모의 데이터에서 제거
        scheduleOnRN(onDiscard, card.id);
      }
    });
  }, [discarding]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
      transformOrigin: 'top left', // 스케일 변경 시 레이아웃 기준점 안 맞는 문제 해결
    };
  });

  return (
    (card.id === discarding) ?
    <Animated.View style={[styles.card, animatedStyle]}>
      <Text style={[styles.suitText, { color: card.color }]}>{card.suit}</Text>
      <Text style={[styles.valueText, { color: card.color }]}>{card.value}</Text>
    </Animated.View> :
    <Animated.View style={[styles.cardBack, animatedStyle]} />
  );
}

const styles = StyleSheet.create({
  cardBack: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    backgroundColor: '#b22222',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#fff',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
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
  suitText: { fontSize: 20, fontWeight: 'bold' },
  valueText: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', alignSelf: 'center' }
});
