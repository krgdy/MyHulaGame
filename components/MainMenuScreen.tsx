import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface MainMenuScreenProps {
  onStart: () => void;
  onStartTutorial: () => void;
}

export default function MainMenuScreen({ onStart, onStartTutorial }: MainMenuScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>HOOLA GAME</Text>
        
        <Text style={styles.subtitle}>
          클래식 카드 훌라 게임에 오신 것을 환영합니다!
        </Text>

        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>게임 규칙 요약</Text>
          <View style={styles.infoRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>각 플레이어는 처음에 7장의 카드를 받습니다.</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>자신의 턴에 덱에서 카드를 한 장 가져온 후, 한 장을 버려야 합니다.</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>같은 숫자 3장 이상, 또는 같은 무늬의 연속된 숫자 3장 이상(스트레이트 플러시), 혹은 7을 등록할 수 있습니다.</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>이미 등록된 카드 묶음에 조건이 맞는 내 카드를 붙일 수 있습니다.</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.infoText}>손패의 카드를 모두 먼저 없애는 쪽이 승리합니다!</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onStart}>
          <Text style={styles.buttonText}>게임 시작</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.tutorialButton]} 
          activeOpacity={0.8} 
          onPress={onStartTutorial}
        >
          <Text style={styles.buttonText}>튜토리얼 시작</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f3818',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 2,
    borderColor: '#d4af37',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#d4af37',
    marginBottom: 12,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.9,
    lineHeight: 20,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    padding: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  infoTitle: {
    color: '#d4af37',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  bullet: {
    color: '#d4af37',
    fontSize: 14,
    marginRight: 6,
    lineHeight: 18,
  },
  infoText: {
    flex: 1,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#007aff',
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: 24,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007aff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tutorialButton: {
    backgroundColor: '#d4af37',
    marginTop: 12,
    shadowColor: '#d4af37',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
