/**
 * @file index.tsx
 * @description 훌라 카드 게임의 메인 스크린 컴포넌트입니다.
 * - 게임 진행에 따라 메인 메뉴, 인게임 보드, 게임 오버 화면 등을 라우팅합니다.
 * - 튜토리얼 유도 및 팝업 제어와 인게임 제스처(탭 선택, 붙이기 드래그앤드롭)의 이벤트 조율을 담당합니다.
 * - 리팩토링된 하위 레이아웃 컴포넌트들을 평평하게 나열하여 JSX 중첩 깊이를 2단계 이하로 평탄화하였습니다.
 * - Safe Area Insets를 감지하여 투명 네비게이션 바 하단에 적절한 패딩을 채워 넣음으로써 레이아웃 붕괴를 원천 방지합니다.
 */
import React, { useState, useRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlayerCard from '../components/PlayerCard';
import OpponentCard from '../components/OpponentCard';
import { useHulaGame } from '../hooks/useHulaGame';
import { useHulaTutorial } from '../hooks/useHulaTutorial';
import { useMeasuredLayout } from '../hooks/useMeasuredLayout';
import { isValidMeld } from '../utils/hulaAI';
import { findClosestValidMeld, findClosestHandSlot } from '../utils/hulaLayout';
import { Card } from '../types/game';
import GameOverScreen from '../components/GameOverScreen';
import MainMenuScreen from '../components/MainMenuScreen';
import TutorialGuideHeader from '../components/TutorialGuideHeader';
import TutorialCompleteModal from '../components/TutorialCompleteModal';
import MeldsContainer from '../components/MeldsContainer';
import BoardArea from '../components/BoardArea';
import ActionPanel from '../components/ActionPanel';

export default function HulaGameScreen() {
  const [isTutorial, setIsTutorial] = useState(false);

  // 전반적인 게임 상태 관리 훅 (isTutorial 인수로 컴퓨터 턴, 게임 오버 체크 비활성화)
  const game = useHulaGame({ isTutorial: isTutorial });

  // 튜토리얼용 데코레이터 훅
  const tutorial = useHulaTutorial(game);

  // 튜토리얼인지에 따라 실제 게임 로직 결정
  const activeGame = isTutorial ? tutorial : game;

  const {
    gamePhase,
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
    computerDiscarding,
    reorderPlayerHand,
    sortPlayerHand,
    initGame,
    thankYouRegister,
  } = activeGame;

  // 튜토리얼에서만 사용하는 상태, 함수 추출
  const {
    tutorialStep,
    isStepCompleted,
    warningMessage: tutorialWarning,
    startTutorial: triggerStartTutorial,
    nextTutorialStep,
    exitTutorial: triggerExitTutorial,
    checkDiscardAllowed,
    checkSelectionAllowed,
    checkDragAllowed,
    checkDrawAllowed,
  } = tutorial;

  const startTutorial = () => {
    setIsTutorial(true);
    triggerStartTutorial();
  };

  const exitTutorial = () => {
    setIsTutorial(false);
    triggerExitTutorial();
  };

  // 화면 크기 변경 시 강제 뷰 마운팅 및 네이티브 레이아웃 측정을 위한 훅
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  
  const playerMeldsScrollX = useRef(0);
  const opponentMeldsScrollX = useRef(0);

  // 선택된 카드들 및 버리기 애니메이션 대기 상태
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [discardingCardId, setDiscardingCardId] = useState<number>(0);
  const isActionProcessing = useRef(false);

  // 등록 패 클릭 시 펼침 상태 관리
  const [expandedPlayerMeldIdx, setExpandedPlayerMeldIdx] = useState<number | null>(null);
  const [expandedComputerMeldIdx, setExpandedComputerMeldIdx] = useState<number | null>(null);

  // 경고 메시지 상태 및 타이머 관리
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const warningTimer = useRef<number | null>(null);

  const showWarning = (message: string) => {
    if (warningTimer.current) {
      clearTimeout(warningTimer.current);
    }
    setWarningMessage(message);
    warningTimer.current = setTimeout(() => {
      setWarningMessage(null);
      warningTimer.current = null;
    }, 2000);
  };

  // 동기 카드 선택 해제 함수
  const deselectAllCards = () => {
    setSelectedCardIds([]);
  };

  const activeWarning = isTutorial ? tutorialWarning : warningMessage;

  // 레이아웃에 영향을 주는 요소를 의존성 배열에 추가하여 레이아웃이 밀릴 때도 실시간 측정이 되도록 보장
  const layoutDeps = [
    width,
    height,
    selectedCardIds.length > 0,
    activeWarning,
    isTutorial,
    insets.top,
    insets.bottom
  ];

  // useMeasuredLayout 훅을 사용하여 각 컴포넌트의 위치와 크기 정보를 동적으로 추적
  const [opponentAreaRef, opponentAreaLayout] = useMeasuredLayout(layoutDeps);
  const [opponentMeldsRef, opponentMeldsLayout] = useMeasuredLayout(layoutDeps);
  const [boardAreaRef] = useMeasuredLayout(layoutDeps);
  const [deckRef, deckLayout] = useMeasuredLayout(layoutDeps);
  const [discardRef, discardLayout] = useMeasuredLayout(layoutDeps);
  const [playerMeldsRef, playerMeldsLayout] = useMeasuredLayout(layoutDeps);
  const [playerAreaRef, playerAreaLayout] = useMeasuredLayout(layoutDeps);

  const topDiscardCard = discardPile[discardPile.length - 1];

  // 절대 좌표를 활용하여 위치 정보를 즉시 할당 (더 이상 부모 좌표를 더할 필요 없음)
  const isLayoutReady = !!(deckLayout && discardLayout && playerAreaLayout && opponentAreaLayout);
  const deckX = deckLayout ? deckLayout.x : 0;
  const deckY = deckLayout ? deckLayout.y : 0;
  const discardX = discardLayout ? discardLayout.x : 0;
  const discardY = discardLayout ? discardLayout.y : 0;

  // 선택된 카드들의 유효성 확인
  const selectedCards = playerHand.filter(c => selectedCardIds.includes(c.id));
  const isValidMeldSelected = isValidMeld(selectedCards);

  // 땡큐 등록 조건: PLAYER_DRAW 페이즈이고, 버림패가 존재하며, 선택한 2장 이상의 카드 + 버림패 맨 위 카드가 유효한 족보일 때
  const canThankYou =
    gamePhase === 'PLAYER_DRAW' &&
    !!topDiscardCard &&
    selectedCardIds.length >= 2 &&
    isValidMeld([...selectedCards, topDiscardCard]);

  const handleThankYouRegister = () => {
    if (isActionProcessing.current) return;
    if (canThankYou) {
      isActionProcessing.current = true;
      thankYouRegister(selectedCards);
      deselectAllCards();
      isActionProcessing.current = false;
    }
  };

  // 선택 해제
  const handleCancelSelection = () => {
    if (isActionProcessing.current) return;
    deselectAllCards();
  };

  // 다중 카드 등록
  const handleRegisterSelected = () => {
    if (isActionProcessing.current) return;
    if (isValidMeldSelected) {
      isActionProcessing.current = true;
      registerMeld(selectedCards, true);
      deselectAllCards();
      isActionProcessing.current = false;
    }
  };

  // 선택한 단일 카드 버리기 트리거
  const handleDiscardSelected = () => {
    if (isActionProcessing.current) return;
    if (selectedCardIds.length === 1) {
      const cardId = selectedCardIds[0];
      if (isTutorial && !checkDiscardAllowed(cardId)) {
        return;
      }
      isActionProcessing.current = true;
      deselectAllCards(); // 즉시 선택 해제하여 패널 감춤
      setDiscardingCardId(cardId);
    }
  };

  // 버리기 애니메이션 완료 후 상태 처리 콜백
  const handleOnDiscard = (cardId: number) => {
    setDiscardingCardId(0);
    discardCard(cardId);
    isActionProcessing.current = false; // 버리기 완료 후 처리 해제
  };

  // 카드 탭 토글
  const handleToggleSelect = (cardId: number) => {
    if (isActionProcessing.current) return;
    if (isTutorial && !checkSelectionAllowed(cardId)) {
      return;
    }
    if (selectedCardIds.includes(cardId)) {
      setSelectedCardIds(selectedCardIds.filter(id => id !== cardId));
    } else {
      setSelectedCardIds([...selectedCardIds, cardId]);
    }
  };

  // 내 손패 드래그 종료 시 (붙이기 시도)
  const handleDragEnd = (cardId: number, dropX: number, dropY: number) => {
    if (isActionProcessing.current) return;
    if (isTutorial && !checkDragAllowed(cardId)) {
      return;
    }
    const card = playerHand.find(c => c.id === cardId);
    if (!card) return;

    // 드래그된 카드의 중심 좌표
    const cardCenterX = dropX + 34; // CARD_WIDTH / 2
    const cardCenterY = dropY + 50; // CARD_HEIGHT / 2

    // 1. 내 등록 영역에 드롭한 경우 (세로 오차 범위 40px 버퍼 추가)
    if (
      playerMeldsLayout &&
      cardCenterY >= playerMeldsLayout.y - 40 &&
      cardCenterY <= playerMeldsLayout.y + playerMeldsLayout.height + 40
    ) {
      const scrollDropX = cardCenterX - playerMeldsLayout.x + playerMeldsScrollX.current;
      const closestIdx = findClosestValidMeld(card, scrollDropX, playerMelds, expandedPlayerMeldIdx);
      if (closestIdx !== -1) {
        if (playerMelds.length === 0) {
          showWarning("내 등록 세트가 최소 1개 이상 있어야 붙일 수 있습니다.");
        } else {
          layoffCard(card.id, closestIdx, true, true);
          setSelectedCardIds(prev => prev.filter(id => id !== cardId));
        }
      }
      return;
    }

    // 2. 상대 등록 영역에 드롭한 경우 (세로 오차 범위 40px 버퍼 추가)
    if (
      opponentMeldsLayout &&
      cardCenterY >= opponentMeldsLayout.y - 40 &&
      cardCenterY <= opponentMeldsLayout.y + opponentMeldsLayout.height + 40
    ) {
      const scrollDropX = cardCenterX - opponentMeldsLayout.x + opponentMeldsScrollX.current;
      const closestIdx = findClosestValidMeld(card, scrollDropX, computerMelds, expandedComputerMeldIdx);
      if (closestIdx !== -1) {
        if (playerMelds.length === 0) {
          showWarning("내 등록 세트가 최소 1개 이상 있어야 붙일 수 있습니다.");
        } else {
          layoffCard(card.id, closestIdx, false, true);
          setSelectedCardIds(prev => prev.filter(id => id !== cardId));
        }
      }
      return;
    }

    // 3. 내 손패 영역에 드롭한 경우 (수동 순서 변경)
    if (
      playerAreaLayout &&
      cardCenterY >= playerAreaLayout.y - 50 &&
      cardCenterY <= playerAreaLayout.y + playerAreaLayout.height + 50
    ) {
      const closestIdx = findClosestHandSlot(cardCenterX, playerAreaLayout, playerHand.length);
      if (closestIdx !== -1) {
        reorderPlayerHand(card.id, closestIdx);
      }
      return;
    }
  };

  if (gamePhase === 'MENU_SCREEN') {
    return (
      <MainMenuScreen
        onStart={initGame}
        onStartTutorial={startTutorial}
      />
    );
  }

  if (gamePhase === 'GAME_OVER') {
    return (
      <GameOverScreen
        playerHand={playerHand}
        computerHand={computerHand}
        onRestart={initGame}
      />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 16),
          paddingBottom: Math.max(insets.bottom, 16),
        }
      ]}>

        {/* 튜토리얼 가이드 헤더 */}
        <TutorialGuideHeader
          isTutorial={isTutorial}
          tutorialStep={tutorialStep}
          onExit={exitTutorial}
        />

        {/* 튜토리얼 완료 팝업 */}
        <TutorialCompleteModal
          isTutorial={isTutorial}
          isStepCompleted={isStepCompleted}
          tutorialStep={tutorialStep}
          onNext={nextTutorialStep}
        />

        {/* 상대방 영역 (튜토리얼 시 사용하지 않으므로 여백 확보를 위해 숨김) */}
        <View
          ref={opponentAreaRef}
          style={[
            styles.opponentArea,
            isTutorial && { height: 0, marginTop: 0 }
          ]}
        />

        {/* 상대방 등록 카드 슬라이드 뷰 */}
        <MeldsContainer
          ref={opponentMeldsRef}
          melds={computerMelds}
          emptyText="등록된 상대 카드 없음"
          expandedIdx={expandedComputerMeldIdx}
          onExpandToggle={(idx) => setExpandedComputerMeldIdx(prev => prev === idx ? null : idx)}
          onScroll={(x) => { opponentMeldsScrollX.current = x; }}
          meldKeyPrefix="comp-meld"
        />

        {/* 중앙 보드판 영역 */}
        <BoardArea
          boardAreaRef={boardAreaRef}
          deckRef={deckRef}
          discardRef={discardRef}
          deckLength={deck.length}
          topDiscardCard={topDiscardCard}
          onDrawCard={() => {
            deselectAllCards();
            drawCard();
          }}
          isPlayerDrawPhase={gamePhase === 'PLAYER_DRAW'}
          canThankYou={canThankYou}
        />

        {/* 내 등록 카드 슬라이드 뷰 */}
        <MeldsContainer
          ref={playerMeldsRef}
          melds={playerMelds}
          emptyText="등록된 내 카드 없음"
          expandedIdx={expandedPlayerMeldIdx}
          onExpandToggle={(idx) => setExpandedPlayerMeldIdx(prev => prev === idx ? null : idx)}
          onScroll={(x) => { playerMeldsScrollX.current = x; }}
          meldKeyPrefix="player-meld"
        />

        {/* 액션 버튼 패널 및 조작 가이드 */}
        <ActionPanel
          activeWarning={activeWarning}
          selectedCardIdsLength={selectedCardIds.length}
          isActionProcessing={isActionProcessing.current}
          gamePhase={gamePhase}
          canThankYou={canThankYou}
          isValidMeldSelected={isValidMeldSelected}
          onCancelSelection={handleCancelSelection}
          onThankYouRegister={handleThankYouRegister}
          onRegisterSelected={handleRegisterSelected}
          onDiscardSelected={handleDiscardSelected}
          onSortPlayerHand={sortPlayerHand}
        />

        {/* 플레이어 영역 */}
        <View
          ref={playerAreaRef}
          style={styles.playerArea}
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
            onDiscard={handleOnDiscard}
            gamePhase={gamePhase}
            deckX={deckX}
            deckY={deckY}
            discardX={discardX}
            discardY={discardY}
            playerAreaLayout={playerAreaLayout}
            isSelected={selectedCardIds.includes(card.id)}
            onToggleSelect={handleToggleSelect}
            onDragEnd={handleDragEnd}
            discarding={discardingCardId}
          />
        ))}
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f3818', justifyContent: 'space-between' },
  opponentArea: { height: 82, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  playerArea: { height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
});
