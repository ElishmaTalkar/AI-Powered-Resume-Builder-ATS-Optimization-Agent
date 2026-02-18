import React, { useState } from 'react';

import UploadForm from './components/UploadForm';
import JobAnalysis from './components/JobAnalysis';
import Dashboard from './components/Dashboard';
import LiveEditor from './components/LiveEditor';

function App() {
  const [step, setStep] = useState(1);
  const [parsedData, setParsedData] = useState(null);
  const [finalData, setFinalData] = useState(null);

  const handleUploadSuccess = (data) => {
    setParsedData(data);
    setStep(2);
  };

  const handleAnalysisComplete = (data) => {
    setFinalData(data);
    setStep(3);
  };

  const handleBackToUpload = () => {
    setParsedData(null);
    setStep(1);
  };

  const handleBackToAnalysis = () => {
    setFinalData(null);
    setStep(2);
  };

  return (
    <div>
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>AI Resume Builder</h1>
        <p style={{ color: '#94a3b8' }}>Optimize your resume for ATS with AI power</p>
      </div>

      <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '0 1rem' }}>
        {/* Navigation for testing Live Editor */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button onClick={() => setStep(1)} style={{ marginRight: '1rem', padding: '0.5rem', background: step === 1 ? '#cbd5e1' : 'transparent', border: 'none', cursor: 'pointer' }}>Home</button>
          <button onClick={() => setStep(4)} style={{ padding: '0.5rem', background: step === 4 ? '#cbd5e1' : 'transparent', border: 'none', cursor: 'pointer' }}>Live Editor</button>
        </div>

        {step === 1 && (
          <UploadForm onUploadSuccess={handleUploadSuccess} />
        )}

        {step === 2 && parsedData && (
          <JobAnalysis
            parsedData={parsedData}
            onAnalysisComplete={handleAnalysisComplete}
            onBack={handleBackToUpload}
          />
        )}

        {step === 3 && finalData && (
          <Dashboard
            data={finalData}
            onBack={handleBackToAnalysis}
          />
        )}

        {step === 4 && (
          <LiveEditor />
        )}
      </div>
    </div>
  );
}

export default App;
