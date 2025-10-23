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
  const [selectedJobId, setSelectedJobId] = useState('');
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [isGeneratingCompetency, setIsGeneratingCompetency] = useState(false);
  const [competencyGenerated, setCompetencyGenerated] = useState(false);
  const [isGeneratingRubric, setIsGeneratingRubric] = useState(false);
  const [rubricGenerated, setRubricGenerated] = useState(false);
  const [isRubricDialogOpen, setIsRubricDialogOpen] = useState(false);

  // Predefined job descriptions
  const jobDescriptions = [
    {
      id: 'swe',
      title: 'Senior Software Engineer',
      description: `Senior Software Engineer - Full Stack

We are seeking an experienced Senior Software Engineer to join our dynamic team. The ideal candidate will have:

Requirements:
• 5+ years of experience in software development
• Strong proficiency in JavaScript/TypeScript, React, Node.js
• Experience with cloud platforms (AWS, Azure, or GCP)
• Solid understanding of microservices architecture
• Experience with CI/CD pipelines and DevOps practices
• Strong problem-solving and analytical skills
• Excellent communication and teamwork abilities

Responsibilities:
• Design and implement scalable web applications
• Lead technical discussions and code reviews
• Mentor junior developers
• Collaborate with product and design teams
• Contribute to architectural decisions`
    },
    {
      id: 'pm',
      title: 'Product Manager',
      description: `Product Manager - SaaS Platform

Join our product team to drive strategy and execution for our enterprise SaaS platform.

Requirements:
• 3+ years of product management experience
• Strong analytical and data-driven decision making
• Experience with B2B SaaS products
• Excellent stakeholder management skills
• Understanding of Agile methodologies
• Technical background or strong technical acumen

Responsibilities:
• Define product roadmap and strategy
• Gather and prioritize product requirements
• Work closely with engineering, design, and sales teams
• Analyze metrics and user feedback
• Conduct market research and competitive analysis`
    },
    {
      id: 'ds',
      title: 'Data Scientist',
      description: `Data Scientist - Machine Learning

We're looking for a talented Data Scientist to help us leverage data for business insights.

Requirements:
• Master's or PhD in Computer Science, Statistics, or related field
• 3+ years of experience in data science or machine learning
• Strong programming skills in Python (NumPy, Pandas, Scikit-learn)
• Experience with deep learning frameworks (TensorFlow, PyTorch)
• Knowledge of statistical analysis and A/B testing
• Experience with SQL and big data technologies

Responsibilities:
• Build and deploy machine learning models
• Analyze large datasets to extract insights
• Collaborate with engineering to productionize models
• Present findings to stakeholders
• Stay current with ML/AI advancements`
    }
  ];

  // Predefined resumes
  const resumes = [
    {
      id: 'candidate1',
      name: 'Sarah Chen',
      resume: `SARAH CHEN
Senior Software Engineer
Email: sarah.chen@email.com | LinkedIn: linkedin.com/in/sarahchen

PROFESSIONAL SUMMARY
Results-driven Senior Software Engineer with 6+ years of experience building scalable web applications. Expertise in full-stack development, cloud architecture, and leading technical initiatives.

EXPERIENCE

Senior Software Engineer | TechCorp Inc. | 2021 - Present
• Led development of microservices architecture serving 2M+ users
• Reduced API response time by 40% through optimization and caching strategies
• Mentored 5 junior engineers and conducted technical interviews
• Technologies: React, Node.js, TypeScript, AWS, Docker, Kubernetes

Software Engineer | StartupXYZ | 2018 - 2021
• Built real-time collaboration features using WebSocket and Redis
• Implemented CI/CD pipeline reducing deployment time by 60%
• Developed RESTful APIs and integrated third-party services
• Technologies: Vue.js, Python, PostgreSQL, MongoDB

EDUCATION
B.S. Computer Science | Stanford University | 2018

SKILLS
Languages: JavaScript, TypeScript, Python, Java
Frontend: React, Vue.js, Next.js, Redux
Backend: Node.js, Express, Django, GraphQL
Cloud: AWS (EC2, S3, Lambda), Docker, Kubernetes
Databases: PostgreSQL, MongoDB, Redis`
    },
    {
      id: 'candidate2',
      name: 'Michael Rodriguez',
      resume: `MICHAEL RODRIGUEZ
Product Manager
Email: m.rodriguez@email.com | Phone: (555) 123-4567

SUMMARY
Strategic Product Manager with 5 years of experience driving product vision and execution for B2B SaaS platforms. Track record of launching successful features that increase user engagement and revenue.

PROFESSIONAL EXPERIENCE

Senior Product Manager | CloudSolutions Inc. | 2022 - Present
• Led product strategy for enterprise analytics dashboard (ARR: $15M)
• Increased user engagement by 35% through data-driven feature prioritization
• Managed cross-functional team of 12 engineers and designers
• Conducted 50+ customer interviews to validate product hypotheses

Product Manager | DataFlow Systems | 2019 - 2022
• Launched 3 major product features resulting in 25% revenue growth
• Defined product roadmap based on market research and user feedback
• Collaborated with sales team to develop go-to-market strategies
• Improved feature adoption rate from 40% to 75%

Associate Product Manager | TechStart | 2018 - 2019
• Assisted in product planning and requirements gathering
• Analyzed user metrics and created dashboards for stakeholders

EDUCATION
MBA | Harvard Business School | 2018
B.A. Economics | UC Berkeley | 2016

SKILLS
Product Strategy, Agile/Scrum, User Research, A/B Testing, SQL, Analytics (Mixpanel, Amplitude), Wireframing (Figma), Roadmapping (Aha!, ProductBoard)`
    },
    {
      id: 'candidate3',
      name: 'Dr. Aisha Patel',
      resume: `DR. AISHA PATEL
Data Scientist - Machine Learning Engineer
Email: aisha.patel@email.com | GitHub: github.com/aishapatel

EDUCATION
Ph.D. Computer Science (Machine Learning) | MIT | 2020
M.S. Statistics | University of Michigan | 2016
B.S. Mathematics & Computer Science | Cornell University | 2014

PROFESSIONAL EXPERIENCE

Senior Data Scientist | AI Innovations Lab | 2021 - Present
• Developed recommendation engine increasing user engagement by 45%
• Built NLP models for sentiment analysis with 92% accuracy
• Led team of 4 data scientists on computer vision project
• Published 3 papers in top-tier ML conferences (NeurIPS, ICML)
• Technologies: Python, TensorFlow, PyTorch, Kubernetes, MLflow

Data Scientist | FinTech Analytics | 2020 - 2021
• Created fraud detection model reducing false positives by 30%
• Implemented real-time scoring pipeline processing 100K+ transactions/day
• Conducted A/B tests and statistical analysis for product features
• Technologies: Python, Scikit-learn, Spark, SQL, Airflow

Research Assistant | MIT CSAIL | 2016 - 2020
• Researched deep learning architectures for computer vision
• Published dissertation on "Attention Mechanisms in Visual Recognition"
• Collaborated with industry partners on applied ML projects

TECHNICAL SKILLS
Languages: Python, R, SQL, Scala
ML/DL: TensorFlow, PyTorch, Scikit-learn, XGBoost, Keras
Big Data: Spark, Hadoop, Hive
Cloud: AWS (SageMaker, EC2), GCP
Tools: Docker, Kubernetes, Git, MLflow, Jupyter

PUBLICATIONS
• "Attention Mechanisms in Visual Recognition" - CVPR 2020
• "Efficient Training of Large-Scale Models" - NeurIPS 2019
• "Transfer Learning for Few-Shot Classification" - ICML 2019`
    }
  ];

  const handleJobSelect = (jobId: string) => {
    setSelectedJobId(jobId);
    const selectedJob = jobDescriptions.find(j => j.id === jobId);
    if (selectedJob) {
      setJobDescription(selectedJob.description);
    }
  };

  const handleResumeSelect = (resumeId: string) => {
    setSelectedResumeId(resumeId);
    const selectedResume = resumes.find(r => r.id === resumeId);
    if (selectedResume) {
      setResume(selectedResume.resume);
    }
  };

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
              
              {/* Job Description Selector */}
              <div className="mb-3">
                <Select value={selectedJobId} onValueChange={handleJobSelect}>
                  <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                    <SelectValue placeholder="Select a job description" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobDescriptions.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the job description here or select from dropdown above..."
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
              
              {/* Resume Selector */}
              <div className="mb-3">
                <Select value={selectedResumeId} onValueChange={handleResumeSelect}>
                  <SelectTrigger className="bg-white/60 border-gray-200/50 w-full">
                    <SelectValue placeholder="Select a candidate resume" />
                  </SelectTrigger>
                  <SelectContent>
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Textarea
                value={resume}
                onChange={(e) => setResume(e.target.value)}
                placeholder="Paste the candidate's resume here or select from dropdown above..."
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
