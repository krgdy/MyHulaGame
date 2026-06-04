import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Card } from '../types/game';

interface BoardAreaProps {
  boardAreaRef: (node: any) => void;
  deckRef: (node: any) => void;
  discardRef: (node: any) => void;
  deckLength: number;
  topDiscardCard: Card | null;
  onDrawCard: () => void;
  isPlayerDrawPhase: boolean;
  canThankYou: boolean;
}

export default function BoardArea({
  boardAreaRef,
  deckRef,
  discardRef,
  deckLength,
  topDiscardCard,
  onDrawCard,
  isPlayerDrawPhase,
  canThankYou,
}: BoardAreaProps) {
  return (
    <View
      ref={boardAreaRef}
      style={styles.boardArea}
    >
      {/* 남은 덱 더미 (누르면 드로우) */}
      <View ref={deckRef}>
        <TouchableOpacity
          style={styles.deck}
          onPress={onDrawCard}
          disabled={!isPlayerDrawPhase}
        >
          <Text style={styles.deckText}>DECK</Text>
          <Text style={styles.deckCount}>{deckLength}</Text>
        </TouchableOpacity>
      </View>
      
      {/* 버림 카드 더미 */}
      <View
        ref={discardRef}
        style={[
          styles.discardPile,
          canThankYou && styles.discardPileHighlight
        ]}
      >
        {topDiscardCard ? (
          <View style={styles.discardCardInner}>
            <Text style={[styles.discardSuit, { color: topDiscardCard.color }]}>
              {topDiscardCard.suit}
            </Text>
            <Text style={[styles.discardValue, { color: topDiscardCard.color }]}>
              {topDiscardCard.value}
            </Text>
          </View>
        ) : (
          <Text style={styles.deckText}>EMPTY</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  boardArea: {
    flex: 1.2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  deck: {
    width: 68,
    height: 100,
    backgroundColor: '#1a5e2f',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    elevation: 4,
  },
  discardPile: {
    width: 68,
    height: 100,
    backgroundColor: '#2e2e2e',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    elevation: 4,
  },
  discardPileHighlight: {
    borderColor: '#d4af37',
    borderWidth: 2.5,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
  },
  deckText: {
    color: '#fff',
    fontSize: 12,
    opacity: 0.8,
  },
  deckCount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  discardCardInner: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 6,
    justifyContent: 'space-between',
  },
  discardSuit: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  discardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'right',
    alignSelf: 'flex-end',
  },
});
