import { useState, useRef } from 'react';
import { Card } from '../types/game';
import { useHulaGame } from './useHulaGame';
import { canLayoff } from '../utils/hulaAI';

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
  const [tutorialStep, setTutorialStep] = useState<number>(1);
  const [isStepCompleted, setIsStepCompleted] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const warningTimer = useRef<number | null>(null);

  // 제어 플래그 상태 (방법 B: 경고 메세지 직접 주입 가능하도록 설계)
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
  const disableFeature = (feature: keyof TutorialRestrictions, msg?: string) => {
    setRestrictions(prev => ({ ...prev, [feature]: { allowed: false, message: msg } }));
  };

  const enableFeature = (feature: keyof TutorialRestrictions) => {
    setRestrictions(prev => ({ ...prev, [feature]: { allowed: true } }));
  };

  const showWarning = (message: string) => {
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
    }
    setWarningMessage(message);
    warningTimer.current = setTimeout(() => {
      setWarningMessage(null);
      warningTimer.current = null;
    }, 2000) as any;
  };

  const makeCard = (id: number, suit: '♠' | '♥' | '♦' | '♣', value: string): Card => ({
    id,
    suit,
    value,
    color: (suit === '♥' || suit === '♦') ? 'red' : 'black'
  });

  const loadTutorialPreset = (step: number) => {
    setIsStepCompleted(false);

    // 스텝별 기능 제한 및 경고 메세지 바인딩 (방법 B 구현)
    if (step === 1) {
      enableFeature('draw');
      enableFeature('discard');
      disableFeature('drag', "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      disableFeature('register', "이 단계에서는 등록을 할 수 없습니다.");
      disableFeature('thankYou', "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      setAllowedSelection(null);
      setAllowedDragging(null);

      game.setPlayerHand([
        makeCard(1, '♣', '3'),
        makeCard(2, '♦', '5'),
        makeCard(3, '♥', '8'),
        makeCard(4, '♠', '9'),
        makeCard(5, '♣', 'Q'),
        makeCard(6, '♥', 'K'),
        makeCard(7, '♦', 'A'),
      ]);
      game.setDeck([makeCard(8, '♠', '2')]);
      game.setDiscardPile([]);
      game.setPlayerMelds([]);
      game.setComputerMelds([]);
      game.setComputerHand([]);
      game.setGamePhase('PLAYER_DRAW');
    } else if (step === 2) {
      disableFeature('draw', "이 단계에서는 드로우를 할 필요가 없습니다.");
      disableFeature('drag', "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      disableFeature('discard', "이 단계에서는 카드를 버릴 수 없습니다.");
      disableFeature('thankYou', "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      enableFeature('register');
      
      setAllowedSelection([1, 2, 3, 4]); // ♠7, ♥3, ♦3, ♣3
      disableFeature('selectCard', "등록 가능한 ♠7 카드 또는 숫자 3 세 개를 선택하세요.");
      setAllowedDragging(null);

      game.setPlayerHand([
        makeCard(1, '♠', '7'),
        makeCard(2, '♥', '3'),
        makeCard(3, '♦', '3'),
        makeCard(4, '♣', '3'),
        makeCard(5, '♠', 'J'),
        makeCard(6, '♣', 'Q'),
        makeCard(7, '♥', 'A'),
      ]);
      game.setDeck([makeCard(8, '♠', 'K')]);
      game.setDiscardPile([]);
      game.setPlayerMelds([]);
      game.setComputerMelds([]);
      game.setComputerHand([]);
      game.setGamePhase('PLAYER_DISCARD');
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

      game.setPlayerHand([
        makeCard(1, '♠', '6'),
        makeCard(2, '♥', 'J'),
        makeCard(3, '♦', '9'),
      ]);
      game.setPlayerMelds([
        [makeCard(4, '♠', '3'), makeCard(5, '♠', '4'), makeCard(6, '♠', '5')]
      ]);
      game.setComputerMelds([
        [makeCard(7, '♥', 'Q'), makeCard(8, '♥', 'K')]
      ]);
      game.setDeck([makeCard(9, '♦', 'K')]);
      game.setDiscardPile([]);
      game.setComputerHand([]);
      game.setGamePhase('PLAYER_DISCARD');
    } else if (step === 4) {
      disableFeature('draw', "이 단계에서는 드로우를 할 필요가 없습니다.");
      disableFeature('drag', "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      disableFeature('discard', "이 단계에서는 카드를 버릴 수 없습니다.");
      disableFeature('register', "이 단계에서는 등록을 할 수 없습니다.");
      enableFeature('thankYou');
      
      setAllowedSelection([1, 2]); // ♣8, ♣9 탭 허용
      disableFeature('selectCard', "땡큐 등록을 위해 ♣8과 ♣9 카드만 선택해 주세요.");
      setAllowedDragging(null);

      game.setPlayerHand([
        makeCard(1, '♣', '8'),
        makeCard(2, '♣', '9'),
        makeCard(3, '♥', '5'),
        makeCard(4, '♦', 'J'),
      ]);
      game.setDiscardPile([makeCard(5, '♣', '10')]);
      game.setPlayerMelds([]);
      game.setComputerMelds([]);
      game.setDeck([makeCard(6, '♦', 'A')]);
      game.setComputerHand([]);
      game.setGamePhase('PLAYER_DRAW');
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

      game.setPlayerHand([
        makeCard(1, '♠', '7'),
        makeCard(2, '♥', 'K'),
      ]);
      game.setPlayerMelds([
        [makeCard(3, '♠', '4'), makeCard(4, '♠', '5'), makeCard(5, '♠', '6')]
      ]);
      game.setComputerMelds([]);
      game.setDeck([makeCard(6, '♣', 'A')]);
      game.setDiscardPile([]);
      game.setComputerHand([]);
      game.setGamePhase('PLAYER_DISCARD');
    }
  };

  const startTutorial = () => {
    setTutorialStep(1);
    setIsStepCompleted(false);
    loadTutorialPreset(1);
  };

  const nextTutorialStep = () => {
    if (tutorialStep < 5) {
      const nextStep = tutorialStep + 1;
      setTutorialStep(nextStep);
      setIsStepCompleted(false);
      loadTutorialPreset(nextStep);
    } else {
      exitTutorial();
    }
  };

  const exitTutorial = () => {
    setTutorialStep(0);
    setIsStepCompleted(false);
    game.setGamePhase('MENU_SCREEN');
  };

  // --- 가드 검증 API 들 ( index.tsx 에서 호출하여 사용 ) ---

  const checkDrawAllowed = (): boolean => {
    if (!restrictions.draw.allowed) {
      showWarning(restrictions.draw.message || "이 단계에서는 드로우를 할 수 없습니다.");
      return false;
    }
    return true;
  };

  const checkDiscardAllowed = (cardId: number): boolean => {
    if (!restrictions.discard.allowed) {
      showWarning(restrictions.discard.message || "이 단계에서는 카드를 버릴 수 없습니다.");
      return false;
    }
    // 5단계에서 K 이전에 7을 버리려고 시도하는 것을 방지하는 가이드 처리
    if (tutorialStep === 5 && game.playerHand.some(c => c.value === '7')) {
      const card = game.playerHand.find(c => c.id === cardId);
      if (card && card.value === 'K') {
        showWarning("먼저 ♠7 카드를 붙여야 합니다.");
        return false;
      }
    }
    return true;
  };

  const checkRegisterAllowed = (): boolean => {
    if (!restrictions.register.allowed) {
      showWarning(restrictions.register.message || "이 단계에서는 등록을 할 수 없습니다.");
      return false;
    }
    return true;
  };

  const checkThankYouAllowed = (): boolean => {
    if (!restrictions.thankYou.allowed) {
      showWarning(restrictions.thankYou.message || "이 단계에서는 땡큐 등록을 할 수 없습니다.");
      return false;
    }
    return true;
  };

  const checkSelectionAllowed = (cardId: number): boolean => {
    // 1단계 드로우 전 카드 선택 시도 방지
    if (tutorialStep === 1 && game.gamePhase === 'PLAYER_DRAW') {
      showWarning("먼저 덱을 눌러 카드를 가져와야 합니다.");
      return false;
    }

    if (allowedSelection !== null && !allowedSelection.includes(cardId)) {
      showWarning(restrictions.selectCard.message || "올바른 카드를 선택해 주세요.");
      return false;
    }
    return true;
  };

  const checkDragAllowed = (cardId: number): boolean => {
    if (!restrictions.drag.allowed) {
      showWarning(restrictions.drag.message || "이 단계에서는 카드를 드래그하여 붙일 수 없습니다.");
      return false;
    }

    if (allowedDragging !== null && !allowedDragging.includes(cardId)) {
      showWarning(restrictions.dragCard.message || "이 카드는 드래그할 수 없습니다.");
      return false;
    }
    return true;
  };

  // --- 오버라이드 비즈니스 로직 함수들 ( 원본 useHulaGame 래핑 ) ---

  const drawCard = () => {
    if (!checkDrawAllowed()) return;
    game.drawCard();
  };

  const discardCard = (cardId: number) => {
    if (!checkDiscardAllowed(cardId)) return;
    
    const originalHandLength = game.playerHand.length;

    // 1. 원본 버리기 수행 (페이즈가 COMPUTER_TURN 혹은 GAME_OVER 로 넘어감)
    game.discardCard(cardId);

    // 2. 페이즈 전환 사이드 이펙트 복구 및 완료 여부 판정
    if (tutorialStep === 1) {
      setIsStepCompleted(true);
      game.setGamePhase('PLAYER_DISCARD'); // 컴퓨터에게 차례가 넘어가지 않도록 유지
    } else if (tutorialStep === 5) {
      if (originalHandLength === 1) {
        setIsStepCompleted(true);
        game.setGamePhase('PLAYER_DISCARD'); // 게임오버 화면 대신 완료 팝업 유지
      }
    }
  };

  const registerMeld = (cards: Card[], isPlayer: boolean) => {
    if (!checkRegisterAllowed()) return;
    game.registerMeld(cards, isPlayer);
    if (isPlayer) {
      setIsStepCompleted(true);
    }
  };

  const thankYouRegister = (cardsInHand: Card[]) => {
    if (!checkThankYouAllowed()) return;
    game.thankYouRegister(cardsInHand);
    setIsStepCompleted(true);
  };

  const layoffCard = (cardId: number, meldIndex: number, isPlayerMeld: boolean, isPlayer: boolean): boolean => {
    // 1. 붙이기 시도 전, 원본 layoffCard 수행 (상태 조작 위임 및 동적 결과 수신)
    const isLayoffSuccess = game.layoffCard(cardId, meldIndex, isPlayerMeld, isPlayer);

    // 2. 카드 이동이 성공했는지 체크
    if (!isLayoffSuccess) return false;

    if (tutorialStep === 3) {
      setIsStepCompleted(true);
    } else if (tutorialStep === 5) {
      // 5단계에서 ♠7 붙이기를 성공하면, 드래그 비활성화 및 버리기 활성화 (방법 B 동적 리스트/에러메시지 갱신)
      disableFeature('drag', "이미 ♠7 카드를 붙였습니다. 이제 남은 카드를 버리세요.");
      enableFeature('discard');
      setAllowedSelection([2]); // ♥K(2) 카드 탭 허용
      disableFeature('selectCard', "마지막 승리를 위해 남은 ♥K 카드를 선택해서 버려야 합니다.");
    }

    return true;
  };

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
