import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import PlayerCard from '../../components/PlayerCard';
import OpponentCard from '../../components/OpponentCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Card {
  id: number;
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  color: 'red' | 'black';
}

type GamePhase = 'SETUP' | 'PLAYER_DRAW' | 'PLAYER_DISCARD' | 'COMPUTER_TURN' | 'GAME_OVER';

export default function HulaGameScreen() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const [deck, setDeck] = useState<Card[]>([]); 
  const [playerHand, setPlayerHand] = useState<Card[]>([]); 
  const [computerHand, setComputerHand] = useState<Card[]>([]); 
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  useEffect(() => {
    if(gamePhase === 'SETUP') {
      initGame();
    }
  }, [gamePhase]);

  const initGame = () => {
    const suitArray: ('♠' | '♥' | '♦' | '♣')[] = ['♠' , '♥' , '♦' , '♣'];
    const valueArray: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck: Card[] = [];

    for (let i = 1; i <= 52; i++) {
      const cardId = i;
      const cardSuit = suitArray[Math.trunc((i - 1) / 13)];
      const cardValue = valueArray[(i - 1) % 13];
      const cardColor: 'red' | 'black' = (cardSuit === '♥' || cardSuit === '♦') ? 'red' : 'black';
      
      newDeck.push({ id: cardId, suit: cardSuit, value: cardValue, color: cardColor });
    }

    for (let j = newDeck.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [newDeck[j], newDeck[k]] = [newDeck[k], newDeck[j]];
    }

    const initialPlayerHand = newDeck.splice(0, 7);
    const initialComputerHand = newDeck.splice(0, 7);

    setDeck(newDeck);
    setPlayerHand(initialPlayerHand);
    setComputerHand(initialComputerHand);

    setGamePhase('PLAYER_DRAW');
  }

  const drawCard = () => {
    if (gamePhase !== 'PLAYER_DRAW') return;
    if (deck.length === 0 ) return;

    const nextCard = deck[0];
    setDeck(deck.slice(1));
    setPlayerHand([...playerHand, nextCard]);
    setGamePhase('PLAYER_DISCARD'); // 드로우 후 버리기 단계로 변경
  }

  const discardCard = (cardId: number) => {
    const cardToDiscard = playerHand.find(c => c.id === cardId);
    if (!cardToDiscard) return;

    setPlayerHand(playerHand.filter(c => c.id !== cardId));
    setDiscardPile([...discardPile, cardToDiscard]);
    
    // 플레이어가 카드를 버리면 컴퓨터 턴으로 변경
    setGamePhase('COMPUTER_TURN');
  }

  const topDiscardCard = discardPile[discardPile.length - 1];

  return (
    <View style={styles.container}>

      {/* 중앙 보드판 영역 */}
      <View style={styles.boardArea}>
        {/* 남은 덱 더미 (누르면 드로우) */}
        <TouchableOpacity 
          style={styles.deck} 
          onPress={drawCard}
          disabled={gamePhase !== 'PLAYER_DRAW'}
        >
          <Text style={styles.deckText}>DECK</Text>
          <Text style={styles.deckCount}>{deck.length}</Text>
        </TouchableOpacity>

        {/* 버림 카드 더미 */}
        <View style={styles.discardPile}>
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

      {/* 절대 좌표 카드들의 렌더링 그룹 */}
      {/* 상대방 카드 뒷면들 */}
      {computerHand.map((card, index) => (
        <OpponentCard
          key={card.id}
          card={card}
          index={index}
          totalCards={computerHand.length}
          onDiscard={discardCard}
          gamePhase={gamePhase}
        />
      ))}

      {/* 플레이어 카드들 */}
      {playerHand.map((card, index) => (
        <PlayerCard
          key={card.id}
          card={card}
          index={index}
          totalCards={playerHand.length}
          onDiscard={discardCard}
          gamePhase={gamePhase}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f3818', justifyContent: 'space-between', paddingVertical: 40 },
  opponentArea: { height: 60, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  boardArea: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  deck: { width: 68, height: 100, backgroundColor: '#1a5e2f', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', elevation: 4 },
  discardPile: { width: 68, height: 100, backgroundColor: '#2e2e2e', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ccc', elevation: 4 },
  playerArea: { height: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  infoText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deckText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  deckCount: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  discardCardInner: { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 6, padding: 6, justifyContent: 'space-between' },
  discardSuit: { fontSize: 18, fontWeight: 'bold' },
  discardValue: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', alignSelf: 'flex-end' }
});