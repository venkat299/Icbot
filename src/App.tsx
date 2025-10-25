import { useState } from 'react';
import { Chatbot } from './components/Chatbot';
import { SetupPage, InterviewDetails } from './components/SetupPage';
import { ScheduledInterviews, ScheduledInterview } from './components/ScheduledInterviews';

type AppView = 'setup' | 'scheduled' | 'interview';

// Sample demo interview data
const demoInterview: ScheduledInterview = {
  id: 'demo-interview-1',
  jobTitle: 'Senior Software Engineer',
  candidateName: 'Sarah Chen',
  jobDescription: `Senior Software Engineer

We are seeking an experienced Senior Software Engineer to join our growing team. The ideal candidate will have strong technical skills and a passion for building scalable systems.

Key Responsibilities:
- Design and implement complex software solutions
- Lead technical discussions and architecture decisions
- Mentor junior developers
- Collaborate with cross-functional teams

Requirements:
- 5+ years of software development experience
- Strong proficiency in modern programming languages
- Experience with distributed systems
- Excellent problem-solving skills`,
  resume: `Sarah Chen
Senior Software Engineer

Professional Summary:
Accomplished software engineer with 7+ years of experience building scalable web applications and distributed systems. Proven track record of leading technical initiatives and mentoring development teams.

Experience:
Senior Software Engineer at Tech Corp (2020-Present)
- Led migration of monolithic application to microservices architecture
- Mentored team of 5 junior developers
- Improved system performance by 40%

Software Engineer at StartupXYZ (2017-2020)
- Built real-time data processing pipeline handling 1M+ events/day
- Implemented CI/CD pipeline reducing deployment time by 60%`,
  competencies: [
    { id: '1', name: 'Technical Problem Solving', interviewStyle: 'technical' },
    { id: '2', name: 'System Design', interviewStyle: 'technical' },
    { id: '3', name: 'Leadership & Mentoring', interviewStyle: 'behavioral' }
  ],
  rubric: {
    candidateName: 'Sarah Chen',
    position: 'Senior Software Engineer',
    evaluationCriteria: [
      {
        category: 'Technical Skills',
        criteria: [
          {
            name: 'Problem Solving',
            description: 'Ability to break down complex problems and devise effective solutions',
            weight: 25
          },
          {
            name: 'System Design',
            description: 'Understanding of scalable architecture and design patterns',
            weight: 25
          }
        ]
      },
      {
        category: 'Leadership',
        criteria: [
          {
            name: 'Mentoring',
            description: 'Experience guiding and developing junior team members',
            weight: 20
          },
          {
            name: 'Communication',
            description: 'Clear articulation of technical concepts to various audiences',
            weight: 15
          }
        ]
      },
      {
        category: 'Domain Expertise',
        criteria: [
          {
            name: 'Technology Stack',
            description: 'Proficiency in relevant technologies and tools',
            weight: 15
          }
        ]
      }
    ]
  },
  scheduledDate: new Date('2025-10-25T14:00:00'),
  status: 'scheduled'
};

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('setup');
  const [scheduledInterviews, setScheduledInterviews] = useState<ScheduledInterview[]>([demoInterview]);
  const [currentInterviewId, setCurrentInterviewId] = useState<string | null>(null);
  
  // Set this to true for interviewer view, false for candidate view
  const isInterviewerView = true; // Toggle this based on user role

  const handleScheduleInterview = (details: InterviewDetails) => {
    const newInterview: ScheduledInterview = {
      id: `interview-${Date.now()}`,
      jobTitle: details.jobTitle,
      candidateName: details.candidateName,
      jobDescription: details.jobDescription,
      resume: details.resume,
      competencies: details.competencies,
      rubric: details.rubric,
      scheduledDate: new Date(),
      status: 'scheduled'
    };

    setScheduledInterviews([...scheduledInterviews, newInterview]);
    setCurrentView('scheduled');
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

  if (currentView === 'interview') {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <Chatbot 
          isInterviewerView={isInterviewerView}
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
