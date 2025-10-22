import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Code, CheckCircle2, Send } from 'lucide-react';
import { Badge } from './ui/badge';

export type QuestionType = 'code' | 'latex' | 'multiple-choice' | 'multiple-select' | 'yes-no';

interface BaseQuestion {
  id: string;
  type: QuestionType;
  prompt?: string;
}

interface CodeQuestion extends BaseQuestion {
  type: 'code';
  language?: string;
  initialCode?: string;
  debugMode?: boolean;
}

interface LatexQuestion extends BaseQuestion {
  type: 'latex';
  placeholder?: string;
}

interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: string[];
}

interface MultipleSelectQuestion extends BaseQuestion {
  type: 'multiple-select';
  options: string[];
}

interface YesNoQuestion extends BaseQuestion {
  type: 'yes-no';
}

export type Question = CodeQuestion | LatexQuestion | MultipleChoiceQuestion | MultipleSelectQuestion | YesNoQuestion;

interface InteractiveQuestionProps {
  question: Question;
  onSubmit: (answer: any) => void;
  isSubmitted?: boolean;
}

export function InteractiveQuestion({ question, onSubmit, isSubmitted = false }: InteractiveQuestionProps) {
  const [codeAnswer, setCodeAnswer] = useState((question as CodeQuestion).initialCode || '');
  const [latexAnswer, setLatexAnswer] = useState('');
  const [multipleChoiceAnswer, setMultipleChoiceAnswer] = useState('');
  const [multipleSelectAnswers, setMultipleSelectAnswers] = useState<string[]>([]);
  const [yesNoAnswer, setYesNoAnswer] = useState<'yes' | 'no' | null>(null);

  const handleSubmit = () => {
    switch (question.type) {
      case 'code':
        onSubmit({ type: 'code', code: codeAnswer, language: (question as CodeQuestion).language });
        break;
      case 'latex':
        onSubmit({ type: 'latex', formula: latexAnswer });
        break;
      case 'multiple-choice':
        onSubmit({ type: 'multiple-choice', answer: multipleChoiceAnswer });
        break;
      case 'multiple-select':
        onSubmit({ type: 'multiple-select', answers: multipleSelectAnswers });
        break;
      case 'yes-no':
        onSubmit({ type: 'yes-no', answer: yesNoAnswer });
        break;
    }
  };

  const isAnswered = () => {
    switch (question.type) {
      case 'code':
        return codeAnswer.trim().length > 0;
      case 'latex':
        return latexAnswer.trim().length > 0;
      case 'multiple-choice':
        return multipleChoiceAnswer.length > 0;
      case 'multiple-select':
        return multipleSelectAnswers.length > 0;
      case 'yes-no':
        return yesNoAnswer !== null;
      default:
        return false;
    }
  };

  const toggleMultipleSelect = (option: string) => {
    setMultipleSelectAnswers(prev =>
      prev.includes(option)
        ? prev.filter(a => a !== option)
        : [...prev, option]
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3"
    >
      <div className="
        backdrop-blur-xl bg-white/80 border border-gray-200/50
        rounded-2xl p-4 sm:p-5
        shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
        relative
        before:absolute before:inset-0 before:rounded-2xl
        before:bg-gradient-to-br before:from-white/40 before:to-transparent
        before:pointer-events-none
      ">
        <div className="relative z-10">
          {question.prompt && (
            <p className="text-sm text-gray-700 mb-4">{question.prompt}</p>
          )}

          {/* Code Editor */}
          {question.type === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="w-4 h-4 text-gray-500" />
                  <span className="text-xs text-gray-600">
                    {(question as CodeQuestion).debugMode ? 'Debug the code' : 'Write your code'}
                  </span>
                </div>
                {(question as CodeQuestion).language && (
                  <Badge variant="outline" className="text-xs">
                    {(question as CodeQuestion).language}
                  </Badge>
                )}
              </div>
              <Textarea
                value={codeAnswer}
                onChange={(e) => setCodeAnswer(e.target.value)}
                placeholder="// Type your code here..."
                disabled={isSubmitted}
                className="
                  min-h-[200px] font-mono text-sm
                  bg-gray-900/5 border-gray-200/50
                  focus:border-gray-300 focus:ring-gray-200/50
                  resize-none
                "
              />
            </div>
          )}

          {/* LaTeX Formula */}
          {question.type === 'latex' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">Enter your formula (LaTeX syntax)</span>
              </div>
              <Textarea
                value={latexAnswer}
                onChange={(e) => setLatexAnswer(e.target.value)}
                placeholder={(question as LatexQuestion).placeholder || '\\frac{a}{b} = c'}
                disabled={isSubmitted}
                className="
                  min-h-[120px] font-mono text-sm
                  bg-white/60 border-gray-200/50
                  focus:border-gray-300 focus:ring-gray-200/50
                  resize-none
                "
              />
              {latexAnswer && (
                <div className="bg-gray-50/80 rounded-xl p-4 border border-gray-200/50">
                  <p className="text-xs text-gray-500 mb-2">Preview:</p>
                  <div className="text-center text-gray-900 font-serif text-lg">
                    {latexAnswer}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Multiple Choice */}
          {question.type === 'multiple-choice' && (
            <RadioGroup
              value={multipleChoiceAnswer}
              onValueChange={setMultipleChoiceAnswer}
              disabled={isSubmitted}
              className="space-y-3"
            >
              {(question as MultipleChoiceQuestion).options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="
                    flex items-center gap-3 p-3 rounded-xl
                    bg-white/60 border border-gray-200/50
                    hover:bg-gray-50/80 hover:border-gray-300/50
                    transition-all cursor-pointer
                  "
                  onClick={() => !isSubmitted && setMultipleChoiceAnswer(option)}
                >
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label
                    htmlFor={`option-${index}`}
                    className="flex-1 cursor-pointer text-sm text-gray-700"
                  >
                    {option}
                  </Label>
                </motion.div>
              ))}
            </RadioGroup>
          )}

          {/* Multiple Select */}
          {question.type === 'multiple-select' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">Select all that apply</p>
              {(question as MultipleSelectQuestion).options.map((option, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="
                    flex items-center gap-3 p-3 rounded-xl
                    bg-white/60 border border-gray-200/50
                    hover:bg-gray-50/80 hover:border-gray-300/50
                    transition-all cursor-pointer
                  "
                  onClick={() => !isSubmitted && toggleMultipleSelect(option)}
                >
                  <Checkbox
                    checked={multipleSelectAnswers.includes(option)}
                    onCheckedChange={() => toggleMultipleSelect(option)}
                    id={`multi-option-${index}`}
                    disabled={isSubmitted}
                  />
                  <Label
                    htmlFor={`multi-option-${index}`}
                    className="flex-1 cursor-pointer text-sm text-gray-700"
                  >
                    {option}
                  </Label>
                </motion.div>
              ))}
            </div>
          )}

          {/* Yes/No */}
          {question.type === 'yes-no' && (
            <div className="flex gap-3">
              <Button
                onClick={() => !isSubmitted && setYesNoAnswer('yes')}
                disabled={isSubmitted}
                variant={yesNoAnswer === 'yes' ? 'default' : 'outline'}
                className={`
                  flex-1 h-auto py-4
                  ${yesNoAnswer === 'yes'
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-white/60 hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Yes</span>
                </div>
              </Button>
              <Button
                onClick={() => !isSubmitted && setYesNoAnswer('no')}
                disabled={isSubmitted}
                variant={yesNoAnswer === 'no' ? 'default' : 'outline'}
                className={`
                  flex-1 h-auto py-4
                  ${yesNoAnswer === 'no'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-white/60 hover:bg-gray-50 text-gray-700'
                  }
                `}
              >
                <div className="flex flex-col items-center gap-1">
                  <span className="text-xl">✕</span>
                  <span>No</span>
                </div>
              </Button>
            </div>
          )}

          {/* Submit Button */}
          {!isSubmitted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-4 flex justify-end"
            >
              <Button
                onClick={handleSubmit}
                disabled={!isAnswered()}
                className="
                  bg-gradient-to-br from-gray-800 to-gray-900
                  hover:from-gray-700 hover:to-gray-800
                  text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)]
                  disabled:opacity-50 disabled:cursor-not-allowed
                "
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Answer
              </Button>
            </motion.div>
          )}

          {isSubmitted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-green-50/80 border border-green-200/50 rounded-xl"
            >
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm">Answer submitted successfully</span>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
