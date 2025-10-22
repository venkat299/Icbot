import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX, ChevronRight, RotateCcw } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { InterviewProgress, InterviewStage } from './InterviewProgress';
import { InterviewerSidebar } from './InterviewerSidebar';
import { Question } from './InteractiveQuestion';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  question?: Question;
  questionSubmitted?: boolean;
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: 'Welcome to your technical interview! Let\'s start with a warm-up question.',
    isUser: false,
    timestamp: '2:30 PM'
  },
  {
    id: '2',
    text: 'Tell me about a challenging project you worked on recently.',
    isUser: false,
    timestamp: '2:30 PM'
  },
  {
    id: '3',
    text: 'I worked on a microservices architecture migration project that involved...',
    isUser: true,
    timestamp: '2:31 PM'
  }
];

// Simple bot responses for demonstration
const botResponses = [
  "That's a great question! Let me think about that...",
  "I'd be happy to help you with that. Here's what I know:",
  "Interesting! From my perspective, I think:",
  "That's a fascinating topic. In my experience:",
  "I understand what you're asking. Here's my take:",
  "Great point! I've been thinking about this too:",
];

interface ChatbotProps {
  isInterviewerView?: boolean;
}

export function Chatbot({ isInterviewerView = false }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [status, setStatus] = useState<'listening' | 'thinking' | 'waiting for answer'>('waiting for answer');
  const [currentStage, setCurrentStage] = useState<InterviewStage>('warmup');
  const [competencyNumber, setCompetencyNumber] = useState(1);
  const [totalCompetencies] = useState(3);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

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
  const addDemoQuestion = (type: 'code' | 'latex' | 'multiple-choice' | 'multiple-select' | 'yes-no') => {
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
      case 'latex':
        questionMessage = {
          id: Date.now().toString(),
          text: 'Write the formula for calculating the compound interest:',
          isUser: false,
          timestamp,
          question: {
            id: `q-${Date.now()}`,
            type: 'latex',
            placeholder: 'A = P(1 + r/n)^(nt)'
          }
        };
        break;
      case 'multiple-choice':
        questionMessage = {
          id: Date.now().toString(),
          text: 'What is the time complexity of binary search?',
          isUser: false,
          timestamp,
          question: {
            id: `q-${Date.now()}`,
            type: 'multiple-choice',
            options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)']
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
    } else if (answer.type === 'latex') {
      answerText = `Submitted formula: ${answer.formula}`;
    } else if (answer.type === 'multiple-choice') {
      answerText = `Selected: ${answer.answer}`;
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

  const handleSendMessage = (text: string) => {
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

    // Simulate bot response
    setTimeout(() => {
      const botText = botResponses[Math.floor(Math.random() * botResponses.length)];
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: botText,
        isUser: false,
        timestamp
      };
      setMessages(prev => [...prev, botResponse]);
      
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
            {/* Progress bar at the very top */}
            <div className="px-4 sm:px-6 pt-6 pb-3 bg-white/50 shrink-0">
              <InterviewProgress 
                currentStage={currentStage}
                competencyNumber={competencyNumber}
                totalCompetencies={totalCompetencies}
              />
            </div>
            
            <div className="px-6 pb-0 shrink-0">
              <div className="flex items-center justify-between">
                <ChatHeader status={status} />
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
                          onClick={() => addDemoQuestion('latex')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          LaTeX Formula
                        </button>
                        <button
                          onClick={() => addDemoQuestion('multiple-choice')}
                          className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Multiple Choice
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
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 scroll-smooth">
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
                  />
                );
              })}
              <div ref={messagesEndRef} />
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