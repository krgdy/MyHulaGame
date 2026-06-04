/**
 * @file useHulaGame.ts
 * @description 훌라 게임의 전반적인 인게임 상태(State)와 게임 차례 흐름을 정의하고 제어하는 핵심 비즈니스 로직 훅입니다.
 * - 카드 덱 생성, 셔플 및 플레이어/컴퓨터 초기 손패 세팅을 관리합니다.
 * - 드로우, 버리기, 땡큐 등록, 붙이기 등의 핵심 행동 상태 전환 처리를 담당합니다.
 * - 무거운 게임 룰 판정 및 컴퓨터용 행동 탐색 AI 코드는 hulaAI.ts로 분리하여 가벼운 훅 구조를 유지합니다.
 */
import { useState, useEffect } from 'react';
import { Card, GamePhase } from '../types/game';
import { getDiscardCard, canLayoff, isValidMeld, runComputerMeldsAndLayoffs } from '../utils/hulaAI';

export function useHulaGame(options?: { isTutorial?: boolean }) {
  const isTutorial = options?.isTutorial ?? false;

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
      if (isTutorial) return; // Skip computer turn if suspended
      handleComputerTurn();
    }
  }, [gamePhase, computerPhase, isTutorial]);

  useEffect(() => {
    if (gamePhase === 'SETUP' || gamePhase === 'MENU_SCREEN') return;
    if ((playerHand.length === 0 || computerHand.length === 0) && isTutorial == false) {
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
    const newDiscardPile: Card[] = [];

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
    setDiscardPile(newDiscardPile);
    setPlayerHand(initialPlayerHand);
    setComputerHand(initialComputerHand);
    setPlayerMelds([]);
    setComputerMelds([]);
    setComputerDiscarding(0);
    setComputerPhase('IDLE');
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

    const nextHand = playerHand.filter(c => c.id !== cardId);
    setPlayerHand(nextHand);
    setDiscardPile([...discardPile, cardToDiscard]);

    // 카드를 버린 후 즉시 손패가 0장이 되면 게임 오버
    if (nextHand.length === 0) {
      setGamePhase('GAME_OVER');
      return;
    }

    // 다음 차례가 시작되기 전에 덱이 고갈되었는지 확인하여 바로 종료
    if (deck.length === 0) {
      setGamePhase('GAME_OVER');
    } else {
      setGamePhase('COMPUTER_TURN');
    }
  };

  const discardEnemyCard = (cardId: number) => {
    const cardToDiscard = computerHand.find(c => c.id === cardId);
    if (!cardToDiscard) return;

    const nextHand = computerHand.filter(c => c.id !== cardId);
    setComputerHand(nextHand);
    setDiscardPile([...discardPile, cardToDiscard]);
    setComputerDiscarding(0);
    setComputerPhase('IDLE');

    // 카드를 버린 후 즉시 손패가 0장이 되면 게임 오버
    if (nextHand.length === 0) {
      setGamePhase('GAME_OVER');
      return;
    }

    // 다음 차례가 시작되기 전에 덱이 고갈되었는지 확인하여 바로 종료
    if (deck.length === 0) {
      setGamePhase('GAME_OVER');
    } else {
      setGamePhase('PLAYER_DRAW');
    }
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

  const thankYouRegister = (cardsInHand: Card[]) => {
    if (gamePhase !== 'PLAYER_DRAW') return;
    const topCard = discardPile[discardPile.length - 1];
    if (!topCard) return;

    // 0. 안전 장치 (방어적 프로그래밍): 조합이 유효하지 않으면 상태 전환을 거부
    if (!isValidMeld([...cardsInHand, topCard])) return;

    // 1. 플레이어 손패에서 선택 카드 제거
    setPlayerHand(prev => prev.filter(hc => !cardsInHand.some(c => c.id === hc.id)));
    // 2. 버림패 맨 위 카드 제거
    setDiscardPile(prev => prev.slice(0, -1));

    // 3. 결합하여 새로운 meld 생성 및 등록 (무늬 수열일 경우 정렬 처리)
    const newMeld = [...cardsInHand, topCard];
    const VALUE_MAP: Record<string, number> = { 'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13 };
    const isSeq = newMeld.every(c => c.suit === newMeld[0].suit);
    if (isSeq) {
      newMeld.sort((a, b) => (VALUE_MAP[a.value] || 0) - (VALUE_MAP[b.value] || 0));
    }
    setPlayerMelds(prev => [...prev, newMeld]);

    // 4. 버림 카드를 가져왔으므로 드로우를 완료한 상태가 되며, 즉시 버리기 페이즈로 이동
    setGamePhase('PLAYER_DISCARD');
  };

  const hasRegisteredMeld = (isPlayer: boolean) => {
    return isPlayer ? playerMelds.length > 0 : computerMelds.length > 0;
  };

  const layoffCard = (cardId: number, meldIndex: number, isPlayerMeld: boolean, isPlayer: boolean): boolean => {
    if (!hasRegisteredMeld(isPlayer)) return false;

    const hand = isPlayer ? playerHand : computerHand;
    const card = hand.find(c => c.id === cardId);
    if (!card) return false;

    const targetMelds = isPlayerMeld ? playerMelds : computerMelds;
    if (meldIndex < 0 || meldIndex >= targetMelds.length) return false;
    const targetMeld = targetMelds[meldIndex];

    const position = canLayoff(card, targetMeld);
    if (!position) return false;

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

    return true;
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



  return {
    gamePhase,
    setGamePhase,
    deck,
    setDeck,
    playerHand,
    setPlayerHand,
    computerHand,
    setComputerHand,
    discardPile,
    setDiscardPile,
    playerMelds,
    setPlayerMelds,
    computerMelds,
    setComputerMelds,
    drawCard,
    discardCard,
    discardEnemyCard,
    registerMeld,
    layoffCard,
    initGame,
    computerDiscarding,
    reorderPlayerHand,
    sortPlayerHand,
    thankYouRegister,
  };
}
