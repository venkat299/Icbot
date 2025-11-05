import { Button } from './ui/button'; // InterviewPrepOverlay.tsx renders the interview preparation overlay UI.
import { Badge } from './ui/badge';
import {
  Loader2,
  PlayCircle,
  CheckCircle2,
  Mic,
  Video,
  MessageSquare,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface InterviewPrepOverlayProps {
  isReady: boolean;
  onStart: () => void;
  candidateName?: string;
  positionTitle?: string;
  estimatedDuration?: number;
}

const PREP_STEPS = [
  'Initializing session',
  'Loading interview questions',
  'Configuring AI interviewer',
  'Setting up audio system',
  'Finalizing environment',
] as const;

const AUDIO_STEP = 'Setting up audio system';

export function InterviewPrepOverlay({
  isReady,
  onStart,
  candidateName = 'Candidate',
  positionTitle = 'Position',
  estimatedDuration = 30,
}: InterviewPrepOverlayProps) { // Renders the interview preparation overlay with staged loading and ready states.
  const [progressIndex, setProgressIndex] = useState(0);

  useEffect(() => {
    if (isReady) {
      setProgressIndex(PREP_STEPS.length);
      return;
    }
    if (progressIndex >= PREP_STEPS.length - 1) return;
    const timer = window.setTimeout(() => setProgressIndex(prev => prev + 1), 900);
    return () => window.clearTimeout(timer);
  }, [isReady, progressIndex]);

  useEffect(() => {
    if (!isReady) setProgressIndex(0);
  }, [isReady]);

  const progressRatio = Math.min(progressIndex / PREP_STEPS.length, 1);

  return (
    <div className="
      fixed inset-0 z-50
      bg-gradient-to-br from-gray-50 via-white to-gray-100
      flex items-center justify-center
      backdrop-blur-xl
    ">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-200/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute -top-16 right-1/3 w-64 h-64 bg-blue-100/30 rounded-full blur-3xl animate-[pulse_4s_ease-in-out_infinite]" />
      </div>

      <div className="relative z-10 w-full max-w-2xl mx-4">
        <div className="
          backdrop-blur-xl bg-white/90 border border-gray-200/50
          rounded-3xl p-8 sm:p-12
          shadow-[0_20px_60px_rgba(0,0,0,0.12),0_8px_24px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)]
          relative overflow-hidden
        ">
          <div className="text-center mb-8">
            <div className="relative inline-flex items-center justify-center mb-4">
              {isReady && (
                <>
                  <div className="absolute inset-0 rounded-full border border-green-300/80 animate-[ping_2s_ease-out_infinite]" />
                  <div className="absolute inset-2 rounded-full border border-green-200/70 animate-[spin_6s_linear_infinite]" />
                </>
              )}
              <div className={`
                relative flex items-center justify-center
                w-16 h-16 rounded-full shadow-lg
                transition-all duration-500
                ${isReady
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                  : 'bg-gradient-to-br from-blue-500 to-blue-600 animate-pulse'
                }
              `}>
                {isReady ? (
                  <CheckCircle2 className="w-9 h-9 text-white" />
                ) : (
                  <Loader2 className="w-9 h-9 text-white animate-spin" />
                )}
              </div>
            </div>

            <h2 className="text-gray-900 mb-2">
              {isReady ? 'Interview Ready!' : 'Preparing Your Interview'}
            </h2>
            <p className="text-gray-600">
              {isReady 
                ? 'Everything is set up. Click the button below to begin.'
                : 'Please wait while we set up your interview session...'
              }
            </p>
          </div>

          <div className="
            backdrop-blur-xl bg-gradient-to-br from-gray-50/50 to-white/50
            border border-gray-200/50 rounded-2xl p-6 mb-8
            shadow-[0_4px_12px_rgba(0,0,0,0.04)]
          ">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Candidate</p>
                <p className="text-sm text-gray-900">{candidateName}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Position</p>
                <p className="text-sm text-gray-900">{positionTitle}</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200/50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4" />
                <span>Estimated duration: {estimatedDuration} minutes</span>
              </div>
            </div>
            {!isReady && (
              <div className="mt-4 w-full bg-gray-100/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 transition-all duration-700 ease-out"
                  style={{ width: `${Math.max(progressRatio * 100, 8)}%` }}
                />
              </div>
            )}
          </div>

          {!isReady ? (
            <div className="space-y-3 mb-8">
              {PREP_STEPS.map((label, idx) => {
                const isComplete = progressIndex > idx;
                const isActive = progressIndex === idx;
                return (
                <div 
                  key={label}
                  className={`
                    flex items-center gap-3 p-3 rounded-xl
                    transition-all duration-300
                    ${isComplete
                      ? 'bg-green-50/60 border border-green-200/60'
                      : isActive
                      ? 'bg-blue-50/50 border border-blue-200/50'
                      : 'bg-gray-50/40 border border-gray-200/40'
                    }
                  `}
                >
                  <div className="flex-shrink-0">
                    {isComplete ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 transition-transform duration-300" />
                    ) : isActive ? (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-300/70" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`
                      ${isComplete
                        ? 'text-green-700'
                        : isActive
                        ? 'text-blue-700'
                        : 'text-gray-500'
                      }
                    `}>
                      {label}
                    </span>
                    {label === AUDIO_STEP && (
                      <Badge
                        variant="outline"
                        className="border-amber-200/60 text-amber-700 bg-amber-50/60"
                      >
                        In progress
                      </Badge>
                    )}
                  </div>
                </div>
              )})}
            </div>
          ) : (
            <div className="mb-8">
              <div className="
                backdrop-blur-xl bg-gradient-to-br from-green-50/50 to-white/50
                border border-green-200/50 rounded-2xl p-5
                shadow-[0_4px_12px_rgba(0,0,0,0.04)]
              ">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm text-green-900">System Check Complete</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/60 border border-green-200/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <MessageSquare className="w-4 h-4" />
                      <span>Chat Ready</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border border-green-200/80">
                      Ready
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/60 border border-amber-200/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-amber-700">
                      <Mic className="w-4 h-4" />
                      <span>Voice Ready</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-amber-300/70 text-amber-700 bg-amber-50/70"
                    >
                      Coming soon
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-white/60 border border-green-200/60 px-3 py-2">
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <Video className="w-4 h-4" />
                      <span>Session Active</span>
                    </div>
                    <Badge className="bg-green-100 text-green-700 border border-green-200/80">
                      Active
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isReady && (
            <div className="
              backdrop-blur-xl bg-gradient-to-br from-amber-50/50 to-white/50
              border border-amber-200/50 rounded-2xl p-5 mb-8
              shadow-[0_4px_12px_rgba(0,0,0,0.04)]
            ">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm text-amber-900 mb-2">Quick Tips</h3>
                  <ul className="space-y-1 text-xs text-amber-800">
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Ensure you're in a quiet environment</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Speak clearly when using voice input</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-amber-400 mt-0.5">•</span>
                      <span>Take your time to think before answering</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {isReady && (
            <div className="text-center">
              <Button
                onClick={onStart}
                size="lg"
                className="
                  bg-gradient-to-br from-blue-600 to-blue-700
                  hover:from-blue-700 hover:to-blue-800
                  text-white px-8 py-6
                  shadow-[0_8px_24px_rgba(37,99,235,0.3)]
                  hover:shadow-[0_12px_32px_rgba(37,99,235,0.4)]
                  transition-all duration-300
                  border-0
                  group
                "
              >
                <PlayCircle className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Start Interview
              </Button>
              <p className="text-xs text-gray-500 mt-4">
                By starting, you agree to the interview terms and conditions
              </p>
            </div>
          )}

          {!isReady && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-gray-600">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Setting up your interview session...</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Need help? Contact support at support@example.com
          </p>
        </div>
      </div>
    </div>
  );
}
