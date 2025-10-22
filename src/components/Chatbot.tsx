import { useState, useRef, useEffect } from 'react';
import { motion } from 'motion/react';
import { Volume2, VolumeX, ChevronRight, RotateCcw } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatHeader } from './ChatHeader';
import { InterviewProgress, InterviewStage } from './InterviewProgress';
import { InterviewerSidebar } from './InterviewerSidebar';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const initialMessages: Message[] = [
  {
    id: '1',
    text: 'Hello! I\'m your AI assistant. How can I help you today?',
    isUser: false,
    timestamp: '2:30 PM'
  },
  {
    id: '2',
    text: 'Hi! Can you tell me about the new iOS 26 features?',
    isUser: true,
    timestamp: '2:31 PM'
  },
  {
    id: '3',
    text: 'iOS 26 introduces the revolutionary Liquid Glass design system with advanced glassmorphism effects, fluid animations, and enhanced AR integration. The interface feels more organic and responsive than ever before!',
    isUser: false,
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
        w-full h-screen flex
        bg-gradient-to-br from-gray-50 to-white
        overflow-hidden relative
      "
    >
      <div className="relative z-10 flex flex-col h-full flex-1">
        {/* Progress bar at the very top */}
        <div className="px-6 pt-4 pb-2">
          <InterviewProgress 
            currentStage={currentStage}
            competencyNumber={competencyNumber}
            totalCompetencies={totalCompetencies}
          />
        </div>
        
        <div className="px-6 pb-0">
          <div className="flex items-center justify-between">
            <ChatHeader status={status} />
            <div className="flex items-center gap-2">
              {/* Demo Controls - Remove in production */}
              <motion.button
                onClick={resetInterview}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="
                  p-2 rounded-full
                  backdrop-blur-xl border border-white/20
                  bg-orange-500/20 text-orange-600 hover:bg-orange-500/30
                  shadow-[0_4px_12px_rgba(249,115,22,0.2),0_2px_4px_rgba(249,115,22,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]
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
                  backdrop-blur-xl border border-white/20
                  bg-blue-500/20 text-blue-600 hover:bg-blue-500/30
                  shadow-[0_4px_12px_rgba(59,130,246,0.2),0_2px_4px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]
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
                  backdrop-blur-xl border border-white/20
                  transition-all duration-200
                  ${ttsEnabled 
                    ? 'bg-green-500/20 text-green-600 hover:bg-green-500/30 shadow-[0_4px_12px_rgba(34,197,94,0.2),0_2px_4px_rgba(34,197,94,0.15),inset_0_1px_0_rgba(255,255,255,0.4)]' 
                    : 'bg-gray-500/20 text-gray-600 hover:bg-gray-500/30 shadow-[0_4px_12px_rgba(0,0,0,0.08),0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.4)]'
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
              />
            );
          })}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="p-6 pt-4">
          <ChatInput 
            onSendMessage={handleSendMessage}
            onListeningChange={(isListening) => setStatus(isListening ? 'listening' : 'waiting for answer')}
          />
        </div>
      </div>

      {/* Interviewer Sidebar - Only visible in interviewer view */}
      {isInterviewerView && (
        <InterviewerSidebar
          overallScore={overallScore}
          currentCompetency={currentCompetency}
          interviewStyle={interviewStyle}
          criteria={criteria}
          scoreNotes={scoreNotes}
          redFlags={redFlags}
        />
      )}
    </motion.div>
  );
}