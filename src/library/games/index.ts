import type React from 'react';
import type { LibraryFamilyId } from '../catalog';
import ColourConnect from './ColourConnect';
import ColourSymbol from './ColourSymbol';
import CompareNumbers from './CompareNumbers';
import ContinuePattern from './ContinuePattern';
import CountShapes from './CountShapes';
import DiceMatch from './DiceMatch';
import DotCopy from './DotCopy';
import DotToDot from './DotToDot';
import FollowLines from './FollowLines';
import MathSearch from './MathSearch';
import NumberSearch from './NumberSearch';
import NumberSnake from './NumberSnake';
import Rainbow from './Rainbow';
import ShapeCode from './ShapeCode';
import ShapeSums from './ShapeSums';
import type { LibraryGameProps } from './shared';
import SpotDifference from './SpotDifference';
import StackSquares from './StackSquares';
import SymbolMatch from './SymbolMatch';
import WordSearch from './WordSearch';

/** The phone games for `app` families. Paper and flashcard families have none. */
export const LIBRARY_GAMES: Partial<Record<LibraryFamilyId, React.ComponentType<LibraryGameProps>>> = {
  symbolMatch: SymbolMatch,
  colourConnect: ColourConnect,
  dotCopy: DotCopy,
  shapeCode: ShapeCode,
  shapeSums: ShapeSums,
  continuePattern: ContinuePattern,
  compareNumbers: CompareNumbers,
  numberSearch: NumberSearch,
  mathSearch: MathSearch,
  numberSnake: NumberSnake,
  stackSquares: StackSquares,
  colourSymbol: ColourSymbol,
  spotDifference: SpotDifference,
  rainbow: Rainbow,
  wordSearch: WordSearch,
  followLines: FollowLines,
  diceMatch: DiceMatch,
  dotToDot: DotToDot,
  countShapes: CountShapes,
};
