import React, { useEffect } from 'react';
import { StyleSheet, Dimensions } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CARD_WIDTH = 56;
const CARD_HEIGHT = 82;

const DECK_X = SCREEN_WIDTH / 2 - CARD_WIDTH - 15;
const DECK_Y = SCREEN_HEIGHT / 2 - CARD_HEIGHT / 2;

const COMPUTER_AREA_Y = 0;

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
}

export default function OpponentCard({ card, index, totalCards, onDiscard, gamePhase }: OpponentCardProps) {
  // 덱 위치에서 탄생
  const translateX = useSharedValue(DECK_X);
  const translateY = useSharedValue(DECK_Y);

  useEffect(() => {
    const maxHandWidth = SCREEN_WIDTH * 0.8;
    const defaultSpacing = 30;
    const spacing = totalCards > 1 
      ? Math.min(defaultSpacing, (maxHandWidth - CARD_WIDTH) / (totalCards - 1))
      : defaultSpacing;

    const handStartX = (SCREEN_WIDTH - (spacing * (totalCards - 1) + CARD_WIDTH)) / 2;
    const targetX = handStartX + index * spacing;
    const targetY = COMPUTER_AREA_Y;

    translateX.value = withSpring(targetX);
    translateY.value = withSpring(targetY);
  }, [index, totalCards]);

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
