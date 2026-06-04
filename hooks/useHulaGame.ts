/**
 * @file useHulaGame.ts
 * @description 훌라 게임의 전반적인 인게임 상태(State)와 게임 차례 흐름을 정의하고 제어하는 핵심 비즈니스 로직 훅입니다.
 * - 카드 덱 생성, 셔플 및 플레이어/컴퓨터 초기 손패 세팅을 관리합니다.
 * - 드로우, 버리기, 땡큐 등록, 붙이기 등의 핵심 행동 상태 전환 처리를 담당합니다.
 * - 무거운 게임 룰 판정 및 컴퓨터용 행동 탐색 AI 코드는 hulaAI.ts로 분리하여 가벼운 훅 구조를 유지합니다.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, GamePhase } from '../types/game';
import { getDiscardCard, canLayoff, isValidMeld, runComputerMeldsAndLayoffs } from '../utils/hulaAI';
import { CARD_VALUE_MAP, CARD_SUIT_ORDER, getCardColor } from '../constants/game';

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

  // AI 비동기 연산 시 Stale Closure 방지를 위한 Ref
  const computerHandRef = useRef(computerHand);
  const playerMeldsRef = useRef(playerMelds);
  const computerMeldsRef = useRef(computerMelds);

  useEffect(() => { computerHandRef.current = computerHand; }, [computerHand]);
  useEffect(() => { playerMeldsRef.current = playerMelds; }, [playerMelds]);
  useEffect(() => { computerMeldsRef.current = computerMelds; }, [computerMelds]);

  const initGame = useCallback(() => {
    const suitArray: ('♠' | '♥' | '♦' | '♣')[] = ['♠' , '♥' , '♦' , '♣'];
    const valueArray: string[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const newDeck: Card[] = [];
    const newDiscardPile: Card[] = [];

    // 덱에 카드 52장 넣기
    for (let i = 1; i <= 52; i++) {
      const cardId = i;
      const cardSuit = suitArray[Math.trunc((i - 1) / 13)];
      const cardValue = valueArray[(i - 1) % 13];
      const cardColor = getCardColor(cardSuit);

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
  }, []);

  const drawEnemyCard = useCallback(() => {
    setDeck(prevDeck => {
      if (prevDeck.length === 0) return prevDeck;
      const nextCard = prevDeck[0];
      setComputerHand(prevHand => [...prevHand, nextCard]);
      return prevDeck.slice(1);
    });
  }, []);

  const handleComputerTurn = useCallback(() => {
    if (computerPhase === 'IDLE') {
      drawEnemyCard();
      setComputerPhase('DRAWING');
    }
  }, [computerPhase, drawEnemyCard]);

  useEffect(() => {
    if (gamePhase === 'SETUP') {
      initGame();
    }
    if (gamePhase === 'COMPUTER_TURN') {
      if (isTutorial) return; // Skip computer turn if suspended
      handleComputerTurn();
    }
  }, [gamePhase, isTutorial, initGame, handleComputerTurn]);

  useEffect(() => {
    if (gamePhase === 'SETUP' || gamePhase === 'MENU_SCREEN') return;
    if ((playerHand.length === 0 || computerHand.length === 0) && !isTutorial) {
      setGamePhase('GAME_OVER');
    }
  }, [playerHand.length, computerHand.length, gamePhase, isTutorial]);

  useEffect(() => {
    if (computerPhase === 'DRAWING') {
      const timer = setTimeout(() => {
        // Ref를 통한 최신 상태 참조 (Stale Closure 예방)
        const { finalHand, newPlayerMelds, newComputerMelds } = runComputerMeldsAndLayoffs(
          computerHandRef.current,
          playerMeldsRef.current,
          computerMeldsRef.current
        );
        
        setComputerHand(finalHand);
        setPlayerMelds(newPlayerMelds);
        setComputerMelds(newComputerMelds);

        // 1초 대기 후 버리기 진행
        const discardTimer = setTimeout(() => {
          const idToDiscard = getDiscardCard(finalHand);
          setComputerDiscarding(idToDiscard);
        }, 1000);

        return () => clearTimeout(discardTimer);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [computerPhase]);

  const drawCard = useCallback(() => {
    if (gamePhase !== 'PLAYER_DRAW') return;
    setDeck(prevDeck => {
      if (prevDeck.length === 0) return prevDeck;
      const nextCard = prevDeck[0];
      setPlayerHand(prevHand => [...prevHand, nextCard]);
      setGamePhase('PLAYER_DISCARD');
      return prevDeck.slice(1);
    });
  }, [gamePhase]);

  const discardCard = useCallback((cardId: number) => {
    setPlayerHand(prevHand => {
      const cardToDiscard = prevHand.find(c => c.id === cardId);
      if (!cardToDiscard) return prevHand;

      const nextHand = prevHand.filter(c => c.id !== cardId);
      setDiscardPile(prevPile => [...prevPile, cardToDiscard]);

      // 카드를 버린 후 즉시 손패가 0장이 되면 게임 오버
      if (nextHand.length === 0) {
        setGamePhase('GAME_OVER');
      } else {
        setDeck(prevDeck => {
          if (prevDeck.length === 0) {
            setGamePhase('GAME_OVER');
          } else {
            setGamePhase('COMPUTER_TURN');
          }
          return prevDeck;
        });
      }

      return nextHand;
    });
  }, []);

  const discardEnemyCard = useCallback((cardId: number) => {
    setComputerHand(prevHand => {
      const cardToDiscard = prevHand.find(c => c.id === cardId);
      if (!cardToDiscard) return prevHand;

      const nextHand = prevHand.filter(c => c.id !== cardId);
      setComputerHand(nextHand);
      setDiscardPile(prevPile => [...prevPile, cardToDiscard]);
      setComputerDiscarding(0);
      setComputerPhase('IDLE');

      // 카드를 버린 후 즉시 손패가 0장이 되면 게임 오버
      if (nextHand.length === 0) {
        setGamePhase('GAME_OVER');
      } else {
        setDeck(prevDeck => {
          if (prevDeck.length === 0) {
            setGamePhase('GAME_OVER');
          } else {
            setGamePhase('PLAYER_DRAW');
          }
          return prevDeck;
        });
      }

      return nextHand;
    });
  }, []);

  const registerMeld = useCallback((cards: Card[], isPlayer: boolean) => {
    if (isPlayer) {
      setPlayerHand(prev => prev.filter(hc => !cards.some(c => c.id === hc.id)));
      setPlayerMelds(prev => [...prev, cards]);
    } else {
      setComputerHand(prev => prev.filter(hc => !cards.some(c => c.id === hc.id)));
      setComputerMelds(prev => [...prev, cards]);
    }
  }, []);

  const thankYouRegister = useCallback((cardsInHand: Card[]) => {
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
    const isSeq = newMeld.every(c => c.suit === newMeld[0].suit);
    if (isSeq) {
      newMeld.sort((a, b) => (CARD_VALUE_MAP[a.value] || 0) - (CARD_VALUE_MAP[b.value] || 0));
    }
    setPlayerMelds(prev => [...prev, newMeld]);

    // 4. 버림 카드를 가져왔으므로 드로우를 완료한 상태가 되며, 즉시 버리기 페이즈로 이동
    setGamePhase('PLAYER_DISCARD');
  }, [gamePhase, discardPile]);

  const layoffCard = useCallback((cardId: number, meldIndex: number, isPlayerMeld: boolean, isPlayer: boolean): boolean => {
    const targetMelds = isPlayerMeld ? playerMelds : computerMelds;
    if (meldIndex < 0 || meldIndex >= targetMelds.length) return false;

    const hasMelds = isPlayer ? playerMelds.length > 0 : computerMelds.length > 0;
    if (!hasMelds) return false;

    const hand = isPlayer ? playerHand : computerHand;
    const card = hand.find(c => c.id === cardId);
    if (!card) return false;

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
    const isSequence = updatedMeld.every(c => c.suit === updatedMeld[0].suit);
    if (isSequence) {
      updatedMeld.sort((a, b) => (CARD_VALUE_MAP[a.value] || 0) - (CARD_VALUE_MAP[b.value] || 0));
    }

    const newMelds = targetMelds.map((m, idx) => idx === meldIndex ? updatedMeld : m);
    if (isPlayerMeld) {
      setPlayerMelds(newMelds);
    } else {
      setComputerMelds(newMelds);
    }

    return true;
  }, [playerHand, computerHand, playerMelds, computerMelds]);

  const reorderPlayerHand = useCallback((cardId: number, targetIndex: number) => {
    setPlayerHand(prevHand => {
      const card = prevHand.find(c => c.id === cardId);
      if (!card) return prevHand;
      const newHand = prevHand.filter(c => c.id !== cardId);
      newHand.splice(targetIndex, 0, card);
      return newHand;
    });
  }, []);

  const sortPlayerHand = useCallback((by: 'suit' | 'value') => {
    setPlayerHand(prevHand => {
      return [...prevHand].sort((a, b) => {
        if (by === 'value') {
          const diffVal = (CARD_VALUE_MAP[a.value] || 0) - (CARD_VALUE_MAP[b.value] || 0);
          if (diffVal !== 0) return diffVal;
          return (CARD_SUIT_ORDER[a.suit] || 0) - (CARD_SUIT_ORDER[b.suit] || 0);
        } else {
          const diffSuit = (CARD_SUIT_ORDER[a.suit] || 0) - (CARD_SUIT_ORDER[b.suit] || 0);
          if (diffSuit !== 0) return diffSuit;
          return (CARD_VALUE_MAP[a.value] || 0) - (CARD_VALUE_MAP[b.value] || 0);
        }
      });
    });
  }, []);

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
