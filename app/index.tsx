import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PlayerCard from '../components/PlayerCard';
import OpponentCard from '../components/OpponentCard';
import { useHulaGame } from '../hooks/useHulaGame';
import { useHulaTutorial } from '../hooks/useHulaTutorial';
import { useMeasuredLayout } from '../hooks/useMeasuredLayout';
import { isValidMeld, canLayoff } from '../utils/hulaAI';
import { Card } from '../types/game';
import GameOverScreen from '../components/GameOverScreen';
import MainMenuScreen from '../components/MainMenuScreen';

export default function HulaGameScreen() {
  const [isTutorial, setIsTutorial] = useState(false);

  // Initialize general game hook (suspend computer turn if tutorial is active)
  const game = useHulaGame({ isTutorial: isTutorial });

  // Initialize tutorial decorator hook
  const tutorial = useHulaTutorial(game);

  // Select active state source
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

  // Extract tutorial-specific states
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
  const [boardAreaRef, boardAreaLayout] = useMeasuredLayout(layoutDeps);
  const [deckRef, deckRelative] = useMeasuredLayout(layoutDeps);
  const [discardRef, discardRelative] = useMeasuredLayout(layoutDeps);
  const [playerMeldsRef, playerMeldsLayout] = useMeasuredLayout(layoutDeps);
  const [playerAreaRef, playerAreaLayout] = useMeasuredLayout(layoutDeps);

  const topDiscardCard = discardPile[discardPile.length - 1];

  // Calculate coordinates relative to container
  const isLayoutReady = !!(boardAreaLayout && deckRelative && discardRelative && playerAreaLayout && opponentAreaLayout);
  const deckX = boardAreaLayout && deckRelative ? boardAreaLayout.x + deckRelative.x : 0;
  const deckY = boardAreaLayout && deckRelative ? boardAreaLayout.y + deckRelative.y : 0;
  const discardX = boardAreaLayout && discardRelative ? boardAreaLayout.x + discardRelative.x : 0;
  const discardY = boardAreaLayout && discardRelative ? boardAreaLayout.y + discardRelative.y : 0;

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

  // 특정 등록 패 영역에서 가장 가까운 유효 등록 그룹 인덱스 반환
  const findClosestValidMeld = (
    card: Card,
    scrollDropX: number,
    melds: Card[][],
    expandedMeldIdx: number | null
  ): number => {
    let currentX = 12; // paddingHorizontal
    let closestIdx = -1;
    let minDistance = 99999;

    for (let i = 0; i < melds.length; i++) {
      const meld = melds[i];
      const isExpanded = i === expandedMeldIdx;
      const cardSpacing = isExpanded ? 36 : 14; // 펼쳤을 때(32+4) vs 겹쳤을 때(32-18)
      const width = 32 + (meld.length - 1) * cardSpacing + 8;

      const leftBound = currentX - 30;
      const rightBound = currentX + width + 30;

      // 가로 바운더리 내에 존재하고 붙이기가 가능할 때만 거리 비교 수행
      if (scrollDropX >= leftBound && scrollDropX <= rightBound) {
        if (canLayoff(card, meld)) {
          const centerX = currentX + width / 2;
          const dist = Math.abs(centerX - scrollDropX);
          if (dist < minDistance) {
            minDistance = dist;
            closestIdx = i;
          }
        }
      }
      currentX += width + 12; // gap(12)
    }

    return closestIdx;
  };

  // 내 손패 카드 슬롯 중 가장 가까운 인덱스 반환
  const findClosestHandSlot = (cardCenterX: number): number => {
    if (!playerAreaLayout) return -1;
    const totalCards = playerHand.length;
    if (totalCards <= 1) return -1;

    const maxHandWidth = playerAreaLayout.width * 0.85;
    const spacing = Math.min(42, (maxHandWidth - 68) / (totalCards - 1)); // CARD_WIDTH = 68
    const handStartX = playerAreaLayout.x + (playerAreaLayout.width - (spacing * (totalCards - 1) + 68)) / 2;

    let closestIdx = 0;
    let minDistance = 99999;

    for (let i = 0; i < totalCards; i++) {
      const slotCenterX = handStartX + i * spacing + 34; // CARD_WIDTH / 2
      const dist = Math.abs(slotCenterX - cardCenterX);
      if (dist < minDistance) {
        minDistance = dist;
        closestIdx = i;
      }
    }

    return closestIdx;
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
      const closestIdx = findClosestHandSlot(cardCenterX);
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
        {isTutorial && (
          <View style={styles.tutorialGuideContainer}>
            <View style={styles.tutorialGuideHeader}>
              <Text style={styles.tutorialStepText}>{TUTORIAL_GUIDES[tutorialStep]?.title}</Text>
              <TouchableOpacity onPress={exitTutorial} style={styles.tutorialExitButton}>
                <Text style={styles.tutorialExitText}>종료</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.tutorialDescText}>{TUTORIAL_GUIDES[tutorialStep]?.desc}</Text>
          </View>
        )}

        {/* 튜토리얼 완료 팝업 */}
        {isTutorial && isStepCompleted && (
          <View style={styles.overlayContainer}>
            <View style={styles.modalCard}>
              <Text style={styles.modalEmoji}>🎉</Text>
              <Text style={styles.modalTitle}>스텝 완료!</Text>
              <Text style={styles.modalDesc}>
                {tutorialStep === 1 && "훌라의 기본인 카드 드로우와 버리기를 마스터하셨습니다!"}
                {tutorialStep === 2 && "조건에 맞는 카드 묶음을 내려놓는 '등록(Meld)' 기능을 성공하셨습니다."}
                {tutorialStep === 3 && "바닥에 깔린 세트에 카드를 이어 붙여 패를 터는 '붙이기(Lay off)'를 완수하셨습니다."}
                {tutorialStep === 4 && "상대 버림패를 낚아채어 등록하는 짜릿한 '땡큐' 규칙을 숙지하셨습니다."}
                {tutorialStep === 5 && "모든 패를 털어내고 멋진 승리를 달성하셨습니다! 이제 실전으로 가볼까요?"}
              </Text>
              
              <TouchableOpacity 
                style={styles.modalButton} 
                onPress={nextTutorialStep}
              >
                <Text style={styles.modalButtonText}>
                  {tutorialStep === 5 ? "튜토리얼 완료 (메인으로)" : "다음 단계로"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 상대방 영역 (튜토리얼 시 사용하지 않으므로 여백 확보를 위해 숨김) */}
        <View
          ref={opponentAreaRef}
          style={[
            styles.opponentArea,
            isTutorial && { height: 0, marginTop: 0 }
          ]}
        />

        {/* 상대방 등록 카드 슬라이드 뷰 */}
        <View
          ref={opponentMeldsRef}
          style={styles.meldsContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.meldsScrollContent}
            onScroll={(e) => {
              opponentMeldsScrollX.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
          >
          {computerMelds.length === 0 ? (
            <Text style={styles.emptyMeldText}>등록된 상대 카드 없음</Text>
          ) : (
            computerMelds.map((meld, groupIdx) => {
              const isExpanded = groupIdx === expandedComputerMeldIdx;
              return (
                <TouchableOpacity
                  key={`comp-meld-${groupIdx}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setExpandedComputerMeldIdx(prev => prev === groupIdx ? null : groupIdx);
                  }}
                  style={styles.meldGroup}
                >
                  {meld.map((card, cardIdx) => (
                    <View
                      key={card.id}
                      style={[
                        styles.miniCard,
                        { marginLeft: cardIdx === 0 ? 0 : (isExpanded ? 4 : -18) }
                      ]}
                    >
                      <Text style={[styles.miniSuit, { color: card.color }]}>{card.suit}</Text>
                      <Text style={[styles.miniValue, { color: card.color }]}>{card.value}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              );
            })
          )}
          </ScrollView>
        </View>

        {/* 중앙 보드판 영역 */}
        <View
          ref={boardAreaRef}
          style={styles.boardArea}
        >
          {/* 남은 덱 더미 (누르면 드로우) */}
          <View ref={deckRef}>
            <TouchableOpacity
              style={styles.deck}
              onPress={() => {
                deselectAllCards();
                drawCard();
              }}
              disabled={gamePhase !== 'PLAYER_DRAW'}
            >
              <Text style={styles.deckText}>DECK</Text>
              <Text style={styles.deckCount}>{deck.length}</Text>
            </TouchableOpacity>
          </View>
          {/* 버림 카드 더미 */}
          <View
            ref={discardRef}
            style={[
              styles.discardPile,
              canThankYou && styles.discardPileHighlight
            ]}
          >
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

        {/* 내 등록 카드 슬라이드 뷰 */}
        <View
          ref={playerMeldsRef}
          style={styles.meldsContainer}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.meldsScrollContent}
            onScroll={(e) => {
              playerMeldsScrollX.current = e.nativeEvent.contentOffset.x;
            }}
            scrollEventThrottle={16}
          >
          {playerMelds.length === 0 ? (
            <Text style={styles.emptyMeldText}>등록된 내 카드 없음</Text>
          ) : (
            playerMelds.map((meld, groupIdx) => {
              const isExpanded = groupIdx === expandedPlayerMeldIdx;
              return (
                <TouchableOpacity
                  key={`player-meld-${groupIdx}`}
                  activeOpacity={0.8}
                  onPress={() => {
                    setExpandedPlayerMeldIdx(prev => prev === groupIdx ? null : groupIdx);
                  }}
                  style={styles.meldGroup}
                >
                  {meld.map((card, cardIdx) => (
                    <View
                      key={card.id}
                      style={[
                        styles.miniCard,
                        { marginLeft: cardIdx === 0 ? 0 : (isExpanded ? 4 : -18) }
                      ]}
                    >
                      <Text style={[styles.miniSuit, { color: card.color }]}>{card.suit}</Text>
                      <Text style={[styles.miniValue, { color: card.color }]}>{card.value}</Text>
                    </View>
                  ))}
                </TouchableOpacity>
              );
            })
          )}
          </ScrollView>
        </View>

        {/* 액션 버튼 패널 및 조작 가이드 */}
        <View style={styles.actionPanel}>
          {activeWarning ? (
            <View style={styles.warningRow}>
              <Text style={[styles.guideText, styles.warningText]}>
                ⚠️ {activeWarning}
              </Text>
            </View>
          ) : selectedCardIds.length > 0 && !isActionProcessing.current ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelSelection}
              >
                <Text style={styles.buttonText}>취소</Text>
              </TouchableOpacity>

              {gamePhase === 'PLAYER_DRAW' ? (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    canThankYou ? styles.thankYouButton : styles.disabledButton
                  ]}
                  onPress={handleThankYouRegister}
                  disabled={!canThankYou}
                >
                  <Text style={styles.buttonText}>땡큐 등록 ({selectedCardIds.length + 1})</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      isValidMeldSelected ? styles.registerButton : styles.disabledButton
                    ]}
                    onPress={handleRegisterSelected}
                    disabled={!isValidMeldSelected}
                  >
                    <Text style={styles.buttonText}>등록 ({selectedCardIds.length})</Text>
                  </TouchableOpacity>

                  {selectedCardIds.length === 1 && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.discardButton]}
                      onPress={handleDiscardSelected}
                    >
                      <Text style={styles.buttonText}>버리기</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          ) : (
            <View style={styles.nonSelectedRow}>
              <Text style={styles.guideText}>
                {gamePhase === 'PLAYER_DRAW'
                  ? '덱을 눌러 카드를 가져오세요.'
                  : gamePhase === 'PLAYER_DISCARD'
                  ? '카드를 탭하여 선택하세요.'
                  : '상대방의 턴입니다...'}
              </Text>
              {(gamePhase === 'PLAYER_DRAW' || gamePhase === 'PLAYER_DISCARD') && (
                <View style={styles.sortButtonRow}>
                  <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => sortPlayerHand('suit')}
                  >
                    <Text style={styles.sortButtonText}>♠ 무늬</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => sortPlayerHand('value')}
                  >
                    <Text style={styles.sortButtonText}>🔢 숫자</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

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
  boardArea: { flex: 1.2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 30 },
  deck: { width: 68, height: 100, backgroundColor: '#1a5e2f', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff', elevation: 4 },
  discardPile: { width: 68, height: 100, backgroundColor: '#2e2e2e', borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#ccc', elevation: 4 },
  discardPileHighlight: {
    borderColor: '#d4af37',
    borderWidth: 2.5,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
    elevation: 8,
  },
  playerArea: { height: 100, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  deckText: { color: '#fff', fontSize: 12, opacity: 0.8 },
  deckCount: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  discardCardInner: { width: '100%', height: '100%', backgroundColor: '#fff', borderRadius: 6, padding: 6, justifyContent: 'space-between' },
  discardSuit: { fontSize: 18, fontWeight: 'bold' },
  discardValue: { fontSize: 20, fontWeight: 'bold', textAlign: 'right', alignSelf: 'flex-end' },

  // 등록 영역 스타일
  meldsContainer: {
    height: 68,
    backgroundColor: '#0a2310',
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#1d4f29',
    borderRadius: 8,
    marginHorizontal: 16,
    justifyContent: 'center',
  },
  meldsScrollContent: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  meldGroup: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 6,
    padding: 4,
    marginRight: 12,
    alignItems: 'center',
    height: 56,
  },
  miniCard: {
    width: 32,
    height: 46,
    backgroundColor: '#fff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bbb',
    padding: 2,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 1.0,
    elevation: 2,
  },
  miniSuit: { fontSize: 10, fontWeight: 'bold', lineHeight: 10 },
  miniValue: { fontSize: 11, fontWeight: 'bold', textAlign: 'right', lineHeight: 11 },
  emptyMeldText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, fontStyle: 'italic' },

  // 액션 패널 스타일
  actionPanel: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2.0,
  },
  registerButton: {
    backgroundColor: '#007aff',
  },
  discardButton: {
    backgroundColor: '#ff3b30',
  },
  cancelButton: {
    backgroundColor: '#8e8e93',
  },
  disabledButton: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  thankYouButton: {
    backgroundColor: '#d4af37',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  guideText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  warningRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  warningText: {
    color: '#ff3b30',
    fontWeight: 'bold',
  },
  nonSelectedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
  },
  sortButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  sortButton: {
    backgroundColor: '#1a5e2f',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    elevation: 2,
  },
  sortButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  // 튜토리얼 가이드 스타일
  tutorialGuideContainer: {
    backgroundColor: '#0a2310',
    borderWidth: 1,
    borderColor: '#d4af37',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginTop: 10,
  },
  tutorialGuideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tutorialStepText: {
    color: '#d4af37',
    fontSize: 14,
    fontWeight: 'bold',
  },
  tutorialExitButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  tutorialExitText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  tutorialDescText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 16,
  },
  // 오버레이 및 모달
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  modalCard: {
    width: '85%',
    backgroundColor: '#164a23',
    borderWidth: 2,
    borderColor: '#d4af37',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  modalEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  modalTitle: {
    color: '#d4af37',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  modalDesc: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    opacity: 0.9,
  },
  modalButton: {
    backgroundColor: '#d4af37',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 20,
    shadowColor: '#d4af37',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalButtonText: {
    color: '#0f3818',
    fontSize: 15,
    fontWeight: 'bold',
  },
});

const TUTORIAL_GUIDES: Record<number, { title: string; desc: string }> = {
  1: {
    title: "1단계: 한 장 뽑고 버리기",
    desc: "훌라의 기본 차례 진행입니다.\n1. 중앙의 초록색 덱(DECK)을 눌러 카드를 가져오세요.\n2. 손패에서 필요 없는 카드를 한 장 탭하고 '버리기' 버튼을 누르세요."
  },
  2: {
    title: "2단계: 등록 (Meld) 하기",
    desc: "손패에 조건에 맞는 세트가 있으면 바닥에 내려놓을 수 있습니다.\n- 같은 숫자의 카드 3장\n- 같은 문양의 연속된 숫자 3장\n- 숫자 7\n♠7 카드를 선택해 '등록'하거나,\n- ♥3, ♦3, ♣3 세 장을 동시에 선택해 '등록'해 보세요."
  },
  3: {
    title: "3단계: 카드 붙이기 (Lay off)",
    desc: "바닥에 이미 등록된 세트에 내 손패를 드래그해서 붙일 수 있습니다.\n- ♠6 카드를 드래그해서 내 등록 세트 [♠3, ♠4, ♠5] 근처에 내려놓거나,\n- ♥J 카드를 드래그해서 상대 등록 세트 [♥Q, ♥K] 근처에 내려놓으세요."
  },
  4: {
    title: "4단계: 땡큐 (Thank You)",
    desc: "상대가 방금 버린 카드(♣10)와 내 손패 2장(♣8, ♣9)을 조합해 즉시 등록해 봅시다.\n1. 손패에서 ♣8, ♣9 카드를 선택하세요.\n2. 활성화된 '땡큐 등록' 버튼을 누르세요."
  },
  5: {
    title: "5단계: 카드 다 털고 승리하기",
    desc: "손패를 전부 없애면 승리합니다!\n1. ♠7 카드를 드래그하여 내 등록 세트 [♠4, ♠5, ♠6]에 붙이세요.\n2. 하나 남은 ♥K 카드를 선택하고 '버리기' 버튼을 누르세요."
  }
};
