import React, { useEffect } from 'react';
import { Pressable , StyleSheet, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
const CARD_WIDTH = 68;
const CARD_HEIGHT = 100;

interface Card {
  id: number;
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  color: 'red' | 'black';
}

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
  playerAreaLayout
}: PlayerCardProps) {
  // [1] 태어날 때 초기값은 덱의 좌표로 고정 (덱에서 나오는 효과)
  const translateX = useSharedValue(deckX);
  const translateY = useSharedValue(deckY);
  const scale = useSharedValue(1);

  // [2] index(순서)나 totalCards가 바뀌면 내 자리로 스르륵 정렬
  useEffect(() => {
    const maxHandWidth = playerAreaLayout.width * 0.85;
    const defaultSpacing = 42;
    const spacing = totalCards > 1 
      ? Math.min(defaultSpacing, (maxHandWidth - CARD_WIDTH) / (totalCards - 1))
      : defaultSpacing;

    // 내 손패가 시작될 기준 X 좌표 구해서 index만큼 가로 정렬
    const handStartX = playerAreaLayout.x + (playerAreaLayout.width - (spacing * (totalCards - 1) + CARD_WIDTH)) / 2;
    const targetX = handStartX + index * spacing;
    const targetY = playerAreaLayout.y + (playerAreaLayout.height - CARD_HEIGHT) / 2;

    translateX.value = withSpring(targetX);
    translateY.value = withSpring(targetY);
  }, [index, totalCards, playerAreaLayout]);

  // [3] 카드 버리기 애니메이션 구동 후 데이터 변경 콜백 트리거
  const handlePress = () => {
    if (gamePhase !== 'PLAYER_DISCARD') return; // 버릴 수 있는 턴에만 작동

    scale.value = withSpring(1.05);

    // 1. 버림 카드 더미 좌표로 카드를 날립니다.
    translateX.value = withSpring(discardX);
    translateY.value = withSpring(discardY, {}, (finished) => {
      if (finished) {
        // 2. 애니메이션이 끝난 후 안전하게 부모의 데이터에서 제거
        scheduleOnRN(onDiscard, card.id);
      }
    });
  };

  

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value }
      ],
    };
  });

  return (
    <Animated.View style={[styles.card, animatedStyle]}>
      <Pressable
        style={{ flex: 1 }} 
        onPress={handlePress}
      >
        <Text style={[styles.suitText, { color: card.color }]}>{card.suit}</Text>
        <Text style={[styles.valueText, { color: card.color }]}>{card.value}</Text>
      </Pressable>
    </Animated.View>
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
  suitText: { fontSize: 20, fontWeight: 'bold' },
  valueText: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', alignSelf: 'center' }
});
