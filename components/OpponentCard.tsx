import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const CARD_WIDTH = 56;
const CARD_HEIGHT = 82;

interface Card {
  id: number;
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  color: 'red' | 'black';
}

interface OpponentCardProps {
  card: Card;
  index: number;
  totalCards: number;
  onDiscard: (id: number) => void;
  gamePhase: string;
  deckX: number;
  deckY: number;
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
  opponentAreaLayout
}: OpponentCardProps) {
  // 덱 위치에서 탄생
  const translateX = useSharedValue(deckX);
  const translateY = useSharedValue(deckY);

  useEffect(() => {
    const maxHandWidth = opponentAreaLayout.width * 0.8;
    const defaultSpacing = 30;
    const spacing = totalCards > 1 
      ? Math.min(defaultSpacing, (maxHandWidth - CARD_WIDTH) / (totalCards - 1))
      : defaultSpacing;

    const handStartX = opponentAreaLayout.x + (opponentAreaLayout.width - (spacing * (totalCards - 1) + CARD_WIDTH)) / 2;
    const targetX = handStartX + index * spacing;
    const targetY = opponentAreaLayout.y + (opponentAreaLayout.height - CARD_HEIGHT) / 2;

    translateX.value = withSpring(targetX);
    translateY.value = withSpring(targetY);
  }, [index, totalCards, opponentAreaLayout]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value }
      ]
    };
  });

  return (
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
  }
});
