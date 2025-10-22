import { useState } from 'react';
import { Chatbot } from './components/Chatbot';
import { SetupPage } from './components/SetupPage';

export default function App() {
  const [showInterview, setShowInterview] = useState(false);
  
  // Set this to true for interviewer view, false for candidate view
  const isInterviewerView = true; // Toggle this based on user role

  if (showInterview) {
    return (
      <div className="h-screen w-screen overflow-hidden">
        <Chatbot isInterviewerView={isInterviewerView} />
      </div>
    );
  }

  return <SetupPage onStartInterview={() => setShowInterview(true)} />;
}