import { Card, GamePhase } from '../types/game';
import { getCardColor } from './game';

export interface FeatureRestriction {
  feature: 'draw' | 'drag' | 'discard' | 'register' | 'thankYou' | 'selectCard' | 'dragCard';
  allowed: boolean;
  message?: string;
}

export interface TutorialPreset {
  step: number;
  setup: {
    playerHand: Card[];
    computerHand: Card[];
    deck: Card[];
    discardPile: Card[];
    playerMelds: Card[][];
    computerMelds: Card[][];
    gamePhase: GamePhase;
  };
  restrictions: FeatureRestriction[];
  allowedSelection: number[] | null;
  allowedDragging: number[] | null;
  completion: {
    triggerAction: 'DISCARD' | 'REGISTER' | 'LAYOFF' | 'THANK_YOU';
    validate?: (playerHand: Card[]) => boolean;
  };
}

const makeCard = (id: number, suit: '♠' | '♥' | '♦' | '♣', value: string): Card => ({
  id,
  suit,
  value,
  color: getCardColor(suit)
});

export const TUTORIAL_PRESETS: TutorialPreset[] = [
  {
    step: 1,
    setup: {
      playerHand: [
        makeCard(1, '♣', '3'),
        makeCard(2, '♦', '5'),
        makeCard(3, '♥', '8'),
        makeCard(4, '♠', '9'),
        makeCard(5, '♣', 'Q'),
        makeCard(6, '♥', 'K'),
        makeCard(7, '♦', 'A'),
      ],
      computerHand: [],
      deck: [makeCard(8, '♠', '2')],
      discardPile: [],
      playerMelds: [],
      computerMelds: [],
      gamePhase: 'PLAYER_DRAW'
    },
    restrictions: [
      { feature: 'draw', allowed: true },
      { feature: 'discard', allowed: true },
      { feature: 'drag', allowed: false, message: "이 단계에서는 카드를 드래그하여 붙일 수 없습니다." },
      { feature: 'register', allowed: false, message: "이 단계에서는 등록을 할 수 없습니다." },
      { feature: 'thankYou', allowed: false, message: "이 단계에서는 땡큐 등록을 할 수 없습니다." }
    ],
    allowedSelection: null,
    allowedDragging: null,
    completion: {
      triggerAction: 'DISCARD'
    }
  },
  {
    step: 2,
    setup: {
      playerHand: [
        makeCard(1, '♠', '7'),
        makeCard(2, '♥', '3'),
        makeCard(3, '♦', '3'),
        makeCard(4, '♣', '3'),
        makeCard(5, '♠', 'J'),
        makeCard(6, '♣', 'Q'),
        makeCard(7, '♥', 'A'),
      ],
      computerHand: [],
      deck: [makeCard(8, '♠', 'K')],
      discardPile: [],
      playerMelds: [],
      computerMelds: [],
      gamePhase: 'PLAYER_DISCARD'
    },
    restrictions: [
      { feature: 'draw', allowed: false, message: "이 단계에서는 드로우를 할 필요가 없습니다." },
      { feature: 'drag', allowed: false, message: "이 단계에서는 카드를 드래그하여 붙일 수 없습니다." },
      { feature: 'discard', allowed: false, message: "이 단계에서는 카드를 버릴 수 없습니다." },
      { feature: 'thankYou', allowed: false, message: "이 단계에서는 땡큐 등록을 할 수 없습니다." },
      { feature: 'register', allowed: true },
      { feature: 'selectCard', allowed: false, message: "등록 가능한 ♠7 카드 또는 숫자 3 세 개를 선택하세요." }
    ],
    allowedSelection: [1, 2, 3, 4],
    allowedDragging: null,
    completion: {
      triggerAction: 'REGISTER'
    }
  },
  {
    step: 3,
    setup: {
      playerHand: [
        makeCard(1, '♠', '6'),
        makeCard(2, '♥', 'J'),
        makeCard(3, '♦', '9'),
      ],
      computerHand: [],
      deck: [makeCard(9, '♦', 'K')],
      discardPile: [],
      playerMelds: [
        [makeCard(4, '♠', '3'), makeCard(5, '♠', '4'), makeCard(6, '♠', '5')]
      ],
      computerMelds: [
        [makeCard(7, '♥', 'Q'), makeCard(8, '♥', 'K')]
      ],
      gamePhase: 'PLAYER_DISCARD'
    },
    restrictions: [
      { feature: 'draw', allowed: false, message: "이 단계에서는 드로우를 할 필요가 없습니다." },
      { feature: 'drag', allowed: true },
      { feature: 'discard', allowed: false, message: "이 단계에서는 카드를 버릴 수 없습니다." },
      { feature: 'register', allowed: false, message: "이 단계에서는 등록을 할 수 없습니다." },
      { feature: 'thankYou', allowed: false, message: "이 단계에서는 땡큐 등록을 할 수 없습니다." },
      { feature: 'selectCard', allowed: false, message: "이 단계에서는 카드를 드래그 앤 드롭하여 붙여야 합니다." },
      { feature: 'dragCard', allowed: false, message: "붙일 수 있는 카드(♠6 또는 ♥J)를 드래그하세요." }
    ],
    allowedSelection: [],
    allowedDragging: [1, 2],
    completion: {
      triggerAction: 'LAYOFF'
    }
  },
  {
    step: 4,
    setup: {
      playerHand: [
        makeCard(1, '♣', '8'),
        makeCard(2, '♣', '9'),
        makeCard(3, '♥', '5'),
        makeCard(4, '♦', 'J'),
      ],
      computerHand: [],
      deck: [makeCard(6, '♦', 'A')],
      discardPile: [makeCard(5, '♣', '10')],
      playerMelds: [],
      computerMelds: [],
      gamePhase: 'PLAYER_DRAW'
    },
    restrictions: [
      { feature: 'draw', allowed: false, message: "이 단계에서는 드로우를 할 필요가 없습니다." },
      { feature: 'drag', allowed: false, message: "이 단계에서는 카드를 드래그하여 붙일 수 없습니다." },
      { feature: 'discard', allowed: false, message: "이 단계에서는 카드를 버릴 수 없습니다." },
      { feature: 'register', allowed: false, message: "이 단계에서는 등록을 할 수 없습니다." },
      { feature: 'thankYou', allowed: true },
      { feature: 'selectCard', allowed: false, message: "땡큐 등록을 위해 ♣8과 ♣9 카드만 선택해 주세요." }
    ],
    allowedSelection: [1, 2],
    allowedDragging: null,
    completion: {
      triggerAction: 'THANK_YOU'
    }
  },
  {
    step: 5,
    setup: {
      playerHand: [
        makeCard(1, '♠', '7'),
        makeCard(2, '♥', 'K'),
      ],
      computerHand: [],
      deck: [makeCard(6, '♣', 'A')],
      discardPile: [],
      playerMelds: [
        [makeCard(3, '♠', '4'), makeCard(4, '♠', '5'), makeCard(5, '♠', '6')]
      ],
      computerMelds: [],
      gamePhase: 'PLAYER_DISCARD'
    },
    restrictions: [
      { feature: 'draw', allowed: false, message: "이 단계에서는 드로우를 할 필요가 없습니다." },
      { feature: 'drag', allowed: true },
      { feature: 'discard', allowed: false, message: "먼저 ♠7 카드를 붙여야 합니다." },
      { feature: 'register', allowed: false, message: "이 단계에서는 등록을 할 수 없습니다." },
      { feature: 'thankYou', allowed: false, message: "이 단계에서는 땡큐 등록을 할 수 없습니다." },
      { feature: 'selectCard', allowed: false, message: "♠7 카드는 드래그하여 등록 세트에 붙이세요." },
      { feature: 'dragCard', allowed: false, message: "♠7 카드를 드래그하여 등록 세트에 붙이세요." }
    ],
    allowedSelection: [],
    allowedDragging: [1],
    completion: {
      triggerAction: 'DISCARD',
      validate: (playerHand: Card[]) => playerHand.length === 1
    }
  }
];
