import { motion } from 'motion/react';
import { Check } from 'lucide-react';

export type InterviewStage = 'warmup' | 'competency' | 'wrapup';

interface InterviewProgressProps {
  currentStage: InterviewStage;
  competencyNumber?: number;
  totalCompetencies?: number;
}

interface Stage {
  id: InterviewStage;
  label: string;
}

const stages: Stage[] = [
  { id: 'warmup', label: 'Warm Up' },
  { id: 'competency', label: 'Competency' },
  { id: 'wrapup', label: 'Wrap Up' },
];

export function InterviewProgress({ 
  currentStage, 
  competencyNumber = 1, 
  totalCompetencies = 3 
}: InterviewProgressProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage);
  
  // Calculate overall progress percentage
  const getProgressPercentage = () => {
    if (currentStage === 'warmup') return 15;
    if (currentStage === 'competency') {
      const competencyProgress = (competencyNumber / totalCompetencies) * 100;
      return 15 + (competencyProgress * 0.7);
    }
    if (currentStage === 'wrapup') return 95;
    return 0;
  };

  const progress = getProgressPercentage();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-4"
    >
      {/* Minimal header */}
      <div className="flex items-center justify-between mb-2 px-1">
        <span className="text-xs text-gray-500">
          {stages[currentIndex].label}
          {currentStage === 'competency' && (
            <span className="text-gray-400 ml-1">
              {competencyNumber}/{totalCompetencies}
            </span>
          )}
        </span>
        <span className="text-xs text-gray-400">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Minimal progress bar */}
      <div className="
        relative h-1.5 rounded-full overflow-hidden
        bg-gradient-to-r from-gray-200 to-gray-100
        shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)]
      ">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="
            h-full rounded-full
            bg-gradient-to-r from-gray-400 to-gray-500
            shadow-[0_1px_3px_rgba(0,0,0,0.1)]
          "
        />
      </div>
    </motion.div>
  );
}
