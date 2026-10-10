/**
 * Content for the Calm & feelings Skill Builders: feelings, everyday situations, problem sizes,
 * calm-down strategies and grounding prompts — in English, Arabic and Urdu.
 * Pure TypeScript so the games, printable sheets and tests can share it.
 */
import type { Lang, Tr } from '../speech/data';

export type FeelingId = 'happy' | 'sad' | 'angry' | 'scared' | 'surprised' | 'tired' | 'worried' | 'excited' | 'calm';

export const FEELINGS: { id: FeelingId; emoji: string; name: Tr; basic?: boolean }[] = [
  { id: 'happy', emoji: '😊', name: { en: 'happy', ar: 'سعيد', ur: 'خوش' }, basic: true },
  { id: 'sad', emoji: '😢', name: { en: 'sad', ar: 'حزين', ur: 'اداس' }, basic: true },
  { id: 'angry', emoji: '😠', name: { en: 'angry', ar: 'غاضب', ur: 'غصے میں' }, basic: true },
  { id: 'scared', emoji: '😨', name: { en: 'scared', ar: 'خائف', ur: 'ڈرا ہوا' }, basic: true },
  { id: 'surprised', emoji: '😮', name: { en: 'surprised', ar: 'متفاجئ', ur: 'حیران' } },
  { id: 'tired', emoji: '😴', name: { en: 'tired', ar: 'متعب', ur: 'تھکا ہوا' } },
  { id: 'worried', emoji: '😟', name: { en: 'worried', ar: 'قلق', ur: 'پریشان' } },
  { id: 'excited', emoji: '🤩', name: { en: 'excited', ar: 'متحمس', ur: 'پرجوش' } },
  { id: 'calm', emoji: '😌', name: { en: 'calm', ar: 'هادئ', ur: 'پرسکون' } },
];
export const FEELING = Object.fromEntries(FEELINGS.map((f) => [f.id, f])) as Record<FeelingId, (typeof FEELINGS)[number]>;

/** Everyday situations: how might you feel? (`also` = other feelings that are fair answers too). */
export type Situation = { id: string; emoji: string; text: Tr; feeling: FeelingId; also?: FeelingId[] };
const sit = (id: string, emoji: string, feeling: FeelingId, en: string, ar: string, ur: string, also?: FeelingId[]): Situation => ({ id, emoji, feeling, also, text: { en, ar, ur } });

export const SITUATIONS: Situation[] = [
  sit('icecream', '🍦', 'sad', 'Your ice cream falls on the floor.', 'سقط الآيس كريم على الأرض.', 'آپ کی آئس کریم زمین پر گر جاتی ہے۔', ['angry']),
  sit('party', '🎉', 'excited', 'It is your birthday party!', 'إنها حفلة عيد ميلادك!', 'آج آپ کی سالگرہ کی پارٹی ہے!', ['happy']),
  sit('dog', '🐕', 'scared', 'A big dog barks loudly at you.', 'كلب كبير ينبح عليك بصوت عالٍ.', 'ایک بڑا کتا آپ پر زور سے بھونکتا ہے۔', ['surprised', 'worried']),
  sit('toy', '🧸', 'angry', 'Someone takes your toy without asking.', 'أخذ أحدهم لعبتك دون أن يستأذن.', 'کوئی بغیر پوچھے آپ کا کھلونا لے لیتا ہے۔', ['sad']),
  sit('present', '🎁', 'surprised', 'You get a present you did not expect.', 'تحصل على هدية لم تكن تتوقعها.', 'آپ کو ایسا تحفہ ملتا ہے جس کی امید نہیں تھی۔', ['happy', 'excited']),
  sit('late', '🌙', 'tired', 'You stayed up very late last night.', 'سهرت كثيراً الليلة الماضية.', 'آپ کل رات بہت دیر تک جاگتے رہے۔'),
  sit('school', '🏫', 'worried', 'Tomorrow is your first day at a new school.', 'غداً أول يوم لك في مدرسة جديدة.', 'کل نئے اسکول میں آپ کا پہلا دن ہے۔', ['scared', 'excited']),
  sit('puzzle', '🧩', 'happy', 'You finish a hard puzzle all by yourself.', 'أنهيت لغزاً صعباً بنفسك.', 'آپ نے ایک مشکل پہیلی خود حل کر لی۔', ['excited']),
  sit('friend', '👋', 'sad', 'Your best friend is moving far away.', 'صديقك المفضل سينتقل إلى مكان بعيد.', 'آپ کا پکا دوست بہت دور جا رہا ہے۔', ['worried']),
  sit('tower', '🧱', 'angry', 'Your block tower falls down just as you finish.', 'سقط برج المكعبات لحظة انتهائك منه.', 'آپ کا بلاکوں کا مینار بنتے ہی گر جاتا ہے۔', ['sad']),
  sit('thunder', '⛈️', 'scared', 'There is loud thunder in the night.', 'هناك رعد قوي في الليل.', 'رات کو زور کی گرج ہوتی ہے۔', ['worried', 'surprised']),
  sit('park', '🛝', 'happy', 'You are playing in the park with friends.', 'تلعب في الحديقة مع أصدقائك.', 'آپ دوستوں کے ساتھ پارک میں کھیل رہے ہیں۔', ['excited', 'calm']),
  sit('bath', '🛁', 'calm', 'You are in a warm bath with soft music.', 'أنت في حمّام دافئ مع موسيقى هادئة.', 'آپ نیم گرم پانی میں نہا رہے ہیں اور دھیمی موسیقی چل رہی ہے۔', ['happy', 'tired']),
  sit('lost', '🛒', 'scared', 'You cannot find your mum in a big shop.', 'لا تجد أمك في متجر كبير.', 'آپ بڑی دکان میں اپنی امی کو نہیں ڈھونڈ پا رہے۔', ['worried']),
];

/* ——— Big or Small Problem ——— */

export type Size = 'small' | 'medium' | 'big';
export const SIZE_INFO: Record<Size, { emoji: string; color: string; tint: string; name: Tr; react: Tr }> = {
  small: { emoji: '🐜', color: '#2E9E6B', tint: '#E3F4E3', name: { en: 'Small problem', ar: 'مشكلة صغيرة', ur: 'چھوٹا مسئلہ' }, react: { en: 'Stay calm and fix it yourself.', ar: 'ابقَ هادئاً وحلّها بنفسك.', ur: 'پرسکون رہیں اور خود حل کریں۔' } },
  medium: { emoji: '🐕', color: '#D99A1B', tint: '#FFF3D6', name: { en: 'Medium problem', ar: 'مشكلة متوسطة', ur: 'درمیانہ مسئلہ' }, react: { en: 'Take a breath and ask a grown-up to help.', ar: 'خذ نفساً واطلب مساعدة شخص كبير.', ur: 'گہرا سانس لیں اور کسی بڑے سے مدد مانگیں۔' } },
  big: { emoji: '🐘', color: '#C2412D', tint: '#FCE6E1', name: { en: 'Big problem', ar: 'مشكلة كبيرة', ur: 'بڑا مسئلہ' }, react: { en: 'Get a grown-up straight away.', ar: 'نادِ شخصاً كبيراً فوراً.', ur: 'فوراً کسی بڑے کو بلائیں۔' } },
};
export type Problem = { id: string; emoji: string; text: Tr; size: Size; /** Hardest level only: tricky ones that look bigger or smaller than they are. */ tricky?: boolean };
const pr = (id: string, emoji: string, size: Size, en: string, ar: string, ur: string, tricky = false): Problem => ({ id, emoji, size, tricky, text: { en, ar, ur } });

export const PROBLEMS: Problem[] = [
  pr('pencil', '✏️', 'small', 'Your pencil breaks.', 'انكسر قلمك.', 'آپ کی پنسل ٹوٹ جاتی ہے۔'),
  pr('game', '🎲', 'small', 'You lose a board game.', 'خسرت في لعبة.', 'آپ ایک کھیل ہار جاتے ہیں۔'),
  pr('spill', '🥤', 'small', 'You spill a little water.', 'سكبت قليلاً من الماء.', 'آپ سے تھوڑا سا پانی گر جاتا ہے۔'),
  pr('rain', '🌧️', 'small', 'It rains, so you play inside.', 'تمطر، فتلعب في الداخل.', 'بارش ہو رہی ہے، اس لیے آپ اندر کھیلتے ہیں۔'),
  pr('colour', '🖍️', 'small', 'You wanted the red crayon but got blue.', 'أردت القلم الأحمر لكنك أخذت الأزرق.', 'آپ کو لال رنگ چاہیے تھا مگر نیلا ملا۔', true),
  pr('turn', '🛝', 'small', 'You have to wait for your turn on the slide.', 'عليك انتظار دورك على الزحليقة.', 'آپ کو سلائیڈ پر اپنی باری کا انتظار کرنا ہے۔', true),
  pr('lunch', '🥪', 'medium', 'You forgot your lunch at home.', 'نسيت غداءك في البيت.', 'آپ اپنا لنچ گھر بھول گئے۔'),
  pr('knee', '🩹', 'medium', 'You fall and scrape your knee.', 'وقعت وجُرحت ركبتك.', 'آپ گر جاتے ہیں اور گھٹنا چھل جاتا ہے۔'),
  pr('lostToy', '🧸', 'medium', 'You cannot find your favourite toy.', 'لا تجد لعبتك المفضلة.', 'آپ کو اپنا پسندیدہ کھلونا نہیں مل رہا۔'),
  pr('pushed', '😣', 'medium', 'Someone pushes you in the line.', 'دفعك أحدهم في الطابور.', 'قطار میں کوئی آپ کو دھکا دیتا ہے۔', true),
  pr('mum', '🛒', 'big', 'You are lost in a big shop.', 'تهت في متجر كبير.', 'آپ بڑی دکان میں گم ہو گئے ہیں۔'),
  pr('fire', '🔥', 'big', 'You see smoke and fire.', 'ترى دخاناً وناراً.', 'آپ کو دھواں اور آگ نظر آتی ہے۔'),
  pr('hurt', '🚑', 'big', 'Your friend is badly hurt.', 'صديقك مصاب إصابة بالغة.', 'آپ کا دوست بری طرح زخمی ہے۔'),
  pr('stranger', '🚗', 'big', 'A stranger asks you to get in their car.', 'شخص غريب يطلب منك ركوب سيارته.', 'کوئی اجنبی آپ کو اپنی گاڑی میں بیٹھنے کو کہتا ہے۔', true),
];

/* ——— Calm-Down Toolbox ——— */

export type Strategy = { id: string; emoji: string; text: Tr; helpful: boolean };
const sg = (id: string, emoji: string, helpful: boolean, en: string, ar: string, ur: string): Strategy => ({ id, emoji, helpful, text: { en, ar, ur } });

export const STRATEGIES: Strategy[] = [
  sg('breathe', '🌬️', true, 'Take slow, deep breaths', 'خذ أنفاساً بطيئة وعميقة', 'آہستہ اور گہرے سانس لیں'),
  sg('count', '🔟', true, 'Count to ten', 'عُدّ حتى عشرة', 'دس تک گنیں'),
  sg('hug', '🧸', true, 'Hug a teddy', 'احضن دبدوباً', 'ٹیڈی کو گلے لگائیں'),
  sg('help', '🙋', true, 'Ask a grown-up for help', 'اطلب المساعدة من شخص كبير', 'کسی بڑے سے مدد مانگیں'),
  sg('water', '💧', true, 'Drink some water', 'اشرب بعض الماء', 'تھوڑا پانی پئیں'),
  sg('draw', '🖍️', true, 'Draw how you feel', 'ارسم ما تشعر به', 'اپنا احساس ڈرا کریں'),
  sg('quiet', '🛋️', true, 'Go to a quiet corner', 'اذهب إلى ركن هادئ', 'کسی پرسکون کونے میں جائیں'),
  sg('music', '🎧', true, 'Listen to calm music', 'استمع إلى موسيقى هادئة', 'دھیمی موسیقی سنیں'),
  sg('squeeze', '✊', true, 'Squeeze your hands tight, then let go', 'اضغط يديك بقوة ثم أرخِهما', 'ہاتھوں کو زور سے بھینچیں، پھر ڈھیلا چھوڑ دیں'),
  sg('talk', '💬', true, 'Tell someone how you feel', 'أخبر أحداً بما تشعر به', 'کسی کو اپنا احساس بتائیں'),
  sg('hit', '👊', false, 'Hit someone', 'تضرب أحداً', 'کسی کو ماریں'),
  sg('shout', '📢', false, 'Shout and scream', 'تصرخ وتصيح', 'چیخیں اور چلائیں'),
  sg('throw', '💥', false, 'Throw things', 'ترمي الأشياء', 'چیزیں پھینکیں'),
  sg('break', '🔨', false, 'Break something', 'تكسر شيئاً', 'کوئی چیز توڑ دیں'),
  sg('hide', '🙈', false, 'Hide and tell nobody', 'تختبئ ولا تخبر أحداً', 'چھپ جائیں اور کسی کو نہ بتائیں'),
  sg('bite', '😬', false, 'Bite or kick', 'تعضّ أو تركل', 'کاٹیں یا لات ماریں'),
];

export const TOOLBOX_FEELINGS: { feeling: FeelingId; ask: Tr }[] = [
  { feeling: 'angry', ask: { en: 'I feel angry. What can I do?', ar: 'أشعر بالغضب. ماذا أفعل؟', ur: 'مجھے غصہ آ رہا ہے۔ میں کیا کروں؟' } },
  { feeling: 'worried', ask: { en: 'I feel worried. What can I do?', ar: 'أشعر بالقلق. ماذا أفعل؟', ur: 'میں پریشان ہوں۔ میں کیا کروں؟' } },
  { feeling: 'sad', ask: { en: 'I feel sad. What can I do?', ar: 'أشعر بالحزن. ماذا أفعل؟', ur: 'میں اداس ہوں۔ میں کیا کروں؟' } },
  { feeling: 'scared', ask: { en: 'I feel scared. What can I do?', ar: 'أشعر بالخوف. ماذا أفعل؟', ur: 'مجھے ڈر لگ رہا ہے۔ میں کیا کروں؟' } },
  { feeling: 'excited', ask: { en: 'I feel too wild and excited. What can I do?', ar: 'أشعر بحماس زائد. ماذا أفعل؟', ur: 'میں بہت زیادہ جوش میں ہوں۔ میں کیا کروں؟' } },
];

/* ——— Balloon Breathing ——— */

export type BreathPhase = 'in' | 'hold' | 'out' | 'rest';
export const PHASE_TEXT: Record<BreathPhase, Tr> = {
  in: { en: 'Breathe in…', ar: 'خذ نفساً…', ur: 'سانس اندر…' },
  hold: { en: 'Hold…', ar: 'احبس النفس…', ur: 'روکیں…' },
  out: { en: 'Breathe out…', ar: 'أخرج النفس…', ur: 'سانس باہر…' },
  rest: { en: 'Rest…', ar: 'استرح…', ur: 'آرام…' },
};
/** Seconds for each phase: Easy in/out, Medium with a hold, Hard square breathing. */
export function breathPattern(style: string): [BreathPhase, number][] {
  if (style === 'square') return [['in', 4], ['hold', 4], ['out', 4], ['rest', 4]];
  if (style === 'hold') return [['in', 4], ['hold', 2], ['out', 5]];
  return [['in', 3], ['out', 4]];
}

/* ——— 5-4-3-2-1 Grounding ——— */

export type Sense = { id: 'see' | 'touch' | 'hear' | 'smell' | 'taste'; emoji: string; ask: Tr };
export const SENSES: Sense[] = [
  { id: 'see', emoji: '👀', ask: { en: 'things you can SEE', ar: 'أشياء تراها', ur: 'چیزیں جو آپ دیکھ سکتے ہیں' } },
  { id: 'touch', emoji: '✋', ask: { en: 'things you can TOUCH', ar: 'أشياء تلمسها', ur: 'چیزیں جنہیں آپ چھو سکتے ہیں' } },
  { id: 'hear', emoji: '👂', ask: { en: 'things you can HEAR', ar: 'أشياء تسمعها', ur: 'چیزیں جو آپ سن سکتے ہیں' } },
  { id: 'smell', emoji: '👃', ask: { en: 'things you can SMELL', ar: 'أشياء تشمّها', ur: 'چیزیں جو آپ سونگھ سکتے ہیں' } },
  { id: 'taste', emoji: '👅', ask: { en: 'thing you can TASTE', ar: 'شيء تتذوقه', ur: 'چیز جس کا ذائقہ آپ محسوس کر سکتے ہیں' } },
];
/** Which senses and how many of each: Easy 3-2-1, Medium 4-3-2-1, Hard 5-4-3-2-1. */
export function groundingSteps(senses: number): { sense: Sense; count: number }[] {
  const n = Math.max(3, Math.min(5, senses));
  return SENSES.slice(0, n).map((sense, i) => ({ sense, count: n - i }));
}

export const say3 = (tr: Tr, lang: Lang) => tr[lang];
