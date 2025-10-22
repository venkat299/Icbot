import { motion } from 'motion/react';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp: string;
  isLatestAI?: boolean;
}

export function ChatMessage({ message, isUser, timestamp, isLatestAI = false }: ChatMessageProps) {
  // Make previous messages smaller and less prominent
  const isPreviousMessage = !isLatestAI && !isUser;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} ${
        isLatestAI ? 'mb-6' : 'mb-3'
      }`}
    >
      <div className={`${isLatestAI ? 'max-w-[85%]' : 'max-w-[70%]'} flex flex-col`}>
        <div
          className={`
            relative rounded-3xl
            backdrop-blur-xl border
            ${isUser 
              ? 'bg-gray-100/80 text-gray-900 border-gray-200/40 px-5 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.7)]' 
              : isLatestAI
              ? 'bg-white/90 text-gray-900 border-gray-300/50 px-8 py-6 shadow-[0_8px_32px_rgba(0,0,0,0.12),0_3px_10px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.95)]'
              : 'bg-white/70 text-gray-700 border-gray-200/30 px-5 py-3 shadow-[0_3px_12px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]'
            }
            before:absolute before:inset-0 before:rounded-3xl
            before:bg-gradient-to-br before:from-white/30 before:to-transparent
            before:pointer-events-none
            ${isLatestAI ? 'ring-1 ring-gray-300/30' : ''}
          `}
        >
          <div className="relative z-10">
            <p className={`leading-relaxed ${
              isLatestAI ? 'text-lg' : isPreviousMessage ? 'text-xs' : 'text-sm'
            }`}>
              {message}
            </p>
          </div>
        </div>
        <span className={`text-gray-500 mt-1 ${
          isUser ? 'text-right' : 'text-left'
        } ${isLatestAI ? 'text-xs' : 'text-[10px]'}`}>
          {timestamp}
        </span>
      </div>
    </motion.div>
  );
}