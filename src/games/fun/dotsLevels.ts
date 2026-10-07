/**
 * Connect-the-dots levels (5×5). Each level is defined by a full solution, so it is always
 * solvable; the dots are the two ends of each solution path. Cells are [row, col].
 */
export const DOT_COLORS: Record<string, string> = {
  red: '#FF6B6B',
  green: '#3CCB7F',
  blue: '#5B8CFF',
  yellow: '#FFC233',
  orange: '#FF9548',
};

export type DotLevel = { size: number; solution: Record<string, [number, number][]> };

export const DOT_LEVELS: DotLevel[] = [
  {
    size: 5,
    solution: {
      red: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],
      green: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
      blue: [[0, 2], [1, 2], [2, 2]],
      yellow: [[3, 2], [4, 2], [4, 3], [4, 4]],
      orange: [[0, 3], [0, 4], [1, 4], [1, 3], [2, 3], [2, 4], [3, 4], [3, 3]],
    },
  },
  {
    size: 5,
    solution: {
      red: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4]],
      green: [[1, 0], [1, 1], [1, 2], [1, 3]],
      blue: [[2, 0], [3, 0], [4, 0], [4, 1], [4, 2]],
      yellow: [[2, 1], [2, 2], [2, 3], [3, 3], [3, 4], [4, 4], [4, 3]],
      orange: [[3, 1], [3, 2]],
    },
  },
  {
    size: 5,
    solution: {
      red: [[0, 0], [1, 0], [2, 0], [2, 1], [2, 2]],
      green: [[0, 1], [0, 2], [0, 3], [1, 3], [1, 2], [1, 1]],
      blue: [[0, 4], [1, 4], [2, 4], [2, 3], [3, 3]],
      yellow: [[3, 0], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [3, 4]],
      orange: [[3, 1], [3, 2]],
    },
  },
];

/** The two dot cells (as indices) for each colour. */
export const levelDots = (level: DotLevel) =>
  Object.fromEntries(
    Object.entries(level.solution).map(([c, path]) => {
      const a = path[0];
      const b = path[path.length - 1];
      return [c, [a[0] * level.size + a[1], b[0] * level.size + b[1]] as [number, number]];
    }),
  );
