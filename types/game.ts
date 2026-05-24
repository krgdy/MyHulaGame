export interface Card {
  id: number;
  suit: '♠' | '♥' | '♦' | '♣';
  value: string;
  color: 'red' | 'black';
}

export type GamePhase = 'SETUP' | 'PLAYER_DRAW' | 'PLAYER_DISCARD' | 'COMPUTER_TURN' | 'GAME_OVER';
