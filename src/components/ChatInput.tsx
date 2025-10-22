import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Send, Mic, MicOff } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onListeningChange?: (isListening: boolean) => void;
}

export function ChatInput({ onSendMessage, onListeningChange }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      setIsSupported(false);
      return;
    }

    setIsSupported(true);

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      setMessage(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      onListeningChange?.(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current || !isSupported) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      onListeningChange?.(false);
    } else {
      setMessage('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
        onListeningChange?.(true);
      } catch (e) {
        console.error('Failed to start speech recognition:', e);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={isListening ? "Listening..." : "Type a message..."}
          className="
            w-full px-6 py-4 pr-24 rounded-3xl
            backdrop-blur-xl bg-white/60 border border-gray-200/40
            placeholder-gray-400 text-gray-900
            focus:outline-none focus:ring-2 focus:ring-gray-300/50
            focus:border-gray-300/60 focus:bg-white/80
            transition-all duration-200
            shadow-[0_4px_16px_rgba(0,0,0,0.08),0_1px_4px_rgba(0,0,0,0.06),inset_0_-1px_2px_rgba(0,0,0,0.05)]
          "
          disabled={isListening}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <motion.button
            type="button"
            onClick={toggleListening}
            disabled={!isSupported}
            whileHover={{ scale: isSupported ? 1.05 : 1 }}
            whileTap={{ scale: isSupported ? 0.95 : 1 }}
            title={isSupported ? (isListening ? 'Stop listening' : 'Start voice input') : 'Voice input not supported in this browser'}
            className={`
              w-8 h-8 rounded-full
              backdrop-blur-xl border border-white/20
              flex items-center justify-center
              transition-all duration-200
              ${!isSupported 
                ? 'bg-gray-400/50 cursor-not-allowed opacity-50 shadow-[0_2px_8px_rgba(0,0,0,0.1)]' 
                : isListening 
                  ? 'bg-red-500/80 hover:bg-red-500 shadow-[0_4px_16px_rgba(239,68,68,0.4),0_2px_8px_rgba(239,68,68,0.3),inset_0_1px_0_rgba(255,255,255,0.3)] animate-pulse' 
                  : 'bg-purple-500/80 hover:bg-purple-500 shadow-[0_4px_16px_rgba(168,85,247,0.4),0_2px_8px_rgba(168,85,247,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]'
              }
            `}
          >
            {isListening ? (
              <MicOff className="w-4 h-4 text-white" />
            ) : (
              <Mic className="w-4 h-4 text-white" />
            )}
          </motion.button>
          <motion.button
            type="submit"
            disabled={!message.trim()}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="
              w-8 h-8 rounded-full
              bg-blue-500/80 hover:bg-blue-500
              disabled:bg-gray-400/50 disabled:cursor-not-allowed
              backdrop-blur-xl border border-white/20
              flex items-center justify-center
              transition-all duration-200
              shadow-[0_4px_16px_rgba(59,130,246,0.4),0_2px_8px_rgba(59,130,246,0.3),inset_0_1px_0_rgba(255,255,255,0.3)]
              disabled:shadow-[0_2px_8px_rgba(0,0,0,0.1)]
            "
          >
            <Send className="w-4 h-4 text-white" />
          </motion.button>
        </div>
      </div>
    </form>
  );
}
