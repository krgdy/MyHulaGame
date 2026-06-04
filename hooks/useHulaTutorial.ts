import { useState, useRef, useCallback } from 'react';
import { Card } from '../types/game';
import { useHulaGame } from './useHulaGame';
import { canLayoff } from '../utils/hulaAI';
import { TUTORIAL_PRESETS } from '../constants/tutorialPresets';

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

  // 공통 단계 완료(Step Completion) 확인 헬퍼
  const checkStepCompletion = useCallback((action: 'DISCARD' | 'REGISTER' | 'LAYOFF' | 'THANK_YOU'): boolean => {
    const preset = TUTORIAL_PRESETS.find(p => p.step === tutorialStep);
    if (!preset) return false;

    const { triggerAction, validate } = preset.completion;
    if (triggerAction === action) {
      if (!validate || validate(playerHand)) {
        setIsStepCompleted(true);
        return true;
      }
    }
    return false;
  }, [tutorialStep, playerHand]);

  const loadTutorialPreset = useCallback((step: number) => {
    setIsStepCompleted(false);

    const preset = TUTORIAL_PRESETS.find(p => p.step === step);
    if (!preset) return;

    // 1. 공통 카드 상태 및 페이즈 초기 세팅 바인딩
    setPlayerHand(preset.setup.playerHand);
    setDeck(preset.setup.deck);
    setDiscardPile(preset.setup.discardPile);
    setPlayerMelds(preset.setup.playerMelds);
    setComputerMelds(preset.setup.computerMelds);
    setComputerHand(preset.setup.computerHand);
    setGamePhase(preset.setup.gamePhase);

    // 2. 프리셋에 기재된 기능 제한사항 일괄 적용
    preset.restrictions.forEach(res => {
      if (res.allowed) {
        enableFeature(res.feature);
      } else {
        disableFeature(res.feature, res.message);
      }
    });

    setAllowedSelection(preset.allowedSelection);
    setAllowedDragging(preset.allowedDragging);
  }, [
    disableFeature, enableFeature,
    setPlayerHand, setDeck, setDiscardPile, setPlayerMelds, setComputerMelds, setComputerHand, setGamePhase,
    setAllowedSelection, setAllowedDragging
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
    
    // 버리기 전 completion 판정 확인
    const isCompleted = checkStepCompletion('DISCARD');

    // 1. 원본 gameDiscardCard를 호출하지 않고, 튜토리얼용 무해한 상태 변경 수행
    setPlayerHand(prevHand => {
      const cardToDiscard = prevHand.find(c => c.id === cardId);
      if (!cardToDiscard) return prevHand;

      const nextHand = prevHand.filter(c => c.id !== cardId);
      setDiscardPile(prevPile => [...prevPile, cardToDiscard]);
      return nextHand;
    });

    // 2. 버리기 완료로 스텝이 완료되었다면 컴퓨터 턴으로 넘어가지 않게 페이즈 고정
    setGamePhase('PLAYER_DISCARD');
  }, [checkDiscardAllowed, checkStepCompletion, setPlayerHand, setDiscardPile, setGamePhase]);

  const registerMeld = useCallback((cards: Card[], isPlayer: boolean) => {
    if (!checkRegisterAllowed()) return;
    gameRegisterMeld(cards, isPlayer);
    if (isPlayer) {
      checkStepCompletion('REGISTER');
    }
  }, [checkRegisterAllowed, gameRegisterMeld, checkStepCompletion]);

  const thankYouRegister = useCallback((cardsInHand: Card[]) => {
    if (!checkThankYouAllowed()) return;
    gameThankYouRegister(cardsInHand);
    checkStepCompletion('THANK_YOU');
  }, [checkThankYouAllowed, gameThankYouRegister, checkStepCompletion]);

  const layoffCard = useCallback((cardId: number, meldIndex: number, isPlayerMeld: boolean, isPlayer: boolean): boolean => {
    // 1. 붙이기 시도 전, 원본 layoffCard 수행
    const isLayoffSuccess = gameLayoffCard(cardId, meldIndex, isPlayerMeld, isPlayer);

    // 2. 카드 이동이 성공했는지 체크
    if (!isLayoffSuccess) return false;

    checkStepCompletion('LAYOFF');

    if (tutorialStep === 5) {
      // 5단계에서 ♠7 붙이기를 성공하면, 드래그 비활성화 및 버리기 활성화
      disableFeature('drag', "이미 ♠7 카드를 붙였습니다. 이제 남은 카드를 버리세요.");
      enableFeature('discard');
      setAllowedSelection([2]); // ♥K(2) 카드 탭 허용
      disableFeature('selectCard', "마지막 승리를 위해 남은 ♥K 카드를 선택해서 버려야 합니다.");
    }

    return true;
  }, [gameLayoffCard, tutorialStep, checkStepCompletion, disableFeature, enableFeature]);

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