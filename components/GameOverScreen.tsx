import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { Card } from '../types/game';

interface GameOverScreenProps {
  playerHand: Card[];
  computerHand: Card[];
  onRestart: () => void;
}

export default function GameOverScreen({
  playerHand,
  computerHand,
  onRestart
}: GameOverScreenProps) {
  const VALUE_MAP: Record<string, number> = {
    'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13
  };

  const getHandScore = (hand: Card[]) => {
    return hand.reduce((sum, card) => sum + (VALUE_MAP[card.value] || 0), 0);
  };

  const playerScore = getHandScore(playerHand);
  const computerScore = getHandScore(computerHand);
  const isDeckOut = playerHand.length > 0 && computerHand.length > 0;

  let playerWon = false;
  let isDraw = false;

  if (playerHand.length === 0) {
    playerWon = true;
  } else if (computerHand.length === 0) {
    playerWon = false;
  } else {
    // 덱의 카드가 다 떨어졌을 때, 손패 점수(합)가 낮은 사람이 승리
    if (playerScore < computerScore) {
      playerWon = true;
    } else if (playerScore > computerScore) {
      playerWon = false;
    } else {
      // 점수도 같으면 남은 카드 장수가 적은 사람이 승리
      if (playerHand.length < computerHand.length) {
        playerWon = true;
      } else if (playerHand.length > computerHand.length) {
        playerWon = false;
      } else {
        isDraw = true;
      }
    }
  }

  const getResultText = () => {
    if (isDraw) return '무승부입니다! 🤝';
    return playerWon ? '축하합니다! 당신이 이겼습니다! 🎉' : '아쉽네요! 컴퓨터가 이겼습니다. 🤖';
  };

  const resultStyle = isDraw
    ? styles.drawText
    : playerWon
      ? styles.winText
      : styles.loseText;

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>GAME OVER</Text>
        
        <Text style={[styles.resultText, resultStyle]}>
          {getResultText()}
        </Text>

        <View style={styles.scoreContainer}>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>내 남은 카드:</Text>
            <Text style={styles.scoreValue}>{playerHand.length}장</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={styles.scoreLabel}>상대 남은 카드:</Text>
            <Text style={styles.scoreValue}>{computerHand.length}장</Text>
          </View>

          {isDeckOut && (
            <>
              <View style={[styles.scoreRow, styles.dividerRow]}>
                <Text style={styles.scoreLabel}>내 카드 점수 합:</Text>
                <Text style={styles.scoreValue}>{playerScore}점</Text>
              </View>
              <View style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>상대 카드 점수 합:</Text>
                <Text style={styles.scoreValue}>{computerScore}점</Text>
              </View>
            </>
          )}
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
  drawText: {
    color: '#ffcc00',
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
  dividerRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    paddingTop: 8,
    marginTop: 8,
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
