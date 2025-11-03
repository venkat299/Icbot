import { motion } from 'motion/react';
import { useCallback } from 'react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { InterviewProgress, InterviewStage } from './InterviewProgress';
interface CriteriaItem {
  name: string;
  level?: number | null;
  confidence?: number | null;
  status?: 'pending' | 'in_progress' | 'follow_up' | 'complete';
  maxLevel: number;
}

interface InterviewerSidebarProps {
  overallScore?: number | null;
  currentCompetency?: string;
  currentCriterion?: string | null;
  interviewStyle?: string;
  criteria?: CriteriaItem[];
  scoreNotes?: string;
  redFlags?: string[];
  directiveObjective?: string;
  scoringLevels?: Record<string, string>;
  evaluationStatus?: 'pending' | 'in_progress' | 'follow_up' | 'complete';
  proficiencyLevel?: number | null;
  confidence?: number | null;
  autoReplyEnabled?: boolean;
  onToggleAutoReply?: (enabled: boolean) => void;
  currentStage?: InterviewStage;
  competencyNumber?: number;
  totalCompetencies?: number;
}

export function InterviewerSidebar({
  overallScore = null,
  currentCompetency = 'Competency',
  currentCriterion = null,
  interviewStyle = 'Style',
  criteria = [],
  scoreNotes = 'No evaluation notes yet.',
  redFlags = [],
  directiveObjective,
  scoringLevels = {},
  evaluationStatus = 'pending',
  proficiencyLevel = null,
  confidence = null,
  autoReplyEnabled = false,
  onToggleAutoReply,
  currentStage = 'warmup',
  competencyNumber = 1,
  totalCompetencies = 3,
}: InterviewerSidebarProps) {
  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500';
    if (score >= 80) return 'text-gray-900';
    if (score >= 60) return 'text-gray-700';
    return 'text-gray-600';
  };

  const getLevelClasses = (level: number | null | undefined) => {
    if (level === null || level === undefined) return 'bg-gray-50 text-gray-600 border-gray-200';
    if (level >= 4) return 'bg-gray-200 text-gray-800 border-gray-300';
    if (level >= 3) return 'bg-gray-100 text-gray-700 border-gray-200';
    return 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getStatusBadge = (status: CriteriaItem['status']) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'follow_up':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'in_progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const formatStatusLabel = (status: InterviewerSidebarProps['evaluationStatus']) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'follow_up':
        return 'Needs Follow-up';
      case 'in_progress':
        return 'In Progress';
      default:
        return 'Pending';
    }
  };

  const formatLevel = (level: number | null | undefined) => (level ?? '—');
  const formatConfidence = (value: number | null | undefined) => (value != null ? `${Math.round(value * 100)}%` : '—');
  const scoringEntries = Object.entries(scoringLevels).filter(([, description]) => description);
  const scoreValue = overallScore ?? 0;
  const hasScore = overallScore !== null;

  const handleAutoReplyChange = useCallback(
    (checked: boolean) => {
      onToggleAutoReply?.(checked);
    },
    [onToggleAutoReply],
  ); // Bridges toggle events to parent.

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
        {onToggleAutoReply && (
          <div
            className="
              mt-4 flex items-center justify-between rounded-xl
              bg-white/80 border border-gray-200/60 px-3 py-2
              shadow-[0_2px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)]
            "
          >
            <span className="text-xs text-gray-600">Auto candidate replies</span>
            <Switch
              checked={autoReplyEnabled}
              onCheckedChange={handleAutoReplyChange}
              className="shadow-[0_1px_4px_rgba(0,0,0,0.1)] border border-gray-200"
            />
          </div>
        )}
      </div>

      <ScrollArea className="flex-1 h-full">
        <div className="p-6 space-y-6 pb-8">
          <InterviewProgress currentStage={currentStage} competencyNumber={competencyNumber} totalCompetencies={totalCompetencies} />

          <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] relative before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:to-transparent before:pointer-events-none">
            <div className="relative z-10 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-600 block">Evaluation Status</span>
                  {currentCriterion && (
                    <span className="text-xs text-gray-500">Criterion: {currentCriterion}</span>
                  )}
                </div>
                <Badge className={`text-xs ${getStatusBadge(evaluationStatus)}`}>
                  {formatStatusLabel(evaluationStatus)}
                </Badge>
              </div>
              {directiveObjective && (
                <div>
                  <span className="text-xs text-gray-500 block mb-1">Directive Objective</span>
                  <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/60 rounded-lg p-3 border border-gray-100">
                    {directiveObjective}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
                <div>
                  <span className="block text-gray-500">Proficiency Level</span>
                  <span className="text-gray-800">{proficiencyLevel != null ? `${proficiencyLevel}/5` : '—'}</span>
                </div>
                <div>
                  <span className="block text-gray-500">Confidence</span>
                  <span className="text-gray-800">{formatConfidence(confidence)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/50 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] relative before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:to-transparent before:pointer-events-none">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Overall Score</span>
                <TrendingUp className="w-4 h-4 text-gray-400" />
              </div>
              <div className={`text-gray-900 ${getScoreColor(overallScore)}`}>
                {hasScore ? `${overallScore}%` : 'Pending'}
              </div>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: hasScore ? `${scoreValue}%` : '0%' }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    hasScore
                      ? scoreValue >= 80
                        ? 'bg-gradient-to-r from-gray-600 to-gray-700'
                        : scoreValue >= 60
                          ? 'bg-gradient-to-r from-gray-500 to-gray-600'
                          : 'bg-gradient-to-r from-gray-400 to-gray-500'
                      : 'bg-gradient-to-r from-gray-300 to-gray-400'
                  }`}
                />
              </div>
            </div>
          </div>

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

          {scoringEntries.length > 0 && (
            <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="relative z-10">
                <h4 className="text-sm text-gray-900 mb-2">Scoring Levels</h4>
                <div className="space-y-2 text-xs text-gray-700">
                  {scoringEntries.map(([level, description]) => (
                    <div key={level} className="rounded-lg border border-gray-100 bg-gray-50/80 p-2">
                      <span className="font-semibold text-gray-800">{level}</span>
                      <p className="mt-1 text-gray-600 leading-snug">{description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]">
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
                  className="px-4 py-3 hover:bg-gray-50/50 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-gray-700 flex-1">{item.name}</span>
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 ${getStatusBadge(item.status)}`}>
                      {formatStatusLabel(item.status ?? 'pending')}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-600">
                    <span>Level: <strong className="text-gray-800">{formatLevel(item.level)}</strong> / {item.maxLevel}</span>
                    <span>Confidence: <strong className="text-gray-800">{formatConfidence(item.confidence)}</strong></span>
                  </div>
                </motion.div>
              ))}
              {criteria.length === 0 && (
                <div className="px-4 py-3 text-xs text-gray-500">
                  No criteria evaluated yet.
                </div>
              )}
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl p-4 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] relative before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/30 before:to-transparent before:pointer-events-none">
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
