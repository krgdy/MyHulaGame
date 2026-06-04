/**
 * @file MeldsContainer.tsx
 * @description 플레이어와 컴퓨터가 바닥에 등록(Meld)한 카드 묶음들을 표시하는 가로 스크롤 영역 컴포넌트입니다.
 * - 등록된 세트가 없을 경우 기본 안내 텍스트("등록된 카드 없음")를 보여줍니다.
 * - 각 족보 묶음을 클릭(터치)하면 카드 폭을 넓혀 전체 카드가 보이도록 확장(Expansion) 기능을 지원합니다.
 * - 붙이기(Layoff) 드래그 드롭 판정을 위해 ScrollX 위치를 실시간 측정 콜백으로 피드백합니다.
 */
import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Card } from '../types/game';

interface MeldsContainerProps {
  melds: Card[][];
  emptyText: string;
  expandedIdx: number | null;
  onExpandToggle: (idx: number) => void;
  onScroll: (x: number) => void;
  meldKeyPrefix: string;
}

export const MeldsContainer = React.forwardRef<View, MeldsContainerProps>(({
  melds,
  emptyText,
  expandedIdx,
  onExpandToggle,
  onScroll,
  meldKeyPrefix
}, ref) => {
  return (
    <View
      ref={ref}
      style={styles.meldsContainer}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.meldsScrollContent}
        onScroll={(e) => {
          onScroll(e.nativeEvent.contentOffset.x);
        }}
        scrollEventThrottle={16}
      >
        {melds.length === 0 ? (
          <Text style={styles.emptyMeldText}>{emptyText}</Text>
        ) : (
          melds.map((meld, groupIdx) => {
            const isExpanded = groupIdx === expandedIdx;
            return (
              <TouchableOpacity
                key={`${meldKeyPrefix}-${groupIdx}`}
                activeOpacity={0.8}
                onPress={() => onExpandToggle(groupIdx)}
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
  );
});

export default MeldsContainer;

const styles = StyleSheet.create({
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
});
