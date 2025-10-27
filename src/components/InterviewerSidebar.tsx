import { motion } from 'motion/react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { AlertCircle, TrendingUp } from 'lucide-react';
interface CriteriaItem {
  name: string;
  level: string;
  maxLevel: number;
}

interface InterviewerSidebarProps {
  overallScore?: number;
  currentCompetency?: string;
  interviewStyle?: string;
  criteria?: CriteriaItem[];
  scoreNotes?: string;
  redFlags?: string[];
}

export function InterviewerSidebar({
  overallScore = 0,
  currentCompetency = 'Competency',
  interviewStyle = 'Style',
  criteria = [],
  scoreNotes = 'No evaluation notes yet.',
  redFlags = [],
}: InterviewerSidebarProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-gray-900';
    if (score >= 60) return 'text-gray-700';
    return 'text-gray-600';
  };

  const getLevelColor = (level: string) => {
    const num = Number.parseInt(level, 10);
    if (Number.isNaN(num)) return 'bg-gray-50 text-gray-600 border-gray-200';
    if (num >= 4) return 'bg-gray-200 text-gray-800 border-gray-300';
    if (num >= 3) return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="
        h-full w-full
        backdrop-blur-xl bg-white/90 border-l border-gray-200/50
        shadow-[-8px_0_32px_rgba(0,0,0,0.08)]
        flex flex-col
        relative
        before:absolute before:inset-0
        before:bg-gradient-to-br before:from-white/40 before:to-transparent
        before:pointer-events-none
      "
    >
      <div className="p-6 border-b border-gray-200/50 shrink-0">
        <h3 className="text-gray-900 mb-1">Interviewer View</h3>
        <p className="text-xs text-gray-500">Live evaluation data</p>
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-6 space-y-6 pb-8">
          {/* Overall Score */}
          <div className="
            backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
            border border-gray-200/50 rounded-2xl p-4
            shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
            relative
            before:absolute before:inset-0 before:rounded-2xl
            before:bg-gradient-to-br before:from-white/30 before:to-transparent
            before:pointer-events-none
          ">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Overall Score</span>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <div className={`text-gray-900 ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${overallScore}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    overallScore >= 80 ? 'bg-gradient-to-r from-gray-600 to-gray-700' :
                    overallScore >= 60 ? 'bg-gradient-to-r from-gray-500 to-gray-600' :
                    'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Current Context */}
          <div className="space-y-3">
            <div>
              <span className="text-xs text-gray-500 block mb-1">Current Competency</span>
              <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">
                {currentCompetency}
              </Badge>
            </div>
            <div>
              <span className="text-xs text-gray-500 block mb-1">Interview Style</span>
              <Badge className="bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100">
                {interviewStyle}
              </Badge>
            </div>
          </div>

          {/* Criteria Table */}
          <div className="
            backdrop-blur-xl bg-white/80
            border border-gray-200/50 rounded-2xl overflow-hidden
            shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
          ">
            <div className="px-4 py-3 bg-gray-50/80 border-b border-gray-200/50">
              <h4 className="text-sm text-gray-900">Evaluation Criteria</h4>
            </div>
            <div className="divide-y divide-gray-200/30">
              {criteria.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="px-4 py-3 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-700 flex-1">{item.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0.5 ${getLevelColor(item.level)}`}
                    >
                      {item.level}/{item.maxLevel}
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Current Report */}
          <div className="
            backdrop-blur-xl bg-white/80
            border border-gray-200/50 rounded-2xl p-4
            shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
            relative
            before:absolute before:inset-0 before:rounded-2xl
            before:bg-gradient-to-br before:from-white/30 before:to-transparent
            before:pointer-events-none
          ">
            <div className="relative z-10">
              <h4 className="text-sm text-gray-900 mb-3">Current Report</h4>
              
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-500 block mb-2">Score Notes</span>
                  <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/50 rounded-lg p-3 border border-gray-100">
                    {scoreNotes}
                  </p>
                </div>

                {redFlags.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-3.5 h-3.5 text-gray-600" />
                      <span className="text-xs text-gray-700">Red Flags</span>
                    </div>
                    <div className="space-y-2">
                      {redFlags.map((flag, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="
                            text-xs text-gray-700 bg-gray-50/80 rounded-lg p-2.5
                            border border-gray-200 flex items-start gap-2
                          "
                        >
                          <span className="text-gray-400 mt-0.5">•</span>
                          <span className="flex-1">{flag}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </motion.div>
  );
}
