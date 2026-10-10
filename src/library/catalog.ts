/**
 * Skill Builders — the clinic's activity library: the therapist's worksheets (Activity days 3–14), grouped into
 * families with repeats merged, each with three levels from easy to hard.
 *
 * - `app`: plays as a game on the phone (built to look like the worksheet).
 * - `flashcard`: done with a parent from step-by-step cards (and a printable sheet).
 * - `paper`: needs pencil and paper (drawing, colouring); the parent follows the steps.
 */

export type LibraryMode = 'app' | 'flashcard' | 'paper';

export type LibraryFamilyId =
  | 'symbolMatch'
  | 'colourConnect'
  | 'dotCopy'
  | 'shapeCode'
  | 'shapeSums'
  | 'continuePattern'
  | 'compareNumbers'
  | 'numberSearch'
  | 'mathSearch'
  | 'numberSnake'
  | 'stackSquares'
  | 'colourSymbol'
  | 'spotDifference'
  | 'rainbow'
  | 'wordSearch'
  | 'followLines'
  | 'diceMatch'
  | 'dotToDot'
  | 'countShapes'
  | 'mirrorDraw'
  | 'gridPatterns'
  | 'numberTree'
  | 'secretCode'
  | 'findFigure'
  | 'sayIt'
  | 'soundDetective'
  | 'oddOneOut'
  | 'listenDo'
  | 'questionTime'
  | 'storySteps';

export type LibraryCategory = 'Visual attention' | 'Visual memory' | 'Coding & rules' | 'Number sense' | 'Fine motor & copying' | 'Speech & language';

export type LibraryFamily = {
  id: LibraryFamilyId;
  name: string;
  /** The worksheet's usual name, so therapists recognise it. */
  aka?: string;
  emoji: string;
  color: string;
  tint: string;
  category: LibraryCategory;
  /** The main skill it trains. */
  skill: string;
  mode: LibraryMode;
  ages: [number, number];
  /** Typical minutes for one go. */
  minutes: number;
  /** Which of the therapist's worksheets it comes from. */
  sources: string[];
  summary: string;
  /** Shown to the child before playing (app) or read by the parent (paper/flashcard). */
  steps: string[];
  materials?: string;
  /** Why it isn't (only) a phone activity. */
  modeNote?: string;
  levels: [string, string, string];
};

export const LEVEL_NAMES = ['Easy', 'Medium', 'Hard'] as const;

export const MODE_INFO: Record<LibraryMode, { label: string; emoji: string; hint: string; color: string; tint: string }> = {
  app: { label: 'Play on mobile', emoji: '📱', hint: 'The child plays it in the app', color: '#2F5D46', tint: '#DDEEDA' },
  flashcard: { label: 'Flashcards with parent', emoji: '🃏', hint: 'Step-by-step cards the parent goes through', color: '#3E6FB8', tint: '#E3ECFF' },
  paper: { label: 'Paper & pencil', emoji: '✏️', hint: 'Drawing or colouring on a printed sheet', color: '#B2702A', tint: '#F6EDCB' },
};

export const LIBRARY: LibraryFamily[] = [
  {
    id: 'symbolMatch',
    name: 'Symbol Twins',
    aka: 'Symbol Match',
    emoji: '🔣',
    color: '#4E5BA6',
    tint: '#E6E9F8',
    category: 'Visual attention',
    skill: 'Visual scanning',
    mode: 'app',
    ages: [5, 12],
    minutes: 10,
    sources: ['Day 3'],
    summary: 'Two columns of symbols. Join each symbol on the left to the same symbol on the right.',
    steps: ['Look at the first symbol on the left.', 'Find the same symbol on the right side.', 'Tap one, then the other, to draw the line.', 'Keep going until every symbol is joined.'],
    levels: ['6 symbols', '12 symbols', '20 symbols, look-alikes'],
  },
  {
    id: 'colourConnect',
    name: 'Colour Code Circles',
    aka: 'Colour Connect',
    emoji: '🎨',
    color: '#C0503B',
    tint: '#F8E1DB',
    category: 'Coding & rules',
    skill: 'Sequencing & working memory',
    mode: 'app',
    ages: [5, 12],
    minutes: 10,
    sources: ['Day 3', 'Day 6', 'Day 14'],
    summary: 'A code chart turns letters or numbers into colours. Join the coloured dots in the order of the code.',
    steps: ['Read the code under the circle, e.g. 2-4-5-3.', 'Use the chart to find each colour.', 'Tap the dots in that order to join them.', 'Finish all the circles.'],
    levels: ['5 dots, letter code', '8 dots, number code', '8 dots, longer codes'],
  },
  {
    id: 'dotCopy',
    name: 'Dot Grid Copycat',
    aka: 'Copy the Pattern',
    emoji: '⬚',
    color: '#E2604F',
    tint: '#FCE6E1',
    category: 'Fine motor & copying',
    skill: 'Visual-spatial copying',
    mode: 'app',
    ages: [4, 12],
    minutes: 12,
    sources: ['Day 3', 'Day 4', 'Day 10', 'Day 14'],
    summary: 'A drawing on a dot grid. Make the same drawing on the empty grid next to it.',
    steps: ['Look carefully at the drawing on the left.', 'Find where each line starts and ends.', 'Tap two dots on the empty grid to draw a line.', 'Check both grids look the same, then tap Done.'],
    levels: ['3×3 dots', '4×4 dots', '5×5 dots, more lines'],
  },
  {
    id: 'shapeCode',
    name: 'Shape Code Breaker',
    aka: 'Code the Shapes',
    emoji: '🔢',
    color: '#2B8CC4',
    tint: '#DDF0FA',
    category: 'Coding & rules',
    skill: 'Rule following & attention',
    mode: 'app',
    ages: [5, 12],
    minutes: 12,
    sources: ['Day 3', 'Day 7', 'Day 10', 'Day 11', 'Day 13'],
    summary: 'A key gives every shape (and colour) a number or letter. Write the code for each shape.',
    steps: ['Look at the key at the top.', 'Look at the first shape and its colour.', 'Find it in the key and pick its code.', 'Do all the shapes, one by one.'],
    levels: ['Shape → number', 'Shape + colour → code', 'Shape + colour, look-alike letters (b d p q)'],
  },
  {
    id: 'shapeSums',
    name: 'Shape Sum Puzzles',
    aka: 'Shape Sums',
    emoji: '➕',
    color: '#E0862B',
    tint: '#FCEBD6',
    category: 'Number sense',
    skill: 'Coding & adding',
    mode: 'app',
    ages: [6, 12],
    minutes: 10,
    sources: ['Day 3'],
    summary: 'Each shape is worth a number. Add the shapes to find the answer.',
    steps: ['Look at the key: each shape has a number.', 'Swap each shape for its number.', 'Add them up.', 'Pick the answer.'],
    levels: ['2 shapes', '3 shapes', '3 shapes, + and −'],
  },
  {
    id: 'continuePattern',
    name: 'Pattern Train',
    aka: 'Continue the Pattern',
    emoji: '〰️',
    color: '#D63C7E',
    tint: '#FCE4EF',
    category: 'Coding & rules',
    skill: 'Pattern recognition',
    mode: 'app',
    ages: [4, 12],
    minutes: 10,
    sources: ['Day 5', 'Day 6'],
    summary: 'Each row has a repeating pattern of marks. Carry on the pattern to the end of the row.',
    steps: ['Say the pattern out loud: circle, plus, dot…', 'Find where it starts again.', 'Pick the next mark for each empty box.', 'Fill the whole row.'],
    levels: ['Repeats every 2', 'Repeats every 3', 'Repeats every 4'],
  },
  {
    id: 'compareNumbers',
    name: 'Crocodile Compare',
    aka: 'Bigger or Smaller',
    emoji: '⚖️',
    color: '#3E8E3A',
    tint: '#DDEEDA',
    category: 'Number sense',
    skill: 'Comparing numbers',
    mode: 'app',
    ages: [5, 11],
    minutes: 10,
    sources: ['Day 8', 'Day 9'],
    summary: 'A row of numbers with boxes between them. Put <, > or = in each box.',
    steps: ['Look at the two numbers next to the box.', 'The open mouth eats the bigger number.', 'Pick <, > or =.', 'Move along the row.'],
    levels: ['Numbers 1–9', 'Longer rows', 'Numbers up to 99'],
  },
  {
    id: 'numberSearch',
    name: 'Number Hunt',
    aka: 'Number Search',
    emoji: '🔍',
    color: '#7A4FB5',
    tint: '#EFE6FF',
    category: 'Visual attention',
    skill: 'Visual scanning',
    mode: 'app',
    ages: [6, 12],
    minutes: 12,
    sources: ['Day 8', 'Day 9', 'Day 12'],
    summary: 'A grid full of digits. Find the hidden numbers from the list, across or down.',
    steps: ['Read the first number in the list.', 'Look for its first digit in the grid.', 'Check the next digits across or down.', 'Tap the first and last digit to circle it.'],
    levels: ['3-digit numbers', '3–4 digits', '4-digit numbers, bigger grid'],
  },
  {
    id: 'mathSearch',
    name: 'Number Buddies',
    aka: 'Make the Number',
    emoji: '🧮',
    color: '#1F7A6E',
    tint: '#D7F0EC',
    category: 'Number sense',
    skill: 'Mental maths & scanning',
    mode: 'app',
    ages: [6, 12],
    minutes: 12,
    sources: ['Day 11', 'Day 12'],
    summary: 'Find two numbers side by side that add up to (or take away to) the number in the middle.',
    steps: ['Look at the big number in the middle.', 'Find two numbers next to each other.', 'Check they make the big number.', 'Tap both to circle them.'],
    levels: ['Add to 10', 'Add to 8, more pairs', 'Take away to make 6'],
  },
  {
    id: 'numberSnake',
    name: 'Snake Sums',
    aka: 'Number Snake',
    emoji: '🐍',
    color: '#43A047',
    tint: '#E4F4DA',
    category: 'Number sense',
    skill: 'Working memory & maths',
    mode: 'app',
    ages: [6, 12],
    minutes: 10,
    sources: ['Day 11'],
    summary: 'Start at the head, follow + and − along the snake, and write each new number.',
    steps: ['Start with the number in the head.', 'Do the sum on the first line.', 'Write the answer in the next circle.', 'Keep going to the tail.'],
    levels: ['6 steps, ±1–3', '12 steps, ±1–6', '20 steps, ±1–7'],
  },
  {
    id: 'stackSquares',
    name: 'See-Through Squares',
    aka: 'Stack the Squares',
    emoji: '🔳',
    color: '#7A5AE0',
    tint: '#EEE8FD',
    category: 'Visual memory',
    skill: 'Mental imagery',
    mode: 'app',
    ages: [6, 12],
    minutes: 10,
    sources: ['Day 3'],
    summary: 'Put the see-through cards on top of each other. Shade the squares that are dark on the new card.',
    steps: ['Look at the dark squares on the first card.', 'Look at the dark squares on the second card.', 'Any square dark on either card is dark on the answer.', 'Tap the squares to shade the answer.'],
    levels: ['2×2 cards', '3×3 cards', '3 cards to stack'],
  },
  {
    id: 'colourSymbol',
    name: 'Colour Signals',
    aka: 'Colour to Symbol',
    emoji: '🔴',
    color: '#D9573B',
    tint: '#FBE3DC',
    category: 'Coding & rules',
    skill: 'Processing speed',
    mode: 'app',
    ages: [5, 12],
    minutes: 10,
    sources: ['Day 10', 'Day 11', 'Day 13'],
    summary: 'Each colour has its own mark. Give every coloured dot the right mark.',
    steps: ['Look at the key: which mark goes with each colour?', 'Pick a mark at the bottom.', 'Tap every dot of that colour.', 'Do the next colour until all dots are marked.'],
    levels: ['Faces, 3 colours', '4 colours, 24 dots', '5 colours, 40 dots'],
  },
  {
    id: 'spotDifference',
    name: 'Spot the Change',
    aka: 'Spot the Difference',
    emoji: '👀',
    color: '#C46A1F',
    tint: '#FBEBD9',
    category: 'Visual attention',
    skill: 'Attention to detail',
    mode: 'app',
    ages: [4, 12],
    minutes: 10,
    sources: ['Day 5'],
    summary: 'Two pictures look the same but a few things are different. Find them all.',
    steps: ['Look at the top picture.', 'Look at the same place on the bottom picture.', 'Tap anything that is different.', 'Find all the differences.'],
    levels: ['3 differences', '5 differences', '8 differences'],
  },
  {
    id: 'rainbow',
    name: 'Rainbow Order',
    aka: 'Rainbow Colours',
    emoji: '🌈',
    color: '#D84B6B',
    tint: '#FCE3EA',
    category: 'Coding & rules',
    skill: 'Following an order',
    mode: 'app',
    ages: [3, 9],
    minutes: 8,
    sources: ['Day 3'],
    summary: 'Colour each band of the rainbow in the order of the dots underneath.',
    steps: ['Look at the dots under the rainbow, left to right.', 'The first dot colours the outside band.', 'Tap a colour, then tap its band.', 'Colour every band.'],
    modeNote: 'Tap-to-colour on the phone; the printed rainbow is good for crayons too.',
    levels: ['4 bands', '7 bands', '7 bands, repeating colours'],
  },
  {
    id: 'wordSearch',
    name: 'Word Explorer',
    aka: 'Word Search',
    emoji: '🔤',
    color: '#8B5FBF',
    tint: '#F1E8FB',
    category: 'Visual attention',
    skill: 'Scanning & reading',
    mode: 'app',
    ages: [6, 12],
    minutes: 12,
    sources: ['Day 5', 'Day 12'],
    summary: 'Find the hidden words in the letter grid. Themes: Spring, Space, Museum, Vacation.',
    steps: ['Read a word from the list.', 'Find its first letter in the grid.', 'Tap the first letter, then the last letter.', 'Find all the words.'],
    levels: ['Spring · 8×8', 'Space · 10×10', 'Museum & Vacation · bigger grid'],
  },
  {
    id: 'followLines',
    name: 'Tangled Lines',
    aka: 'Follow the Lines',
    emoji: '〽️',
    color: '#3B7A57',
    tint: '#DCEFE3',
    category: 'Visual attention',
    skill: 'Visual tracking',
    mode: 'app',
    ages: [6, 12],
    minutes: 12,
    sources: ['Day 8', 'Day 9'],
    summary: 'Follow each fruit’s line down through the rows of numbers to build its secret code.',
    steps: ['Pick a fruit at the top.', 'Follow its line with your eyes to the next row.', 'Tap the number it lands on.', 'Keep following down to finish the code.'],
    levels: ['2 rows, 4 fruits', '3 rows, 5 fruits', '4 rows, 6 fruits'],
  },
  {
    id: 'diceMatch',
    name: 'Dice Detective',
    aka: 'Dice Match',
    emoji: '🎲',
    color: '#B5533C',
    tint: '#F6E3D6',
    category: 'Number sense',
    skill: 'Counting & adding',
    mode: 'app',
    ages: [5, 10],
    minutes: 10,
    sources: ['Day 7'],
    summary: 'Match each sum to its answer and to the dice that show the same number.',
    steps: ['Read the sum, e.g. 3 + 7.', 'Work out the answer.', 'Pick the dice that show that many dots.', 'Match them all.'],
    levels: ['Count the dots', 'Sums to 12', 'Sums to 18, three dice'],
  },
  {
    id: 'dotToDot',
    name: 'Join the Dots',
    aka: 'Dot-to-Dot',
    emoji: '✏️',
    color: '#E05A47',
    tint: '#FCE4DF',
    category: 'Fine motor & copying',
    skill: 'Number order & tracking',
    mode: 'app',
    ages: [4, 10],
    minutes: 10,
    sources: ['Day 3'],
    summary: 'Join the numbered dots in order to reveal a picture.',
    steps: ['Find dot number 1.', 'Look for number 2 and tap it.', 'Keep going in order.', 'See what picture appears!'],
    levels: ['Up to 12', 'Up to 25', 'Up to 45'],
  },
  {
    id: 'countShapes',
    name: 'Hidden Shapes',
    aka: 'Count the Shapes',
    emoji: '🔺',
    color: '#5B6BD6',
    tint: '#E4E8FB',
    category: 'Visual attention',
    skill: 'Figure–ground attention',
    mode: 'app',
    ages: [5, 12],
    minutes: 10,
    sources: ['Day 8', 'Day 9', 'Day 12', 'Day 14'],
    summary: 'Shapes overlap in a busy picture. Count how many of each shape you can find.',
    steps: ['Pick one shape to look for.', 'Trace each one with your finger.', 'Count them carefully.', 'Enter the number for every shape.'],
    levels: ['Few shapes, apart', 'Overlapping shapes', 'Many shapes and colours'],
  },
  {
    id: 'mirrorDraw',
    name: 'Mirror Magic',
    aka: 'Mirror Drawing',
    emoji: '🪞',
    color: '#C98A0A',
    tint: '#FBF0D2',
    category: 'Fine motor & copying',
    skill: 'Symmetry & spatial planning',
    mode: 'paper',
    ages: [7, 12],
    minutes: 15,
    sources: ['Day 3'],
    summary: 'Half a pattern is drawn on a grid. Draw the other half like a mirror.',
    steps: ['Print the sheet (or copy it onto squared paper).', 'Point to where a line touches the middle line.', 'Count the squares out from the middle on the left.', 'Draw the same line on the right, the other way round.', 'Check it looks like a butterfly — both sides the same.'],
    materials: 'Printed sheet, pencil, eraser, ruler',
    modeNote: 'Needs careful pencil control, so it works best on paper.',
    levels: ['Simple shapes', 'Patterns with diagonals', 'Detailed patterns'],
  },
  {
    id: 'gridPatterns',
    name: 'Pattern Paths',
    aka: 'Grid Pattern Drawing',
    emoji: '📐',
    color: '#2E9E6B',
    tint: '#DDF3E8',
    category: 'Fine motor & copying',
    skill: 'Pattern copying & pencil control',
    mode: 'paper',
    ages: [5, 12],
    minutes: 10,
    sources: ['Day 6'],
    summary: 'A pattern of squares, diamonds and zigzags starts each row. Keep drawing it to the end of the grid.',
    steps: ['Print the sheet.', 'Trace the start of the row with a finger.', 'Count how many squares each part uses.', 'Draw the next part, then repeat to the end.', 'Use a ruler for straight lines.'],
    materials: 'Printed sheet, pencil, ruler',
    modeNote: 'Drawing along grid lines needs a pencil.',
    levels: ['Squares only', 'Squares & diamonds', 'Zigzags & triangles'],
  },
  {
    id: 'numberTree',
    name: 'Number Pyramid',
    aka: 'Number Tree',
    emoji: '🌳',
    color: '#2E7D32',
    tint: '#DCEFD9',
    category: 'Number sense',
    skill: 'Multi-step maths',
    mode: 'flashcard',
    ages: [7, 12],
    minutes: 15,
    sources: ['Day 10'],
    summary: 'Work from the bottom of the tree to the top, filling the empty boxes with + and − sums.',
    steps: ['Start at the bottom row of boxes.', 'Do the sum in each little pair.', 'Write the answer in the box the arrows point to.', 'Climb up the tree one row at a time.', 'Check the top row with the number at the very top.'],
    materials: 'Printed sheet, pencil',
    modeNote: 'Many linked steps — easier to see the whole tree on paper.',
    levels: ['Sums to 10', 'Sums to 20', 'Mixed + and − to 20'],
  },
  {
    id: 'secretCode',
    name: 'Dot Code Detective',
    aka: 'Secret Dot Code',
    emoji: '⠿',
    color: '#1F9AA8',
    tint: '#DCF4F6',
    category: 'Coding & rules',
    skill: 'Decoding & visual discrimination',
    mode: 'flashcard',
    ages: [7, 12],
    minutes: 12,
    sources: ['Day 13'],
    summary: 'Each letter has a dot pattern. Use the code box to turn the dots into words (days of the week).',
    steps: ['Look at the first dot pattern.', 'Find the same pattern in the code box.', 'Write its letter on the line.', 'Read the word when all letters are done.'],
    materials: 'Flashcards on the phone, or printed sheet and pencil',
    levels: ['Short words', 'Days of the week', 'Longer sentences'],
  },
  {
    id: 'findFigure',
    name: 'Figure Finder',
    aka: 'Find the Figure',
    emoji: '🧩',
    color: '#3D7DD8',
    tint: '#E3EEFC',
    category: 'Visual attention',
    skill: 'Visual discrimination',
    mode: 'paper',
    ages: [8, 12],
    minutes: 15,
    sources: ['Day 13', 'Day 14'],
    summary: 'Many turned and shaded figures fill the page. Count how many times each target figure appears.',
    steps: ['Print the sheet.', 'Look at the first target figure at the bottom.', 'Search the page; a figure may be turned around.', 'Tick each one you find and count them.', 'Write the count next to the target.'],
    materials: 'Printed sheet, pencil, highlighter',
    modeNote: 'The figures are small and detailed — a full printed page works best.',
    levels: ['3 targets', '6 targets', '6 targets, more rotations'],
  },
  {
    id: 'sayIt',
    name: 'Say It!',
    aka: 'Naming pictures',
    emoji: '🗣️',
    color: '#D9480F',
    tint: '#FFE8DC',
    category: 'Speech & language',
    skill: 'Naming & speaking',
    mode: 'app',
    ages: [2, 10],
    minutes: 8,
    sources: ['Speech & language pack'],
    summary: 'The child names each picture out loud, can hear the word and record themselves to hear it back.',
    steps: ['Look at the picture.', 'Say what it is (or what is happening).', 'Tap 🔊 to hear it, then try again.', 'Record yourself and listen back.', 'A grown-up taps “Said it!”.'],
    levels: ['Everyday words, word shown', 'More words, word hidden', 'Action words: “What is happening?”'],
  },
  {
    id: 'soundDetective',
    name: 'Sound Detective',
    aka: 'First sounds',
    emoji: '🕵️',
    color: '#5F3DC4',
    tint: '#ECE5FF',
    category: 'Speech & language',
    skill: 'Phonological awareness',
    mode: 'app',
    ages: [4, 9],
    minutes: 6,
    sources: ['Speech & language pack'],
    summary: 'Hear a sound and find the picture that starts with it.',
    steps: ['Listen to the sound.', 'Say each picture’s name quietly.', 'Tap the one that starts with that sound.', 'Hear the word to check.'],
    levels: ['2 pictures', '3 pictures', '4 pictures, sounds that are easy to mix up'],
  },
  {
    id: 'oddOneOut',
    name: 'Odd One Out',
    aka: 'Which doesn’t belong?',
    emoji: '🧺',
    color: '#0B7285',
    tint: '#DDF3F7',
    category: 'Speech & language',
    skill: 'Categories & vocabulary',
    mode: 'app',
    ages: [4, 10],
    minutes: 6,
    sources: ['Speech & language pack'],
    summary: 'Four pictures — three go together. Find the one that doesn’t belong and hear why.',
    steps: ['Name all four pictures.', 'Find what three of them share.', 'Tap the odd one out.', 'Say why: “The others are …”.'],
    levels: ['Very different groups', 'Close groups (fruit vs vegetables)', 'Think harder: things that fly, cold things…'],
  },
  {
    id: 'listenDo',
    name: 'Listen & Do',
    aka: 'Following directions',
    emoji: '👂',
    color: '#C2255C',
    tint: '#FDE3EC',
    category: 'Speech & language',
    skill: 'Understanding instructions',
    mode: 'app',
    ages: [3, 9],
    minutes: 6,
    sources: ['Speech & language pack'],
    summary: 'Listen to an instruction and do it: “Touch the star” up to “Put the small red ball in the box”.',
    steps: ['Listen to the whole instruction.', 'Tap 🔊 to hear it again.', 'Tap the right thing.', 'If it says where, tap the place too.'],
    levels: ['1 key word: “Touch the star”', '2 key words: “Touch the red star”', '3 key words + where: “Put the small red star in the box”'],
  },
  {
    id: 'questionTime',
    name: 'Question Time',
    aka: 'WH questions',
    emoji: '❓',
    color: '#E67700',
    tint: '#FFF1D6',
    category: 'Speech & language',
    skill: 'Answering questions',
    mode: 'app',
    ages: [3, 10],
    minutes: 6,
    sources: ['Speech & language pack'],
    summary: 'Answer who, what and where questions by tapping the right picture.',
    steps: ['Listen to the question.', 'Look at all the pictures.', 'Tap the answer.', 'Say the answer in a sentence.'],
    levels: ['“Which one is the dog?”', '“What do we drink from?”', '“Where do fish live?”'],
  },
  {
    id: 'storySteps',
    name: 'Story Steps',
    aka: 'Sequencing & retelling',
    emoji: '📖',
    color: '#2B8A3E',
    tint: '#E1F5E4',
    category: 'Speech & language',
    skill: 'Sequencing & storytelling',
    mode: 'app',
    ages: [4, 10],
    minutes: 8,
    sources: ['Speech & language pack'],
    summary: 'Put picture cards in order, then tell the story using first, next and last.',
    steps: ['Look at all the pictures.', 'Tap them in the order they happen.', 'Tell the story: first, next, last.', 'Record it and listen back.'],
    levels: ['3 pictures', '4 pictures', '5 pictures, two stories'],
  },
];

export const FAMILY = Object.fromEntries(LIBRARY.map((f) => [f.id, f])) as Record<LibraryFamilyId, LibraryFamily>;
export const isLibraryFamily = (id: string): id is LibraryFamilyId => id in FAMILY;
export const libraryTaskId = (family: LibraryFamilyId) => `library-${family}`;

export const CATEGORIES: LibraryCategory[] = ['Visual attention', 'Visual memory', 'Coding & rules', 'Number sense', 'Fine motor & copying', 'Speech & language'];

/** Does this family suit a child of this (developmental) age? */
export function ageFit(f: LibraryFamily, age: number): 'fits' | 'young' | 'old' {
  if (age < f.ages[0]) return 'young';
  if (age > f.ages[1] + 1) return 'old';
  return 'fits';
}

/** Suggested starting level for a child: younger or extra-support children start easy. */
export function startLevel(f: LibraryFamily, age: number, support: boolean): number {
  if (support || age <= f.ages[0] + 1) return 1;
  if (age >= f.ages[0] + 4) return 3;
  return 2;
}

/** Same rule as Game Studio: up after two 3-star plays in a row, down after a 1-star play. */
export function nextLibraryLevel(level: number, streak: number, stars: number): { level: number; streak: number; changed: -1 | 0 | 1 } {
  if (stars >= 3) {
    const s = streak + 1;
    if (s >= 2 && level < 3) return { level: level + 1, streak: 0, changed: 1 };
    return { level, streak: s, changed: 0 };
  }
  if (stars <= 1 && level > 1) return { level: level - 1, streak: 0, changed: -1 };
  return { level, streak: 0, changed: 0 };
}

export const starsFor = (accuracy: number | null) => (accuracy === null ? 2 : accuracy >= 0.9 ? 3 : accuracy >= 0.6 ? 2 : 1);
export const RATING_STARS = { easy: 3, ok: 2, hard: 1 } as const;
