import { indiaBusinessDate } from "./point-rules";

export type ZeeStage = { days: number; name: string; image: string };

export const zeeStages: readonly ZeeStage[] = [
  [0, "Little beginnings"], [1, "Ready, set, Zee"], [3, "Wrapped & ready"],
  [5, "Training mode"], [7, "Tiny adventurer"], [10, "Finding her stride"],
  [15, "Leather apprentice"], [20, "First armor"], [25, "Shoulders of courage"],
  [30, "Heart of a knight"], [35, "Paws of steel"], [40, "Boots on the ground"],
  [45, "Little defender"], [50, "Brave blade"], [60, "Silver knight"],
  [70, "Cape of courage"], [80, "Silver guardian"], [90, "Golden champion"],
  [95, "Royal warrior"], [100, "Legendary Zee"],
].map(([days, name]) => ({ days: Number(days), name: String(name), image: `/zee/day-${String(days).padStart(3, "0")}.webp` }));

export const zeeDailyLines = [
  "Excuses ka warm-up ho gaya? Ab tumhari baari.",
  "Main chhoti hoon. Tumhara streak nahi hona chahiye.",
  "Armor meri upgrade ho rahi hai. Discipline tumhara.",
  "Kal se nahi, aaj se. Calendar bhi thak gaya sunke.",
  "Gym bag ko bhi kabhi ghar se bahar ghuma do.",
  "Motivation late hai? Tum time pe aa jaana.",
  "Main flower pehenti hoon, tum consistency pehen lo.",
  "Bas show up karo. Hero wali entry optional hai.",
  "Tumhara sofa mujhe competition de raha hai. Jeetne mat dena.",
  "Ek aur din. Main taali paws se baja lungi.",
  "Discipline ka subscription hai. Roz renew karna padta hai.",
  "Aaj ki attendance, kal ka proud moment.",
  "Tiny paws, big plans. Tumhare bhi, hopefully.",
  "Consistency ka filter nahi hota. Asli wali dikhao.",
  "Streak ko seen pe mat chhodo. Gym aa jao.",
  "Main cape sambhal lungi. Tum apna routine sambhalo.",
  "Progress slow? Koi nahi. Excuses ko fast mat hone do.",
  "Aaj ka effort future tum ko thank-you bolne dega.",
  "Alarm se negotiation band. Shoes se friendship shuru.",
  "Tum aaye, streak badha, meri cuteness toh permanent hai.",
  "Perfect day ka wait? Normal day bhi chalega, boss.",
  "Main warrior ban rahi hoon. Tum regular ban jao.",
  "Gym playlist ready hai. Lead character kahan hai?",
  "Chhota sa effort. Badi wali consistency. Deal?",
  "Aaj bhi aaye? Discipline tum par suit karta hai.",
  "Mere paas shield hai. Tumhare paas solid routine ho.",
  "Achievement unlocked: excuses ko politely mana kiya.",
  "Main cute hoon, par attendance pe serious hoon.",
  "Apni pace pe chalo. Bas apna promise yaad rakho.",
  "Roz ka little effort hi legendary banta hai.",
] as const;

export const zeeStarterLines = [
  "Day zero? Fresh start ka fancy naam hai. Chalo!",
  "Comeback ka welcome hai. Guilt ko bahar chhod do.",
  "Main ready hoon. Tum bas pehla step le lo.",
  "Streak naya hai, tumhari mehnat waste nahi hui.",
  "Zero se hero? Pehle zero se one. Easy rakho.",
  "Nayi shuruaat, same cute coach. Aaj milte hain?",
  "Break hua toh kya? Comeback ki entry banti hai.",
] as const;

export const zeeWarningLines = [
  "Streak wait kar raha hai. Scan kar lo, suspense nahi.",
  "Armor ko pause mat do. Waqt hai toh scan kar lo.",
  "Timer chal raha hai, boss. Visit ka scan yaad hai?",
  "Streak ko cliffhanger mat banao. Scan kar lo.",
  "Main shield le aayi. Tum apna visit scan kara lo.",
  "Cute reminder: streak bachane ka scan baaki hai.",
  "Last-minute hero? Time rehte visit scan kar lo.",
] as const;

export function getZeeProgress(streak: number) {
  const days = Number.isFinite(streak) ? Math.max(0, Math.floor(streak)) : 0;
  const index = zeeStages.findLastIndex(stage => days >= stage.days);
  const stage = zeeStages[index];
  const next = zeeStages[index + 1] ?? null;
  return { days, index, stage, next, remaining: next ? next.days - days : 0 };
}

export function getZeeBusinessDate(now = new Date()) {
  return indiaBusinessDate(now).toISOString().slice(0, 10);
}

export function getNextIndiaMidnight(now = new Date()) {
  return new Date(indiaBusinessDate(now).getTime() + 86400000 - 19800000);
}

export function getZeeLine(streak: number, businessDate: string, expiresSoon = false) {
  const bank = streak <= 0 ? zeeStarterLines : expiresSoon ? zeeWarningLines : zeeDailyLines;
  const parsed = Date.parse(`${businessDate}T00:00:00.000Z`);
  const ordinal = Number.isFinite(parsed) ? Math.floor(parsed / 86400000) : 0;
  return bank[((ordinal % bank.length) + bank.length) % bank.length];
}
