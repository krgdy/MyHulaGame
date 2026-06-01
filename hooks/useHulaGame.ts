import { useState, useEffect } from 'react';
import { Card, GamePhase } from '../types/game';
import { getDiscardCard, canLayoff, isStraightFlush, isTriple } from '../utils/hulaAI';

export function useHulaGame() {
  const [gamePhase, setGamePhase] = useState<GamePhase>('MENU_SCREEN');
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
    if (gamePhase === 'SETUP' || gamePhase === 'MENU_SCREEN') return;
    if (playerHand.length === 0 || computerHand.length === 0) {
      setGamePhase('GAME_OVER');
    }
  }, [playerHand.length, computerHand.length, gamePhase]);

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

  const reorderPlayerHand = (cardId: number, targetIndex: number) => {
    const card = playerHand.find(c => c.id === cardId);
    if (!card) return;
    const newHand = playerHand.filter(c => c.id !== cardId);
    newHand.splice(targetIndex, 0, card);
    setPlayerHand(newHand);
  };

  const sortPlayerHand = (by: 'suit' | 'value') => {
    const suitOrder: Record<string, number> = { '♠': 0, '♥': 1, '♦': 2, '♣': 3 };
    const valueOrder: Record<string, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };

    const sorted = [...playerHand].sort((a, b) => {
      if (by === 'value') {
        const diffVal = (valueOrder[a.value] || 0) - (valueOrder[b.value] || 0);
        if (diffVal !== 0) return diffVal;
        return (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
      } else {
        const diffSuit = (suitOrder[a.suit] || 0) - (suitOrder[b.suit] || 0);
        if (diffSuit !== 0) return diffSuit;
        return (valueOrder[a.value] || 0) - (valueOrder[b.value] || 0);
      }
    });
    setPlayerHand(sorted);
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
      const group = valueGroups[val];
      if (group.length === 4 || (group.length === 3 && isTriple(group))) {
        registeredMelds.push(group);
        const ids = group.map(c => c.id);
        hand = hand.filter(c => !ids.includes(c.id));
      }
    }

    // 3. 등록 가능한 스트레이트 플러시 추출 (순환 스트레이트 포함)
    const suitGroups: Record<string, Card[]> = {};
    for (const card of hand) {
      if (!suitGroups[card.suit]) suitGroups[card.suit] = [];
      suitGroups[card.suit].push(card);
    }
    for (const suit in suitGroups) {
      let suitCards = suitGroups[suit];
      // 크기 순 정렬
      suitCards.sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));

      let foundMeld = true;
      while (foundMeld && suitCards.length >= 3) {
        foundMeld = false;
        const len = suitCards.length;
        // 슬라이딩 윈도우로 3장 수열 탐색
        for (let i = 0; i < len; i++) {
          const c1 = suitCards[i];
          const c2 = suitCards[(i + 1) % len];
          const c3 = suitCards[(i + 2) % len];

          if (isStraightFlush([c1, c2, c3])) {
            const seq = [c1, c2, c3];
            registeredMelds.push(seq);
            const ids = seq.map(c => c.id);
            // 손패와 현재 suit 묶음에서 제거
            hand = hand.filter(c => !ids.includes(c.id));
            suitCards = suitCards.filter(c => !ids.includes(c.id));
            foundMeld = true;
            break;
          }
        }
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
        
        // 내(컴퓨터) 등록 세트와 플레이어 등록 세트 모두 검사
        const targetMelds = [...finalCMelds, ...finalPMelds];
        let foundIndex = -1;
        let pos: 'front' | 'back' | 'group' | null = null;
        
        for (let i = 0; i < targetMelds.length; i++) {
          pos = canLayoff(card, targetMelds[i]);
          if (pos) {
            foundIndex = i;
            break;
          }
        }
        
        if (foundIndex !== -1 && pos) {
          // 어떤 세트에 붙었는지 확인하여 실제 배열 업데이트
          const isComputerMeld = foundIndex < finalCMelds.length;
          const meldIndex = isComputerMeld ? foundIndex : foundIndex - finalCMelds.length;
          const targetMeld = isComputerMeld ? finalCMelds[meldIndex] : finalPMelds[meldIndex];
          
          if (pos === 'front') {
            targetMeld.unshift(card);
          } else {
            targetMeld.push(card);
          }
          
          const isSeq = targetMeld.every(c => c.suit === targetMeld[0].suit);
          if (isSeq) {
            targetMeld.sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));
          }
          
          hand.splice(cardIdx, 1);
          layoffFound = true;
          break;
        }
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
    reorderPlayerHand,
    sortPlayerHand,
  };
}
