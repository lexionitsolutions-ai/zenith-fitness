export const membershipCategories = [
  { code: "MALE", label: "Male", note: "Access during regular gym opening hours." },
  { code: "FEMALE", label: "Female", note: "Access during regular gym opening hours." },
  { code: "FEMALE_HAPPY_HOURS", label: "Female Happy Hours", note: "Only for females. Access from 10:00 AM to 4:00 PM, within gym opening hours." },
] as const;

export type MembershipCategory = typeof membershipCategories[number]["code"];
const durations = [
  { days: 30, label: "1 Month" },
  { days: 90, label: "3 Months" },
  { days: 180, label: "6 Months" },
  { days: 365, label: "1 Year" },
] as const;
const prices: Record<MembershipCategory, readonly number[]> = {
  MALE: [2000, 4699, 6499, 9991],
  FEMALE: [1499, 3999, 5699, 8999],
  FEMALE_HAPPY_HOURS: [1000, 3000, 4500, 6000],
};

export const membershipPackages = membershipCategories.flatMap(category => durations.map((duration, index) => ({
  planCode: `${category.code}_${duration.days}_DAYS`,
  planName: `${category.label} - ${duration.label}`,
  category: category.code,
  durationDays: duration.days,
  standardPrice: prices[category.code][index],
})));
