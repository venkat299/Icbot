import { useState, useRef, useEffect, useCallback, useMemo } from 'react'; // Chatbot renders interviewer-facing chat experience.
import { motion } from 'motion/react';
import { Volume2, VolumeX, Bot, Circle } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { InterviewProgress, InterviewStage } from './InterviewProgress';
import { InterviewPrepOverlay } from './InterviewPrepOverlay';
import { InterviewerSidebar } from './InterviewerSidebar';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from './ui/resizable';
import {
  CandidateConversationEntry,
  CandidateLevelId,
  CandidatePersonaPayload,
  fetchCandidateReply,
} from '../services/candidateAutoReply';
import {
  startInterviewSession,
  advanceInterviewSession,
  completeInterviewSession,
  extractSidebarSnapshot,
} from '../services/interviewSession';
import type { ApiError } from '../services/interviewSession';
import type { SessionMessage, InterviewSessionResponse, SidebarSnapshot } from '../types/interviewSession';
import type { ScheduledInterview } from './ScheduledInterviews';
import type { InteractiveQuestionAnswer, InteractiveQuestionData } from '../types/interactiveQuestion';
import type { CandidateLevelOption } from '../services/uiConfig';

interface Message { // Represents a chat transcript entry for the UI.
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  expectCandidateReply?: boolean;
  objective?: string;
  kind?: 'directive';
  interactiveQuestion?: InteractiveQuestionData | null;
  questionSubmitted?: boolean;
}

type ChatStatus = 'listening' | 'thinking' | 'waiting for answer';

const SESSION_EXPIRED_NOTICE = 'Interview session expired. Reconnecting...';

const isSessionExpiredError = (error: unknown): error is ApiError =>
  typeof error === 'object' && error !== null && 'status' in error && (error as ApiError).status === 404;

const mapSessionMessage = (entry: SessionMessage): Message => ({ // Maps backend session payload to UI message.
  id: entry.messageId,
  text: entry.text,
  isUser: entry.role === 'interviewer',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  expectCandidateReply: entry.expectCandidateReply,
  objective: entry.objective ?? undefined,
  kind: entry.role === 'directive' ? 'directive' : undefined,
  interactiveQuestion: entry.interactiveQuestion ?? null,
});

interface ChatbotProps {
  interview?: ScheduledInterview | null;
  isInterviewerView?: boolean;
  autoReplyEnabled?: boolean;
  initialTtsEnabled?: boolean;
  candidateLevelOptions?: CandidateLevelOption[];
  initialCandidateLevel?: CandidateLevelId;
  onEndInterview?: () => void;
}

export function Chatbot({
  interview = null,
  isInterviewerView = false,
  autoReplyEnabled = false,
  initialTtsEnabled = true,
  candidateLevelOptions = [],
  initialCandidateLevel = 'L3',
  onEndInterview,
}: ChatbotProps) { // Orchestrates chat UI backed by backend session flow.
  const [messages, setMessages] = useState<Message[]>([]); // Chat transcript state.
  const [ttsEnabled, setTtsEnabled] = useState(initialTtsEnabled); // Tracks text-to-speech toggle.
  const [autoReplyOn, setAutoReplyOn] = useState(autoReplyEnabled); // Tracks auto candidate reply toggle.
  const [isSpeaking, setIsSpeaking] = useState(false); // Indicates active speech synthesis.
  const [status, setStatus] = useState<ChatStatus>('thinking'); // Reflects assistant status indicator.
  const [sessionId, setSessionId] = useState<string | null>(null); // Holds active session identifier.
  const [currentStage, setCurrentStage] = useState<InterviewStage>('warmup'); // Mirrors backend stage for progress UI.
  const [competencyNumber, setCompetencyNumber] = useState(1); // Tracks active competency index.
  const totalCompetencies = interview?.competencies.length ?? 3; // Total competencies for progress UI.
  const [sidebarSnapshot, setSidebarSnapshot] = useState<SidebarSnapshot | null>(null); // Stores sidebar data derived from session.
  const [sessionError, setSessionError] = useState<string | null>(null); // Stores session bootstrap/advance errors.
  const [isLoadingSession, setIsLoadingSession] = useState(false); // Indicates session bootstrap.
  const [isEnding, setIsEnding] = useState(false); // Tracks manual end processing state.
  const [candidateLevel, setCandidateLevel] = useState<CandidateLevelId>(initialCandidateLevel); // Tracks candidate proficiency level.
  const [isPrepOverlayOpen, setIsPrepOverlayOpen] = useState(true); // Controls prep overlay visibility.
  const [isPrepReady, setIsPrepReady] = useState(false); // Tracks prep overlay readiness state.
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Message[]>([]);
  const autoReplyInFlightRef = useRef(false);
  const lastAutoReplyPromptRef = useRef<string | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

  const fallbackSidebar = useMemo<SidebarSnapshot>(() => ({
    overallScore: null,
    currentCompetency: interview?.competencies?.[0]?.name ?? 'Competency',
    currentCriterion: null,
    interviewStyle: interview?.competencies?.[0]?.interviewStyle ?? 'Style',
    criteria: [],
    scoreNotes: 'No evaluation notes yet.',
    redFlags: [],
    directiveObjective: null,
    scoringLevels: {},
    evaluationStatus: 'pending',
    proficiencyLevel: null,
    confidence: null,
  }), [interview]); // Provides stable sidebar defaults.

  const sidebarData = sidebarSnapshot ?? fallbackSidebar;

  const replaceMessages = useCallback((next: Message[]) => {
    messagesRef.current = next;
    setMessages(next);
  }, []); // Resets chat history to provided messages.

  const patchMessages = useCallback((builder: (prev: Message[]) => Message[]) => {
    setMessages(prev => {
      const next = builder(prev);
      messagesRef.current = next;
      return next;
    });
  }, []); // Applies functional update to chat history.

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []); // Scrolls transcript to latest entry.

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    setAutoReplyOn(autoReplyEnabled);
  }, [autoReplyEnabled]);

  useEffect(() => {
    setCandidateLevel(initialCandidateLevel);
  }, [initialCandidateLevel]);

  const handleAutoReplyToggle = useCallback(
    (enabled: boolean) => {
      setAutoReplyOn(enabled);
      if (!enabled) {
        autoReplyInFlightRef.current = false;
        setStatus('waiting for answer');
      }
    },
    [setStatus],
  ); // Resets state when interviewer disables auto replies.


  const stopSpeaking = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []); // Halts active speech synthesis playback.

  const toggleTTS = useCallback(() => {
    if (ttsEnabled && isSpeaking) {
      stopSpeaking();
    }
    setTtsEnabled(prev => !prev);
  }, [isSpeaking, stopSpeaking, ttsEnabled]); // Toggles text-to-speech usage.

  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || !window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const femaleVoice = voices.find(voice => voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female'));
      if (femaleVoice) {
        utterance.voice = femaleVoice;
      }
      utterance.rate = 0.95;
      utterance.pitch = 1.1;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      speechSynthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled],
  ); // Plays candidate replies via speech synthesis when enabled.

  useEffect(() => {
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []); // Primes voice list for speech synthesis.

  const resolveCompetencyNumber = useCallback(
    (competencyId: string | null | undefined) => {
      if (!interview || !competencyId) {
        return 1;
      }
      const index = interview.competencies.findIndex(entry => entry.id === competencyId);
      return index >= 0 ? index + 1 : 1;
    },
    [interview],
  ); // Resolves competency ordinal from identifier.

  const applySessionResponse = useCallback(
    (response: InterviewSessionResponse, mode: 'replace' | 'append') => {
      setSessionId(response.sessionId);
      const uiMessages = response.messages.map(mapSessionMessage);
      if (uiMessages.length) {
        if (mode === 'replace') {
          replaceMessages(uiMessages);
        } else {
          patchMessages(prev => [...prev, ...uiMessages]);
        }
      } else if (mode === 'replace') {
        replaceMessages([]);
      }
      const expectsReply = response.messages.some(entry => entry.expectCandidateReply);
      setStatus(expectsReply ? 'waiting for answer' : 'thinking');
      if (response.stage === 'competency') {
        setCurrentStage('competency');
        setCompetencyNumber(resolveCompetencyNumber(response.competencyId));
      } else if (response.stage === 'warmup') {
        setCurrentStage('warmup');
        setCompetencyNumber(1);
      } else {
        setCurrentStage('wrapup');
      }
      setSidebarSnapshot(extractSidebarSnapshot(response));
    },
    [patchMessages, replaceMessages, resolveCompetencyNumber],
  ); // Synchronizes UI state with backend session snapshot.

  const resetSession = useCallback((preserveError = false) => {
    setSessionId(null);
    setCurrentStage('warmup');
    setCompetencyNumber(1);
    replaceMessages([]);
    if (!preserveError) {
      setSessionError(null);
    }
    setStatus('thinking');
    lastAutoReplyPromptRef.current = null;
    autoReplyInFlightRef.current = false;
    stopSpeaking();
    setSidebarSnapshot(null);
    setIsPrepOverlayOpen(true);
    setIsPrepReady(false);
  }, [replaceMessages, stopSpeaking]); // Clears state when interview changes or session ends.

  const bootstrapSession = useCallback(async (preserveError = false) => {
    if (!interview) {
      resetSession(preserveError);
      return;
    }
    resetSession(preserveError);
    setIsLoadingSession(true);
    setStatus('thinking');
    try {
      const response = await startInterviewSession(interview.id);
      applySessionResponse(response, 'replace');
      setSessionError(null);
      setIsPrepReady(true);
    } catch (error) {
      console.error('Failed to start interview session', error);
      setSessionError('Unable to load interview session. Please try again.');
      replaceMessages([]);
    } finally {
      setIsLoadingSession(false);
    }
  }, [applySessionResponse, interview, replaceMessages, resetSession, setSessionError, setStatus]);

  useEffect(() => {
    void bootstrapSession();
  }, [bootstrapSession]);

  const handleEndInterviewClick = useCallback(async () => {
    if (isEnding) {
      return;
    }
    setIsEnding(true);
    try {
      if (sessionId) {
        await completeInterviewSession(sessionId);
      }
      resetSession();
      onEndInterview?.();
      setStatus('thinking');
    } catch (error) {
      console.error('Failed to complete interview session', error);
      setSessionError('Unable to complete the interview. Please try again.');
    } finally {
      setIsEnding(false);
    }
  }, [isEnding, sessionId, onEndInterview, resetSession, setStatus]);

  const buildCandidatePersona = useCallback(() => {
    if (!interview) {
      return null;
    }
    const persona: CandidatePersonaPayload = {};
    if (interview.candidateName) {
      persona.name = interview.candidateName;
    }
    if (interview.jobTitle) {
      persona.title = interview.jobTitle;
    }
    const specialties = interview.competencies
      .map(item => item.name)
      .filter((name): name is string => Boolean(name?.trim()));
    if (specialties.length) {
      persona.specialties = specialties;
    }
    const hasPersona = persona.name || persona.title || (persona.specialties && persona.specialties.length > 0);
    return hasPersona ? persona : null;
  }, [interview]); // Builds persona payload for candidate auto reply service.

  const mapConversationEntries = useCallback(
    (history: Message[]): CandidateConversationEntry[] =>
      history.reduce<CandidateConversationEntry[]>((acc, message) => {
        const trimmed = message.text.trim();
        if (!trimmed) {
          return acc;
        }
        const role: 'interviewer' | 'candidate' =
          message.isUser || message.expectCandidateReply
            ? (isInterviewerView ? 'interviewer' : 'candidate')
            : (isInterviewerView ? 'candidate' : 'interviewer');
        acc.push({ role, text: trimmed });
        return acc;
      }, []),
    [isInterviewerView],
  ); // Converts transcript into candidate service conversation payload.

  const handleCandidateReply = useCallback(
    async (text: string) => {
      let sessionExpired = false;
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const candidateMessage: Message = {
        id: `candidate-reply-${Date.now()}`,
        text,
        isUser: false,
        timestamp,
        expectCandidateReply: false,
      };
      patchMessages(prev => [...prev, candidateMessage]);
      if (ttsEnabled) {
        setTimeout(() => speak(text), 400);
      }
      if (!sessionId) {
        setStatus('waiting for answer');
        return;
      }
      setStatus('thinking');
      try {
        const response = await advanceInterviewSession(sessionId, { event: 'candidate_reply', text });
        applySessionResponse(response, 'append');
      } catch (error) {
        console.error('Failed to advance interview session', error);
        if (isSessionExpiredError(error)) {
          sessionExpired = true;
          setSessionError(SESSION_EXPIRED_NOTICE);
          void bootstrapSession(true);
        } else {
          const failure: Message = {
            id: `session-advance-error-${Date.now()}`,
            text: 'Unable to advance the interview. Please retry shortly.',
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            expectCandidateReply: false,
          };
          patchMessages(prev => [...prev, failure]);
        }
      } finally {
        setStatus(sessionExpired ? 'thinking' : 'waiting for answer');
      }
    },
    [applySessionResponse, bootstrapSession, patchMessages, sessionId, setSessionError, speak, ttsEnabled],
  ); // Handles candidate responses and advances backend session.

  const formatInteractiveAnswer = useCallback(
    (answer: InteractiveQuestionAnswer, question: InteractiveQuestionData): string => {
      if (answer.type === 'code') {
        const language = answer.language ?? (question.type === 'code' ? question.language ?? null : null);
        const prefix = language ? `${language} code submission:\n` : 'Code submission:\n';
        return `${prefix}${answer.code}`.trim();
      }
      if (answer.type === 'multiple-select') {
        const selections = answer.answers.join(', ');
        return `Selected options: ${selections}`;
      }
      if (answer.type === 'yes-no') {
        return answer.answer === 'yes' ? 'Yes.' : 'No.';
      }
      return '';
    },
    [],
  ); // Formats interactive answers into text for backend submission.

  const handleInteractiveSubmit = useCallback(
    (messageId: string, answer: InteractiveQuestionAnswer, question: InteractiveQuestionData) => {
      const response = formatInteractiveAnswer(answer, question);
      patchMessages(prev =>
        prev.map(entry =>
          entry.id === messageId ? { ...entry, questionSubmitted: true } : entry,
        ),
      );
      if (response.trim()) {
        void handleCandidateReply(response);
      }
    },
    [formatInteractiveAnswer, handleCandidateReply, patchMessages],
  ); // Handles submissions from interactive question widgets.

  const handleSendMessage = useCallback(
    async (text: string, options?: { skipAutoReply?: boolean }) => {
      const trimmedText = text.trim();
      if (!trimmedText) {
        return;
      }
      const pendingPrompt = [...messagesRef.current].reverse().find(message => message.expectCandidateReply);
      if (pendingPrompt && !autoReplyOn && !options?.skipAutoReply) {
        await handleCandidateReply(trimmedText);
        return;
      }
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const userMessage: Message = {
        id: Date.now().toString(),
        text: trimmedText,
        isUser: true,
        timestamp,
        expectCandidateReply: false,
      };
      const updatedHistory = [...messagesRef.current, userMessage];
      replaceMessages(updatedHistory);
      setStatus('thinking');
      if (sessionId) {
        try {
          await advanceInterviewSession(sessionId, { event: 'interviewer_message', text: trimmedText });
        } catch (error) {
          console.error('Failed to record interviewer message', error);
          if (isSessionExpiredError(error)) {
            setSessionError(SESSION_EXPIRED_NOTICE);
            setStatus('thinking');
            void bootstrapSession(true);
            return;
          }
        }
      }
      if (options?.skipAutoReply) {
        setStatus('waiting for answer');
        return;
      }
      if (!autoReplyOn) {
        setStatus('waiting for answer');
        return;
      }
      const prompt = pendingPrompt;
      if (!prompt) {
        setStatus('waiting for answer');
        return;
      }
      lastAutoReplyPromptRef.current = prompt.id;
      autoReplyInFlightRef.current = true;
      let sessionExpired = false;
      try {
        const conversation = mapConversationEntries(updatedHistory);
        const persona = buildCandidatePersona();
        const candidateResponse = await fetchCandidateReply({
          question: trimmedText,
          conversation,
          level: candidateLevel,
          ...(persona ? { persona } : {}),
        });
        await handleCandidateReply(candidateResponse.reply);
      } catch (error) {
        console.error('Failed to auto-generate candidate reply', error);
        if (isSessionExpiredError(error)) {
          sessionExpired = true;
          setSessionError(SESSION_EXPIRED_NOTICE);
          void bootstrapSession(true);
        } else {
          const failureTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const notice: Message = {
            id: `candidate-auto-error-${Date.now()}`,
            text: 'Candidate auto-response is unavailable. Please retry shortly.',
            isUser: false,
            timestamp: failureTimestamp,
            expectCandidateReply: false,
          };
          patchMessages(prev => [...prev, notice]);
          setStatus('waiting for answer');
        }
      } finally {
        autoReplyInFlightRef.current = false;
        if (!sessionExpired) {
          setStatus('waiting for answer');
        }
      }
    },
    [
      autoReplyOn,
      bootstrapSession,
      buildCandidatePersona,
      candidateLevel,
      handleCandidateReply,
      mapConversationEntries,
      patchMessages,
      replaceMessages,
      setSessionError,
      sessionId,
    ],
  ); // Handles interviewer messages and optionally triggers auto candidate replies.

  useEffect(() => {
    if (!autoReplyOn || !sessionId) {
      return;
    }
    const prompt = [...messages].reverse().find(message => message.expectCandidateReply);
    if (!prompt) {
      return;
    }
    if (lastAutoReplyPromptRef.current === prompt.id || autoReplyInFlightRef.current) {
      return;
    }
    const trimmedQuestion = prompt.text.trim();
    if (!trimmedQuestion) {
      return;
    }
    lastAutoReplyPromptRef.current = prompt.id;
    autoReplyInFlightRef.current = true;
    const respond = async () => {
      try {
        setStatus('thinking');
        const conversation = mapConversationEntries(messages);
        const persona = buildCandidatePersona();
        const candidateResponse = await fetchCandidateReply({
          question: trimmedQuestion,
          conversation,
          level: candidateLevel,
          ...(persona ? { persona } : {}),
        });
        await handleCandidateReply(candidateResponse.reply);
      } catch (error) {
        console.error('Failed to auto-generate candidate reply', error);
      } finally {
        autoReplyInFlightRef.current = false;
        setStatus('waiting for answer');
      }
    };
    void respond();
  }, [
    autoReplyOn,
    buildCandidatePersona,
    candidateLevel,
    handleCandidateReply,
    mapConversationEntries,
    messages,
    sessionId,
    setStatus,
  ]); // Auto-generates candidate replies when feature flag enabled.

  const handleCandidateLevelChange = useCallback((levelId: CandidateLevelId) => {
    setCandidateLevel(levelId);
  }, []); // Updates candidate level state from sidebar dropdown.

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
      {isPrepOverlayOpen && (
        <InterviewPrepOverlay
          isReady={isPrepReady && !isLoadingSession}
          onStart={() => setIsPrepOverlayOpen(false)}
          candidateName={interview?.candidateName ?? undefined}
          positionTitle={interview?.jobTitle ?? undefined}
        />
      )}
      <ResizablePanelGroup direction="horizontal" className="h-full">
        <ResizablePanel defaultSize={isInterviewerView ? 70 : 100} minSize={40}>
          <div className="relative z-10 flex flex-col h-full">
            <div className="px-4 sm:px-6 pt-6 pb-4 bg-white/50 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="
                      w-12 h-12 rounded-2xl
                      bg-white/80
                      backdrop-blur-xl border border-gray-200/60
                      flex items-center justify-center
                      shadow-[0_4px_12px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.8)]
                    "
                  >
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
                <div className="flex items-center gap-2">
                  <motion.button
                    onClick={toggleTTS}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      p-2 rounded-full
                      backdrop-blur-xl border border-gray-200/50
                      transition-all duration-200
                      ${
                        ttsEnabled
                          ? 'bg-gradient-to-br from-gray-200 to-gray-300/80 text-gray-700 hover:from-gray-300 hover:to-gray-400/80 shadow-[0_4px_12px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.6)]'
                          : 'bg-gradient-to-br from-white to-gray-100/80 text-gray-500 hover:from-gray-50 hover:to-gray-200/80 shadow-[0_4px_12px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]'
                      }
                    `}
                    title={ttsEnabled ? 'Text-to-Speech enabled' : 'Text-to-Speech disabled'}
                  >
                    {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </motion.button>
                  {onEndInterview && (
                    <motion.button
                      onClick={handleEndInterviewClick}
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
                      disabled={isEnding}
                    >
                      {isEnding ? 'Ending…' : 'End Interview'}
                    </motion.button>
                  )}
                </div>
              </div>
              {sessionError && (
                <div className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {sessionError}
                </div>
              )}
            </div>

            {!isInterviewerView && (
              <div className="px-4 sm:px-6 pb-3 bg-white/50 shrink-0">
                <InterviewProgress currentStage={currentStage} competencyNumber={competencyNumber} totalCompetencies={totalCompetencies} />
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6 py-8 scroll-smooth">
              <div className="relative max-w-5xl mx-auto">
                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-gray-300 via-gray-200 to-gray-100"></div>
                {isLoadingSession && messages.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-sm text-gray-600">
                    Loading interview session...
                  </div>
                ) : (
                  messages.map((message, index) => {
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
                        interactiveQuestion={message.interactiveQuestion ?? undefined}
                        onQuestionSubmit={
                          message.interactiveQuestion
                            ? (answer) => handleInteractiveSubmit(message.id, answer, message.interactiveQuestion!)
                            : undefined
                        }
                        questionSubmitted={message.questionSubmitted}
                        isLast={index === messages.length - 1}
                      />
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <div className="p-6 pt-4 shrink-0">
              <ChatInput
                onSendMessage={
                  isInterviewerView
                    ? (value) => { void handleSendMessage(value); }
                    : (value) => { void handleCandidateReply(value); }
                }
                onListeningChange={isListening => setStatus(isListening ? 'listening' : 'waiting for answer')}
              />
            </div>
          </div>
        </ResizablePanel>

        {isInterviewerView && (
          <>
            <ResizableHandle />
            <ResizablePanel defaultSize={30} minSize={20}>
              <InterviewerSidebar
                overallScore={sidebarData.overallScore}
                currentCompetency={sidebarData.currentCompetency}
                currentCriterion={sidebarData.currentCriterion ?? undefined}
                interviewStyle={sidebarData.interviewStyle}
                criteria={sidebarData.criteria}
                scoreNotes={sidebarData.scoreNotes}
                redFlags={sidebarData.redFlags}
                directiveObjective={sidebarData.directiveObjective ?? undefined}
                scoringLevels={sidebarData.scoringLevels ?? {}}
                evaluationStatus={sidebarData.evaluationStatus ?? 'pending'}
                proficiencyLevel={sidebarData.proficiencyLevel ?? null}
                confidence={sidebarData.confidence ?? null}
                autoReplyEnabled={autoReplyOn}
                onToggleAutoReply={handleAutoReplyToggle}
                currentStage={currentStage}
                competencyNumber={competencyNumber}
                totalCompetencies={totalCompetencies}
                candidateLevel={candidateLevel}
                candidateLevels={candidateLevelOptions}
                onCandidateLevelChange={handleCandidateLevelChange}
              />
            </ResizablePanel>
          </>
        )}
      </ResizablePanelGroup>
    </motion.div>
  );
}
