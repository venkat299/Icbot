import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import {
  Award,
  Calendar,
  Clock,
  User,
  Briefcase,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  AlertCircle,
  FileText,
  MessageSquare,
  Target,
  GraduationCap,
  Lightbulb,
  BarChart3,
  Link as LinkIcon,
  Database,
} from 'lucide-react';

interface ResumeEducation {
  institution: string;
  credential: string;
  graduated: string;
}

interface ResumeProject {
  name: string;
  description: string;
}

interface LlmCallMetadata {
  registry_key: string;
  route: string;
  model: string;
  base_url: string;
  temperature: number;
  schema_path: string;
  timestamp: string;
}

interface LlmMetadata {
  question_generation?: LlmCallMetadata;
  competency_planning?: LlmCallMetadata;
  evaluation_scoring?: LlmCallMetadata;
  [key: string]: LlmCallMetadata | undefined;
}

export interface InterviewReportData {
  report_id: string;
  generated_at: string;
  generated_by: string;
  interview: {
    interview_id: string;
    scheduled_at: string;
    duration_minutes: number;
    mode: string;
    stage_sequence: string[];
  };
  candidate: {
    candidate_id: string;
    name: string;
    email: string;
    linked_profile?: string;
    experience_years?: number | null;
    resume_summary: {
      headline: string;
      highlights: string[];
      education: ResumeEducation[];
      notable_projects: ResumeProject[];
    };
  };
  position: {
    job_title: string;
    requisition_id: string;
    hiring_manager: string;
    job_description_summary: {
      mission: string;
      core_responsibilities: string[];
      key_requirements: string[];
    };
  };
  session_summary: {
    warmup_outcome: {
      comfort_score: number;
      ready_signal: boolean;
      notes: string;
    };
    competency_progress: {
      competency_id: string;
      title: string;
      interview_style: string;
      question_count: number;
      time_spent_minutes: number;
      transcript_highlights: string[];
    }[];
    wrapup_notes: string;
  };
  overall_evaluation: {
    status: string;
    confidence: number;
    overall_score: number;
    scoring_scale: {
      min: number;
      max: number;
      thresholds: {
        strong_positive: number;
        lean_positive: number;
        neutral: number;
        concern: number;
      };
    };
    strengths: string[];
    risks: string[];
  };
  competency_results: {
    competency_id: string;
    title: string;
    score: number;
    rating: string;
    summary: string;
    criteria: {
      criterion_id: string;
      name: string;
      score: number;
      max_score: number;
      evidence: string[];
    }[];
  }[];
  transcript_digest: {
    stage: string;
    speaker: string;
    excerpt: string;
    timestamp: string;
  }[];
  recommendations: string[];
  attachments?: {
    full_transcript_path: string;
    rubric_snapshot_path: string;
  };
  llm_metadata?: LlmMetadata;
}

interface InterviewReportProps {
  data: InterviewReportData;
}

export function InterviewReport({ data }: InterviewReportProps) {
  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase().replace('_', ' ');
    if (statusLower.includes('strong')) return 'bg-green-100 text-green-700 border-green-200';
    if (statusLower.includes('positive')) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (statusLower.includes('neutral')) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-red-100 text-red-700 border-red-200';
  };

  const getRatingColor = (rating: string) => {
    const ratingLower = rating.toLowerCase().replace('_', ' ');
    if (ratingLower.includes('exceeds')) return 'bg-green-100 text-green-700 border-green-200';
    if (ratingLower.includes('meets')) return 'bg-blue-100 text-blue-700 border-blue-200';
    return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getScoreColor = (score: number, max: number = 100) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return 'text-green-700';
    if (percentage >= 60) return 'text-blue-700';
    if (percentage >= 40) return 'text-yellow-700';
    return 'text-red-700';
  };
  const llmEntries = Object.entries(data.llm_metadata ?? {}).filter(
    (entry): entry is [string, LlmCallMetadata] => Boolean(entry[1])
  );
  const formatKey = (value: string) =>
    value.replace(/[_-]/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl p-6
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
        ">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="w-6 h-6 text-gray-600" />
                <h2 className="text-gray-900">Interview Report</h2>
              </div>
              <p className="text-sm text-gray-600">Report ID: {data.report_id}</p>
              <p className="text-xs text-gray-500">Generated: {formatDate(data.generated_at)}</p>
              <p className="text-xs text-gray-500">Generated by: {data.generated_by}</p>
            </div>
            <div className="
              backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
              border border-gray-200/50 rounded-xl p-4
              shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
              text-center min-w-[120px]
            ">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Award className="w-5 h-5 text-gray-600" />
                <span className="text-xs text-gray-600">Overall Score</span>
              </div>
              <div className={`text-gray-900 ${getScoreColor(data.overall_evaluation.overall_score)}`}>
                {data.overall_evaluation.overall_score}%
              </div>
              <Badge className={`mt-2 ${getStatusColor(data.overall_evaluation.status)}`}>
                {data.overall_evaluation.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Candidate & Position Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Candidate Info */}
          <Card className="
            backdrop-blur-xl bg-white/80 border border-gray-200/50
            rounded-2xl
            shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
          ">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Candidate Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-gray-900">{data.candidate.name}</p>
                <p className="text-sm text-gray-600">{data.candidate.email}</p>
                <p className="text-xs text-gray-500">ID: {data.candidate.candidate_id}</p>
                {data.candidate.linked_profile && (
                  <a
                    href={data.candidate.linked_profile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    <LinkIcon className="w-3.5 h-3.5" />
                    Profile
                  </a>
                )}
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-600 mb-1">Experience</p>
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  {data.candidate.experience_years} years
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">{data.candidate.resume_summary.headline}</p>
                {data.candidate.resume_summary.highlights.length > 0 && (
                  <ul className="space-y-1">
                    {data.candidate.resume_summary.highlights.map((item, idx) => (
                      <li key={`highlight-${idx}`} className="text-xs text-gray-600 flex items-start gap-1.5">
                        <span className="text-gray-400 mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {data.candidate.resume_summary.education.map((edu, idx) => (
                  <div key={idx} className="flex items-start gap-2 mt-2">
                    <GraduationCap className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-900">{edu.credential}</p>
                      <p className="text-xs text-gray-500">{edu.institution}</p>
                    </div>
                  </div>
                ))}
                {data.candidate.resume_summary.notable_projects.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {data.candidate.resume_summary.notable_projects.map((project, idx) => (
                      <div key={`project-${idx}`} className="rounded-lg border border-gray-200/70 bg-gray-50/60 p-2">
                        <p className="text-xs text-gray-900 font-medium">{project.name}</p>
                        <p className="text-xs text-gray-600 mt-1">{project.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Position Info */}
          <Card className="
            backdrop-blur-xl bg-white/80 border border-gray-200/50
            rounded-2xl
            shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
          ">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-gray-600" />
                Position Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-gray-900">{data.position.job_title}</p>
                <p className="text-xs text-gray-500">Req ID: {data.position.requisition_id}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-gray-600 mb-1">Hiring Manager</p>
                <p className="text-sm text-gray-900">{data.position.hiring_manager}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Mission</p>
                <p className="text-xs text-gray-700">{data.position.job_description_summary.mission}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDate(data.interview.scheduled_at).split(',')[0]}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {data.interview.duration_minutes} min
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Overall Evaluation */}
        <Card className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
        ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-gray-600" />
              Overall Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="
                backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                border border-gray-200/50 rounded-xl p-4
                shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
              ">
                <p className="text-xs text-gray-600 mb-1">Confidence Level</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-gray-600 to-gray-800 h-2 rounded-full"
                      style={{ width: `${data.overall_evaluation.confidence * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-900">{Math.round(data.overall_evaluation.confidence * 100)}%</span>
                </div>
              </div>
              <div className="
                backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                border border-gray-200/50 rounded-xl p-4
                shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
              ">
                <p className="text-xs text-gray-600 mb-1">Overall Score</p>
                <p className={`text-sm ${getScoreColor(data.overall_evaluation.overall_score)}`}>
                  {data.overall_evaluation.overall_score} / {data.overall_evaluation.scoring_scale.max}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="
                backdrop-blur-xl bg-green-50/50 border border-green-200/50
                rounded-xl p-4
                shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
              ">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <h4 className="text-sm text-green-900">Strengths</h4>
                </div>
                <ul className="space-y-2">
                  {data.overall_evaluation.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-green-800">{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Risks */}
              <div className="
                backdrop-blur-xl bg-yellow-50/50 border border-yellow-200/50
                rounded-xl p-4
                shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
              ">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-yellow-600" />
                  <h4 className="text-sm text-yellow-900">Areas for Growth</h4>
                </div>
                <ul className="space-y-2">
                  {data.overall_evaluation.risks.map((risk, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <span className="text-xs text-yellow-800">{risk}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competency Results */}
        <Card className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
        ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
              Competency Results
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.competency_results.map((comp, idx) => (
              <div 
                key={comp.competency_id}
                className="
                  backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                  border border-gray-200/50 rounded-xl p-4
                  shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                "
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm text-gray-900">{comp.title}</h4>
                      <Badge className={getRatingColor(comp.rating)}>
                        {comp.rating.replace('_', ' ')}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">{comp.summary}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`text-sm ${getScoreColor(comp.score)}`}>{comp.score}%</p>
                  </div>
                </div>

                {/* Criteria Breakdown */}
                <div className="space-y-2 mt-4">
                  {comp.criteria.map((criterion) => (
                    <div key={criterion.criterion_id} className="pl-4 border-l-2 border-gray-200">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-gray-900">{criterion.name}</p>
                        <span className={`text-xs ${getScoreColor(criterion.score, criterion.max_score)}`}>
                          {criterion.score}/{criterion.max_score}
                        </span>
                      </div>
                      <ul className="space-y-1 mt-1">
                        {criterion.evidence.map((evidence, evidenceIdx) => (
                          <li key={evidenceIdx} className="text-xs text-gray-600 flex items-start gap-1.5">
                            <span className="text-gray-400 mt-0.5">•</span>
                            <span>{evidence}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>

                {/* Session Details */}
                {data.session_summary.competency_progress[idx] && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3.5 h-3.5" />
                        {data.session_summary.competency_progress[idx].question_count} questions
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {data.session_summary.competency_progress[idx].time_spent_minutes} min
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Transcript Highlights */}
        <Card className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
        ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              Key Transcript Excerpts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.transcript_digest.map((excerpt, idx) => (
              <div 
                key={idx}
                className="
                  backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                  border border-gray-200/50 rounded-xl p-4
                  shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                "
              >
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 capitalize">
                    {excerpt.stage}
                  </Badge>
                  <Badge variant="outline" className={
                    excerpt.speaker === 'candidate' 
                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }>
                    {excerpt.speaker}
                  </Badge>
                  <span className="text-xs text-gray-500 ml-auto">{excerpt.timestamp}</span>
                </div>
                <p className="text-xs text-gray-700 italic">"{excerpt.excerpt}"</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
        ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-gray-600" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Session Summary */}
        <Card className="
          backdrop-blur-xl bg-white/80 border border-gray-200/50
          rounded-2xl
          shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
        ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              Session Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="
              backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
              border border-gray-200/50 rounded-xl p-4
              shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
            ">
              <p className="text-xs text-gray-600 mb-1">Warmup Outcome</p>
              <p className="text-sm text-gray-900 mb-2">{data.session_summary.warmup_outcome.notes}</p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Comfort Score:</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[200px]">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full"
                    style={{ width: `${data.session_summary.warmup_outcome.comfort_score * 100}%` }}
                  />
                </div>
                <span className="text-xs text-gray-900">
                  {Math.round(data.session_summary.warmup_outcome.comfort_score * 100)}%
                </span>
              </div>
            </div>

            <div className="
              backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
              border border-gray-200/50 rounded-xl p-4
              shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
            ">
              <p className="text-xs text-gray-600 mb-1">Wrapup Notes</p>
              <p className="text-sm text-gray-700">{data.session_summary.wrapup_notes}</p>
            </div>
            <div className="
              backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
              border border-gray-200/50 rounded-xl p-4
              shadow-[0_4px_12px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
            ">
              <p className="text-xs text-gray-600 mb-1">Stage Sequence</p>
              <div className="flex flex-wrap gap-2">
                {data.interview.stage_sequence.map((stage) => (
                  <Badge key={stage} variant="outline" className="bg-gray-50 text-gray-700 border-gray-200 capitalize">
                    {stage.replace('-', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {(data.attachments || llmEntries.length > 0) && (
          <Card className="
            backdrop-blur-xl bg-white/80 border border-gray-200/50
            rounded-2xl
            shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
          ">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-600" />
                Artifacts & LLM Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {data.attachments && (
                <div>
                  <p className="text-xs text-gray-600 mb-2">Attachments</p>
                  <div className="space-y-2">
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <FileText className="w-3.5 h-3.5 text-gray-500 mt-0.5" />
                      <span>{data.attachments.full_transcript_path}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-gray-700">
                      <FileText className="w-3.5 h-3.5 text-gray-500 mt-0.5" />
                      <span>{data.attachments.rubric_snapshot_path}</span>
                    </div>
                  </div>
                </div>
              )}
              {llmEntries.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 mb-2">LLM Calls</p>
                  <div className="space-y-2">
                    {llmEntries.map(([key, meta]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-gray-200/60 bg-gray-50/60 p-3 text-xs text-gray-700 space-y-1"
                      >
                        <p className="text-gray-900 font-medium">{formatKey(key)}</p>
                        <p>Route: {meta.route}</p>
                        <p>Model: {meta.model}</p>
                        <p>Schema: {meta.schema_path}</p>
                        <p>Timestamp: {formatDate(meta.timestamp)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
