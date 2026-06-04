/**
 * @file TutorialCompleteModal.tsx
 * @description 튜토리얼의 각 미션 단계 완료 시 띄우는 오버레이 팝업 모달 컴포넌트입니다.
 * - 성공 축하 메시지와 배운 규칙 요약 텍스트를 노출합니다.
 * - '다음 단계로' 또는 '튜토리얼 완료' 버튼을 클릭하면 다음 미션 혹은 메인 메뉴로 분기 처리를 실행합니다.
 */
import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface TutorialCompleteModalProps {
  isTutorial: boolean;
  isStepCompleted: boolean;
  tutorialStep: number;
  onNext: () => void;
}

export default function TutorialCompleteModal({
  isTutorial,
  isStepCompleted,
  tutorialStep,
  onNext
}: TutorialCompleteModalProps) {
  if (!isTutorial || !isStepCompleted) return null;

  return (
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
          onPress={onNext}
        >
          <Text style={styles.modalButtonText}>
            {tutorialStep === 5 ? "튜토리얼 완료 (메인으로)" : "다음 단계로"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
