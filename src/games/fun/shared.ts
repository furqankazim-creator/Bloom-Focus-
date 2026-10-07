import type { Character } from '../../types';

/** Props every Fun Zone game gets. These games are just for fun: nothing is scored or adapted. */
export type FunGameProps = {
  heroes: Character[];
  calm: boolean;
  /** Called when a round is finished (puzzle solved, breaths done…). */
  onWin: (message: string) => void;
};
