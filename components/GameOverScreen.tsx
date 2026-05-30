import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

interface GameOverScreenProps {
  playerWon: boolean;
  playerHandCount: number;
  computerHandCount: number;
  onRestart: () => void;
}

export default function GameOverScreen({
  playerWon,
  playerHandCount,
  computerHandCount,
  onRestart
}: GameOverScreenProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>GAME OVER</Text>
        
        <Text style={[styles.resultText, playerWon ? styles.winText : styles.loseText]}>
          {playerWon ? '축하합니다! 당신이 이겼습니다! 🎉' : '아쉽네요! 컴퓨터가 이겼습니다. 🤖'}
        </Text>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>내 남은 카드:</Text>
            <Text style={styles.scoreValue}>{playerHandCount}장</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>상대 남은 카드:</Text>
            <Text style={styles.scoreValue}>{computerHandCount}장</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={onRestart}>
          <Text style={styles.buttonText}>새 게임 시작</Text>
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
    marginBottom: 20,
    letterSpacing: 2,
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 28,
    lineHeight: 26,
  },
  winText: {
    color: '#4cd964',
  },
  loseText: {
    color: '#ff3b30',
  },
  scoreContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 6,
  },
  scoreLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  scoreValue: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
