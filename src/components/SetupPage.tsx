import { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Loader2, CheckCircle2, Sparkles, FileText } from 'lucide-react';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';

interface Competency {
  id: string;
  name: string;
  interviewStyle: string;
}

interface SetupPageProps {
  onStartInterview: () => void;
}

export function SetupPage({ onStartInterview }: SetupPageProps) {
  const [jobDescription, setJobDescription] = useState('');
  const [resume, setResume] = useState('');
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [isGeneratingCompetency, setIsGeneratingCompetency] = useState(false);
  const [competencyGenerated, setCompetencyGenerated] = useState(false);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [rubricGenerated, setRubricGenerated] = useState(false);
  const [isRubricDialogOpen, setIsRubricDialogOpen] = useState(false);

  // Mock rubric data
  const rubricData = {
    candidateName: 'John Doe',
    position: 'Senior Software Engineer',
    evaluationCriteria: [
      {
        category: 'Technical Skills',
        criteria: [
          { name: 'Programming Languages', description: 'Proficiency in Java, Python, JavaScript', weight: 20 },
          { name: 'System Design', description: 'Ability to design scalable systems', weight: 25 },
          { name: 'Data Structures & Algorithms', description: 'Strong foundation in DSA', weight: 20 },
        ]
      },
      {
        category: 'Soft Skills',
        criteria: [
          { name: 'Communication', description: 'Clear and effective communication', weight: 15 },
          { name: 'Problem Solving', description: 'Analytical thinking and creativity', weight: 10 },
          { name: 'Teamwork', description: 'Collaboration and leadership', weight: 10 },
        ]
      }
    ]
  };

  const handleGenerateCompetency = () => {
    setIsGeneratingCompetency(true);
    // Simulate API call
    setTimeout(() => {
      setCompetencies([
        { id: '1', name: 'Technical Problem Solving', interviewStyle: '' },
        { id: '2', name: 'Communication Skills', interviewStyle: '' },
        { id: '3', name: 'Leadership & Team Management', interviewStyle: '' },
        { id: '4', name: 'Domain Expertise', interviewStyle: '' },
      ]);
      setIsGeneratingCompetency(false);
      setCompetencyGenerated(true);
    }, 2000);
  };

  const handleGenerateRubric = () => {
    setIsGeneratingRubric(true);
    // Simulate API call
    setTimeout(() => {
      setIsGeneratingRubric(false);
      setRubricGenerated(true);
    }, 2000);
  };

  const updateInterviewStyle = (competencyId: string, style: string) => {
    setCompetencies(competencies.map(c => 
      c.id === competencyId ? { ...c, interviewStyle: style } : c
    ));
  };

  const allCompetenciesHaveStyle = competencies.length > 0 && competencies.every(c => c.interviewStyle);
  const canStartInterview = competencyGenerated && rubricGenerated && allCompetenciesHaveStyle;

  return (
    <div className="h-screen w-screen overflow-auto bg-gradient-to-br from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-12"
        >
          <div className="flex items-center justify-center gap-3 mb-2">
            <Sparkles className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" />
            <h1 className="text-gray-900">AI Interview Setup</h1>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mb-4">Configure your interview parameters to get started</p>
          
          {/* Skip to Interview Button */}
          <Button
            onClick={onStartInterview}
            variant="outline"
            size="sm"
            className="
              bg-white/80 border-gray-300/50 text-gray-700
              hover:bg-gray-50 hover:border-gray-400/50
              shadow-[0_2px_8px_rgba(0,0,0,0.06)]
            "
          >
            Skip to Interview (Demo)
          </Button>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-6 lg:mb-8">
          {/* Left Column - Job Description */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col"
          >
            <div className="
              backdrop-blur-xl bg-white/80 border border-gray-200/50
              rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col
              shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
              relative
              before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
              before:bg-gradient-to-br before:from-white/40 before:to-transparent
              before:pointer-events-none
            ">
              <h2 className="text-gray-900 mb-3 sm:mb-4">Job Description</h2>
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here..."
                className="min-h-[200px] sm:min-h-[300px] resize-none bg-white/60 border-gray-200/50 focus:border-gray-300 focus:ring-gray-200/50 mb-4"
              />
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  onClick={handleGenerateCompetency}
                  disabled={!jobDescription || isGeneratingCompetency || competencyGenerated}
                  className="
                    w-full sm:w-auto
                    bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                    text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  {isGeneratingCompetency && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Generate Competency
                </Button>
                
                {isGeneratingCompetency && (
                  <div className="flex items-center justify-center gap-2 text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Generating...</span>
                  </div>
                )}
                
                {competencyGenerated && !isGeneratingCompetency && (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="text-sm">Completed</span>
                  </div>
                )}
              </div>
            </div>

            {/* Competencies List */}
            {competencies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 sm:mt-6 space-y-3"
              >
                <h3 className="text-gray-900">Competencies</h3>
                {competencies.map((competency, index) => (
                  <motion.div
                    key={competency.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="
                      backdrop-blur-xl bg-white/80 border border-gray-200/50
                      rounded-xl sm:rounded-2xl p-3 sm:p-4
                      flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4
                      shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                      relative
                      before:absolute before:inset-0 before:rounded-xl sm:before:rounded-2xl
                      before:bg-gradient-to-br before:from-white/40 before:to-transparent
                      before:pointer-events-none
                    "
                  >
                    <div className="relative z-10 flex-1">
                      <span className="text-sm sm:text-base text-gray-900">{competency.name}</span>
                    </div>
                    <div className="relative z-10 w-full sm:w-64">
                      <Select
                        value={competency.interviewStyle}
                        onValueChange={(value) => updateInterviewStyle(competency.id, value)}
                      >
                        <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                          <SelectValue placeholder="Select interview style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="situational">Situational</SelectItem>
                          <SelectItem value="case-study">Case Study</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Resume */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col"
          >
            <div className="
              backdrop-blur-xl bg-white/80 border border-gray-200/50
              rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col
              shadow-[0_8px_32px_rgba(0,0,0,0.08),0_2px_8px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
              relative
              before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
              before:bg-gradient-to-br before:from-white/40 before:to-transparent
              before:pointer-events-none
            ">
              <h2 className="text-gray-900 mb-3 sm:mb-4">Resume</h2>
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste the candidate's resume here..."
                className="min-h-[200px] sm:min-h-[300px] resize-none bg-white/60 border-gray-200/50 focus:border-gray-300 focus:ring-gray-200/50 mb-4"
              />
              
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Button
                    onClick={handleGenerateRubric}
                    disabled={!resume || isGeneratingRubric || rubricGenerated}
                    className="
                      w-full sm:w-auto
                      bg-gradient-to-br from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800
                      text-white shadow-[0_4px_16px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.2)]
                      disabled:opacity-50 disabled:cursor-not-allowed
                    "
                  >
                    {isGeneratingRubric && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Generate Rubric
                  </Button>
                  
                  {isGeneratingRubric && (
                    <div className="flex items-center justify-center gap-2 text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Generating...</span>
                    </div>
                  )}
                  
                  {rubricGenerated && !isGeneratingRubric && (
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">Completed</span>
                    </div>
                  )}
                </div>

                {rubricGenerated && !isGeneratingRubric && (
                  <Dialog open={isRubricDialogOpen} onOpenChange={setIsRubricDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="
                          w-full sm:w-auto
                          bg-white/80 border-gray-300/50 text-gray-700
                          hover:bg-gray-50 hover:border-gray-400/50
                          shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                        "
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        View Rubric
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Evaluation Rubric</DialogTitle>
                        <DialogDescription>
                          Detailed assessment criteria for {rubricData.candidateName} - {rubricData.position}
                        </DialogDescription>
                      </DialogHeader>
                      
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-6">
                          {rubricData.evaluationCriteria.map((category, catIndex) => (
                            <motion.div
                              key={catIndex}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: catIndex * 0.1 }}
                              className="
                                backdrop-blur-xl bg-gradient-to-br from-white to-gray-50/50
                                border border-gray-200/50 rounded-2xl p-5
                                shadow-[0_4px_16px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]
                              "
                            >
                              <h3 className="text-gray-900 mb-4 flex items-center gap-2">
                                {category.category}
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                                  {category.criteria.reduce((sum, c) => sum + c.weight, 0)}%
                                </Badge>
                              </h3>
                              
                              <div className="space-y-3">
                                {category.criteria.map((criterion, critIndex) => (
                                  <div
                                    key={critIndex}
                                    className="bg-white/60 border border-gray-200/50 rounded-xl p-4"
                                  >
                                    <div className="flex items-start justify-between gap-3 mb-2">
                                      <h4 className="text-sm text-gray-900">{criterion.name}</h4>
                                      <Badge 
                                        variant="secondary"
                                        className="bg-gray-100 text-gray-700 shrink-0"
                                      >
                                        {criterion.weight}%
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                      {criterion.description}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          ))}
                          
                          <div className="
                            bg-gradient-to-br from-blue-50 to-blue-100/50
                            border border-blue-200/50 rounded-2xl p-4
                          ">
                            <p className="text-xs text-blue-800">
                              <strong>Note:</strong> This rubric will be used to evaluate the candidate's performance
                              throughout the interview. Each criterion will be scored on a scale of 1-5.
                            </p>
                          </div>
                        </div>
                      </ScrollArea>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Start Interview Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-center pb-6"
        >
          <Button
            onClick={onStartInterview}
            disabled={!canStartInterview}
            size="lg"
            className="
              w-full sm:w-auto
              bg-gradient-to-br from-gray-900 to-black hover:from-gray-800 hover:to-gray-900
              text-white px-8 sm:px-12 py-4 sm:py-6
              shadow-[0_8px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-300
            "
          >
            Start Interview
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
