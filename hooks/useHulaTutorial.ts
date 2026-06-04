import { useState, useRef, useCallback } from 'react';
import { Card } from '../types/game';
import { useHulaGame } from './useHulaGame';
import { canLayoff } from '../utils/hulaAI';
import { getCardColor } from '../constants/game';

type HulaGameInstance = ReturnType<typeof useHulaGame>;

export interface RestrictionInfo {
  allowed: boolean;
  message?: string;
}

export interface TutorialRestrictions {
  draw: RestrictionInfo;
  drag: RestrictionInfo;
  discard: RestrictionInfo;
  register: RestrictionInfo;
  thankYou: RestrictionInfo;
  selectCard: RestrictionInfo;
  dragCard: RestrictionInfo;
}

export function useHulaTutorial(game: HulaGameInstance) {
  const {
    setPlayerHand,
    setDeck,
    setDiscardPile,
    setPlayerMelds,
    setComputerMelds,
    setComputerHand,
    setGamePhase,
    playerHand,
    gamePhase,
    drawCard: gameDrawCard,
    discardCard: gameDiscardCard,
    registerMeld: gameRegisterMeld,
    thankYouRegister: gameThankYouRegister,
    layoffCard: gameLayoffCard
  } = game;

  const [tutorialStep, setTutorialStep] = useState<number>(1);
  const [isStepCompleted, setIsStepCompleted] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const warningTimer = useRef<number | null>(null);

  // 제어 플래그 상태
  const [restrictions, setRestrictions] = useState<TutorialRestrictions>({
    draw: { allowed: true },
    drag: { allowed: true },
    discard: { allowed: true },
    register: { allowed: true },
    thankYou: { allowed: true },
    selectCard: { allowed: true },
    dragCard: { allowed: true },
  });

  // 허용 카드 ID 리스트 상태
  const [allowedSelection, setAllowedSelection] = useState<number[] | null>(null);
  const [allowedDragging, setAllowedDragging] = useState<number[] | null>(null);

  // 제한 조작 헬퍼 함수들
  const disableFeature = useCallback((feature: keyof TutorialRestrictions, msg?: string) => {
    setRestrictions(prev => ({ ...prev, [feature]: { allowed: false, message: msg } }));
  }, []);

  const enableFeature = useCallback((feature: keyof TutorialRestrictions) => {
    setRestrictions(prev => ({ ...prev, [feature]: { allowed: true } }));
  }, []);

  const showWarning = useCallback((message: string) => {
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
    }
    setWarningMessage(message);
    warningTimer.current = setTimeout(() => {
      setWarningMessage(null);
      warningTimer.current = null;
    }, 2000) as any;
  }, []);

  const makeCard = useCallback((id: number, suit: '♠' | '♥' | '♦' | '♣', value: string): Card => ({
    id,
    suit,
    value,
    color: getCardColor(suit)
  }), []);

  const loadTutorialPreset = useCallback((step: number) => {
    setIsStepCompleted(false);

    // 스텝별 기능 제한 및 경고 메세지 바인딩
    if (step === 1) {
      enableFeature('draw');
      enableFeature('discard');
      disableFeature('drag', "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      disableFeature('register', "이 단계에서는 등록을 할 수 없습니다.");
      disableFeature('thankYou', "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      setAllowedSelection(null);
      setAllowedDragging(null);

      setPlayerHand([
        makeCard(1, '♣', '3'),
        makeCard(2, '♦', '5'),
        makeCard(3, '♥', '8'),
        makeCard(4, '♠', '9'),
        makeCard(5, '♣', 'Q'),
        makeCard(6, '♥', 'K'),
        makeCard(7, '♦', 'A'),
      ]);
      setDeck([makeCard(8, '♠', '2')]);
      setDiscardPile([]);
      setPlayerMelds([]);
      setComputerMelds([]);
      setComputerHand([]);
      setGamePhase('PLAYER_DRAW');
    } else if (step === 2) {
      disableFeature('draw', "이 단계에서는 드로우를 할 필요가 없습니다.");
      disableFeature('drag', "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      disableFeature('discard', "이 단계에서는 카드를 버릴 수 없습니다.");
      disableFeature('thankYou', "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      enableFeature('register');
      
      setAllowedSelection([1, 2, 3, 4]); // ♠7, ♥3, ♦3, ♣3
      disableFeature('selectCard', "등록 가능한 ♠7 카드 또는 숫자 3 세 개를 선택하세요.");
      setAllowedDragging(null);

      setPlayerHand([
        makeCard(1, '♠', '7'),
        makeCard(2, '♥', '3'),
        makeCard(3, '♦', '3'),
        makeCard(4, '♣', '3'),
        makeCard(5, '♠', 'J'),
        makeCard(6, '♣', 'Q'),
        makeCard(7, '♥', 'A'),
      ]);
      setDeck([makeCard(8, '♠', 'K')]);
      setDiscardPile([]);
      setPlayerMelds([]);
      setComputerMelds([]);
      setComputerHand([]);
      setGamePhase('PLAYER_DISCARD');
    } else if (step === 3) {
      disableFeature('draw', "이 단계에서는 드로우를 할 필요가 없습니다.");
      enableFeature('drag');
      disableFeature('discard', "이 단계에서는 카드를 버릴 수 없습니다.");
      disableFeature('register', "이 단계에서는 등록을 할 수 없습니다.");
      disableFeature('thankYou', "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      
      setAllowedSelection([]); // 탭 선택 전체 차단
      disableFeature('selectCard', "이 단계에서는 카드를 드래그 앤 드롭하여 붙여야 합니다.");
      
      setAllowedDragging([1, 2]); // ♠6, ♥J 드래그만 허용
      disableFeature('dragCard', "붙일 수 있는 카드(♠6 또는 ♥J)를 드래그하세요.");

      setPlayerHand([
        makeCard(1, '♠', '6'),
        makeCard(2, '♥', 'J'),
        makeCard(3, '♦', '9'),
      ]);
      setPlayerMelds([
        [makeCard(4, '♠', '3'), makeCard(5, '♠', '4'), makeCard(6, '♠', '5')]
      ]);
      setComputerMelds([
        [makeCard(7, '♥', 'Q'), makeCard(8, '♥', 'K')]
      ]);
      setDeck([makeCard(9, '♦', 'K')]);
      setDiscardPile([]);
      setComputerHand([]);
      setGamePhase('PLAYER_DISCARD');
    } else if (step === 4) {
      disableFeature('draw', "이 단계에서는 드로우를 할 필요가 없습니다.");
      disableFeature('drag', "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      disableFeature('discard', "이 단계에서는 카드를 버릴 수 없습니다.");
      disableFeature('register', "이 단계에서는 등록을 할 수 없습니다.");
      enableFeature('thankYou');
      
      setAllowedSelection([1, 2]); // ♣8, ♣9 탭 허용
      disableFeature('selectCard', "땡큐 등록을 위해 ♣8과 ♣9 카드만 선택해 주세요.");
      setAllowedDragging(null);

      setPlayerHand([
        makeCard(1, '♣', '8'),
        makeCard(2, '♣', '9'),
        makeCard(3, '♥', '5'),
        makeCard(4, '♦', 'J'),
      ]);
      setDiscardPile([makeCard(5, '♣', '10')]);
      setPlayerMelds([]);
      setComputerMelds([]);
      setDeck([makeCard(6, '♦', 'A')]);
      setComputerHand([]);
      setGamePhase('PLAYER_DRAW');
    } else if (step === 5) {
      disableFeature('draw', "이 단계에서는 드로우를 할 필요가 없습니다.");
      enableFeature('drag');
      disableFeature('discard', "먼저 ♠7 카드를 붙여야 합니다.");
      disableFeature('register', "이 단계에서는 등록을 할 수 없습니다.");
      disableFeature('thankYou', "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      
      setAllowedSelection([]); // 첫 카드 선택 비활성
      disableFeature('selectCard', "♠7 카드는 드래그하여 등록 세트에 붙이세요.");
      
      setAllowedDragging([1]); // ♠7 드래그 허용
      disableFeature('dragCard', "♠7 카드를 드래그하여 등록 세트에 붙이세요.");

      setPlayerHand([
        makeCard(1, '♠', '7'),
        makeCard(2, '♥', 'K'),
      ]);
      setPlayerMelds([
        [makeCard(3, '♠', '4'), makeCard(4, '♠', '5'), makeCard(5, '♠', '6')]
      ]);
      setComputerMelds([]);
      setDeck([makeCard(6, '♣', 'A')]);
      setDiscardPile([]);
      setComputerHand([]);
      setGamePhase('PLAYER_DISCARD');
    }
  }, [
    disableFeature, enableFeature, makeCard,
    setPlayerHand, setDeck, setDiscardPile, setPlayerMelds, setComputerMelds, setComputerHand, setGamePhase
  ]);

  const startTutorial = useCallback(() => {
    setTutorialStep(1);
    setIsStepCompleted(false);
    loadTutorialPreset(1);
  }, [loadTutorialPreset]);

  const nextTutorialStep = useCallback(() => {
    if (tutorialStep < 5) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      setIsStepCompleted(false);
      loadTutorialPreset(nextStep);
    } else {
      setTutorialStep(0);
      setIsStepCompleted(false);
      setGamePhase('MENU_SCREEN');
    }
  }, [tutorialStep, loadTutorialPreset, setGamePhase]);

  const exitTutorial = useCallback(() => {
    setTutorialStep(0);
    setIsStepCompleted(false);
    setGamePhase('MENU_SCREEN');
  }, [setGamePhase]);

  // --- 가드 검증 API 들 ( index.tsx 에서 호출하여 사용 ) ---

  const checkDrawAllowed = useCallback((): boolean => {
    if (!restrictions.draw.allowed) {
      showWarning(restrictions.draw.message || "이 단계에서는 드로우를 할 수 없습니다.");
      return false;
    }
    return true;
  }, [restrictions.draw, showWarning]);

  const checkDiscardAllowed = useCallback((cardId: number): boolean => {
    if (!restrictions.discard.allowed) {
      showWarning(restrictions.discard.message || "이 단계에서는 카드를 버릴 수 없습니다.");
      return false;
    }
    // 5단계에서 K 이전에 7을 버리려고 시도하는 것을 방지하는 가이드 처리
    if (tutorialStep === 5 && playerHand.some(c => c.value === '7')) {
      const card = playerHand.find(c => c.id === cardId);
      if (card && card.value === 'K') {
        showWarning("먼저 ♠7 카드를 붙여야 합니다.");
        return false;
      }
    }
    return true;
  }, [restrictions.discard, tutorialStep, playerHand, showWarning]);

  const checkRegisterAllowed = useCallback((): boolean => {
    if (!restrictions.register.allowed) {
      showWarning(restrictions.register.message || "이 단계에서는 등록을 할 수 없습니다.");
      return false;
    }
    return true;
  }, [restrictions.register, showWarning]);

  const checkThankYouAllowed = useCallback((): boolean => {
    if (!restrictions.thankYou.allowed) {
      showWarning(restrictions.thankYou.message || "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      return false;
    }
    return true;
  }, [restrictions.thankYou, showWarning]);

  const checkSelectionAllowed = useCallback((cardId: number): boolean => {
    // 1단계 드로우 전 카드 선택 시도 방지
    if (tutorialStep === 1 && gamePhase === 'PLAYER_DRAW') {
      showWarning("먼저 덱을 눌러 카드를 가져와야 합니다.");
      return false;
    }

    if (allowedSelection !== null && !allowedSelection.includes(cardId)) {
      showWarning(restrictions.selectCard.message || "올바른 카드를 선택해 주세요.");
      return false;
    }
    return true;
  }, [tutorialStep, gamePhase, allowedSelection, restrictions.selectCard, showWarning]);

  const checkDragAllowed = useCallback((cardId: number): boolean => {
    if (!restrictions.drag.allowed) {
      showWarning(restrictions.drag.message || "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      return false;
    }

    if (allowedDragging !== null && !allowedDragging.includes(cardId)) {
      showWarning(restrictions.dragCard.message || "이 카드는 드래그할 수 없습니다.");
      return false;
    }
    return true;
  }, [restrictions.drag, allowedDragging, restrictions.dragCard, showWarning]);

  // --- 오버라이드 비즈니스 로직 함수들 ( 원본 useHulaGame 래핑 ) ---

  const drawCard = useCallback(() => {
    if (!checkDrawAllowed()) return;
    gameDrawCard();
  }, [checkDrawAllowed, gameDrawCard]);

  const discardCard = useCallback((cardId: number) => {
    if (!checkDiscardAllowed(cardId)) return;
    
    const originalHandLength = playerHand.length;

    // 1. 원본 버리기 수행
    gameDiscardCard(cardId);

    // 2. 페이즈 전환 사이드 이펙트 복구 및 완료 여부 판정
    if (tutorialStep === 1) {
      setIsStepCompleted(true);
      setGamePhase('PLAYER_DISCARD'); // 컴퓨터에게 차례가 넘어가지 않도록 유지
    } else if (tutorialStep === 5) {
      if (originalHandLength === 1) {
        setIsStepCompleted(true);
        setGamePhase('PLAYER_DISCARD'); // 게임오버 화면 대신 완료 팝업 유지
      }
    }
  }, [checkDiscardAllowed, playerHand.length, gameDiscardCard, tutorialStep, setGamePhase]);

  const registerMeld = useCallback((cards: Card[], isPlayer: boolean) => {
    if (!checkRegisterAllowed()) return;
    gameRegisterMeld(cards, isPlayer);
    if (isPlayer) {
      setIsStepCompleted(true);
    }
  }, [checkRegisterAllowed, gameRegisterMeld]);

  const thankYouRegister = useCallback((cardsInHand: Card[]) => {
    if (!checkThankYouAllowed()) return;
    gameThankYouRegister(cardsInHand);
    setIsStepCompleted(true);
  }, [checkThankYouAllowed, gameThankYouRegister]);

  const layoffCard = useCallback((cardId: number, meldIndex: number, isPlayerMeld: boolean, isPlayer: boolean): boolean => {
    // 1. 붙이기 시도 전, 원본 layoffCard 수행
    const isLayoffSuccess = gameLayoffCard(cardId, meldIndex, isPlayerMeld, isPlayer);

    // 2. 카드 이동이 성공했는지 체크
    if (!isLayoffSuccess) return false;

    if (tutorialStep === 3) {
      setIsStepCompleted(true);
    } else if (tutorialStep === 5) {
      // 5단계에서 ♠7 붙이기를 성공하면, 드래그 비활성화 및 버리기 활성화
      disableFeature('drag', "이미 ♠7 카드를 붙였습니다. 이제 남은 카드를 버리세요.");
      enableFeature('discard');
      setAllowedSelection([2]); // ♥K(2) 카드 탭 허용
      disableFeature('selectCard', "마지막 승리를 위해 남은 ♥K 카드를 선택해서 버려야 합니다.");
    }

    return true;
  }, [gameLayoffCard, tutorialStep, disableFeature, enableFeature]);

  return {
    ...game,
    tutorialStep,
    isStepCompleted,
    warningMessage,
    restrictions,
    disableFeature,
    enableFeature,
    setAllowedSelection,
    setAllowedDragging,
    startTutorial,
    nextTutorialStep,
    exitTutorial,
    checkDrawAllowed,
    checkDiscardAllowed,
    checkRegisterAllowed,
    checkThankYouAllowed,
    checkSelectionAllowed,
    checkDragAllowed,
    drawCard,
    discardCard,
    registerMeld,
    thankYouRegister,
    layoffCard,
  };
}
