/**
 * Content for the Speech & language Skill Builders: a picture-word bank in English, Arabic and
 * Urdu, plus questions, odd-one-out sets, listening instructions and picture stories.
 * Pure TypeScript so the games, printable sheets and tests can share it.
 */
export type Lang = 'en' | 'ar' | 'ur';
export type Tr = Record<Lang, string>;

export type Cat = 'animals' | 'fruit' | 'vegetables' | 'food' | 'clothes' | 'vehicles' | 'home' | 'nature' | 'body' | 'actions';

export type Word = {
  id: string;
  emoji: string;
  cat: Cat;
  /** Short, everyday words for the easiest level. */
  easy?: boolean;
} & Tr;

const w = (id: string, emoji: string, cat: Cat, en: string, ar: string, ur: string, easy = false): Word => ({ id, emoji, cat, en, ar, ur, easy });

export const WORDS: Word[] = [
  // Animals
  w('dog', '🐶', 'animals', 'dog', 'كلب', 'کتا', true),
  w('cat', '🐱', 'animals', 'cat', 'قطة', 'بلی', true),
  w('cow', '🐄', 'animals', 'cow', 'بقرة', 'گائے', true),
  w('horse', '🐴', 'animals', 'horse', 'حصان', 'گھوڑا'),
  w('fish', '🐟', 'animals', 'fish', 'سمكة', 'مچھلی', true),
  w('bird', '🐦', 'animals', 'bird', 'طائر', 'پرندہ', true),
  w('duck', '🦆', 'animals', 'duck', 'بطة', 'بطخ', true),
  w('lion', '🦁', 'animals', 'lion', 'أسد', 'شیر'),
  w('elephant', '🐘', 'animals', 'elephant', 'فيل', 'ہاتھی'),
  w('monkey', '🐒', 'animals', 'monkey', 'قرد', 'بندر'),
  w('rabbit', '🐰', 'animals', 'rabbit', 'أرنب', 'خرگوش'),
  w('sheep', '🐑', 'animals', 'sheep', 'خروف', 'بھیڑ'),
  w('frog', '🐸', 'animals', 'frog', 'ضفدع', 'مینڈک'),
  w('bee', '🐝', 'animals', 'bee', 'نحلة', 'شہد کی مکھی'),
  w('butterfly', '🦋', 'animals', 'butterfly', 'فراشة', 'تتلی'),
  w('chicken', '🐔', 'animals', 'chicken', 'دجاجة', 'مرغی'),
  // Fruit
  w('apple', '🍎', 'fruit', 'apple', 'تفاحة', 'سیب', true),
  w('banana', '🍌', 'fruit', 'banana', 'موزة', 'کیلا', true),
  w('grapes', '🍇', 'fruit', 'grapes', 'عنب', 'انگور'),
  w('orange', '🍊', 'fruit', 'orange', 'برتقالة', 'مالٹا'),
  w('strawberry', '🍓', 'fruit', 'strawberry', 'فراولة', 'اسٹرابیری'),
  w('watermelon', '🍉', 'fruit', 'watermelon', 'بطيخ', 'تربوز'),
  w('mango', '🥭', 'fruit', 'mango', 'مانجو', 'آم'),
  w('pear', '🍐', 'fruit', 'pear', 'كمثرى', 'ناشپاتی'),
  // Vegetables
  w('carrot', '🥕', 'vegetables', 'carrot', 'جزرة', 'گاجر'),
  w('potato', '🥔', 'vegetables', 'potato', 'بطاطا', 'آلو'),
  w('tomato', '🍅', 'vegetables', 'tomato', 'طماطم', 'ٹماٹر'),
  w('corn', '🌽', 'vegetables', 'corn', 'ذرة', 'مکئی'),
  w('broccoli', '🥦', 'vegetables', 'broccoli', 'بروكلي', 'بروکلی'),
  w('onion', '🧅', 'vegetables', 'onion', 'بصل', 'پیاز'),
  // Food & drink
  w('bread', '🍞', 'food', 'bread', 'خبز', 'روٹی', true),
  w('milk', '🥛', 'food', 'milk', 'حليب', 'دودھ', true),
  w('egg', '🥚', 'food', 'egg', 'بيضة', 'انڈا', true),
  w('cake', '🎂', 'food', 'cake', 'كعكة', 'کیک', true),
  w('water', '💧', 'food', 'water', 'ماء', 'پانی', true),
  w('rice', '🍚', 'food', 'rice', 'أرز', 'چاول'),
  w('icecream', '🍦', 'food', 'ice cream', 'آيس كريم', 'آئس کریم'),
  // Clothes
  w('shirt', '👕', 'clothes', 'shirt', 'قميص', 'قمیض'),
  w('shoes', '👟', 'clothes', 'shoes', 'حذاء', 'جوتے', true),
  w('hat', '🧢', 'clothes', 'hat', 'قبعة', 'ٹوپی', true),
  w('socks', '🧦', 'clothes', 'socks', 'جوارب', 'موزے'),
  w('dress', '👗', 'clothes', 'dress', 'فستان', 'فراک'),
  w('coat', '🧥', 'clothes', 'coat', 'معطف', 'کوٹ'),
  w('glasses', '👓', 'clothes', 'glasses', 'نظارة', 'عینک'),
  // Vehicles
  w('car', '🚗', 'vehicles', 'car', 'سيارة', 'گاڑی', true),
  w('bus', '🚌', 'vehicles', 'bus', 'حافلة', 'بس', true),
  w('train', '🚆', 'vehicles', 'train', 'قطار', 'ٹرین'),
  w('plane', '✈️', 'vehicles', 'plane', 'طائرة', 'ہوائی جہاز'),
  w('boat', '⛵', 'vehicles', 'boat', 'قارب', 'کشتی'),
  w('bicycle', '🚲', 'vehicles', 'bicycle', 'دراجة', 'سائیکل'),
  w('fireengine', '🚒', 'vehicles', 'fire engine', 'سيارة إطفاء', 'فائر ٹرک'),
  // Things at home
  w('cup', '☕', 'home', 'cup', 'كوب', 'کپ', true),
  w('spoon', '🥄', 'home', 'spoon', 'ملعقة', 'چمچ'),
  w('bed', '🛏️', 'home', 'bed', 'سرير', 'بستر', true),
  w('chair', '🪑', 'home', 'chair', 'كرسي', 'کرسی'),
  w('book', '📖', 'home', 'book', 'كتاب', 'کتاب', true),
  w('ball', '⚽', 'home', 'ball', 'كرة', 'گیند', true),
  w('key', '🔑', 'home', 'key', 'مفتاح', 'چابی'),
  w('scissors', '✂️', 'home', 'scissors', 'مقص', 'قینچی'),
  w('toothbrush', '🪥', 'home', 'toothbrush', 'فرشاة أسنان', 'ٹوتھ برش'),
  w('soap', '🧼', 'home', 'soap', 'صابون', 'صابن'),
  w('phone', '📱', 'home', 'phone', 'هاتف', 'فون'),
  w('umbrella', '☂️', 'home', 'umbrella', 'مظلة', 'چھتری'),
  w('clock', '⏰', 'home', 'clock', 'ساعة', 'گھڑی'),
  w('pencil', '✏️', 'home', 'pencil', 'قلم رصاص', 'پنسل'),
  w('bag', '🎒', 'home', 'bag', 'حقيبة', 'بستہ'),
  w('house', '🏠', 'home', 'house', 'بيت', 'گھر', true),
  w('broom', '🧹', 'home', 'broom', 'مكنسة', 'جھاڑو'),
  // Nature
  w('sun', '☀️', 'nature', 'sun', 'شمس', 'سورج', true),
  w('moon', '🌙', 'nature', 'moon', 'قمر', 'چاند', true),
  w('star', '⭐', 'nature', 'star', 'نجمة', 'ستارہ', true),
  w('tree', '🌳', 'nature', 'tree', 'شجرة', 'درخت', true),
  w('flower', '🌸', 'nature', 'flower', 'زهرة', 'پھول', true),
  w('rain', '🌧️', 'nature', 'rain', 'مطر', 'بارش'),
  w('sea', '🌊', 'nature', 'sea', 'بحر', 'سمندر'),
  w('snow', '❄️', 'nature', 'snow', 'ثلج', 'برف'),
  w('fire', '🔥', 'nature', 'fire', 'نار', 'آگ'),
  w('ice', '🧊', 'nature', 'ice', 'جليد', 'برف کا ٹکڑا'),
  // Body
  w('hand', '✋', 'body', 'hand', 'يد', 'ہاتھ', true),
  w('foot', '🦶', 'body', 'foot', 'قدم', 'پاؤں'),
  w('eye', '👁️', 'body', 'eye', 'عين', 'آنکھ', true),
  w('ear', '👂', 'body', 'ear', 'أذن', 'کان', true),
  w('nose', '👃', 'body', 'nose', 'أنف', 'ناک', true),
  w('mouth', '👄', 'body', 'mouth', 'فم', 'منہ'),
  // Actions (say what is happening)
  w('running', '🏃', 'actions', 'running', 'يركض', 'دوڑ رہا ہے'),
  w('swimming', '🏊', 'actions', 'swimming', 'يسبح', 'تیر رہا ہے'),
  w('cycling', '🚴', 'actions', 'riding a bike', 'يركب الدراجة', 'سائیکل چلا رہا ہے'),
  w('sleeping', '😴', 'actions', 'sleeping', 'ينام', 'سو رہا ہے'),
  w('climbing', '🧗', 'actions', 'climbing', 'يتسلق', 'چڑھ رہا ہے'),
  w('dancing', '💃', 'actions', 'dancing', 'ترقص', 'ناچ رہی ہے'),
  w('cooking', '🧑‍🍳', 'actions', 'cooking', 'يطبخ', 'کھانا پکا رہا ہے'),
  w('writing', '✍️', 'actions', 'writing', 'يكتب', 'لکھ رہا ہے'),
  w('painting', '🎨', 'actions', 'painting', 'يرسم', 'رنگ بھر رہا ہے'),
  w('singing', '🎤', 'actions', 'singing', 'يغني', 'گا رہا ہے'),
  w('crying', '😢', 'actions', 'crying', 'يبكي', 'رو رہا ہے'),
  w('laughing', '😂', 'actions', 'laughing', 'يضحك', 'ہنس رہا ہے'),
  w('waving', '👋', 'actions', 'waving', 'يلوّح', 'ہاتھ ہلا رہا ہے'),
  w('eating', '😋', 'actions', 'eating', 'يأكل', 'کھا رہا ہے'),
];

export const WORD: Record<string, Word> = Object.fromEntries(WORDS.map((x) => [x.id, x]));
export const NOUNS = WORDS.filter((x) => x.cat !== 'actions');

export const CAT_NAME: Record<Cat, Tr> = {
  animals: { en: 'animals', ar: 'حيوانات', ur: 'جانور' },
  fruit: { en: 'fruit', ar: 'فواكه', ur: 'پھل' },
  vegetables: { en: 'vegetables', ar: 'خضروات', ur: 'سبزیاں' },
  food: { en: 'food and drink', ar: 'طعام وشراب', ur: 'کھانے پینے کی چیزیں' },
  clothes: { en: 'clothes', ar: 'ملابس', ur: 'کپڑے' },
  vehicles: { en: 'vehicles', ar: 'مركبات', ur: 'سواریاں' },
  home: { en: 'things at home', ar: 'أشياء في البيت', ur: 'گھر کی چیزیں' },
  nature: { en: 'nature', ar: 'الطبيعة', ur: 'قدرت' },
  body: { en: 'body parts', ar: 'أجزاء الجسم', ur: 'جسم کے حصے' },
  actions: { en: 'actions', ar: 'أفعال', ur: 'کام' },
};

/* ——— Sound Detective: first sounds ——— */

/** The first sound of a word as a letter (English digraphs kept together; c/k/q share one sound). */
export function firstSound(word: string, lang: Lang): string {
  const s = word.trim().toLowerCase();
  if (lang === 'en') {
    for (const d of ['sh', 'ch', 'th']) if (s.startsWith(d)) return d;
    return s[0];
  }
  return [...s][0];
}

/** Letters that share a sound, so they are never used as "wrong" answers for each other. */
const SAME_SOUND: Record<Lang, string[][]> = {
  en: [['c', 'k', 'q']],
  ar: [['ا', 'أ', 'إ', 'آ']],
  ur: [['س', 'ص', 'ث'], ['ز', 'ذ', 'ض', 'ظ'], ['ت', 'ط'], ['ہ', 'ح']],
};
export function soundKey(letter: string, lang: Lang): string {
  const group = SAME_SOUND[lang].find((g) => g.includes(letter));
  return group ? group[0] : letter;
}

/** Words left out of Sound Detective: English vowels and silent/odd spellings sound unlike their letter. */
export function soundFriendly(word: Word, lang: Lang): boolean {
  if (lang !== 'en') return true;
  return !/^[aeiou]/i.test(word.en) && !['phone'].includes(word.id) && !word.en.includes(' ');
}

/** Sounds children often mix up — used as the tricky distractors at the hardest level. */
export const CONFUSABLE: Record<Lang, string[][]> = {
  en: [['b', 'p'], ['d', 't'], ['c', 'g'], ['f', 'v'], ['s', 'sh'], ['m', 'n'], ['ch', 'sh']],
  ar: [['س', 'ص'], ['ت', 'ط'], ['د', 'ض'], ['ك', 'ق'], ['ذ', 'ز'], ['ح', 'ه']],
  ur: [['ک', 'گ'], ['ت', 'ٹ'], ['د', 'ڈ'], ['پ', 'ب'], ['ج', 'چ'], ['ر', 'ڑ']],
};

/** How an English sound is said aloud (letter names confuse young children). */
export const EN_SOUND: Record<string, string> = {
  b: 'buh', c: 'kuh', d: 'duh', f: 'fff', g: 'guh', h: 'huh', j: 'juh', k: 'kuh', l: 'lll', m: 'mmm', n: 'nnn', p: 'puh',
  q: 'kwuh', r: 'rrr', s: 'sss', t: 'tuh', v: 'vvv', w: 'wuh', y: 'yuh', z: 'zzz', sh: 'shh', ch: 'chuh', th: 'thh',
};

/* ——— Odd One Out ——— */

export type OddSet = { group: Tr; members: string[]; odd: string[] };

/** Hard level: sets that belong together by what they do or are like, not by category. */
export const ODD_HARD: OddSet[] = [
  { group: { en: 'things that fly', ar: 'أشياء تطير', ur: 'اڑنے والی چیزیں' }, members: ['bird', 'plane', 'butterfly', 'bee'], odd: ['car', 'fish', 'dog'] },
  { group: { en: 'things with wheels', ar: 'أشياء لها عجلات', ur: 'پہیوں والی چیزیں' }, members: ['car', 'bus', 'bicycle', 'train'], odd: ['boat', 'plane', 'horse'] },
  { group: { en: 'things in the sky', ar: 'أشياء في السماء', ur: 'آسمان کی چیزیں' }, members: ['sun', 'moon', 'star', 'rain'], odd: ['tree', 'flower', 'house'] },
  { group: { en: 'cold things', ar: 'أشياء باردة', ur: 'ٹھنڈی چیزیں' }, members: ['snow', 'icecream', 'ice'], odd: ['fire', 'sun', 'cake'] },
  { group: { en: 'hot things', ar: 'أشياء ساخنة', ur: 'گرم چیزیں' }, members: ['fire', 'sun', 'cup'], odd: ['snow', 'ice', 'icecream'] },
  { group: { en: 'things for keeping clean', ar: 'أشياء للنظافة', ur: 'صفائی کی چیزیں' }, members: ['soap', 'toothbrush', 'broom'], odd: ['cake', 'ball', 'phone'] },
  { group: { en: 'things in water', ar: 'أشياء في الماء', ur: 'پانی کی چیزیں' }, members: ['fish', 'boat', 'duck', 'frog'], odd: ['bicycle', 'lion', 'chair'] },
  { group: { en: 'things you wear', ar: 'أشياء نلبسها', ur: 'پہننے کی چیزیں' }, members: ['shirt', 'hat', 'socks', 'coat', 'glasses'], odd: ['chair', 'apple', 'key'] },
];

/** Medium level: two close categories. */
export const ODD_MEDIUM: [Cat, Cat][] = [
  ['fruit', 'vegetables'],
  ['vegetables', 'fruit'],
  ['clothes', 'home'],
  ['vehicles', 'home'],
  ['nature', 'home'],
  ['body', 'clothes'],
];

/* ——— Question Time ——— */

export type Question = { q: Tr; answer: string; /** Other pictures that would also be right (never shown as distractors). */ also?: string[] };

/** Medium: what things are for. */
export const Q_FUNCTION: Question[] = [
  { q: { en: 'What do we drink from?', ar: 'من أي شيء نشرب؟', ur: 'ہم کس میں پیتے ہیں؟' }, answer: 'cup' },
  { q: { en: 'What do we wear on our feet?', ar: 'ماذا نلبس في أقدامنا؟', ur: 'ہم پاؤں میں کیا پہنتے ہیں؟' }, answer: 'shoes', also: ['socks'] },
  { q: { en: 'What do we sleep in?', ar: 'أين ننام؟', ur: 'ہم کس پر سوتے ہیں؟' }, answer: 'bed' },
  { q: { en: 'What do we cut paper with?', ar: 'بماذا نقص الورق؟', ur: 'ہم کاغذ کس سے کاٹتے ہیں؟' }, answer: 'scissors' },
  { q: { en: 'What do we brush our teeth with?', ar: 'بماذا ننظف أسناننا؟', ur: 'ہم دانت کس سے صاف کرتے ہیں؟' }, answer: 'toothbrush' },
  { q: { en: 'What do we read?', ar: 'ماذا نقرأ؟', ur: 'ہم کیا پڑھتے ہیں؟' }, answer: 'book' },
  { q: { en: 'What do we sit on?', ar: 'على أي شيء نجلس؟', ur: 'ہم کس پر بیٹھتے ہیں؟' }, answer: 'chair', also: ['bed'] },
  { q: { en: 'What tells us the time?', ar: 'ما الذي يخبرنا بالوقت؟', ur: 'وقت کون بتاتا ہے؟' }, answer: 'clock', also: ['phone'] },
  { q: { en: 'What keeps us dry in the rain?', ar: 'ما الذي يحمينا من المطر؟', ur: 'بارش میں ہمیں کون سوکھا رکھتا ہے؟' }, answer: 'umbrella', also: ['coat'] },
  { q: { en: 'What do we wash our hands with?', ar: 'بماذا نغسل أيدينا؟', ur: 'ہم ہاتھ کس سے دھوتے ہیں؟' }, answer: 'soap', also: ['water'] },
  { q: { en: 'What do we write with?', ar: 'بماذا نكتب؟', ur: 'ہم کس سے لکھتے ہیں؟' }, answer: 'pencil' },
  { q: { en: 'What opens a door?', ar: 'ما الذي يفتح الباب؟', ur: 'دروازہ کس سے کھلتا ہے؟' }, answer: 'key' },
  { q: { en: 'What do we eat soup with?', ar: 'بماذا نأكل الحساء؟', ur: 'ہم سوپ کس سے کھاتے ہیں؟' }, answer: 'spoon' },
  { q: { en: 'What do we wear on our head?', ar: 'ماذا نلبس على رؤوسنا؟', ur: 'ہم سر پر کیا پہنتے ہیں؟' }, answer: 'hat' },
  { q: { en: 'What do we carry our books in?', ar: 'في أي شيء نحمل كتبنا؟', ur: 'ہم کتابیں کس میں رکھتے ہیں؟' }, answer: 'bag' },
  { q: { en: 'What do we call someone on?', ar: 'بماذا نتصل بشخص؟', ur: 'ہم کسی کو کس سے فون کرتے ہیں؟' }, answer: 'phone' },
];

/** Hard: who / where / which — thinking about the world. */
export const Q_REASON: Question[] = [
  { q: { en: 'Where do fish live?', ar: 'أين تعيش الأسماك؟', ur: 'مچھلیاں کہاں رہتی ہیں؟' }, answer: 'sea' },
  { q: { en: 'Who says “moo”?', ar: 'من يقول «مووو»؟', ur: 'کون «ماں» کرتی ہے؟' }, answer: 'cow' },
  { q: { en: 'Which animal is the biggest?', ar: 'أي حيوان هو الأكبر؟', ur: 'سب سے بڑا جانور کون سا ہے؟' }, answer: 'elephant' },
  { q: { en: 'What do we see in the sky at night?', ar: 'ماذا نرى في السماء ليلاً؟', ur: 'رات کو آسمان پر کیا نظر آتا ہے؟' }, answer: 'moon', also: ['star'] },
  { q: { en: 'What falls from the clouds?', ar: 'ماذا ينزل من الغيوم؟', ur: 'بادلوں سے کیا گرتا ہے؟' }, answer: 'rain', also: ['snow', 'water'] },
  { q: { en: 'Which one is hot?', ar: 'أيها ساخن؟', ur: 'کون سی چیز گرم ہے؟' }, answer: 'fire', also: ['sun', 'cup'] },
  { q: { en: 'Which one is cold?', ar: 'أيها بارد؟', ur: 'کون سی چیز ٹھنڈی ہے؟' }, answer: 'snow', also: ['ice', 'icecream', 'water'] },
  { q: { en: 'What grows on a tree?', ar: 'ماذا ينمو على الشجرة؟', ur: 'درخت پر کیا اگتا ہے؟' }, answer: 'apple', also: ['orange', 'mango', 'pear', 'banana', 'flower'] },
  { q: { en: 'What do we use to hear?', ar: 'بماذا نسمع؟', ur: 'ہم کس سے سنتے ہیں؟' }, answer: 'ear' },
  { q: { en: 'What do we use to smell?', ar: 'بماذا نشمّ؟', ur: 'ہم کس سے سونگھتے ہیں؟' }, answer: 'nose' },
  { q: { en: 'What do we use to see?', ar: 'بماذا نرى؟', ur: 'ہم کس سے دیکھتے ہیں؟' }, answer: 'eye', also: ['glasses'] },
  { q: { en: 'Which one can fly?', ar: 'أيها يستطيع الطيران؟', ur: 'کون اڑ سکتا ہے؟' }, answer: 'bird', also: ['plane', 'butterfly', 'bee', 'duck', 'chicken'] },
  { q: { en: 'Which one says “ribbit”?', ar: 'من يقول «نق نق»؟', ur: 'کون «ٹر ٹر» کرتا ہے؟' }, answer: 'frog' },
  { q: { en: 'What do we drink when we are thirsty?', ar: 'ماذا نشرب عندما نعطش؟', ur: 'پیاس لگے تو ہم کیا پیتے ہیں؟' }, answer: 'water', also: ['milk'] },
  { q: { en: 'Where do we sleep at night?', ar: 'أين ننام في الليل؟', ur: 'ہم رات کو کہاں سوتے ہیں؟' }, answer: 'bed', also: ['house'] },
  { q: { en: 'Which one gives us milk?', ar: 'أيها يعطينا الحليب؟', ur: 'ہمیں دودھ کون دیتا ہے؟' }, answer: 'cow', also: ['sheep'] },
  { q: { en: 'What do we ride on two wheels?', ar: 'ما الذي نركبه وله عجلتان؟', ur: 'ہم دو پہیوں پر کیا چلاتے ہیں؟' }, answer: 'bicycle' },
  { q: { en: 'Which one lives on a farm and says “baa”?', ar: 'من يعيش في المزرعة ويقول «ماء»؟', ur: 'فارم پر کون «میں میں» کرتی ہے؟' }, answer: 'sheep' },
];

/** Easy: point to the named picture. */
export const whichIs: Tr = { en: 'Which one is the {{x}}?', ar: 'أين {{x}}؟', ur: '{{x}} کون سا ہے؟' };

/* ——— Listen & Do ——— */

export type ObjKind = 'ball' | 'star' | 'heart' | 'block';
export type ObjColour = 'red' | 'blue' | 'yellow' | 'green';
export type ObjSize = 'big' | 'small';
export type Container = 'box' | 'bag' | 'basket';

export const OBJ_SHAPE: Record<ObjKind, 'circle' | 'star' | 'heart' | 'square'> = { ball: 'circle', star: 'star', heart: 'heart', block: 'square' };
export const COLOUR_HEX: Record<ObjColour, string> = { red: '#E5383B', blue: '#2A7FD4', yellow: '#F2C21B', green: '#1F9D3A' };
export const CONTAINER_EMOJI: Record<Container, string> = { box: '📦', bag: '🎒', basket: '🧺' };

type Gendered = { m: string; f: string; mo?: string };
const AR_NOUN: Record<ObjKind, { w: string; f: boolean }> = { ball: { w: 'الكرة', f: true }, star: { w: 'النجمة', f: true }, heart: { w: 'القلب', f: false }, block: { w: 'المكعب', f: false } };
const AR_COLOUR: Record<ObjColour, Gendered> = { red: { m: 'الأحمر', f: 'الحمراء' }, blue: { m: 'الأزرق', f: 'الزرقاء' }, yellow: { m: 'الأصفر', f: 'الصفراء' }, green: { m: 'الأخضر', f: 'الخضراء' } };
const AR_SIZE: Record<ObjSize, Gendered> = { big: { m: 'الكبير', f: 'الكبيرة' }, small: { m: 'الصغير', f: 'الصغيرة' } };
const AR_CONT: Record<Container, string> = { box: 'الصندوق', bag: 'الحقيبة', basket: 'السلة' };

// Urdu: masculine nouns/adjectives ending in ا/ہ change before کو/میں (oblique case).
const UR_NOUN: Record<ObjKind, { w: string; obl: string; f: boolean }> = {
  ball: { w: 'گیند', obl: 'گیند', f: true },
  star: { w: 'ستارہ', obl: 'ستارے', f: false },
  heart: { w: 'دل', obl: 'دل', f: false },
  block: { w: 'بلاک', obl: 'بلاک', f: false },
};
const UR_COLOUR: Record<ObjColour, Gendered> = { red: { m: 'سرخ', f: 'سرخ', mo: 'سرخ' }, blue: { m: 'نیلا', f: 'نیلی', mo: 'نیلے' }, yellow: { m: 'پیلا', f: 'پیلی', mo: 'پیلے' }, green: { m: 'ہرا', f: 'ہری', mo: 'ہرے' } };
const UR_SIZE: Record<ObjSize, Gendered> = { big: { m: 'بڑا', f: 'بڑی', mo: 'بڑے' }, small: { m: 'چھوٹا', f: 'چھوٹی', mo: 'چھوٹے' } };
const UR_CONT: Record<Container, string> = { box: 'ڈبے', bag: 'بستے', basket: 'ٹوکری' };

export type Obj = { kind: ObjKind; colour: ObjColour; size: ObjSize };
export type Instruction = { target: Obj; /** Which details the child must listen for. */ use: { colour: boolean; size: boolean }; container?: Container };

/** "Touch the big red ball" / "Put the small blue star in the box" in the chosen language. */
export function instructionText(ins: Instruction, lang: Lang): string {
  const { target: o, use, container } = ins;
  if (lang === 'en') {
    const np = ['the', use.size ? o.size : '', use.colour ? o.colour : '', o.kind].filter(Boolean).join(' ');
    return container ? `Put ${np} in the ${container}` : `Touch ${np}`;
  }
  if (lang === 'ar') {
    const n = AR_NOUN[o.kind];
    const g = n.f ? 'f' : 'm';
    const np = [n.w, use.colour ? AR_COLOUR[o.colour][g] : '', use.size ? AR_SIZE[o.size][g] : ''].filter(Boolean).join(' ');
    return container ? `ضع ${np} في ${AR_CONT[container]}` : `المس ${np}`;
  }
  const n = UR_NOUN[o.kind];
  const adj = (a: Gendered) => (n.f ? a.f : a.mo ?? a.m);
  const np = [use.size ? adj(UR_SIZE[o.size]) : '', use.colour ? adj(UR_COLOUR[o.colour]) : '', n.obl].filter(Boolean).join(' ');
  return container ? `${np} کو ${UR_CONT[container]} میں رکھیں` : `${np} کو چھوئیں`;
}

/* ——— Story Steps ——— */

export type Story = { id: string; title: Tr; steps: { emoji: string; text: Tr }[] };

const st = (emoji: string, en: string, ar: string, ur: string) => ({ emoji, text: { en, ar, ur } });

/** Five steps each; easier levels use 3 or 4 of them (first and last always kept). */
export const STORIES: Story[] = [
  {
    id: 'seed',
    title: { en: 'The flower', ar: 'الزهرة', ur: 'پھول' },
    steps: [st('🫘', 'Plant the seed', 'نزرع البذرة', 'بیج بوتے ہیں'), st('💧', 'Water it', 'نسقيها بالماء', 'پانی دیتے ہیں'), st('🌱', 'A little shoot grows', 'ينمو برعم صغير', 'ننھا پودا نکلتا ہے'), st('🌿', 'It gets bigger', 'يكبر أكثر', 'پودا بڑا ہوتا ہے'), st('🌻', 'A flower opens', 'تتفتح زهرة', 'پھول کھل جاتا ہے')],
  },
  {
    id: 'chick',
    title: { en: 'The chick', ar: 'الكتكوت', ur: 'چوزہ' },
    steps: [st('🥚', 'There is an egg', 'هناك بيضة', 'ایک انڈا ہے'), st('🐣', 'The egg cracks', 'تنكسر البيضة', 'انڈا ٹوٹتا ہے'), st('🐥', 'A chick comes out', 'يخرج كتكوت', 'چوزہ باہر آتا ہے'), st('🌾', 'The chick eats and grows', 'يأكل الكتكوت ويكبر', 'چوزہ کھاتا ہے اور بڑا ہوتا ہے'), st('🐔', 'It becomes a hen', 'يصبح دجاجة', 'وہ مرغی بن جاتا ہے')],
  },
  {
    id: 'morning',
    title: { en: 'Getting ready for school', ar: 'الاستعداد للمدرسة', ur: 'اسکول کی تیاری' },
    steps: [st('🛏️', 'Wake up', 'أستيقظ', 'جاگنا'), st('🪥', 'Brush your teeth', 'أنظّف أسناني', 'دانت صاف کرنا'), st('👕', 'Get dressed', 'ألبس ملابسي', 'کپڑے پہننا'), st('🥣', 'Eat breakfast', 'أتناول الفطور', 'ناشتہ کرنا'), st('🎒', 'Go to school', 'أذهب إلى المدرسة', 'اسکول جانا')],
  },
  {
    id: 'rain',
    title: { en: 'A rainy day', ar: 'يوم ممطر', ur: 'بارش کا دن' },
    steps: [st('☀️', 'It is sunny', 'الجو مشمس', 'دھوپ نکلی ہے'), st('☁️', 'Clouds come', 'تأتي الغيوم', 'بادل آتے ہیں'), st('🌧️', 'It starts to rain', 'يبدأ المطر', 'بارش شروع ہوتی ہے'), st('☂️', 'Open the umbrella', 'نفتح المظلة', 'چھتری کھولتے ہیں'), st('🌈', 'A rainbow comes out', 'يظهر قوس قزح', 'قوس قزح نکلتی ہے')],
  },
  {
    id: 'sandwich',
    title: { en: 'Making a sandwich', ar: 'تحضير شطيرة', ur: 'سینڈوچ بنانا' },
    steps: [st('🍞', 'Take the bread', 'نأخذ الخبز', 'ڈبل روٹی لیتے ہیں'), st('🧈', 'Spread the butter', 'ندهن الزبدة', 'مکھن لگاتے ہیں'), st('🧀', 'Add the cheese', 'نضع الجبن', 'پنیر رکھتے ہیں'), st('🥪', 'Close the sandwich', 'نغلق الشطيرة', 'سینڈوچ بند کرتے ہیں'), st('😋', 'Eat it up', 'نأكلها', 'مزے سے کھاتے ہیں')],
  },
  {
    id: 'snowman',
    title: { en: 'The snowman', ar: 'رجل الثلج', ur: 'برف کا آدمی' },
    steps: [st('❄️', 'Snow falls', 'يتساقط الثلج', 'برف گرتی ہے'), st('⛄', 'Build a snowman', 'نبني رجل ثلج', 'برف کا آدمی بناتے ہیں'), st('🧣', 'Give him a scarf', 'نلبسه وشاحاً', 'اسے مفلر پہناتے ہیں'), st('☀️', 'The sun comes out', 'تشرق الشمس', 'سورج نکلتا ہے'), st('💧', 'The snowman melts', 'يذوب رجل الثلج', 'برف کا آدمی پگھل جاتا ہے')],
  },
  {
    id: 'birthday',
    title: { en: 'The birthday', ar: 'عيد الميلاد', ur: 'سالگرہ' },
    steps: [st('🎈', 'Put up balloons', 'نعلّق البالونات', 'غبارے لگاتے ہیں'), st('🎂', 'Bring the cake', 'نحضر الكعكة', 'کیک لاتے ہیں'), st('🕯️', 'Light the candles', 'نشعل الشموع', 'موم بتیاں جلاتے ہیں'), st('🥳', 'Blow them out', 'نطفئ الشموع', 'پھونک مار کر بجھاتے ہیں'), st('🎁', 'Open the presents', 'نفتح الهدايا', 'تحفے کھولتے ہیں')],
  },
];

/** Which of the five steps to show for 3, 4 or 5 steps. */
export function storyIndexes(n: number): number[] {
  return n <= 3 ? [0, 2, 4] : n === 4 ? [0, 1, 3, 4] : [0, 1, 2, 3, 4];
}

/** Linking words for telling the story back. */
export const LINKS: Record<Lang, string[]> = {
  en: ['First', 'Next', 'Then', 'After that', 'Last'],
  ar: ['أولاً', 'بعد ذلك', 'ثم', 'وبعدها', 'أخيراً'],
  ur: ['پہلے', 'پھر', 'اس کے بعد', 'پھر', 'آخر میں'],
};
export function linksFor(n: number, lang: Lang): string[] {
  const l = LINKS[lang];
  if (n <= 3) return [l[0], l[2], l[4]];
  if (n === 4) return [l[0], l[1], l[2], l[4]];
  return l;
}
