/**
 * @file ActionPanel.tsx
 * @description 플레이어가 카드를 선택했을 때 노출되는 인게임 액션 버튼 패널 및 알림 가이드 컴포넌트입니다.
 * - 경고 메시지 발생 시 텍스트 경고 메시지를 노출합니다.
 * - 카드가 선택되지 않았을 때는 턴 정보 안내(덱 클릭 유도, 카드 선택 유도)와 함께 손패 카드 정렬(무늬순/숫자순) 버튼들을 노출합니다.
 * - 카드가 선택되었을 때는 턴 진행 상황에 맞춰 '취소', '등록', '버리기', '땡큐 등록' 등의 컨트롤 버튼들을 렌더링합니다.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface ActionPanelProps {
  activeWarning: string | null;
  selectedCardIdsLength: number;
  isActionProcessing: boolean;
  gamePhase: string;
  canThankYou: boolean;
  isValidMeldSelected: boolean;
  onCancelSelection: () => void;
  onThankYouRegister: () => void;
  onRegisterSelected: () => void;
  onDiscardSelected: () => void;
  onSortPlayerHand: (type: 'suit' | 'value') => void;
}

export default function ActionPanel({
  activeWarning,
  selectedCardIdsLength,
  isActionProcessing,
  gamePhase,
  canThankYou,
  isValidMeldSelected,
  onCancelSelection,
  onThankYouRegister,
  onRegisterSelected,
  onDiscardSelected,
  onSortPlayerHand,
}: ActionPanelProps) {
  return (
    <View style={styles.actionPanel}>
      {activeWarning ? (
        <View style={styles.warningRow}>
          <Text style={[styles.guideText, styles.warningText]}>
            ⚠️ {activeWarning}
          </Text>
        </View>
      ) : selectedCardIdsLength > 0 && !isActionProcessing ? (
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.cancelButton]}
            onPress={onCancelSelection}
          >
            <Text style={styles.buttonText}>취소</Text>
          </TouchableOpacity>

          {gamePhase === 'PLAYER_DRAW' ? (
            <TouchableOpacity
              style={[
                styles.actionButton,
                canThankYou ? styles.thankYouButton : styles.disabledButton
              ]}
              onPress={onThankYouRegister}
              disabled={!canThankYou}
            >
              <Text style={styles.buttonText}>땡큐 등록 ({selectedCardIdsLength + 1})</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  isValidMeldSelected ? styles.registerButton : styles.disabledButton
                ]}
                onPress={onRegisterSelected}
                disabled={!isValidMeldSelected}
              >
                <Text style={styles.buttonText}>등록 ({selectedCardIdsLength})</Text>
              </TouchableOpacity>

              {selectedCardIdsLength === 1 && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.discardButton]}
                  onPress={onDiscardSelected}
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
                onPress={() => onSortPlayerHand('suit')}
              >
                <Text style={styles.sortButtonText}>♠ 무늬</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.sortButton}
                onPress={() => onSortPlayerHand('value')}
              >
                <Text style={styles.sortButtonText}>🔢 숫자</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
