import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import PlayerCard from '../../components/PlayerCard';
import OpponentCard from '../../components/OpponentCard';
import { useHulaGame } from '../../hooks/useHulaGame';
import { useMeasuredLayout } from '../../hooks/useMeasuredLayout';
import { isValidMeld, canLayoff } from '../../utils/hulaAI';

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

      let currentX = 12; // paddingHorizontal
      let closestIdx = -1;
      let minDistance = 99999;

      for (let i = 0; i < playerMelds.length; i++) {
        const meld = playerMelds[i];
        const isExpanded = i === expandedPlayerMeldIdx;
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

      if (closestIdx !== -1) {
        layoffCard(card.id, closestIdx, true, true);
        setSelectedCardIds(prev => prev.filter(id => id !== cardId));
        return;
      }
    }

    // 2. 상대 등록 영역에 드롭한 경우 (세로 오차 범위 40px 버퍼 추가)
    if (
      opponentMeldsLayout &&
      cardCenterY >= opponentMeldsLayout.y - 40 &&
      cardCenterY <= opponentMeldsLayout.y + opponentMeldsLayout.height + 40
    ) {
      const scrollDropX = cardCenterX - opponentMeldsLayout.x + opponentMeldsScrollX.current;

      let currentX = 12; // paddingHorizontal
      let closestIdx = -1;
      let minDistance = 99999;

      for (let i = 0; i < computerMelds.length; i++) {
        const meld = computerMelds[i];
        const isExpanded = i === expandedComputerMeldIdx;
        const cardSpacing = isExpanded ? 36 : 14;
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

      if (closestIdx !== -1) {
        layoffCard(card.id, closestIdx, false, true);
        setSelectedCardIds(prev => prev.filter(id => id !== cardId));
        return;
      }
    }
  };

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
          <TouchableOpacity
            ref={deckRef}
            style={styles.deck}
            onPress={drawCard}
            disabled={gamePhase !== 'PLAYER_DRAW'}
          >
            <Text style={styles.deckText}>DECK</Text>
            <Text style={styles.deckCount}>{deck.length}</Text>
          </TouchableOpacity>

          {/* 버림 카드 더미 */}
          <View
            ref={discardRef}
            style={styles.discardPile}
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
          {selectedCardIds.length > 0 && !isActionProcessing.current ? (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={handleCancelSelection}
              >
                <Text style={styles.buttonText}>취소</Text>
              </TouchableOpacity>

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
            </View>
          ) : (
            <Text style={styles.guideText}>
              {gamePhase === 'PLAYER_DRAW'
                ? '덱을 눌러 카드를 한 장 가져오세요.'
                : gamePhase === 'PLAYER_DISCARD'
                ? '카드를 탭하여 선택하거나, 드래그하여 등록된 카드에 붙이세요.'
                : '상대방의 턴입니다...'}
            </Text>
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
});
