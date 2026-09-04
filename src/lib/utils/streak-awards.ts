const streakAwards = [
  { days: 100, label: "Legend", emoji: "🏆" },
  { days: 75, label: "Champion", emoji: "👑" },
  { days: 50, label: "Excellent", emoji: "🔥" },
  { days: 30, label: "Best", emoji: "💪" },
  { days: 25, label: "Keep Going", emoji: "⚡" },
  { days: 20, label: "Better", emoji: "🚀" },
  { days: 10, label: "Good", emoji: "⭐" },
  { days: 5, label: "Building", emoji: "✨" },
  { days: 1, label: "Started", emoji: "✅" },
];

export function getStreakAward(streak: number) {
  return streakAwards.find((award) => streak >= award.days) ?? { days: 0, label: "Start Today", emoji: "🎯" };
}
