import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX, ChevronRight, RotateCcw, Bot, Circle } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { InterviewProgress, InterviewStage } from './InterviewProgress';
import { InterviewerSidebar } from './InterviewerSidebar';
import { Question } from './InteractiveQuestion';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import { API_BASE_URL } from '../config';
import { ScheduledInterview } from './ScheduledInterviews';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  question?: Question;
  questionSubmitted?: boolean;
  objective?: string;
}

// Simple bot responses for demonstration
const botResponses = [
  "That's a great question! Let me think about that...",
  "I'd be happy to help you with that. Here's what I know:",
  "Interesting! From my perspective, I think:",
  "That's a fascinating topic. In my experience:",
  "I understand what you're asking. Here's my take:",
  "Great point! I've been thinking about this too:",
];

interface WarmupContextState {
  candidate_name?: string | null;
  job_title?: string | null;
  interview_style?: string | null;
  competency_focus: string[];
  resume_excerpt?: string | null;
}

interface WarmupHistoryEntry {
  role: 'interviewer' | 'candidate';
  text: string;
}

interface WarmupState {
  history: WarmupHistoryEntry[];
  last_question: string | null;
  last_answer: string | null;
  turns: number;
  comfort: number;
  done: boolean;
  context: WarmupContextState;
}

interface WarmupPlan {
  prompt: {
    greeting: string;
    question: string;
    objective: string;
  };
  follow_up?: string;
  tone: string;
  state: WarmupState;
}

interface WarmupFollowUpResult {
  follow_up?: string | null;
  state?: WarmupState;
}

interface ChatbotProps {
  interview?: ScheduledInterview | null;
  isInterviewerView?: boolean;
  onEndInterview?: () => void;
}

export function Chatbot({ interview = null, isInterviewerView = false, onEndInterview }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'listening' | 'thinking' | 'waiting for answer'>('thinking');
  const [currentStage, setCurrentStage] = useState<InterviewStage>('warmup');
  const [competencyNumber, setCompetencyNumber] = useState(1);
  const totalCompetencies = interview?.competencies.length ?? 3;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [warmupPlan, setWarmupPlan] = useState<WarmupPlan | null>(null);
  const [warmupFollowUpPending, setWarmupFollowUpPending] = useState(false);

  const getCompetencyFocus = () => {
    const items = interview?.competencies ?? [];
    return items
      .map(item => item.name)
      .filter((name): name is string => Boolean(name?.trim()));
  }; // Derives competency focus list from the active interview.

  // Mock data for interviewer sidebar
  const [overallScore] = useState(78);
  const [currentCompetency] = useState('Technical Problem Solving');
  const [interviewStyle] = useState('Behavioral');
  const [criteria] = useState([
    { name: 'Problem Analysis', level: '4', maxLevel: 5 },
    { name: 'Solution Design', level: '3', maxLevel: 5 },
    { name: 'Code Quality', level: '4', maxLevel: 5 },
    { name: 'Communication', level: '3', maxLevel: 5 },
  ]);
  const [scoreNotes] = useState('Candidate demonstrates strong analytical skills and provides well-structured solutions. Good understanding of design patterns, though could improve on edge case handling.');
  const [redFlags] = useState([
    'Incomplete answer on scalability concerns',
    'Vague about previous project experience',
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load voices when available
  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const speak = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Select an Indian female voice with priority
    const voices = window.speechSynthesis.getVoices();
    
    // Male voice names to exclude
    const maleVoiceNames = ['rishi', 'male', 'guy', 'david', 'james', 'tom', 'alex (male)', 'daniel'];
    
    // Filter to get only female voices
    const isFemaleVoice = (voice: SpeechSynthesisVoice) => {
      const nameLower = voice.name.toLowerCase();
      
      // Exclude male voices
      if (maleVoiceNames.some(male => nameLower.includes(male))) {
        return false;
      }
      
      // Include explicit female voices
      return nameLower.includes('female') ||
             nameLower.includes('woman') ||
             nameLower.includes('heera') ||
             nameLower.includes('priya') ||
             nameLower.includes('samantha') ||
             nameLower.includes('karen') ||
             nameLower.includes('victoria') ||
             nameLower.includes('zira') ||
             nameLower.includes('salli') ||
             nameLower.includes('joanna') ||
             nameLower.includes('kendra') ||
             nameLower.includes('kimberly') ||
             nameLower.includes('naja') ||
             nameLower.includes('lekha');
    };
    
    // Priority 1: Indian female voices
    let selectedVoice = voices.find(voice => 
      (voice.lang.includes('en-IN') || voice.name.toLowerCase().includes('indian')) &&
      isFemaleVoice(voice)
    );
    
    // Priority 2: Google UK/US female voices
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => 
        (voice.name.toLowerCase().includes('google uk english female') ||
         voice.name.toLowerCase().includes('google us english female')) &&
        isFemaleVoice(voice)
      );
    }
    
    // Priority 3: Any female voice
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => isFemaleVoice(voice));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
      console.log('Using voice:', selectedVoice.name, '- Language:', selectedVoice.lang);
    } else {
      console.warn('No female voice found. Available voices:', voices.map(v => v.name));
    }
    
    // Soft and soothing voice settings
    utterance.rate = 0.85; // Slower, more calming pace
    utterance.pitch = 1.1; // Slightly higher pitch for feminine tone
    utterance.volume = 0.9; // Slightly softer volume

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleTTS = () => {
    if (ttsEnabled && isSpeaking) {
      stopSpeaking();
    }
    setTtsEnabled(!ttsEnabled);
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadWarmup = async () => {
      if (!interview) {
        setCurrentStage('warmup');
        setCompetencyNumber(1);
        setMessages([]);
        setWarmupPlan(null);
        setWarmupFollowUpPending(false);
        setStatus('waiting for answer');
        return;
      }

      setCurrentStage('warmup');
      setCompetencyNumber(1);
      setStatus('thinking');
      setWarmupPlan(null);
      setWarmupFollowUpPending(false);

      const competencyFocus = getCompetencyFocus();
      const payload = {
        candidate_name: interview.candidateName,
        job_title: interview.jobTitle,
        resume_text: interview.resume,
        competency_focus: competencyFocus,
        interview_style: interview.competencies[0]?.interviewStyle ?? null,
      };

      try {
        const response = await fetch(`${API_BASE_URL}/api/warmup/opening`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const plan: WarmupPlan = await response.json();
        if (!plan.state) {
          throw new Error('Warm-up state missing from response');
        }
        if (cancelled) return;

        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const warmupMessages: Message[] = [
          {
            id: `warmup-greeting-${now.getTime()}`,
            text: `${plan.prompt.greeting}\n\nObjective: ${plan.prompt.objective}`,
            objective: plan.prompt.objective,
            isUser: false,
            timestamp,
          },
          {
            id: `warmup-question-${now.getTime() + 1}`,
            text: plan.prompt.question,
            isUser: false,
            timestamp,
          },
        ];

        setWarmupPlan(plan);
        setWarmupFollowUpPending(true);
        setMessages(warmupMessages);
        setStatus('waiting for answer');
      } catch (error) {
        console.error('Failed to load warm-up plan', error);
        if (cancelled) return;

        const now = new Date();
        const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const notice: Message = {
          id: `warmup-unavailable-${now.getTime()}`,
          text: 'The warm-up assistant is temporarily unavailable. We can move forward whenever you are ready.',
          isUser: false,
          timestamp,
        };

        setWarmupPlan(null);
        setWarmupFollowUpPending(false);
        setMessages([notice]);
        setStatus('waiting for answer');
      }
    };

    void loadWarmup();
    return () => {
      cancelled = true;
    };
  }, [interview]);

  useEffect(() => {
    if (!warmupPlan || !ttsEnabled) {
      return;
    }
    stopSpeaking();
    const combined = `${warmupPlan.prompt.greeting} ${warmupPlan.prompt.question}`;
    const timer = setTimeout(() => speak(combined), 400);
    return () => {
      clearTimeout(timer);
    };
  }, [warmupPlan?.prompt.greeting, warmupPlan?.prompt.question, ttsEnabled]);

  // Helper function to progress to next stage
  const progressToNextStage = () => {
    if (currentStage === 'warmup') {
      setCurrentStage('competency');
      setCompetencyNumber(1);
    } else if (currentStage === 'competency') {
      if (competencyNumber < totalCompetencies) {
        setCompetencyNumber(prev => prev + 1);
      } else {
        setCurrentStage('wrapup');
      }
    }
    // If already at wrapup, stay there
  };

  // Helper function to reset to beginning
  const resetInterview = () => {
    setCurrentStage('warmup');
    setCompetencyNumber(1);
  };

  // Demo function to add different question types
  const addDemoQuestion = (type: 'code' | 'multiple-select' | 'yes-no') => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let questionMessage: Message | null = null;

    switch (type) {
      case 'code':
        questionMessage = {
          id: Date.now().toString(),
          text: 'Please implement a function to reverse a linked list:',
          isUser: false,
          timestamp,
          question: {
            id: `q-${Date.now()}`,
            type: 'code',
            language: 'JavaScript',
            initialCode: `class Node {\n  constructor(value) {\n    this.value = value;\n    this.next = null;\n  }\n}\n\nfunction reverseLinkedList(head) {\n  // Your code here\n}`
          }
        };
        break;
      case 'multiple-select':
        questionMessage = {
          id: Date.now().toString(),
          text: 'Which of the following are JavaScript frameworks? (Select all that apply)',
          isUser: false,
          timestamp,
          question: {
            id: `q-${Date.now()}`,
            type: 'multiple-select',
            options: ['React', 'Angular', 'Django', 'Vue.js', 'Flask', 'Svelte']
          }
        };
        break;
      case 'yes-no':
        questionMessage = {
          id: Date.now().toString(),
          text: 'Have you worked with microservices architecture before?',
          isUser: false,
          timestamp,
          question: {
            id: `q-${Date.now()}`,
            type: 'yes-no'
          }
        };
        break;
    }

    if (questionMessage) {
      setMessages(prev => [...prev, questionMessage]);
    }
  };

  const handleQuestionSubmit = (messageId: string, answer: any) => {
    // Mark the question as submitted
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, questionSubmitted: true }
        : msg
    ));

    // Add the answer as a user message
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    let answerText = '';
    if (answer.type === 'code') {
      answerText = `Submitted code solution in ${answer.language || 'code'}`;
    } else if (answer.type === 'multiple-select') {
      answerText = `Selected: ${answer.answers.join(', ')}`;
    } else if (answer.type === 'yes-no') {
      answerText = `Answer: ${answer.answer}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: answerText,
      isUser: true,
      timestamp
    };

    setMessages(prev => [...prev, userMessage]);
    setStatus('thinking');

    // Simulate bot response to the answer
    setTimeout(() => {
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: "Great! I've reviewed your answer. Let's move to the next question.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMessage]);
      setStatus('waiting for answer');
    }, 1500);
  };

  const handleSendMessage = async (text: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp
    };

    setMessages(prev => [...prev, userMessage]);
    setStatus('thinking');

    if (warmupFollowUpPending && warmupPlan) {
      try {
        const payload = {
          prompt: warmupPlan.prompt,
          candidate_response: text,
          tone: warmupPlan.tone,
          candidate_name: interview?.candidateName ?? null,
          job_title: interview?.jobTitle ?? null,
          interview_style: interview?.competencies[0]?.interviewStyle ?? null,
          competency_focus: getCompetencyFocus(),
          state: warmupPlan.state,
        };

        const response = await fetch(`${API_BASE_URL}/api/warmup/followup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const result: WarmupFollowUpResult = await response.json();
        const updatedState = result.state ?? warmupPlan.state;
        const botText = (result.follow_up ?? warmupPlan.follow_up ?? '').trim();
        const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (botText) {
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: botText,
            isUser: false,
            timestamp: responseTimestamp
          };
          setMessages(prev => [...prev, botResponse]);

          if (ttsEnabled) {
            setTimeout(() => speak(botText), 500);
          }
        }

        const nextFollowUp = (result.follow_up ?? warmupPlan.follow_up ?? '').trim();
        setWarmupPlan(prev => prev ? { ...prev, follow_up: result.follow_up ?? prev.follow_up, state: updatedState } : prev);
        const pendingNext = !updatedState.done && nextFollowUp.length > 0;
        setWarmupFollowUpPending(pendingNext);
      } catch (error) {
        console.error('Failed to generate warm-up follow-up', error);
        const fallbackText = (warmupPlan.follow_up ?? '').trim();
        if (fallbackText) {
          const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: fallbackText,
            isUser: false,
            timestamp: responseTimestamp
          };
          setMessages(prev => [...prev, botResponse]);

          if (ttsEnabled) {
            setTimeout(() => speak(fallbackText), 500);
          }
        }
        setWarmupFollowUpPending(false);
      } finally {
        setStatus('waiting for answer');
      }
      return;
    }

    // Simulate bot response
    setTimeout(() => {
      const plannedFollowUp = warmupPlan?.follow_up;
      const botText = warmupFollowUpPending && warmupPlan && plannedFollowUp
        ? plannedFollowUp
        : botResponses[Math.floor(Math.random() * botResponses.length)];
      const responseTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        isUser: false,
        timestamp: responseTimestamp
      };
      setMessages(prev => [...prev, botResponse]);

      if (warmupFollowUpPending) {
        setWarmupFollowUpPending(false);
      }

      // Speak the bot's response if TTS is enabled
      if (ttsEnabled) {
        setTimeout(() => speak(botText), 500);
      }

      setStatus('waiting for answer');

      // Auto-progress stages for demo (remove this in production)
      // Uncomment the line below to auto-progress after each exchange
      // setTimeout(() => progressToNextStage(), 2000);
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="
        w-full h-screen
        bg-gradient-to-br from-gray-50 to-white
        overflow-hidden relative
      "
    >
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Main Chat Area */}
        <ResizablePanel defaultSize={isInterviewerView ? 70 : 100} minSize={40}>
          <div className="relative z-10 flex flex-col h-full">
            {/* Bot Avatar, Status and Controls - Single Row */}
            <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/50 shrink-0">
              <div className="flex items-center justify-between">
                {/* Left: Bot Avatar and Status */}
                <div className="flex items-center gap-4">
                  <div className="
                    w-12 h-12 rounded-2xl
                    bg-white/80
                    backdrop-blur-xl border border-gray-200/60
                    flex items-center justify-center
                    shadow-[0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
                  ">
                    <Bot className="w-6 h-6 text-gray-700" />
                  </div>
                  <div>
                    <h1 className="text-lg text-gray-900">AI Interviewer</h1>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Circle 
                        className={`w-2 h-2 ${
                          status === 'listening' 
                            ? 'fill-red-500 text-red-500 animate-pulse' 
                            : status === 'thinking'
                            ? 'fill-blue-500 text-blue-500 animate-pulse'
                            : 'fill-green-500 text-green-500'
                        }`} 
                      />
                      <span className="capitalize">{status}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Controls */}
                <div className="flex items-center gap-2">
                  {/* Demo Question Type Selector */}
                  <div className="relative group">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="
                        px-3 py-1.5 rounded-full text-xs
                        backdrop-blur-xl border border-gray-200/50
                        bg-gradient-to-br from-white to-gray-100/80 text-gray-700 hover:from-gray-50 hover:to-gray-200/80
                        shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]
                        transition-all duration-200
                      "
                    >
                      + Add Question
                    </motion.button>
                    
                    {/* Dropdown menu */}
                    <div className="
                      absolute top-full right-0 mt-2 w-48
                      backdrop-blur-xl bg-white/95 border border-gray-200/50
                      rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)]
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 z-50
                    ">
                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => addDemoQuestion('code')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Code Editor
                        </button>
                        <button
                          onClick={() => addDemoQuestion('multiple-select')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Multiple Select
                        </button>
                        <button
                          onClick={() => addDemoQuestion('yes-no')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Yes/No
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Demo Controls - Remove in production */}
                  <motion.button
                    onClick={resetInterview}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="
                      p-2 rounded-full
                      backdrop-blur-xl border border-gray-200/50
                      bg-gradient-to-br from-white to-gray-100/80 text-gray-600 hover:from-gray-50 hover:to-gray-200/80
                      shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]
                      transition-all duration-200
                    "
                    title="Reset Interview (Demo)"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    onClick={progressToNextStage}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="
                      p-2 rounded-full
                      backdrop-blur-xl border border-gray-200/50
                      bg-gradient-to-br from-white to-gray-100/80 text-gray-600 hover:from-gray-50 hover:to-gray-200/80
                      shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]
                      transition-all duration-200
                    "
                    title="Next Stage (Demo)"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                  
                  <motion.button
                    onClick={toggleTTS}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      p-2 rounded-full
                      backdrop-blur-xl border border-gray-200/50
                      transition-all duration-200
                      ${ttsEnabled 
                        ? 'bg-gradient-to-br from-gray-200 to-gray-300/80 text-gray-700 hover:from-gray-300 hover:to-gray-400/80 shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6)]' 
                        : 'bg-gradient-to-br from-white to-gray-100/80 text-gray-500 hover:from-gray-50 hover:to-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]'
                      }
                    `}
                    title={ttsEnabled ? 'Text-to-Speech enabled' : 'Text-to-Speech disabled'}
                  >
                    {ttsEnabled ? (
                      <Volume2 className="w-5 h-5" />
                    ) : (
                      <VolumeX className="w-5 h-5" />
                    )}
                  </motion.button>

                  {onEndInterview && (
                    <motion.button
                      onClick={onEndInterview}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="
                        px-3 py-1.5 rounded-full text-xs
                        backdrop-blur-xl border border-gray-200/50
                        bg-gradient-to-br from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700
                        shadow-[0_4px_12px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                        transition-all duration-200
                      "
                      title="End Interview"
                    >
                      End Interview
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="px-4 sm:px-6 pb-3 bg-white/50 shrink-0">
              <InterviewProgress 
                currentStage={currentStage}
                competencyNumber={competencyNumber}
                totalCompetencies={totalCompetencies}
              />
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth">
              <div className="relative max-w-5xl mx-auto">
                {/* Timeline vertical line */}
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-100"></div>
                
                {messages.map((message, index) => {
                  // Find the last AI message
                  const aiMessages = messages.filter(m => !m.isUser);
                  const lastAIMessage = aiMessages[aiMessages.length - 1];
                  const isLatestAI = !message.isUser && message.id === lastAIMessage?.id;
                  
                  return (
                    <ChatMessage
                      key={message.id}
                      message={message.text}
                      isUser={message.isUser}
                      timestamp={message.timestamp}
                      isLatestAI={isLatestAI}
                      question={message.question}
                      onQuestionSubmit={message.question ? (answer) => handleQuestionSubmit(message.id, answer) : undefined}
                      questionSubmitted={message.questionSubmitted}
                      isLast={index === messages.length - 1}
                    />
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>
            
            <div className="p-6 pt-4 shrink-0">
              <ChatInput 
                onSendMessage={handleSendMessage}
                onListeningChange={(isListening) => setStatus(isListening ? 'listening' : 'waiting for answer')}
              />
            </div>
          </div>
        </ResizablePanel>

        {/* Interviewer Sidebar - Only visible in interviewer view */}
        {isInterviewerView && (
          <>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={30} minSize={20} maxSize={50}>
              <InterviewerSidebar
                overallScore={overallScore}
                currentCompetency={currentCompetency}
                interviewStyle={interviewStyle}
                criteria={criteria}
                scoreNotes={scoreNotes}
                redFlags={redFlags}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </motion.div>
  );
}