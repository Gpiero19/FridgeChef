import type { Difficulty } from "../lib/types";

// ponytail: fixed 3-value mapping, not a generic theming system — this is the
// only place a difficulty badge exists.
const STYLES: Record<Difficulty, string> = {
  easy: "bg-green-100 text-green-800",
  medium: "bg-amber-100 text-amber-800",
  hard: "bg-red-100 text-red-800",
};

const LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[difficulty]}`}
    >
      {LABELS[difficulty]}
    </span>
  );
}
