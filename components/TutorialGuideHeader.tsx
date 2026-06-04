import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface TutorialGuideHeaderProps {
  isTutorial: boolean;
  tutorialStep: number;
  onExit: () => void;
}

export const TUTORIAL_GUIDES: Record<number, { title: string; desc: string }> = {
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

export default function TutorialGuideHeader({
  isTutorial,
  tutorialStep,
  onExit
}: TutorialGuideHeaderProps) {
  if (!isTutorial) return null;

  const guide = TUTORIAL_GUIDES[tutorialStep];

  return (
    <View style={styles.tutorialGuideContainer}>
      <View style={styles.tutorialGuideHeader}>
        <Text style={styles.tutorialStepText}>{guide?.title}</Text>
        <TouchableOpacity onPress={onExit} style={styles.tutorialExitButton}>
          <Text style={styles.tutorialExitText}>종료</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.tutorialDescText}>{guide?.desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
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
});
