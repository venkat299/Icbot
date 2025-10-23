import { motion } from 'motion/react';
import { InteractiveQuestion, Question } from './InteractiveQuestion';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
  isLatestAI?: boolean;
  question?: Question;
  onQuestionSubmit?: (answer: any) => void;
  questionSubmitted?: boolean;
  isLast?: boolean;
}

export function ChatMessage({ 
  message, 
  isUser, 
  timestamp, 
  isLatestAI = false,
  question,
  onQuestionSubmit,
  questionSubmitted = false,
  isLast = false
}: ChatMessageProps) {
  // Make previous messages smaller and less prominent
  const isPreviousMessage = !isLatestAI && !isUser;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`relative pl-20 ${
        isLatestAI ? 'mb-16' : 'mb-8'
      }`}
    >
      {/* Timeline marker */}
      <div className="absolute left-8 top-0 -translate-x-1/2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className={`
            ${isLatestAI 
              ? 'w-5 h-5 bg-gradient-to-br from-gray-700 to-gray-800 ring-4 ring-gray-200/50' 
              : isUser
              ? 'w-3 h-3 bg-gradient-to-br from-gray-400 to-gray-500 ring-2 ring-gray-100/50'
              : 'w-3.5 h-3.5 bg-gradient-to-br from-gray-500 to-gray-600 ring-3 ring-gray-150/50'
            }
            rounded-full shadow-lg
          `}
        />
      </div>

      {/* Timestamp */}
      <div className={`mb-2 ${isLatestAI ? 'text-xs' : 'text-[10px]'} text-gray-400`}>
        {timestamp}
      </div>

      {/* Message content - Timeline style */}
      {isLatestAI && !isUser ? (
        // Current question - huge and prominent
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <h2 className="text-gray-900 leading-tight mb-3">
              {message}
            </h2>
          </motion.div>

          {/* Interactive Question Component */}
          {question && onQuestionSubmit && (
            <InteractiveQuestion
              question={question}
              onSubmit={onQuestionSubmit}
              isSubmitted={questionSubmitted}
            />
          )}
        </div>
      ) : (
        // Previous messages - minimal and compact
        <div className={`
          ${isUser 
            ? 'text-gray-600' 
            : 'text-gray-700'
          }
          ${isPreviousMessage ? 'text-xs opacity-60' : 'text-sm opacity-80'}
        `}>
          <p className="leading-relaxed">
            {message}
          </p>

          {/* Show interactive question for previous AI messages if present */}
          {!isUser && question && onQuestionSubmit && !isLatestAI && (
            <div className="mt-3 opacity-50 pointer-events-none">
              <InteractiveQuestion
                question={question}
                onSubmit={onQuestionSubmit}
                isSubmitted={questionSubmitted}
              />
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}