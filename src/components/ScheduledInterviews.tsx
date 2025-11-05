import { motion } from 'motion/react'; // Scheduled interviews list displays scheduled interview records.
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Calendar, FileText, FileUser, Play, RotateCcw, Eye, Award, Sparkles, Plus, Loader2, AlertTriangle, Trash, MessageSquare } from 'lucide-react';
import type { TranscriptTurn } from '../types/transcript';

export interface Competency {
  id: string;
  name: string;
  interviewStyle: string;
  rationale?: string;
}

export type TranscriptEntry = TranscriptTurn; // Maps scheduled interview transcripts to shared turn model.

export interface CriterionResult {
  competencyId: string;
  competencyName: string;
  criterionId: string;
  criterionName: string;
  level?: number;
  confidence?: number;
  notes?: string;
}

export interface WrapupSummary {
  closingStatement: string;
  keyStrengths: string[];
  riskFlags: string[];
  nextSteps: string[];
}

export interface ScheduledInterview {
  id: string;
  jobTitle: string;
  candidateName: string;
  jobDescription: string;
  resume: string;
  competencies: Competency[];
  rubric: {
    candidateName: string;
    position: string;
    evaluationCriteria: {
      category: string;
      criteria: {
        name: string;
        description: string;
        weight: number;
        scoringLevels?: Record<string, string>;
      }[];
    }[];
  };
  scheduledDate: Date;
  status: 'scheduled' | 'completed';
  overallScore?: number;
  scoreDetails?: {
    criteria: string;
    score: number;
    feedback: string;
  }[];
  transcript: TranscriptEntry[];
  criterionResults: CriterionResult[];
  wrapupSummary?: WrapupSummary;
}

interface ScheduledInterviewsProps {
  interviews: ScheduledInterview[];
  onStartInterview: (interviewId: string) => void;
  onRedoInterview: (interviewId: string) => void;
  onScheduleNew: () => void;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onDeleteInterview: (interviewId: string) => void;
  onViewReport: (interviewId: string) => void;
}

export function ScheduledInterviews({
  interviews,
  onStartInterview,
  onRedoInterview,
  onScheduleNew,
  isLoading,
  error,
  onRetry,
  onDeleteInterview,
  onViewReport
}: ScheduledInterviewsProps) { // Renders scheduled interview dashboard with actions.

  const handleDelete = (interviewId: string) => {
    if (window.confirm('Delete this scheduled interview? This action cannot be undone.')) {
      onDeleteInterview(interviewId);
    }
  };

  const buildCriterionDirective = (_category: string, criterionName: string, description: string) => {
    const trimmedDescription = description.trim();
    // if (trimmedDescription) {
    //   return trimmedDescription;
    // }
    return `Skill Domain : ${_category.trim()}; Connect it to this focus: ${description.trim()}`;
  };

  return (
    <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 sm:mb-12"
        >
          <div className="flex items-center justify-between mb-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
              <h1 className="text-gray-900">Scheduled Interviews</h1>
            </div>
            <Button
              onClick={onScheduleNew}
              className="
                bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
              "
            >
              <Plus className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Schedule New Interview</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
          <p className="text-sm sm:text-base text-gray-600">Manage and conduct your AI-powered interviews</p>
        </motion.div>

        {/* Interviews List */}
        <div className="space-y-4 sm:space-y-6">
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]"
            >
              <Loader2 className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-gray-900 mb-2">Loading Scheduled Interviews</h3>
              <p className="text-sm text-gray-600">Fetching the latest interview plan from the backend.</p>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-white/80 border border-red-200/60 rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]"
            >
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">Unable to Load Interviews</h3>
              <p className="text-sm text-gray-600 mb-6">{error}</p>
              <Button
                onClick={onRetry}
                className="bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]"
              >
                Try Again
              </Button>
            </motion.div>
          ) : interviews.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="
                backdrop-blur-xl bg-white/80 border border-gray-200/50
                rounded-2xl sm:rounded-3xl p-8 sm:p-12 text-center
                shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
              "
            >
              <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-gray-900 mb-2">No Interviews Scheduled</h3>
              <p className="text-sm text-gray-600 mb-6">Get started by scheduling your first interview</p>
              <Button
                onClick={onScheduleNew}
                className="
                  bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                  text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
                "
              >
                <Plus className="w-4 h-4 mr-2" />
                Schedule Interview
              </Button>
            </motion.div>
          ) : (
            interviews.map((interview, index) => (
              <motion.div
                key={interview.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="
                  backdrop-blur-xl bg-white/80 border border-gray-200/50
                  rounded-2xl sm:rounded-3xl p-4 sm:p-6
                  shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
                  relative
                  before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
                  before:bg-gradient-to-br before:from-white/40 before:to-transparent
                  before:pointer-events-none
                ">
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-gray-900">{interview.jobTitle}</h3>
                          <Badge 
                            className={
                              interview.status === 'completed'
                                ? 'bg-green-100 text-green-700 border-green-200'
                                : 'bg-blue-100 text-blue-700 border-blue-200'
                            }
                          >
                            {interview.status === 'completed' ? 'Completed' : 'Scheduled'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600">
                          Candidate: <span className="text-gray-900">{interview.candidateName}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Scheduled: {interview.scheduledDate.toLocaleDateString()} at {interview.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="flex flex-col sm:items-end gap-3">
                        <div className="flex items-center gap-2">
                          {interview.status === 'completed' && interview.overallScore !== undefined && (
                            <div className="
                              backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                              border border-gray-200/50 rounded-xl p-3 sm:p-4
                              shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                              text-center min-w-[100px]
                            ">
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <Award className="w-4 h-4 text-gray-600" />
                                <span className="text-xs text-gray-600">Score</span>
                              </div>
                              <div className="text-gray-900">{interview.overallScore}%</div>
                            </div>
                          )}
                          {interview.status === 'completed' ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onRedoInterview(interview.id)}
                                className="
                                  bg-white/80 border-gray-300/50 text-gray-700
                                  hover:bg-gray-50 hover:border-gray-400/50
                                  shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                                "
                              >
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                Redo
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(interview.id)}
                                title="Delete interview"
                              >
                                <Trash className="w-5 h-5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="sm"
                                onClick={() => onStartInterview(interview.id)}
                                className="
                                  bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                                  text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
                                "
                              >
                                <Play className="w-3.5 h-3.5 mr-1.5" />
                                Start Interview
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDelete(interview.id)}
                                title="Delete interview"
                              >
                                <Trash className="w-5 h-5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Competencies Preview */}
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Competencies:</p>
                      <div className="flex flex-wrap gap-2">
                        {interview.competencies.slice(0, 3).map((comp) => (
                          <Badge key={comp.id} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                            {comp.name}
                          </Badge>
                        ))}
                        {interview.competencies.length > 3 && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                            +{interview.competencies.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
                      {/* View Job Description */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="
                              bg-white/80 border-gray-300/50 text-gray-700
                              hover:bg-gray-50 hover:border-gray-400/50
                              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            "
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Job Description
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Job Description</DialogTitle>
                            <DialogDescription>{interview.jobTitle}</DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] pr-4">
                            <div className="whitespace-pre-wrap text-sm text-gray-700">
                              {interview.jobDescription}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {/* View Resume */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="
                              bg-white/80 border-gray-300/50 text-gray-700
                              hover:bg-gray-50 hover:border-gray-400/50
                              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            "
                          >
                            <FileUser className="w-3.5 h-3.5 mr-1.5" />
                            Resume
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Candidate Resume</DialogTitle>
                            <DialogDescription>{interview.candidateName}</DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] pr-4">
                            <div className="whitespace-pre-wrap text-sm text-gray-700">
                              {interview.resume}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {/* View Competencies */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="
                              bg-white/80 border-gray-300/50 text-gray-700
                              hover:bg-gray-50 hover:border-gray-400/50
                              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            "
                          >
                            <Eye className="w-3.5 h-3.5 mr-1.5" />
                            Competencies
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Competencies & Interview Styles</DialogTitle>
                            <DialogDescription>
                              Evaluation competencies for {interview.jobTitle}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                            {interview.competencies.map((comp) => (
                              <div
                                key={comp.id}
                                className="
                                  backdrop-blur-xl bg-white/80 border border-gray-200/50
                                  rounded-xl p-4 flex items-center justify-between gap-4
                                  shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                                "
                              >
                                <span className="text-sm text-gray-900">{comp.name}</span>
                                <Badge className="bg-gray-100 text-gray-700 border-gray-200 capitalize">
                                  {comp.interviewStyle}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {/* View Criterion Directives */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="
                              bg-white/80 border-gray-300/50 text-gray-700
                              hover:bg-gray-50 hover:border-gray-400/50
                              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            "
                          >
                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                            Criterion Directives
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Criterion Directives</DialogTitle>
                            <DialogDescription>
                              Preview concept primer prompts derived from the rubric.
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-5">
                              {interview.rubric.evaluationCriteria.map(category => (
                                <div key={category.category} className="space-y-3">
                                  <h4 className="text-sm font-semibold text-gray-800">
                                    {category.category}
                                  </h4>
                                  <div className="space-y-3">
                                    {category.criteria.map(criterion => (
                                      <div
                                        key={`${category.category}-${criterion.name}`}
                                        className="bg-white/80 border border-gray-200/60 rounded-xl p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.9)]"
                                      >
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="text-sm font-medium text-gray-900">
                                            {criterion.name}
                                          </span>
                                          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
                                            Weight {criterion.weight}
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-gray-600 mb-2">
                                          {criterion.description}
                                        </p>
                                        <p className="text-sm text-gray-800">
                                          {buildCriterionDirective(category.category, criterion.name, criterion.description)}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {/* View Rubric */}
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="
                              bg-white/80 border-gray-300/50 text-gray-700
                              hover:bg-gray-50 hover:border-gray-400/50
                              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            "
                          >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Rubric
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh]">
                          <DialogHeader>
                            <DialogTitle>Evaluation Rubric</DialogTitle>
                            <DialogDescription>
                              Detailed assessment criteria for {interview.rubric.candidateName} - {interview.rubric.position}
                            </DialogDescription>
                          </DialogHeader>
                          <ScrollArea className="h-[500px] pr-4">
                            <div className="space-y-6">
                              {interview.rubric.evaluationCriteria.map((category, catIndex) => (
                                <motion.div
                                  key={catIndex}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: catIndex * 0.1 }}
                                  className="
                                    backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                                    border border-gray-200/50 rounded-2xl p-5
                                    shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                                  "
                                >
                                  <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                                    {category.category}
                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                      {Math.round(category.criteria.reduce((sum, c) => sum + c.weight, 0))}%
                                    </Badge>
                                  </h3>
                                  <div className="space-y-3">
                                    {category.criteria.map((criterion, critIndex) => (
                                      <div
                                        key={critIndex}
                                        className="bg-white/60 border border-gray-200/50 rounded-xl p-4"
                                      >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                          <h4 className="text-sm text-gray-900">{criterion.name}</h4>
                                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 shrink-0">
                                            {Math.round(criterion.weight)}%
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                          {criterion.description}
                                        </p>
                                        {criterion.scoringLevels && Object.keys(criterion.scoringLevels).length > 0 && (
                                          <div className="mt-3 space-y-1">
                                            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                              Scoring Levels
                                            </p>
                                            {Object.entries(criterion.scoringLevels)
                                              .sort((a, b) => {
                                                const levelA = parseInt(a[0].replace(/[^0-9]/g, ''), 10) || 0;
                                                const levelB = parseInt(b[0].replace(/[^0-9]/g, ''), 10) || 0;
                                                return levelA - levelB;
                                              })
                                              .map(([level, guidance]) => (
                                                <div key={level} className="text-xs text-gray-600 leading-relaxed">
                                                  <span className="font-semibold text-gray-800 mr-2">{level}:</span>
                                                  <span className="text-gray-600">{guidance}</span>
                                                </div>
                                              ))}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              ))}
                              <div className="
                                bg-gradient-to-br from-blue-50 to-blue-100/50
                                border border-blue-200/50 rounded-2xl p-4
                              ">
                                <p className="text-xs text-blue-800">
                                  <strong>Note:</strong> This rubric will be used to evaluate the candidate's performance
                                  throughout the interview. Each criterion will be scored on a scale of 1-5.
                                </p>
                              </div>
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {interview.status === 'completed' && (
                        <div className="flex flex-wrap items-center gap-2">
                          {/* View Transcript */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="
                                  bg-white/80 border-gray-300/50 text-gray-700
                                  hover:bg-gray-50 hover:border-gray-400/50
                                  shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                                "
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                                Transcript
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden p-0">
                              <div className="flex h-full max-h-[80vh] flex-col">
                                <DialogHeader className="px-6 pt-6 pb-3">
                                  <DialogTitle>Interview Transcript</DialogTitle>
                                  <DialogDescription>
                                    Conversation history for {interview.candidateName}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                                  <div className="pr-4">
                                    {interview.transcript && interview.transcript.length > 0 ? (
                                      <div className="space-y-3 text-sm text-gray-800">
                                        {interview.transcript.map((entry, index) => (
                                          <div
                                            key={`${entry.role}-${index}`}
                                            className="bg-white/80 border border-gray-200/60 rounded-lg p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                                          >
                                            <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                                              {entry.role === 'interviewer' ? 'Interviewer' : 'Candidate'}
                                            </div>
                                            <p className="leading-relaxed text-gray-800 whitespace-pre-wrap">
                                              {entry.text}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-600">
                                        Transcript storage is not available yet for this interview.
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <div className="flex items-center gap-2">
                            {/* Evaluation summary */}
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="
                                    bg-white/80 border-gray-300/50 text-gray-700
                                    hover:bg-gray-50 hover:border-gray-400/50
                                    shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                                  "
                                >
                                  <Award className="w-3.5 h-3.5 mr-1.5" />
                                  Evaluation
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden p-0">
                                <div className="flex h-full max-h-[80vh] flex-col">
                                  <DialogHeader className="px-6 pt-6 pb-3">
                                    <DialogTitle>Evaluation Report</DialogTitle>
                                    <DialogDescription>
                                      Summary reporting for the completed interview.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                                    <div className="pr-4">
                                      <div className="text-sm text-gray-800 space-y-4">
                                        {interview.wrapupSummary ? (
                                          <div className="bg-white/80 border border-gray-200/60 rounded-lg p-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)] space-y-3">
                                            <h4 className="text-xs uppercase tracking-wide text-gray-500">Wrap-up Summary</h4>
                                            <p className="text-gray-800 whitespace-pre-wrap">{interview.wrapupSummary.closingStatement}</p>
                                            {interview.wrapupSummary.keyStrengths.length > 0 && (
                                              <div>
                                                <h5 className="text-xs font-semibold text-gray-600 mb-1">Key Strengths</h5>
                                                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                                  {interview.wrapupSummary.keyStrengths.map((item, idx) => (
                                                    <li key={`strength-${idx}`}>{item}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {interview.wrapupSummary.riskFlags.length > 0 && (
                                              <div>
                                                <h5 className="text-xs font-semibold text-gray-600 mb-1">Risks</h5>
                                                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                                  {interview.wrapupSummary.riskFlags.map((item, idx) => (
                                                    <li key={`risk-${idx}`}>{item}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                            {interview.wrapupSummary.nextSteps.length > 0 && (
                                              <div>
                                                <h5 className="text-xs font-semibold text-gray-600 mb-1">Suggested Next Steps</h5>
                                                <ul className="list-disc list-inside text-xs text-gray-700 space-y-1">
                                                  {interview.wrapupSummary.nextSteps.map((item, idx) => (
                                                    <li key={`step-${idx}`}>{item}</li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}
                                          </div>
                                        ) : (
                                          <p className="text-sm text-gray-600">
                                            Evaluation summaries are not available yet for this interview.
                                          </p>
                                        )}

                                        {interview.criterionResults && interview.criterionResults.length > 0 && (
                                          <div className="space-y-3">
                                            <h4 className="text-xs uppercase tracking-wide text-gray-500">Criterion Results</h4>
                                            {interview.criterionResults.map((result, idx) => (
                                              <div
                                                key={`${result.criterionId}-${idx}`}
                                                className="bg-white/80 border border-gray-200/60 rounded-lg p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                                              >
                                                <div className="text-xs text-gray-500 mb-1">
                                                  {result.competencyName}
                                                </div>
                                                <div className="text-sm text-gray-800 font-medium">
                                                  {result.criterionName}
                                                </div>
                                                <div className="text-xs text-gray-600 mt-1">
                                                  Level: {result.level ?? 'pending'} • Confidence: {result.confidence !== undefined ? result.confidence.toFixed(2) : 'n/a'}
                                                </div>
                                                {result.notes && (
                                                  <div className="text-xs text-gray-600 mt-2 whitespace-pre-wrap">
                                                    {result.notes}
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}

                                        {typeof interview.overallScore === 'number' && (
                                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Overall Score</h4>
                                            <p className="text-sm text-gray-800">{interview.overallScore}</p>
                                          </div>
                                        )}

                                        {interview.scoreDetails && interview.scoreDetails.length > 0 && (
                                          <div className="bg-white/80 border border-gray-200/60 rounded-lg p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                                            <h4 className="text-xs uppercase tracking-wide text-gray-500 mb-2">Score Details</h4>
                                            <div className="text-xs text-gray-700 space-y-1">
                                              {interview.scoreDetails.map(detail => (
                                                <div key={detail.criteria}>
                                                  <span className="font-medium text-gray-700">{detail.criteria}</span>: {detail.score}
                                                  {detail.feedback ? ` – ${detail.feedback}` : ''}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              className="
                                bg-white/80 border-gray-300/50 text-gray-700
                                hover:bg-gray-50 hover:border-gray-400/50
                                shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                              "
                              onClick={() => onViewReport(interview.id)}
                            >
                              <FileText className="w-3.5 h-3.5 mr-1.5" />
                              View Report
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
