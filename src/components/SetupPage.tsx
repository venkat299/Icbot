import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, CheckCircle2, Sparkles, FileText } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { DummyJD_Placeholder, JobDescriptionOptions, ResumeOptions } from '../test';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'; // Resolves backend base URL.

interface Competency {
  id: string;
  name: string;
  interviewStyle: string;
  rationale?: string;
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

interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
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

interface SetupPageProps {
  onStartInterview: () => void;
}

export function SetupPage({ onStartInterview }: SetupPageProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [selectedJobId, setSelectedJobId] = useState<string | undefined>('custom');
  const [selectedResumeId, setSelectedResumeId] = useState<string | undefined>('empty');
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [isGeneratingCompetency, setIsGeneratingCompetency] = useState(false);
  const [competencyGenerated, setCompetencyGenerated] = useState(false);
  const [competencyError, setCompetencyError] = useState<string | null>(null);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [rubricGenerated, setRubricGenerated] = useState(false);
  const [isRubricDialogOpen, setIsRubricDialogOpen] = useState(false);
  const [rubricData, setRubricData] = useState<RubricPayload | null>(null);
  const [rubricError, setRubricError] = useState<string | null>(null);

  const jobDescriptions = [
    { id: 'custom', title: 'Paste Job Description', description: '' },
    { id: 'default', title: 'Forecasting Analyst (Default)', description: DummyJD_Placeholder },
    ...JobDescriptionOptions,
  ];

  const resumes = [{ id: 'empty', name: 'Paste Resume', resume: '' }, ...ResumeOptions];

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    setCompetencyGenerated(false);
    setCompetencyError(null);
    setCompetencies([]);
    setRubricGenerated(false);
    setRubricData(null);
    setRubricError(null);
    setIsRubricDialogOpen(false);
    const selected = jobDescriptions.find((job) => job.id === jobId);
    if (selected) {
      setJobDescription(selected.description);
    }
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    setRubricGenerated(false);
    setIsRubricDialogOpen(false);
    setRubricData(null);
    setRubricError(null);
    const selected = resumes.find((entry) => entry.id === resumeId);
    if (selected) {
      setResume(selected.resume);
    }
  };

  const handleGenerateCompetency = async () => {
    if (!jobDescription.trim()) return;

    setIsGeneratingCompetency(true);
    setCompetencyGenerated(false);
    setCompetencyError(null);
    setRubricGenerated(false);
    setRubricData(null);
    setRubricError(null);
    setIsRubricDialogOpen(false);

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
        interviewStyle: item.style_id,
        rationale: item.rationale ?? undefined,
      }));

      setCompetencies(generated);
      setCompetencyGenerated(generated.length > 0);
    } catch (error) {
      console.error('Failed to generate competencies', error);
      setCompetencyError('Unable to generate competencies. Please try again.');
      setCompetencies([]);
      setCompetencyGenerated(false);
    } finally {
      setIsGeneratingCompetency(false);
    }
  };

  const handleGenerateRubric = async () => {
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
      setRubricData(null);
      setRubricGenerated(false);
    } finally {
      setIsGeneratingRubric(false);
    }
  };

  const updateInterviewStyle = (competencyId: string, style: string) => {
    setCompetencies((prev) =>
      prev.map((item) => (item.id === competencyId ? { ...item, interviewStyle: style } : item)),
    );
    setRubricGenerated(false);
    setRubricData(null);
    setRubricError(null);
    setIsRubricDialogOpen(false);
  };

  const allCompetenciesHaveStyle = competencies.length > 0 && competencies.every((item) => item.interviewStyle);
  const canStartInterview = competencyGenerated && rubricGenerated && !!rubricData && allCompetenciesHaveStyle;

  return (
    <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6 sm:mb-12">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
            <h1 className="text-gray-900">AI Interview Setup</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Configure your interview parameters to get started</p>
          <Button
            onClick={onStartInterview}
            variant="outline"
            size="sm"
            className="bg-white/80 border-gray-300/50 text-gray-700 hover:bg-gray-50 hover:border-gray-400/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            Skip to Interview (Demo)
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col"
          >
            <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] relative before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none">
              <h2 className="text-gray-900 mb-3 sm:mb-4">Job Description</h2>

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
                onChange={(event) => {
                  setSelectedJobId('custom');
                  setJobDescription(event.target.value);
                  setCompetencyGenerated(false);
                  setCompetencyError(null);
                  setCompetencies([]);
                  setRubricGenerated(false);
                  setRubricData(null);
                  setRubricError(null);
                  setIsRubricDialogOpen(false);
                }}
                placeholder="Paste the job description here or select from dropdown above..."
                className="min-h-[200px] sm:min-h-[300px] resize-none bg-white/60 border-gray-200/50 focus:border-gray-300 focus:ring-gray-200/50 mb-4"
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={handleGenerateCompetency}
                  disabled={!jobDescription || isGeneratingCompetency}
                  className="w-full sm:w-auto bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
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

                {competencyError && !isGeneratingCompetency && (
                  <div className="text-sm text-red-600 text-center sm:text-left">{competencyError}</div>
                )}
              </div>
            </div>

            {competencies.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-4 sm:mt-6 space-y-3">
                <h3 className="text-gray-900">Competencies</h3>
                {competencies.map((competency, index) => (
                  <motion.div
                    key={competency.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] relative before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none"
                  >
                    <div className="relative z-10 flex-1">
                      <span className="text-sm sm:text-base text-gray-900">{competency.name}</span>
                      {competency.rationale && (
                        <p className="mt-1 text-xs text-gray-600 leading-relaxed">{competency.rationale}</p>
                      )}
                    </div>
                    <div className="relative z-10 w-full sm:w-64">
                      <Select value={competency.interviewStyle} onValueChange={(value) => updateInterviewStyle(competency.id, value)}>
                        <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                          <SelectValue placeholder="Select interview style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="situational">Situational</SelectItem>
                          <SelectItem value="case-study">Case Study</SelectItem>
                          <SelectItem value="debugging">Debugging</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="backdrop-blur-xl bg-white/80 border border-gray-200/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)] relative before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl before:bg-gradient-to-br before:from-white/40 before:to-transparent before:pointer-events-none">
              <h2 className="text-gray-900 mb-3 sm:mb-4">Resume</h2>

              <div className="mb-3">
                <Select value={selectedResumeId} onValueChange={handleResumeSelect}>
                  <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                    <SelectValue placeholder="Select a candidate resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                value={resume}
                onChange={(event) => {
                  setSelectedResumeId('empty');
                  setResume(event.target.value);
                  setRubricGenerated(false);
                  setIsRubricDialogOpen(false);
                  setRubricData(null);
                  setRubricError(null);
                }}
                placeholder="Paste the candidate's resume here or select from dropdown above..."
                className="min-h-[200px] sm:min-h-[300px] resize-none bg-white/60 border-gray-200/50 focus:border-gray-300 focus:ring-gray-200/50 mb-4"
              />

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    onClick={handleGenerateRubric}
                    disabled={!allCompetenciesHaveStyle || isGeneratingRubric}
                    className="w-full sm:w-auto bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {rubricError && !isGeneratingRubric && (
                    <div className="text-sm text-red-600 text-center sm:text-left">{rubricError}</div>
                  )}
                </div>

                {rubricGenerated && rubricData && !isGeneratingRubric && (
                  <Dialog open={isRubricDialogOpen} onOpenChange={setIsRubricDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full sm:w-auto bg-white/80 border-gray-300/50 text-gray-700 hover:bg-gray-50 hover:border-gray-400/50 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Rubric
                      </Button>
                    </DialogTrigger>
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
                              className="backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50 border border-gray-200/50 rounded-2xl p-5 shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
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
                                      <Badge variant="secondary" className="bg-gray-100 text-gray-700 shrink-0">
                                        {Math.round(criterion.weight)}%
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">{criterion.description}</p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 border border-blue-200/50 rounded-2xl p-4">
                            <p className="text-xs text-blue-800">
                              <strong>Note:</strong> This rubric will be used to evaluate the candidate's performance
                              throughout the interview. Each criterion will be scored on a scale of 1-5.
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex justify-center pb-6">
          <Button
            onClick={onStartInterview}
            disabled={!canStartInterview}
            size="lg"
            className="w-full sm:w-auto bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900 text-white px-8 sm:px-12 py-4 sm:py-6 shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
          >
            Start Interview
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
