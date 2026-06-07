import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated from 'react-native-reanimated';
import { GestureDetector } from 'react-native-gesture-handler';
import { Card } from '../types/game';
import { useCardAnimation } from '../hooks/useCardAnimation';

const CARD_WIDTH = 62;
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

export default function PlayerCard(props: PlayerCardProps) {
  const { card, isSelected } = props;
  const { composedGesture, animatedStyle } = useCardAnimation(props);

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
