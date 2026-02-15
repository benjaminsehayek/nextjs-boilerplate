import { scoreColor, grade } from '@/types';

interface ScoreRingProps {
  score: number;
  size?: number;
  showGrade?: boolean;
}

export function ScoreRing({ score, size = 120, showGrade = true }: ScoreRingProps) {
  const radius = (size - 12) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--char-700)"
          strokeWidth="6"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-display text-3xl" style={{ color }}>
          {Math.round(score)}
        </div>
        {showGrade && (
          <div className="text-xs text-ash-400 font-semibold">{grade(score)}</div>
        )}
      </div>
    </div>
  );
}
