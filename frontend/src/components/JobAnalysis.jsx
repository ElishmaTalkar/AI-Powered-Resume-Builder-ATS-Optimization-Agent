import React, { useState } from 'react';
import { scoreResume } from '../api';

const JobAnalysis = ({ parsedData, onAnalysisComplete, onBack }) => {
    const [jobTitle, setJobTitle] = useState("");
    const [company, setCompany] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [analyzing, setAnalyzing] = useState(false);

    const handleContinue = async () => {
        setAnalyzing(true);
        try {
            // Calculate initial score with this context
            // parsedData contains { text: "...", parsed_data: {...} }
            // context includes job description

            const scoreResult = await scoreResume(parsedData.text, jobDescription, parsedData.metadata);

            // Combine everything into the final data object for Dashboard
            const finalData = {
                ...parsedData,
                score: scoreResult.score,
                feedback: scoreResult.feedback,
                jobContext: {
                    jobTitle,
                    company,
                    jobDescription
                }
            };

            onAnalysisComplete(finalData);
        } catch (err) {
            console.error("Analysis failed:", err);
            alert("Analysis failed. Please try again.");
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <h2>Target Job Details</h2>
            <p style={{ color: '#666', marginBottom: '2rem' }}>
                We'll analyze your resume against this specific job to give you a precise ATS score.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Desired Job (Optional)</label>
                <input
                    type="text"
                    placeholder="e.g. Senior Software Engineer"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
                />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Company Name (Optional)</label>
                <input
                    type="text"
                    placeholder="e.g. Google"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd' }}
                />
            </div>

            <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Target Job Description (Optional)</label>
                <textarea
                    placeholder="Paste the full job description here..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={6}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '5px', border: '1px solid #ddd', minHeight: '150px' }}
                />
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                <button
                    onClick={onBack}
                    style={{ background: 'transparent', color: '#666', border: '1px solid #ddd' }}
                >
                    Back
                </button>
                <button
                    onClick={handleContinue}
                    disabled={analyzing}
                    style={{ minWidth: '120px' }}
                >
                    {analyzing ? 'Analyzing...' : 'Continue'}
                </button>
            </div>
        </div>
    );
};

export default JobAnalysis;
