import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import PlayerCard from '../../components/PlayerCard';
import OpponentCard from '../../components/OpponentCard';
import { useHulaGame } from '../../hooks/useHulaGame';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HulaGameScreen() {
  const {
    gamePhase,
    deck,
    playerHand,
    computerHand,
    discardPile,
    drawCard,
    discardCard,
    discardEnemyCard,
    computerDiscarding,
  } = useHulaGame();

  // Layout states for dynamic positioning relative to parent container
  const [boardAreaLayout, setBoardAreaLayout] = useState<{ x: number; y: number } | null>(null);
  const [deckRelative, setDeckRelative] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [discardRelative, setDiscardRelative] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [playerAreaLayout, setPlayerAreaLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [opponentAreaLayout, setOpponentAreaLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const topDiscardCard = discardPile[discardPile.length - 1];

  // Calculate coordinates relative to container
  const isLayoutReady = !!(boardAreaLayout && deckRelative && discardRelative && playerAreaLayout && opponentAreaLayout);
  const deckX = boardAreaLayout && deckRelative ? boardAreaLayout.x + deckRelative.x : 0;
  const deckY = boardAreaLayout && deckRelative ? boardAreaLayout.y + deckRelative.y : 0;
  const discardX = boardAreaLayout && discardRelative ? boardAreaLayout.x + discardRelative.x : 0;
  const discardY = boardAreaLayout && discardRelative ? boardAreaLayout.y + discardRelative.y : 0;

  return (
    <View style={styles.container}>

      {/* 상대방 영역 */}
      <View
        style={styles.opponentArea}
        onLayout={(e) => setOpponentAreaLayout(e.nativeEvent.layout)}
      />

      {/* 중앙 보드판 영역 */}
      <View
        style={styles.boardArea}
        onLayout={(e) => setBoardAreaLayout(e.nativeEvent.layout)}
      >
        {/* 남은 덱 더미 (누르면 드로우) */}
        <TouchableOpacity
          style={styles.deck}
          onPress={drawCard}
          disabled={gamePhase !== 'PLAYER_DRAW'}
          onLayout={(e) => setDeckRelative(e.nativeEvent.layout)}
        >
          <Text style={styles.deckText}>DECK</Text>
          <Text style={styles.deckCount}>{deck.length}</Text>
        </TouchableOpacity>

        {/* 버림 카드 더미 */}
        <View
          style={styles.discardPile}
          onLayout={(e) => setDiscardRelative(e.nativeEvent.layout)}
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

      {/* 플레이어 영역 */}
      <View
        style={styles.playerArea}
        onLayout={(e) => setPlayerAreaLayout(e.nativeEvent.layout)}
      />

      {/* 절대 좌표 카드들의 렌더링 그룹 */}
      {isLayoutReady && opponentAreaLayout && computerHand.map((card, index) => (
        <OpponentCard
          key={card.id}
          card={card}
          index={index}
          totalCards={computerHand.length}
          onDiscard={discardEnemyCard}
          gamePhase={gamePhase}
          deckX={deckX}
          deckY={deckY}
          discardX={discardX}
          discardY={discardY}
          discarding={computerDiscarding}
          opponentAreaLayout={opponentAreaLayout}
        />
      ))}

      {isLayoutReady && playerAreaLayout && playerHand.map((card, index) => (
        <PlayerCard
          key={card.id}
          card={card}
          index={index}
          totalCards={playerHand.length}
          onDiscard={discardCard}
          gamePhase={gamePhase}
          deckX={deckX}
          deckY={deckY}
          discardX={discardX}
          discardY={discardY}
          playerAreaLayout={playerAreaLayout}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f3818', justifyContent: 'space-between', paddingVertical: 40 },
  opponentArea: { height: 82, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  boardArea: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  deck: { width: 68, height: 100, backgroundColor: '#1a5e2f', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', elevation: 4 },
  discardPile: { width: 68, height: 100, backgroundColor: '#2e2e2e', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ccc', elevation: 4 },
  playerArea: { height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  infoText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deckText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  deckCount: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  discardCardInner: { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 6, padding: 6, justifyContent: 'space-between' },
  discardSuit: { fontSize: 18, fontWeight: 'bold' },
  discardValue: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', alignSelf: 'flex-end' }
});