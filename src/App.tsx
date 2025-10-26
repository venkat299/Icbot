import { useCallback, useEffect, useState } from 'react';
import { Chatbot } from './components/Chatbot';
import { SetupPage, InterviewDetails } from './components/SetupPage';
import { ScheduledInterviews, ScheduledInterview } from './components/ScheduledInterviews';
import { API_BASE_URL } from './config';
import { fetchUiConfig, UiClientConfig } from './services/uiConfig';

type AppView = 'setup' | 'scheduled' | 'interview';

interface ApiCompetency {
  id: string;
  name: string;
  interview_style: string;
  rationale?: string | null;
}

interface ApiRubricCriterion {
  name: string;
  description: string;
  weight: number;
  scoring_levels?: Record<string, string> | null;
}

interface ApiRubricCategory {
  category: string;
  criteria: ApiRubricCriterion[];
}

interface ApiScoreDetail {
  criteria: string;
  score: number;
  feedback: string;
}

interface ApiScheduledInterview {
  id: string;
  job_title: string;
  candidate_name: string;
  job_description: string;
  resume: string;
  competencies: ApiCompetency[];
  rubric: {
    candidate_name: string;
    position: string;
    evaluation_criteria: ApiRubricCategory[];
  };
  scheduled_date: string;
  status: 'scheduled' | 'completed';
  overall_score?: number | null;
  score_details?: ApiScoreDetail[] | null;
}

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([]);
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(true);
  const [interviewLoadError, setInterviewLoadError] = useState<string | null>(null);
  const [uiConfig, setUiConfig] = useState<UiClientConfig | null>(null);
  const [isInterviewerView, setIsInterviewerView] = useState(true);

  const mapFromApi = useCallback((payload: ApiScheduledInterview): ScheduledInterview => ({
    id: payload.id,
    jobTitle: payload.job_title,
    candidateName: payload.candidate_name,
    jobDescription: payload.job_description,
    resume: payload.resume,
    competencies: payload.competencies.map((competency) => ({
      id: competency.id,
      name: competency.name,
      interviewStyle: competency.interview_style,
      rationale: competency.rationale ?? undefined,
    })),
    rubric: {
      candidateName: payload.rubric.candidate_name,
      position: payload.rubric.position,
      evaluationCriteria: payload.rubric.evaluation_criteria.map((category) => ({
        category: category.category,
        criteria: category.criteria.map((criterion) => ({
          name: criterion.name,
          description: criterion.description,
          weight: criterion.weight,
          scoringLevels: criterion.scoring_levels ?? undefined,
        })),
      })),
    },
    scheduledDate: new Date(payload.scheduled_date),
    status: payload.status,
    overallScore: payload.overall_score ?? undefined,
    scoreDetails: payload.score_details?.map((detail) => ({
      criteria: detail.criteria,
      score: detail.score,
      feedback: detail.feedback,
    })),
  }), []);

  const fetchScheduledInterviews = useCallback(async () => {
    setIsLoadingInterviews(true);
    setInterviewLoadError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews`);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const payload: ApiScheduledInterview[] = await response.json();
      setScheduledInterviews(payload.map(mapFromApi));
    } catch (error) {
      console.error('Failed to fetch scheduled interviews', error);
      setInterviewLoadError('Unable to fetch scheduled interviews. Please try again.');
    } finally {
      setIsLoadingInterviews(false);
    }
  }, [mapFromApi]);

  useEffect(() => {
    void fetchScheduledInterviews();
  }, [fetchScheduledInterviews]);

  useEffect(() => {
    let cancelled = false;
    const loadUiConfig = async () => {
      try {
        const config = await fetchUiConfig();
        if (cancelled) {
          return;
        }
        setUiConfig(config);
        setIsInterviewerView(config.default_view_mode === 'interviewer');
      } catch (error) {
        console.error('Failed to load UI config', error);
      }
    };
    void loadUiConfig();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleScheduleInterview = async (details: InterviewDetails) => {
    const payload = {
      job_title: details.jobTitle,
      candidate_name: details.candidateName,
      job_description: details.jobDescription,
      resume: details.resume,
      competencies: details.competencies.map((competency) => ({
        id: competency.id,
        name: competency.name,
        interview_style: competency.interviewStyle,
        rationale: competency.rationale ?? null,
      })),
      rubric: {
        candidate_name: details.rubric.candidateName,
        position: details.rubric.position,
        evaluation_criteria: details.rubric.evaluationCriteria.map((category) => ({
          category: category.category,
          criteria: category.criteria.map((criterion) => ({
            name: criterion.name,
            description: criterion.description,
            weight: criterion.weight,
            scoring_levels: criterion.scoringLevels ?? null,
          })),
        })),
      },
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/interviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const scheduled: ApiScheduledInterview = await response.json();
      setScheduledInterviews((prev) => [...prev, mapFromApi(scheduled)]);
      setCurrentView('scheduled');
    } catch (error) {
      console.error('Failed to schedule interview', error);
      throw error;
    }
  };

  const handleStartInterview = (interviewId: string) => {
    setCurrentInterviewId(interviewId);
    setCurrentView('interview');
  };

  const handleRedoInterview = (interviewId: string) => {
    // Update the interview status back to scheduled and clear the score
    setScheduledInterviews(scheduledInterviews.map(interview => 
      interview.id === interviewId 
        ? { ...interview, status: 'scheduled', overallScore: undefined, scoreDetails: undefined }
        : interview
    ));
  };

  const handleScheduleNew = () => {
    setCurrentView('setup');
  };

  const handleViewScheduled = () => {
    setCurrentView('scheduled');
  };

  const handleBackToScheduled = () => {
    // Mark the current interview as completed with mock score
    if (currentInterviewId) {
      setScheduledInterviews(scheduledInterviews.map(interview =>
        interview.id === currentInterviewId
          ? { 
              ...interview, 
              status: 'completed',
              overallScore: 78,
              scoreDetails: [
                { criteria: 'Technical Problem Solving', score: 85, feedback: 'Strong analytical skills demonstrated with clear problem breakdown.' },
                { criteria: 'Communication Skills', score: 72, feedback: 'Good articulation but could improve clarity in complex explanations.' },
                { criteria: 'Leadership & Team Management', score: 80, feedback: 'Excellent examples of team collaboration and conflict resolution.' },
                { criteria: 'Domain Expertise', score: 75, feedback: 'Solid understanding of core concepts with room for deeper knowledge.' }
              ]
            }
          : interview
      ));
    }
    setCurrentInterviewId(null);
    setCurrentView('scheduled');
  };

  const activeInterview = currentInterviewId
    ? scheduledInterviews.find((interview) => interview.id === currentInterviewId) ?? null
    : null;

  if (currentView === 'interview') {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <Chatbot
          interview={activeInterview}
          isInterviewerView={isInterviewerView}
          autoReplyEnabled={uiConfig?.auto_candidate_reply ?? true}
          initialTtsEnabled={uiConfig?.tts_enabled ?? true}
          onEndInterview={handleBackToScheduled}
        />
      </div>
    );
  }

  if (currentView === 'scheduled') {
    return (
      <ScheduledInterviews
        interviews={scheduledInterviews}
        onStartInterview={handleStartInterview}
        onRedoInterview={handleRedoInterview}
        onScheduleNew={handleScheduleNew}
        isLoading={isLoadingInterviews}
        error={interviewLoadError}
        onRetry={() => {
          void fetchScheduledInterviews();
        }}
      />
    );
  }

  return (
    <SetupPage
      onScheduleInterview={handleScheduleInterview}
      onViewScheduled={handleViewScheduled}
      hasScheduledInterviews={scheduledInterviews.length > 0}
    />
  );
}
