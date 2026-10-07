import type React from 'react';
import { KID_ART } from '../../components/kid/kidArt';
import type { FunGameId } from '../../navigation/types';
import BreathingBuddy from './BreathingBuddy';
import BubblePop from './BubblePop';
import ConnectDots from './ConnectDots';
import HeroMemory from './HeroMemory';
import type { FunGameProps } from './shared';

export type FunGameInfo = {
  id: FunGameId;
  title: string;
  blurb: string;
  art: number;
  tint: [string, string];
  /** Always open (the calm corner), even before training is done. */
  alwaysOpen?: boolean;
  Game: React.ComponentType<FunGameProps>;
};

export const FUN_GAMES: FunGameInfo[] = [
  { id: 'bubbles', title: 'Bubble Pop', blurb: 'Pop, pop, POP!', art: KID_ART.bubbles, tint: ['#DDF0FF', '#C4E3FF'], Game: BubblePop },
  { id: 'memory', title: 'Hero Match', blurb: 'Find the hero pairs', art: KID_ART.cards, tint: ['#EFE6FF', '#DCCBFF'], Game: HeroMemory },
  { id: 'dots', title: 'Connect the Dots', blurb: 'Join the colours', art: KID_ART.puzzle, tint: ['#E2F7E9', '#C6EDD3'], Game: ConnectDots },
  { id: 'breathe', title: 'Calm Corner', blurb: 'Breathe with your hero', art: KID_ART.wind, tint: ['#E3ECFF', '#CEDCFF'], alwaysOpen: true, Game: BreathingBuddy },
];

export const FUN_GAME = Object.fromEntries(FUN_GAMES.map((g) => [g.id, g])) as Record<FunGameId, FunGameInfo>;
