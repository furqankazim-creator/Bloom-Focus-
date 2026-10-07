/**
 * Hero worlds: each hero belongs to a themed world that sets the colours, ground and
 * decorations drawn around a game, plus what the hero says while the child plays.
 * Pure TypeScript so it can be shared by screens and tests.
 */
import { t } from '../i18n';
import type { Character, Child, CustomActivity, HeroWorld, SceneStyle } from '../types';

export type WorldInfo = {
  /** Category name shown to therapists and families. */
  name: string;
  tagline: string;
  /** Top → bottom sky gradient. */
  sky: [string, string];
  /** Ground / floor colour. */
  ground: string;
  floor: 'hills' | 'waves' | 'skyline' | 'pitch' | 'none';
  /** Frame + accent colour for hero stickers. */
  accent: string;
  /** Decorations scattered around the edges. */
  props: string[];
  /** Night worlds use light text and twinkling stars. */
  dark?: boolean;
};

export const WORLDS: Record<HeroWorld, WorldInfo> = {
  space: { name: 'Space Explorers', tagline: 'Rockets, aliens & robots', sky: ['#1A1D4A', '#3E3486'], ground: '#2A2563', floor: 'none', accent: '#7C6CF2', props: ['🪐', '⭐', '🌙', '☄️', '🛸', '✨'], dark: true },
  jurassic: { name: 'Dino Land', tagline: 'Stompy, roary dinosaurs', sky: ['#FFD9A8', '#FFF3E0'], ground: '#7CB85A', floor: 'hills', accent: '#5E9E3C', props: ['🌴', '🌋', '🦴', '🥚', '🌿', '☁️'] },
  ocean: { name: 'Ocean Friends', tagline: 'Splashy sea buddies', sky: ['#8FD6F4', '#E6F8FF'], ground: '#3FA7D6', floor: 'waves', accent: '#2B8CC4', props: ['🐠', '🐚', '🫧', '🐙', '🪸', '🐟'] },
  fantasy: { name: 'Magic Kingdom', tagline: 'Unicorns, dragons & wizards', sky: ['#F5CFF2', '#FFF1FC'], ground: '#B9E28C', floor: 'hills', accent: '#C060C9', props: ['🌈', '🏰', '✨', '🦋', '🌸', '⭐'] },
  city: { name: 'Super City', tagline: 'Heroes, racers & trains', sky: ['#C9E1FF', '#F2F8FF'], ground: '#8AA4C8', floor: 'skyline', accent: '#3E6FB8', props: ['🏁', '🚦', '🎈', '⛽', '☁️', '🏙️'] },
  jungle: { name: 'Jungle Pals', tagline: 'Wild and wonderful', sky: ['#C8EEC1', '#F1FFEC'], ground: '#5FAF4E', floor: 'hills', accent: '#3E8E3A', props: ['🌴', '🍌', '🦜', '🌿', '🐒', '🌺'] },
  farm: { name: 'Farm Buddies', tagline: 'Cosy farmyard friends', sky: ['#FFF0B8', '#FFFBEA'], ground: '#9BCB5A', floor: 'hills', accent: '#D9962B', props: ['🌻', '🚜', '🌾', '🐔', '🍎', '☁️'] },
  sports: { name: 'Sports Stars', tagline: 'Goals, hoops & trophies', sky: ['#D3F0CE', '#F4FFF2'], ground: '#5DBB63', floor: 'pitch', accent: '#2E9A46', props: ['⚽', '🏆', '🥅', '⭐', '🏅', '🎉'] },
};

export const WORLD_IDS = Object.keys(WORLDS) as HeroWorld[];

/** Built-in heroes (5 per category), each with 3D artwork and a fun name. */
export const HERO_PRESETS: Character[] = [
  { id: 'captain-blastoff', name: 'Captain Blastoff', emoji: '🚀', world: 'space' },
  { id: 'astro-ace', name: 'Astro Ace', emoji: '🧑‍🚀', world: 'space' },
  { id: 'zib-zorp', name: 'Zib Zorp', emoji: '👽', world: 'space' },
  { id: 'robo-bolt', name: 'Robo Bolt', emoji: '🤖', world: 'space' },
  { id: 'saucer-sam', name: 'Saucer Sam', emoji: '🛸', world: 'space' },
  { id: 'rexy-roarson', name: 'Rexy Roarson', emoji: '🦖', world: 'jurassic' },
  { id: 'longneck-larry', name: 'Longneck Larry', emoji: '🦕', world: 'jurassic' },
  { id: 'zippy-zap', name: 'Zippy Zap', emoji: '🦎', world: 'jurassic' },
  { id: 'chompy', name: 'Chompy Chomp', emoji: '🐊', world: 'jurassic' },
  { id: 'egg-bert', name: 'Egg-bert', emoji: '🐣', world: 'jurassic' },
  { id: 'splash-dash', name: 'Splash Dash', emoji: '🐬', world: 'ocean' },
  { id: 'inky-winky', name: 'Inky Winky', emoji: '🐙', world: 'ocean' },
  { id: 'finn-fang', name: 'Finn Fang', emoji: '🦈', world: 'ocean' },
  { id: 'puffy-mcpuff', name: 'Puffy McPuff', emoji: '🐡', world: 'ocean' },
  { id: 'shelly-speedster', name: 'Shelly Speedster', emoji: '🐢', world: 'ocean' },
  { id: 'sparkle-hoof', name: 'Sparkle Hoof', emoji: '🦄', world: 'fantasy' },
  { id: 'blaze-wing', name: 'Blaze Wing', emoji: '🐉', world: 'fantasy' },
  { id: 'twinkle-toes', name: 'Twinkle Toes', emoji: '🧚', world: 'fantasy' },
  { id: 'wizard-whizbang', name: 'Wizard Whizbang', emoji: '🧙', world: 'fantasy' },
  { id: 'princess-sunbeam', name: 'Princess Sunbeam', emoji: '👸', world: 'fantasy' },
  { id: 'super-zoom', name: 'Super Zoom', emoji: '🦸', world: 'city' },
  { id: 'turbo-tom', name: 'Turbo Tom', emoji: '🏎️', world: 'city' },
  { id: 'choo-choo-charlie', name: 'Choo-Choo Charlie', emoji: '🚂', world: 'city' },
  { id: 'flash-fireheart', name: 'Flash Fireheart', emoji: '🚒', world: 'city' },
  { id: 'detective-dot', name: 'Detective Dot', emoji: '🕵️', world: 'city' },
  { id: 'leo-the-brave', name: 'Leo the Brave', emoji: '🦁', world: 'jungle' },
  { id: 'bamboo-bao', name: 'Bamboo Bao', emoji: '🐼', world: 'jungle' },
  { id: 'cheeky-chimp', name: 'Cheeky Chimp', emoji: '🐒', world: 'jungle' },
  { id: 'polly-pop', name: 'Polly Pop', emoji: '🦜', world: 'jungle' },
  { id: 'stripes-mcroar', name: 'Stripes McRoar', emoji: '🐅', world: 'jungle' },
  { id: 'pip-the-pup', name: 'Pip the Pup', emoji: '🐶', world: 'farm' },
  { id: 'whiskers-mcpurr', name: 'Whiskers McPurr', emoji: '🐱', world: 'farm' },
  { id: 'cluck-norris', name: 'Cluck Norris', emoji: '🐔', world: 'farm' },
  { id: 'daisy-moo', name: 'Daisy Moo', emoji: '🐮', world: 'farm' },
  { id: 'oinky-doinky', name: 'Oinky Doinky', emoji: '🐷', world: 'farm' },
  { id: 'striker-sam', name: 'Striker Sam', emoji: '⚽', world: 'sports' },
  { id: 'dunk-master', name: 'Dunk Master', emoji: '🏀', world: 'sports' },
  { id: 'champ-the-cup', name: 'Champ the Cup', emoji: '🏆', world: 'sports' },
  { id: 'ace-smash', name: 'Ace Smash', emoji: '🎾', world: 'sports' },
  { id: 'captain-cuddles', name: 'Captain Cuddles', emoji: '🧸', world: 'sports' },
];

/**
 * The built-in hero a saved hero matches: by id, or by emoji for heroes saved before ids existed
 * (e.g. an old "Dino 🦖" shows Rexy Roarson's artwork). Photo heroes never match.
 */
export function presetFor(hero: Character | null | undefined): Character | undefined {
  if (!hero || hero.image) return undefined;
  return HERO_PRESETS.find((p) => (hero.id ? p.id === hero.id : p.emoji === hero.emoji));
}

/** Old saved heroes become the matching built-in hero (new name and artwork); photo heroes stay as they are. */
export function upgradeHero(hero: Character): Character {
  if (hero.id || hero.image) return hero;
  return presetFor(hero) ?? hero;
}

/** The world a hero lives in (older saved heroes have no world, so match by emoji). */
export function worldOf(hero: Character | null | undefined): HeroWorld {
  if (!hero) return 'fantasy';
  if (hero.world) return hero.world;
  return presetFor(hero)?.world ?? 'fantasy';
}

export const sameHero = (a: Character, b: Character) =>
  a.id || b.id ? a.id === b.id : a.name === b.name && a.emoji === b.emoji && (a.image ?? '') === (b.image ?? '');

/**
 * The heroes for a game: the activity's own heroes, then its single hero (older data),
 * then the child's favourite characters.
 */
export function heroesFor(child: Pick<Child, 'favouriteCharacters'> | undefined, activity?: Pick<CustomActivity, 'hero' | 'heroes'>): Character[] {
  if (activity?.heroes?.length) return activity.heroes.slice(0, 3);
  if (activity?.hero) return [activity.hero];
  return (child?.favouriteCharacters ?? []).slice(0, 1);
}

/** Scene strength: the activity's choice, otherwise gentler for sensory needs and calm mode. */
export function sceneFor(child: Pick<Child, 'sensory'> | undefined, activity?: Pick<CustomActivity, 'scene'>, calm = false): SceneStyle {
  if (activity?.scene) return calm && activity.scene === 'bold' ? 'subtle' : activity.scene;
  if (child?.sensory?.busyScreens || child?.sensory?.brightLights) return 'off';
  return 'subtle';
}

const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** What the hero says at each moment of play. */
export const heroLines = {
  hello: (hero: Character, child: string, game: string) => t('Hi {{child}}! I’m {{hero}}. Let’s play {{game}} together!', { child, hero: hero.name, game: t(game) }),
  ready: () => t(pick(['Ready? Let’s go!', 'You can do it!', 'I’m right here with you!'])),
  good: () => t(pick(['Yes!', 'Great job!', 'You got it!', 'Woohoo!', 'Super!', 'Nice one!'])),
  streak: (n: number) => t('{{n}} in a row! Amazing!', { n }),
  oops: () => t(pick(['Almost!', 'Try again!', 'Keep going!', 'You’ll get the next one!'])),
  done: (stars: number, child: string) =>
    stars >= 3 ? t('WOW, {{child}}! That was amazing!', { child }) : stars === 2 ? t('Great work, {{child}}!', { child }) : t('Good try, {{child}}! Let’s play again soon.', { child }),
};
