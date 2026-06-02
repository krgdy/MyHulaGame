import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PlayerCard from '../../components/PlayerCard';
import OpponentCard from '../../components/OpponentCard';
import { useHulaGame } from '../../hooks/useHulaGame';
import { useMeasuredLayout } from '../../hooks/useMeasuredLayout';
import { isValidMeld, canLayoff } from '../../utils/hulaAI';
import { Card } from '../../types/game';
import GameOverScreen from '../../components/GameOverScreen';
import MainMenuScreen from '../../components/MainMenuScreen';

export default function HulaGameScreen() {
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
  } = useHulaGame();

  // 화면 크기 변경 시 강제 뷰 마운팅 및 네이티브 레이아웃 측정을 위한 훅
  const { width, height } = useWindowDimensions();

  // useMeasuredLayout 훅을 사용하여 각 컴포넌트의 위치와 크기 정보를 동적으로 추적
  const [opponentAreaRef, opponentAreaLayout] = useMeasuredLayout([width, height]);
  const [opponentMeldsRef, opponentMeldsLayout] = useMeasuredLayout([width, height]);
  const [boardAreaRef, boardAreaLayout] = useMeasuredLayout([width, height]);
  const [deckRef, deckRelative] = useMeasuredLayout([width, height]);
  const [discardRef, discardRelative] = useMeasuredLayout([width, height]);
  const [playerMeldsRef, playerMeldsLayout] = useMeasuredLayout([width, height]);
  const [playerAreaRef, playerAreaLayout] = useMeasuredLayout([width, height]);
  
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
      <View style={styles.container}>

        {/* 상대방 영역 */}
        <View
          ref={opponentAreaRef}
          style={styles.opponentArea}
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
          {warningMessage ? (
            <View style={styles.warningRow}>
              <Text style={[styles.guideText, styles.warningText]}>
                ⚠️ {warningMessage}
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
                  ? '카드를 탭하여 선택하거나 드래그하세요.'
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
  container: { flex: 1, backgroundColor: '#0f3818', justifyContent: 'space-between', paddingVertical: 20 },
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
});
