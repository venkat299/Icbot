import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Calendar, FileText, Play, RotateCcw, Eye, Award, Sparkles, Plus, ArrowLeft } from 'lucide-react';

export interface Competency {
  id: string;
  name: string;
  interviewStyle: string;
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
}

interface ScheduledInterviewsProps {
  interviews: ScheduledInterview[];
  onStartInterview: (interviewId: string) => void;
  onRedoInterview: (interviewId: string) => void;
  onScheduleNew: () => void;
}

export function ScheduledInterviews({
  interviews,
  onStartInterview,
  onRedoInterview,
  onScheduleNew
}: ScheduledInterviewsProps) {

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
              <Button
                onClick={onScheduleNew}
                variant="ghost"
                size="icon"
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                title="Back to Setup"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
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
          {interviews.length === 0 ? (
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
                    <div className="flex flex-wrap gap-2 sm:gap-3">
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
                                      {category.criteria.reduce((sum, c) => sum + c.weight, 0)}%
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
                                            {criterion.weight}%
                                          </Badge>
                                        </div>
                                        <p className="text-xs text-gray-600 leading-relaxed">
                                          {criterion.description}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </ScrollArea>
                        </DialogContent>
                      </Dialog>

                      {/* View Score Details (only for completed interviews) */}
                      {interview.status === 'completed' && interview.scoreDetails && (
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
                              Score Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl max-h-[80vh]">
                            <DialogHeader>
                              <DialogTitle>Score Details</DialogTitle>
                              <DialogDescription>
                                Detailed scoring breakdown for {interview.candidateName}
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[500px] pr-4">
                              <div className="space-y-4">
                                {interview.scoreDetails?.map((detail, idx) => (
                                  <div
                                    key={idx}
                                    className="
                                      backdrop-blur-xl bg-white/80 border border-gray-200/50
                                      rounded-xl p-4
                                      shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                                    "
                                  >
                                    <div className="flex items-center justify-between mb-2">
                                      <h4 className="text-sm text-gray-900">{detail.criteria}</h4>
                                      <Badge
                                        className={
                                          detail.score >= 80
                                            ? 'bg-green-100 text-green-700 border-green-200'
                                            : detail.score >= 60
                                            ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                            : 'bg-red-100 text-red-700 border-red-200'
                                        }
                                      >
                                        {detail.score}%
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">{detail.feedback}</p>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      )}

                      <div className="flex-1" />

                      {/* Redo Interview (only for completed) */}
                      {interview.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRedoInterview(interview.id)}
                          className="
                            bg-white/80 border-gray-300/50 text-gray-700
                            hover:bg-gray-50 hover:border-gray-400/50
                            shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                          "
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Redo
                        </Button>
                      )}

                      {/* Start Interview */}
                      {interview.status === 'scheduled' && (
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
