import { useEffect, useState } from 'react'; // Setup page orchestrates AI interview scheduling flow.
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, CheckCircle2, Sparkles, FileText, Calendar, ArrowLeft } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { DummyJD_Placeholder, JobDescriptionOptions, ResumeOptions } from '../test';
import { API_BASE_URL } from '../config';

export interface Competency {
  id: string;
  name: string;
  interviewStyle: string;
  rationale?: string;
}

export interface InterviewDetails {
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
}

interface LlmCompetency {
  competency_id: string;
  title: string;
  style_id: string;
  rationale?: string | null;
}

interface CompetencyPlanResponse {
  competencies: LlmCompetency[];
  stage_sequence?: string[];
  stage_styles?: Record<string, string>;
}

interface StyleOption {
  style_id: string;
  label: string;
  summary: string;
}

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  scoring_levels?: Record<string, string>;
}

interface RubricCategory {
  id: string;
  name: string;
  criteria: RubricCriterion[];
}

interface RubricPayload {
  role: string;
  seniority_level: string;
  categories: RubricCategory[];
}

const JOB_DESCRIPTION_OPTIONS = [
  { id: 'custom', title: 'Paste Job Description', description: '' },
  { id: 'default', title: 'Forecasting Analyst (Default)', description: DummyJD_Placeholder },
  ...JobDescriptionOptions,
]; // Centralizes JD presets.

const RESUME_OPTIONS = [{ id: 'empty', name: 'Paste Resume', resume: '' }, ...ResumeOptions]; // Centralizes resume presets.

const mapRubricForInterview = (
  payload: RubricPayload,
  candidateName: string,
  jobTitle: string,
): InterviewDetails['rubric'] => ({
  candidateName,
  position: jobTitle,
  evaluationCriteria: payload.categories.map((category) => ({
    category: category.name,
    criteria: category.criteria.map((criterion) => ({
      name: criterion.name,
      description: criterion.description,
      weight: Math.round(criterion.weight),
      scoringLevels: criterion.scoring_levels,
    })),
  })),
}); // Normalizes rubric payload for scheduled interviews.

interface SetupPageProps {
  onScheduleInterview: (details: InterviewDetails) => Promise<void>;
  onViewScheduled: () => void;
  hasScheduledInterviews: boolean;
}

export function SetupPage({ onScheduleInterview, onViewScheduled, hasScheduledInterviews }: SetupPageProps) { // Renders interview setup workflow.
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [selectedJobId, setSelectedJobId] = useState('custom');
  const [selectedResumeId, setSelectedResumeId] = useState('empty');
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [isGeneratingCompetency, setIsGeneratingCompetency] = useState(false);
  const [competencyGenerated, setCompetencyGenerated] = useState(false);
  const [competencyError, setCompetencyError] = useState<string | null>(null);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [rubricGenerated, setRubricGenerated] = useState(false);
  const [isRubricDialogOpen, setIsRubricDialogOpen] = useState(false);
  const [rubricData, setRubricData] = useState<RubricPayload | null>(null);
  const [rubricError, setRubricError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [styleOptions, setStyleOptions] = useState<StyleOption[]>([]); // Stores configured interview styles.

  useEffect(() => {
    let active = true;
    const fetchStyles = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/styles`);
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const data: StyleOption[] = await response.json();
        if (active) {
          setStyleOptions(
            data.slice().sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' })),
          );
        }
      } catch (error) {
        console.error('Failed to load interview styles', error);
      }
    };
    fetchStyles();
    return () => {
      active = false;
    };
  }, []); // Loads available interview styles for the dropdown.

  const jobDescriptions = JOB_DESCRIPTION_OPTIONS; // Provides JD presets for selection.
  const resumes = RESUME_OPTIONS; // Provides resume presets for selection.

  const resetCompetencyState = () => { // Clears competency generation artifacts.
    setCompetencies([]);
    setCompetencyGenerated(false);
    setCompetencyError(null);
    setScheduleError(null);
  };

  const resetRubricState = () => { // Clears rubric generation artifacts.
    setRubricGenerated(false);
    setIsRubricDialogOpen(false);
    setRubricData(null);
    setRubricError(null);
    setCopyStatus(null);
    setScheduleError(null);
  };

  const handleJobSelect = (jobId: string) => { // Updates job description based on picker choice.
    setSelectedJobId(jobId);
    const selectedJob = jobDescriptions.find((job) => job.id === jobId);
    setJobDescription(selectedJob?.description ?? '');
    resetCompetencyState();
    resetRubricState();
  };

  const handleResumeSelect = (resumeId: string) => { // Updates resume text based on picker choice.
    setSelectedResumeId(resumeId);
    const selectedResume = resumes.find((entry) => entry.id === resumeId);
    setResume(selectedResume?.resume ?? '');
    resetRubricState();
  };

  const handleGenerateCompetency = async () => { // Requests competency plan from backend.
    if (!jobDescription.trim()) {
      setCompetencyError('Provide a job description before generating competencies.');
      return;
    }

    setIsGeneratingCompetency(true);
    resetCompetencyState();
    resetRubricState();

    try {
      const response = await fetch(`${API_BASE_URL}/api/competencies/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_text: resume || null,
          target_roles: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload: CompetencyPlanResponse = await response.json();
      const generated: Competency[] = (payload?.competencies ?? []).map((item, index) => ({
        id: item.competency_id || `competency-${index + 1}`,
        name: item.title,
        interviewStyle: item.style_id ?? '',
        rationale: item.rationale ?? undefined,
      }));

      setCompetencies(generated);
      setCompetencyGenerated(generated.length > 0);
      if (generated.length === 0) {
        setCompetencyError('No competencies returned. Try updating the inputs.');
      }
    } catch (error) {
      console.error('Failed to generate competencies', error);
      setCompetencyError('Unable to generate competencies. Please try again.');
    } finally {
      setIsGeneratingCompetency(false);
    }
  };

  const handleGenerateRubric = async () => { // Requests rubric aligned to competencies.
    if (!jobDescription.trim()) {
      setRubricError('Provide a job description before generating the rubric.');
      return;
    }
    if (competencies.length === 0) {
      setRubricError('Generate competencies first so the rubric can align with them.');
      return;
    }
    if (!competencies.every((item) => item.interviewStyle)) {
      setRubricError('Assign an interview style to every competency before generating the rubric.');
      return;
    }

    setIsGeneratingRubric(true);
    setRubricError(null);
    setRubricGenerated(false);
    setRubricData(null);
    setIsRubricDialogOpen(false);
    setCopyStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/rubrics/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_description: jobDescription,
          resume_text: resume || null,
          competencies: competencies.map((item) => ({
            competency_id: item.id,
            title: item.name,
            style_id: item.interviewStyle,
            rationale: item.rationale ?? null,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload: RubricPayload = await response.json();
      setRubricData(payload);
      setRubricGenerated(true);
      setIsRubricDialogOpen(true);
    } catch (error) {
      console.error('Failed to generate rubric', error);
      setRubricError('Unable to generate rubric. Please try again.');
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const handleCopyRubric = async () => { // Copies rubric JSON for sharing.
    if (!rubricData) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(rubricData, null, 2));
      setCopyStatus('Rubric JSON copied to clipboard.');
    } catch (error) {
      console.error('Failed to copy rubric', error);
      setCopyStatus('Unable to copy rubric.');
    } finally {
      setTimeout(() => setCopyStatus(null), 3000);
    }
  };

  const updateInterviewStyle = (competencyId: string, style: string) => { // Updates selected style per competency.
    setCompetencies((prev) => prev.map((item) => (item.id === competencyId ? { ...item, interviewStyle: style } : item)));
    resetRubricState();
  };

  const allCompetenciesHaveStyle = competencies.length > 0 && competencies.every((item) => item.interviewStyle);
  const canScheduleInterview = competencyGenerated && rubricGenerated && allCompetenciesHaveStyle && !!rubricData && !isScheduling;

  const handleScheduleInterview = async () => { // Emits a fully prepared interview payload upstream.
    if (!rubricData) return;
    setScheduleError(null);
    setIsScheduling(true);
    const jobTitle = jobDescription.split('\n')[0]?.trim() || 'Interview';
    const candidateName = resume.split('\n')[0]?.trim() || 'Candidate';

    const interviewDetails: InterviewDetails = {
      jobTitle,
      candidateName,
      jobDescription,
      resume,
      competencies,
      rubric: mapRubricForInterview(rubricData, candidateName, jobTitle),
    };

    try {
      await onScheduleInterview(interviewDetails);
      resetCompetencyState();
      resetRubricState();
    } catch (error) {
      console.error('Failed to schedule interview', error);
      setScheduleError('Unable to schedule interview. Please try again.');
    } finally {
      setIsScheduling(false);
    }
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
          <div className="flex items-center justify-between mb-2">
            <Button
              onClick={onViewScheduled}
              variant="ghost"
              size="icon"
              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              title="Back to Scheduled Interviews"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3 flex-1 justify-center sm:justify-start">
              <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
              <h1 className="text-gray-900">AI Interview Setup</h1>
            </div>
            {hasScheduledInterviews && (
              <Button
                onClick={onViewScheduled}
                variant="outline"
                className="
                  bg-white/80 border-gray-300/50 text-gray-700
                  hover:bg-gray-50 hover:border-gray-400/50
                  shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                  hidden sm:flex
                "
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Scheduled
              </Button>
            )}
          </div>
          <p className="text-sm sm:text-base text-gray-600 text-center sm:text-left">Configure your interview parameters to get started</p>
          
          {/* Mobile View Scheduled Button */}
          {hasScheduledInterviews && (
            <div className="sm:hidden mt-4 flex justify-center">
              <Button
                onClick={onViewScheduled}
                variant="outline"
                size="sm"
                className="
                  bg-white/80 border-gray-300/50 text-gray-700
                  hover:bg-gray-50 hover:border-gray-400/50
                  shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                "
              >
                <Calendar className="w-4 h-4 mr-2" />
                View Scheduled Interviews
              </Button>
            </div>
          )}
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* Left Column - Job Description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col"
          >
            <div className="
              backdrop-blur-xl bg-white/80 border border-gray-200/50
              rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col
              shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
              relative
              before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
              before:bg-gradient-to-br before:from-white/40 before:to-transparent
              before:pointer-events-none
            ">
              <h2 className="text-gray-900 mb-3 sm:mb-4">Job Description</h2>
              
              {/* Job Description Selector */}
              <div className="mb-3">
                <Select value={selectedJobId} onValueChange={handleJobSelect}>
                  <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                    <SelectValue placeholder="Select a job description" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobDescriptions.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={jobDescription}
                onChange={(e) => {
                  setSelectedJobId('custom');
                  setJobDescription(e.target.value);
                  resetCompetencyState();
                  resetRubricState();
                }}
                placeholder="Paste the job description here or select from dropdown above..."
                className="min-h-[200px] sm:min-h-[300px] resize-none bg-white/60 border-gray-200/50 focus:border-gray-300 focus:ring-gray-200/50 mb-4"
              />
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={handleGenerateCompetency}
                  disabled={!jobDescription.trim() || isGeneratingCompetency}
                  className="
                    w-full sm:w-auto
                    bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                    text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isGeneratingCompetency && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Competency
                </Button>
                
                {isGeneratingCompetency && (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                )}
                
                {competencyGenerated && !isGeneratingCompetency && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm">Completed</span>
                  </div>
                )}

                {competencyError && (
                  <div className="text-sm text-red-600 text-center sm:text-left">{competencyError}</div>
                )}
              </div>
            </div>

            {/* Competencies List */}
            {competencies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sm:mt-6 space-y-3"
              >
                <h3 className="text-gray-900">Competencies</h3>
                {competencies.map((competency, index) => (
                  <motion.div
                    key={competency.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="
                      backdrop-blur-xl bg-white/80 border border-gray-200/50
                      rounded-xl sm:rounded-2xl p-3 sm:p-4
                      flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4
                      shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                      relative
                      before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl
                      before:bg-gradient-to-br before:from-white/40 before:to-transparent
                      before:pointer-events-none
                    "
                  >
                    <div className="relative z-10 flex-1">
                      <span className="text-sm sm:text-base text-gray-900">{competency.name}</span>
                      {competency.rationale && (
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed">{competency.rationale}</p>
                      )}
                    </div>
                    <div className="relative z-10 w-full sm:w-64">
                      <Select
                        value={competency.interviewStyle}
                        onValueChange={(value) => updateInterviewStyle(competency.id, value)}
                      >
                        <SelectTrigger className="bg-white/60 border-gray-200/50 w-full" disabled={styleOptions.length === 0}>
                          <SelectValue placeholder="Select interview style" />
                        </SelectTrigger>
                        <SelectContent>
                          {styleOptions.length === 0 ? (
                            <SelectItem value="__unavailable" disabled>
                              No styles available
                            </SelectItem>
                          ) : (
                            styleOptions.map((style) => (
                              <SelectItem key={style.style_id} value={style.style_id}>
                                {style.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Resume */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="
              backdrop-blur-xl bg-white/80 border border-gray-200/50
              rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col
              shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
              relative
              before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
              before:bg-gradient-to-br before:from-white/40 before:to-transparent
              before:pointer-events-none
            ">
              <h2 className="text-gray-900 mb-3 sm:mb-4">Resume</h2>
              
              {/* Resume Selector */}
              <div className="mb-3">
                <Select value={selectedResumeId} onValueChange={handleResumeSelect}>
                  <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                    <SelectValue placeholder="Select a candidate resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resumeOption) => (
                      <SelectItem key={resumeOption.id} value={resumeOption.id}>
                        {resumeOption.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={resume}
                onChange={(e) => {
                  setSelectedResumeId('empty');
                  setResume(e.target.value);
                  resetRubricState();
                }}
                placeholder="Paste the candidate's resume here or select from dropdown above..."
                className="min-h-[200px] sm:min-h-[300px] resize-none bg-white/60 border-gray-200/50 focus:border-gray-300 focus:ring-gray-200/50 mb-4"
              />
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    onClick={handleGenerateRubric}
                    disabled={!allCompetenciesHaveStyle || isGeneratingRubric}
                    className="
                      w-full sm:w-auto
                      bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                      text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {isGeneratingRubric && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Generate Rubric
                  </Button>
                  
                  {isGeneratingRubric && (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  )}
                  
                  {rubricGenerated && !isGeneratingRubric && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">Completed</span>
                    </div>
                  )}

                  {rubricError && (
                    <div className="text-sm text-red-600 text-center sm:text-left">{rubricError}</div>
                  )}
                </div>

                {rubricGenerated && rubricData && !isGeneratingRubric && (
                  <>
                    <Dialog open={isRubricDialogOpen} onOpenChange={setIsRubricDialogOpen}>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            className="
                              w-full sm:w-auto
                              bg-white/80 border-gray-300/50 text-gray-700
                              hover:bg-gray-50 hover:border-gray-400/50
                              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                            "
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Rubric
                          </Button>
                        </DialogTrigger>
                        <Button
                          variant="outline"
                          onClick={handleCopyRubric}
                          className="
                            w-full sm:w-auto
                            bg-white/80 border-gray-300/50 text-gray-700
                            hover:bg-gray-50 hover:border-gray-400/50
                            shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                          "
                        >
                          Copy Rubric JSON
                        </Button>
                      </div>
                      <DialogContent className="max-w-3xl max-h-[80vh]">
                        <DialogHeader>
                          <DialogTitle>Evaluation Rubric</DialogTitle>
                          <DialogDescription>
                            Role: {rubricData.role} · Level: {rubricData.seniority_level}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <ScrollArea className="h-[500px] pr-4">
                          <div className="space-y-6">
                            {rubricData.categories.map((category, catIndex) => (
                              <motion.div
                                key={category.id || `category-${catIndex}`}
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
                                  {category.name}
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                    {Math.round(category.criteria.reduce((sum, c) => sum + c.weight, 0))}%
                                  </Badge>
                                </h3>
                                
                                <div className="space-y-3">
                                  {category.criteria.map((criterion, critIndex) => (
                                    <div
                                      key={criterion.id || `criterion-${catIndex}-${critIndex}`}
                                      className="bg-white/60 border border-gray-200/50 rounded-xl p-4"
                                    >
                                      <div className="flex items-start justify-between gap-3 mb-2">
                                        <h4 className="text-sm text-gray-900">{criterion.name}</h4>
                                        <Badge 
                                          variant="secondary"
                                          className="bg-gray-100 text-gray-700 shrink-0"
                                        >
                                          {Math.round(criterion.weight)}%
                                        </Badge>
                                      </div>
                                      <p className="text-xs text-gray-600 leading-relaxed">
                                        {criterion.description}
                                      </p>
                                      {criterion.scoring_levels && Object.keys(criterion.scoring_levels).length > 0 && (
                                        <div className="mt-3 space-y-1">
                                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                            Scoring Levels
                                          </p>
                                          {Object.entries(criterion.scoring_levels)
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
                    {copyStatus && <div className="text-xs text-gray-600">{copyStatus}</div>}
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Schedule Interview Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-2 pb-6"
        >
          <Button
            onClick={handleScheduleInterview}
            disabled={!canScheduleInterview}
            size="lg"
            className="
              w-full sm:w-auto
              bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900
              text-white px-8 sm:px-12 py-4 sm:py-6
              shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300
            "
          >
            {isScheduling ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Schedule Interview'
            )}
          </Button>
          {scheduleError && <p className="text-sm text-red-600 text-center">{scheduleError}</p>}
        </motion.div>
      </div>
    </div>
  );
}
