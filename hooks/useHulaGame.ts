import { useState, useEffect } from 'react';
import { Card, GamePhase } from '../types/game';

export function useHulaGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const [deck, setDeck] = useState<Card[]>([]); 
  const [playerHand, setPlayerHand] = useState<Card[]>([]); 
  const [computerHand, setComputerHand] = useState<Card[]>([]); 
  const [discardPile, setDiscardPile] = useState<Card[]>([]);

  useEffect(() => {
    if (gamePhase === 'SETUP') {
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
  };

  const drawCard = () => {
    if (gamePhase !== 'PLAYER_DRAW') return;
    if (deck.length === 0 ) return;

    const nextCard = deck[0];
    setDeck(deck.slice(1));
    setPlayerHand([...playerHand, nextCard]);
    setGamePhase('PLAYER_DISCARD');
  };

  const discardCard = (cardId: number) => {
    const cardToDiscard = playerHand.find(c => c.id === cardId);
    if (!cardToDiscard) return;

    setPlayerHand(playerHand.filter(c => c.id !== cardId));
    setDiscardPile([...discardPile, cardToDiscard]);
    setGamePhase('COMPUTER_TURN');
  };

  const discardEnemyCard = (cardId: number) => {
    const cardToDiscard = computerHand.find(c => c.id === cardId);
    if (!cardToDiscard) return;

    setComputerHand(computerHand.filter(c => c.id !== cardId));
    setDiscardPile([...discardPile, cardToDiscard]);
    setGamePhase('PLAYER_DRAW');
  };

  return {
    gamePhase,
    setGamePhase,
    deck,
    playerHand,
    computerHand,
    discardPile,
    drawCard,
    discardCard,
    discardEnemyCard,
    initGame,
  };
}
