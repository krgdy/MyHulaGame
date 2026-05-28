import { useState, useEffect } from 'react';
import { Card, GamePhase } from '../types/game';
import { getDiscardCard, canLayoff } from '../utils/hulaAI';

export function useHulaGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [computerHand, setComputerHand] = useState<Card[]>([]);
  const [discardPile, setDiscardPile] = useState<Card[]>([]);
  const [playerMelds, setPlayerMelds] = useState<Card[][]>([]);
  const [computerMelds, setComputerMelds] = useState<Card[][]>([]);
  const [computerPhase, setComputerPhase] = useState<'IDLE' | 'DRAWING'>('IDLE');
  const [computerDiscarding, setComputerDiscarding] = useState<number>(0);

  useEffect(() => {
    if (gamePhase === 'SETUP') {
      initGame();
    }
    if (gamePhase === 'COMPUTER_TURN') {
      handleComputerTurn();
    }
  }, [gamePhase, computerPhase]);

  useEffect(() => {
    if (computerPhase === 'DRAWING') {
      const timer = setTimeout(() => {
        // [1] 컴퓨터 등록 및 붙이기 AI 구동
        const { finalHand, newPlayerMelds, newComputerMelds } = runComputerMeldsAndLayoffs(
          computerHand,
          playerMelds,
          computerMelds
        );
        
        setComputerHand(finalHand);
        setPlayerMelds(newPlayerMelds);
        setComputerMelds(newComputerMelds);

        // [2] 1초 대기 후 버리기 진행
        const discardTimer = setTimeout(() => {
          const idToDiscard = getDiscardCard(finalHand);
          setComputerDiscarding(idToDiscard);
        }, 1000);

        return () => clearTimeout(discardTimer);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [computerPhase]);

  const initGame = () => {
    const suitArray: ('♠' | '♥' | '♦' | '♣')[] = ['♠' , '♥' , '♦' , '♣'];
    const valueArray: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck: Card[] = [];

    // 덱에 카드 52장 넣기
    for (let i = 1; i <= 52; i++) {
      const cardId = i;
      const cardSuit = suitArray[Math.trunc((i - 1) / 13)];
      const cardValue = valueArray[(i - 1) % 13];
      const cardColor: 'red' | 'black' = (cardSuit === '♥' || cardSuit === '♦') ? 'red' : 'black';

      newDeck.push({ id: cardId, suit: cardSuit, value: cardValue, color: cardColor });
    }

    // 덱 셔플
    for (let j = newDeck.length - 1; j > 0; j--) {
      const k = Math.floor(Math.random() * (j + 1));
      [newDeck[j], newDeck[k]] = [newDeck[k], newDeck[j]];
    }

    const initialPlayerHand = newDeck.splice(0, 7);
    const initialComputerHand = newDeck.splice(0, 7);

    setDeck(newDeck);
    setPlayerHand(initialPlayerHand);
    setComputerHand(initialComputerHand);
    setPlayerMelds([]);
    setComputerMelds([]);
    setGamePhase('PLAYER_DRAW');
  };

  const handleComputerTurn = () => {
    if (computerPhase === 'IDLE') {
      drawEnemyCard();
      setComputerPhase('DRAWING');
    }
  };

  const drawCard = () => {
    if (gamePhase !== 'PLAYER_DRAW') return;
    if (deck.length === 0 ) return;

    const nextCard = deck[0];
    setDeck(deck.slice(1));
    setPlayerHand([...playerHand, nextCard]);
    setGamePhase('PLAYER_DISCARD');
  };

  const drawEnemyCard = () => {
    if (deck.length === 0 ) return;

    const nextCard = deck[0];
    setDeck(deck.slice(1));
    setComputerHand([...computerHand, nextCard]);
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
    setComputerDiscarding(0);
    setComputerPhase('IDLE');
    setGamePhase('PLAYER_DRAW');
  };

  const registerMeld = (cards: Card[], isPlayer: boolean) => {
    if (isPlayer) {
      setPlayerHand(prev => prev.filter(hc => !cards.some(c => c.id === hc.id)));
      setPlayerMelds(prev => [...prev, cards]);
    } else {
      setComputerHand(prev => prev.filter(hc => !cards.some(c => c.id === hc.id)));
      setComputerMelds(prev => [...prev, cards]);
    }
  };

  const layoffCard = (cardId: number, meldIndex: number, isPlayerMeld: boolean, isPlayer: boolean) => {
    const hand = isPlayer ? playerHand : computerHand;
    const card = hand.find(c => c.id === cardId);
    if (!card) return;

    const targetMelds = isPlayerMeld ? playerMelds : computerMelds;
    if (meldIndex < 0 || meldIndex >= targetMelds.length) return;
    const targetMeld = targetMelds[meldIndex];

    const position = canLayoff(card, targetMeld);
    if (!position) return;

    // 카드 제거
    if (isPlayer) {
      setPlayerHand(prev => prev.filter(c => c.id !== cardId));
    } else {
      setComputerHand(prev => prev.filter(c => c.id !== cardId));
    }

    const updatedMeld = [...targetMeld];
    if (position === 'front') {
      updatedMeld.unshift(card);
    } else {
      updatedMeld.push(card);
    }

    // 시퀀스인 경우 재정렬
    const VALUE_MAP: Record<string, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
    const isSequence = updatedMeld.every(c => c.suit === updatedMeld[0].suit);
    if (isSequence) {
      updatedMeld.sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));
    }

    const newMelds = targetMelds.map((m, idx) => idx === meldIndex ? updatedMeld : m);
    if (isPlayerMeld) {
      setPlayerMelds(newMelds);
    } else {
      setComputerMelds(newMelds);
    }
  };

  const runComputerMeldsAndLayoffs = (
    cHand: Card[],
    pMelds: Card[][],
    cMelds: Card[][]
  ) => {
    let hand = [...cHand];
    const registeredMelds: Card[][] = [];
    const VALUE_MAP: Record<string, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

    // 1. 등록 가능한 7 카드 추출
    const sevens = hand.filter(c => c.value === '7');
    for (const seven of sevens) {
      registeredMelds.push([seven]);
      hand = hand.filter(c => c.id !== seven.id);
    }

    // 2. 등록 가능한 트리플/포커 추출 (3장 이상 같은 숫자)
    const valueGroups: Record<string, Card[]> = {};
    for (const card of hand) {
      if (!valueGroups[card.value]) valueGroups[card.value] = [];
      valueGroups[card.value].push(card);
    }
    for (const val in valueGroups) {
      if (valueGroups[val].length >= 3) {
        registeredMelds.push(valueGroups[val]);
        const ids = valueGroups[val].map(c => c.id);
        hand = hand.filter(c => !ids.includes(c.id));
      }
    }

    // 3. 등록 가능한 스트레이트 플러시 추출 (3장 이상 같은 무늬 연속 숫자)
    const suitGroups: Record<string, Card[]> = {};
    for (const card of hand) {
      if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
      suitGroups[card.suit].push(card);
    }
    for (const suit in suitGroups) {
      const suitCards = suitGroups[suit].sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));
      let i = 0;
      while (i < suitCards.length) {
        let j = i;
        while (j + 1 < suitCards.length && 
               (VALUE_MAP[suitCards[j + 1].value] || 0) === (VALUE_MAP[suitCards[j].value] || 0) + 1) {
          j++;
        }
        if (j - i + 1 >= 3) {
          const seq = suitCards.slice(i, j + 1);
          registeredMelds.push(seq);
          const ids = seq.map(c => c.id);
          hand = hand.filter(c => !ids.includes(c.id));
        }
        i = j + 1;
      }
    }

    // 4. 붙이기(Layoff) 탐색
    let finalPMelds = pMelds.map(m => [...m]);
    let finalCMelds = [...cMelds, ...registeredMelds].map(m => [...m]);
    
    let layoffFound = true;
    while (layoffFound) {
      layoffFound = false;
      for (let cardIdx = 0; cardIdx < hand.length; cardIdx++) {
        const card = hand[cardIdx];
        
        // 내(컴퓨터) 등록 세트에 붙이기 검사
        for (let mIdx = 0; mIdx < finalCMelds.length; mIdx++) {
          const pos = canLayoff(card, finalCMelds[mIdx]);
          if (pos) {
            if (pos === 'front') finalCMelds[mIdx].unshift(card);
            else finalCMelds[mIdx].push(card);

            const isSeq = finalCMelds[mIdx].every(c => c.suit === finalCMelds[mIdx][0].suit);
            if (isSeq) finalCMelds[mIdx].sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));

            hand.splice(cardIdx, 1);
            layoffFound = true;
            break;
          }
        }
        if (layoffFound) break;

        // 상대(플레이어) 등록 세트에 붙이기 검사
        for (let mIdx = 0; mIdx < finalPMelds.length; mIdx++) {
          const pos = canLayoff(card, finalPMelds[mIdx]);
          if (pos) {
            if (pos === 'front') finalPMelds[mIdx].unshift(card);
            else finalPMelds[mIdx].push(card);

            const isSeq = finalPMelds[mIdx].every(c => c.suit === finalPMelds[mIdx][0].suit);
            if (isSeq) finalPMelds[mIdx].sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));

            hand.splice(cardIdx, 1);
            layoffFound = true;
            break;
          }
        }
        if (layoffFound) break;
      }
    }

    return {
      finalHand: hand,
      newPlayerMelds: finalPMelds,
      newComputerMelds: finalCMelds
    };
  };

  return {
    gamePhase,
    setGamePhase,
    deck,
    playerHand,
    computerHand,
    discardPile,
    playerMelds,
    computerMelds,
    drawCard,
    discardCard,
    discardEnemyCard,
    registerMeld,
    layoffCard,
    initGame,
    computerDiscarding,
  };
}
