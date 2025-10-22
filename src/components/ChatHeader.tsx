import { motion } from 'motion/react';
import { Bot, Circle } from 'lucide-react';

interface ChatHeaderProps {
  status: 'listening' | 'thinking' | 'waiting for answer';
}

export function ChatHeader({ status }: ChatHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="
        relative p-6 rounded-3xl mb-6
        backdrop-blur-xl bg-white/60 border border-gray-200/40
        shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.6)]
        before:absolute before:inset-0 before:rounded-3xl
        before:bg-gradient-to-br before:from-white/30 before:to-transparent
        before:pointer-events-none
      "
    >
      <div className="relative z-10 flex items-center justify-between">
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
      </div>
    </motion.div>
  );
}