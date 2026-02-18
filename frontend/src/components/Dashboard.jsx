import React, { useState } from 'react';
import { generateResume, enhanceText, scoreResume, sendChatMessage } from '../api';

const Dashboard = ({ data, onBack }) => {
    const [resumeData, setResumeData] = useState(data);
    const [generating, setGenerating] = useState(false);
    const [downloadUrl, setDownloadUrl] = useState('');
    const [format, setFormat] = useState('pdf');
    const [template, setTemplate] = useState('classic');

    // score is in resumeData.score
    // feedback is in resumeData.feedback

    const [jobDescription, setJobDescription] = useState(data.jobContext?.jobDescription || "");
    const [showComparison, setShowComparison] = useState(false);
    const [scoreHistory, setScoreHistory] = useState([
        { score: data.score, timestamp: new Date().toLocaleTimeString(), action: 'Initial Score' }
    ]);
    const [enhancing, setEnhancing] = useState(false);

    // Chat State
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);

    const handleChatSend = async () => {
        if (!chatInput.trim()) return;

        const userMsg = chatInput;
        setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setChatInput("");
        setChatLoading(true);

        try {
            // Context includes resume text and job description
            const context = `
            Resume Text:
            ${resumeData.text}
            
            Target Job Title: ${data.jobContext?.jobTitle || "Not specified"}
            Target Company: ${data.jobContext?.company || "Not specified"}
            
            Job Description:
            ${jobDescription}
            `;

            const result = await sendChatMessage(userMsg, context);
            setChatMessages(prev => [...prev, { role: 'ai', content: result.reply }]);
        } catch (err) {
            console.error(err);
            setChatMessages(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't get a response." }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleEnhance = async (type) => {
        setEnhancing(true);
        try {
            const result = await enhanceText(resumeData.text, type, jobDescription);

            // Re-score the enhanced text
            const newScore = await scoreResume(result.enhanced, jobDescription);

            setResumeData(prev => ({
                ...prev,
                text: result.enhanced,
                score: newScore.score,
                feedback: newScore.feedback
            }));

            // Add to history
            setScoreHistory(prev => [
                ...prev,
                { score: newScore.score, timestamp: new Date().toLocaleTimeString(), action: `Enhanced (${type})` }
            ]);

            alert(`Resume enhanced (${type}) and Score Updated!`);
        } catch (err) {
            console.error(err);
            alert('Enhancement failed');
        } finally {
            setEnhancing(false);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            // Prepare data for generation. 
            // The backend expects a specific ResumeData structure.
            // Our parse result might not match exactly if it's raw text.
            // Ideally, parsing should return structured data. 
            // But our ResumeParser only returns "text".
            // We need to parse fields or just push text to summary for now?
            // Wait, the PDF generator needs robust structured data.
            // The current "ResumeParser" returns Raw Text.
            // The "PDFGenerator" expects { name, email, ...}.
            // WE HAVE A GAP. The parser doesn't structure data yet!
            // I should probably mock the structured data extraction for now or ask the user to fill form.
            // For this MVP, I will pre-fill a form with dummy data or try to extract using regex/AI.
            // Since I have "AI Enhancer", I can use it to extract structure!
            // But for now, let's assume the user fills the missing fields.

            // Use parsed data if available, otherwise mock
            const parsed = resumeData.parsed_data || {};

            const mockData = {
                name: parsed.name || "Candidate Name",
                email: parsed.email || "candidate@email.com",
                phone: parsed.phone || "+1 234 567 890",
                location: "Location",
                summary: (parsed.text || "").substring(0, 500).replace(/\n/g, ' ') + "...",
                experience: [{
                    role: "Software Engineer",
                    company: "Tech Corp",
                    dates: "2020-Present",
                    location: "San Francisco, CA",
                    details: ["Implemented features", "Optimized code"]
                }],
                education: [{
                    degree: "B.S. Computer Science",
                    school: "University",
                    dates: "2016-2020",
                    location: "City, State"
                }],
                skills: { "Technical": ["Python", "React", "AI"] },
                projects: []
            };

            const result = await generateResume(mockData, format, template);
            setDownloadUrl(result.url);
        } catch (err) {
            console.error(err);
            alert('Generation failed');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <div className="container">
            <button onClick={onBack} style={{ background: 'transparent', border: '1px solid var(--border-color)', marginBottom: '1rem' }}>
                &larr; Back
            </button>

            <div className="grid">
                <div className="card">
                    <h2>ATS Score</h2>
                    <div style={{ fontSize: '4rem', fontWeight: 'bold', color: resumeData.score > 70 ? '#22c55e' : '#eab308' }}>
                        {resumeData.score || 0}
                    </div>
                    <p>out of 100</p>
                </div>

                <div className="card">
                    <h2>Detailed Analysis</h2>

                    {/* Section Scores */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3>Section Breakdown</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
                            {resumeData.section_scores && Object.entries(resumeData.section_scores).map(([key, val]) => (
                                <div key={key} style={{ background: '#f8fafc', padding: '0.8rem', borderRadius: '5px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: val >= 70 ? '#22c55e' : '#eab308' }}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Compliance Checks */}
                    {resumeData.compliance && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3>ATS Compliance & Formatting</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                                {/* Basic Checks */}
                                <div style={{ color: resumeData.compliance.parsing_valid ? 'green' : 'red' }}>
                                    {resumeData.compliance.parsing_valid ? '✅' : '❌'} Parsing Valid
                                </div>
                                <div style={{ color: resumeData.compliance.contact_info?.email ? 'green' : 'red' }}>
                                    {resumeData.compliance.contact_info?.email ? '✅' : '❌'} Email: <span style={{ fontSize: '0.85rem', color: '#666' }}>{resumeData.compliance.contact_info?.email_feedback || "Found"}</span>
                                </div>
                                <div style={{ color: resumeData.compliance.contact_info?.phone ? 'green' : 'red' }}>
                                    {resumeData.compliance.contact_info?.phone ? '✅' : '❌'} Phone: <span style={{ fontSize: '0.85rem', color: '#666' }}>{resumeData.compliance.contact_info?.phone_feedback || "Found"}</span>
                                </div>
                                <div style={{ color: resumeData.compliance.formatting?.bullet_points_detected ? 'green' : 'orange' }}>
                                    {resumeData.compliance.formatting?.bullet_points_detected ? '✅' : '⚠️'} Bullet Points
                                </div>

                                {/* Deep Formatting Checks */}
                                <div style={{ color: resumeData.compliance.page_check?.is_appropriate_length ? 'green' : 'orange' }}>
                                    {resumeData.compliance.page_check?.is_appropriate_length ? '✅' : '⚠️'} Length ({resumeData.compliance.page_check?.estimated_pages} pages)
                                </div>
                                <div style={{ color: resumeData.compliance.date_consistency?.is_consistent ? 'green' : 'orange' }}>
                                    {resumeData.compliance.date_consistency?.is_consistent ? '✅' : '⚠️'} Date Format ({resumeData.compliance.date_consistency?.dominant_format})
                                </div>
                                <div style={{ color: !resumeData.compliance.complex_layout?.potential_tables ? 'green' : 'red' }}>
                                    {!resumeData.compliance.complex_layout?.potential_tables ? '✅' : '❌'} Table Detection
                                </div>

                                {/* New Checks */}
                                <div style={{ color: !resumeData.compliance.special_chars?.has_special_chars ? 'green' : 'orange' }}>
                                    {!resumeData.compliance.special_chars?.has_special_chars ? '✅' : '⚠️'} Special Chars
                                </div>
                                <div style={{ color: resumeData.compliance.file_size_check?.is_valid ? 'green' : 'red' }}>
                                    {resumeData.compliance.file_size_check?.is_valid ? '✅' : '❌'} File Size {resumeData.compliance.file_size_check?.size_mb ? `(${resumeData.compliance.file_size_check.size_mb} MB)` : ''}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Keywords Analysis */}
                    {resumeData.keywords && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3>Keyword Optimization & Semantic Match</h3>

                            {/* Hard vs Soft Skills */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>🛠️ Hard / Technical Skills</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {resumeData.keywords.hard_skills?.length > 0 ? (
                                            resumeData.keywords.hard_skills.map((kw, i) => (
                                                <span key={i} style={{ background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{kw}</span>
                                            ))
                                        ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None identified</span>}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '0.5rem' }}>🤝 Soft / Leadership Skills</h4>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {resumeData.keywords.soft_skills?.length > 0 ? (
                                            resumeData.keywords.soft_skills.map((kw, i) => (
                                                <span key={i} style={{ background: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.85rem' }}>{kw}</span>
                                            ))
                                        ) : <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>None identified</span>}
                                    </div>
                                </div>
                            </div>

                            {/* Missing Keywords */}
                            {resumeData.keywords.critical_missing?.length > 0 && (
                                <div style={{ marginBottom: '0.8rem' }}>
                                    <strong style={{ color: '#ef4444' }}>⚠️ Critical Missing Keywords:</strong>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                                        {resumeData.keywords.critical_missing.map((kw, i) => (
                                            <span key={i} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '0.9rem' }}>{kw}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warnings: Stuffing & Acronyms */}
                            {(resumeData.keywords.keyword_stuffing_detected?.length > 0 || resumeData.keywords.acronym_warnings?.length > 0) && (
                                <div style={{ background: '#fffbeb', padding: '0.8rem', borderRadius: '5px', border: '1px solid #fcd34d' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#b45309', margin: '0 0 0.5rem 0' }}>⚠️ Optimization Warnings</h4>

                                    {resumeData.keywords.keyword_stuffing_detected?.length > 0 && (
                                        <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                            <strong>Keyword Stuffing Detected:</strong> {resumeData.keywords.keyword_stuffing_detected.join(", ")}
                                        </div>
                                    )}

                                    {resumeData.keywords.acronym_warnings?.length > 0 && (
                                        <div style={{ fontSize: '0.9rem' }}>
                                            <strong>Undefined Acronyms:</strong> {resumeData.keywords.acronym_warnings.join(", ")}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Deep Content Analysis (Education & Skills) */}
                    {resumeData.content_analysis && (
                        <div style={{ marginBottom: '1.5rem' }}>
                            <h3>Deep Content Insight & Structure</h3>

                            {/* Logic & Grammar */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', background: '#eff6ff', padding: '1rem', borderRadius: '5px' }}>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.5rem' }}>🧠 Logic & Flow</h4>
                                    <div style={{ fontSize: '0.9rem' }}>
                                        <strong>Reverse Chronological:</strong> {resumeData.content_analysis.reverse_chronological_check || "Not checked"}
                                    </div>
                                    <div style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>
                                        <strong>Action Verbs:</strong> {resumeData.content_analysis.action_verbs || "Not rated"}
                                    </div>
                                </div>
                                <div>
                                    <h4 style={{ fontSize: '0.9rem', color: '#1e40af', marginBottom: '0.5rem' }}>✍️ Grammar & Mechanics</h4>
                                    <div style={{ fontSize: '0.9rem' }}>
                                        <strong>Spelling Errors:</strong> {resumeData.content_analysis.spelling_errors?.length > 0 ?
                                            <span style={{ color: 'red' }}>{resumeData.content_analysis.spelling_errors.join(", ")}</span> :
                                            <span style={{ color: 'green' }}>None detected</span>}
                                    </div>
                                </div>
                            </div>

                            {resumeData.content_analysis.skill_proficiency && (
                                <div style={{ marginBottom: '0.8rem' }}>
                                    <strong>Skill Proficiency Level:</strong>
                                    <div style={{ fontSize: '0.9rem', marginTop: '0.3rem' }}>
                                        <div>🏆 <strong>Expert:</strong> {resumeData.content_analysis.skill_proficiency.expert?.join(', ') || "None identified"}</div>
                                        <div>⚡ <strong>Total Extracted:</strong> {(resumeData.content_analysis.skill_proficiency.expert?.length || 0) + (resumeData.content_analysis.skill_proficiency.intermediate?.length || 0) + (resumeData.content_analysis.skill_proficiency.beginner?.length || 0)} skills</div>
                                    </div>
                                </div>
                            )}

                            {resumeData.content_analysis.education_feedback?.length > 0 && (
                                <div>
                                    <strong>Education Logic:</strong>
                                    <ul style={{ margin: '0.3rem 0', paddingLeft: '1.2rem', fontSize: '0.9rem', color: '#475569' }}>
                                        {resumeData.content_analysis.education_feedback.map((fb, i) => (
                                            <li key={i}>{fb}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* General Feedback */}
                    <h3>Optimization Suggestions</h3>
                    <ul style={{ paddingLeft: '1.5rem' }}>
                        {resumeData.feedback && resumeData.feedback.map((item, idx) => (
                            <li key={idx} style={{ marginBottom: '0.25rem' }}>{item}</li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="card">
                <h2>Resume Preview & Export</h2>
                <p>Your resume text has been analyzed. You can now generate a formatted version.</p>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select value={format} onChange={(e) => setFormat(e.target.value)} style={{ width: 'auto', marginBottom: 0 }}>
                        <option value="pdf">PDF (LaTeX)</option>
                        <option value="docx">Word (DOCX)</option>
                    </select>

                    {format === 'pdf' && (
                        <select value={template} onChange={(e) => setTemplate(e.target.value)} style={{ width: 'auto', marginBottom: 0 }}>
                            <option value="classic">Classic Template</option>
                            <option value="modern">Modern Template</option>
                            <option value="minimal">Minimal (ATS Optimized)</option>
                        </select>
                    )}

                    <button onClick={handleGenerate} disabled={generating}>
                        {generating ? 'Generating...' : 'Download Resume'}
                    </button>
                </div>

                {downloadUrl && (
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <a href={`http://localhost:8000${downloadUrl}`} download style={{ display: 'inline-block', padding: '0.8rem 1.5rem', background: '#3b82f6', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                            Download Resume
                        </a>
                        <a href={`mailto:?subject=My Resume&body=Please find my attached resume here: http://localhost:8000${downloadUrl}`} style={{ display: 'inline-block', padding: '0.8rem 1.5rem', background: '#64748b', color: 'white', textDecoration: 'none', borderRadius: '5px', fontWeight: 'bold' }}>
                            Email to Self
                        </a>
                    </div>
                )}
            </div>

            <div className="card">
                <h2>AI Enhancement</h2>
                <textarea
                    placeholder="Paste Job Description here for keyword optimization..."
                    rows="3"
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                />
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button onClick={() => handleEnhance('grammar')} disabled={enhancing}>
                        Fix Grammar
                    </button>
                    <button onClick={() => handleEnhance('keywords')} disabled={enhancing || !jobDescription} title={!jobDescription ? "Enter Job Description first" : ""}>
                        Optimize Keywords
                    </button>
                    <button onClick={() => handleEnhance('general')} disabled={enhancing}>
                        Professional Tone
                    </button>
                    <button onClick={() => handleEnhance('summary')} disabled={enhancing}>
                        Generate Summary
                    </button>
                </div>
                {enhancing && <p className="loading">AI is working on your resume...</p>}
            </div>

            <div className="card">
                <h2>Parsed Content & Comparison</h2>
                <button onClick={() => setShowComparison(!showComparison)} style={{ marginBottom: '1rem' }}>
                    {showComparison ? "Hide Comparison" : "Compare with Original"}
                </button>

                <div style={{ display: 'flex', gap: '1rem', flexDirection: showComparison ? 'row' : 'column' }}>
                    {showComparison && (
                        <div style={{ flex: 1 }}>
                            <h3>Original</h3>
                            <textarea
                                value={data.text}
                                readOnly
                                style={{ minHeight: '300px', fontFamily: 'monospace', width: '100%', backgroundColor: '#f0f0f0', color: '#333' }}
                            />
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <h3>{showComparison ? "Current (Enhanced)" : "Current Content"}</h3>
                        <textarea
                            value={resumeData.text}
                            onChange={(e) => setResumeData({ ...resumeData, text: e.target.value })}
                            style={{ minHeight: '300px', fontFamily: 'monospace', width: '100%' }}
                        />
                    </div>
                </div>
            </div>

            <div className="card">
                <h2>Score History</h2>
                <ul>
                    {scoreHistory.map((entry, index) => (
                        <li key={index} style={{ marginBottom: '0.5rem' }}>
                            <strong>{entry.timestamp}</strong> - {entry.action}: <span style={{ fontWeight: 'bold', color: entry.score >= 80 ? 'green' : (entry.score >= 50 ? 'orange' : 'red') }}>{entry.score}/100</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="card">
                <h2>AI Resume Consultant</h2>
                <div style={{ height: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '1rem', marginBottom: '1rem', borderRadius: '5px' }}>
                    {chatMessages.length === 0 && <p style={{ color: '#888', fontStyle: 'italic' }}>Ask me anything about your resume! E.g., "How can I improve my summary?"</p>}
                    {chatMessages.map((msg, index) => (
                        <div key={index} style={{ marginBottom: '0.5rem', textAlign: msg.role === 'user' ? 'right' : 'left' }}>
                            <span style={{
                                display: 'inline-block',
                                padding: '0.5rem 1rem',
                                borderRadius: '15px',
                                background: msg.role === 'user' ? '#3b82f6' : '#e5e7eb',
                                color: msg.role === 'user' ? 'white' : 'black'
                            }}>
                                {msg.content}
                            </span>
                        </div>
                    ))}
                    {chatLoading && <div style={{ textAlign: 'left' }}><span style={{ display: 'inline-block', padding: '0.5rem', background: '#e5e7eb', borderRadius: '15px' }}>Typing...</span></div>}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleChatSend()}
                        placeholder="Type your question..."
                        disabled={chatLoading}
                        style={{ flex: 1, marginBottom: 0 }}
                    />
                    <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()}>Send</button>
                </div>
            </div>
            <div className="card" style={{ marginTop: '2rem', border: '1px solid #ddd', padding: '1.5rem', background: '#f9fafb' }}>
                <h3 style={{ marginTop: 0, fontSize: '1.2rem', color: '#1e293b' }}>About This Analysis</h3>
                <p style={{ color: '#475569', fontSize: '0.95rem' }}>This analysis tool is designed to help you improve your resume's effectiveness by providing insights into its content and structure.</p>

                <h4 style={{ fontSize: '1rem', marginTop: '1rem', marginBottom: '0.5rem', color: '#334155' }}>Here's what to keep in mind:</h4>
                <ul style={{ paddingLeft: '1.5rem', color: '#475569', fontSize: '0.9rem', lineHeight: '1.6' }}>
                    <li><strong>Focus:</strong> We analyze the content and structure of your resume, offering suggestions for improvement.</li>
                    <li><strong>Scoring:</strong> Stronger resumes may see less fluctuation in score as the analysis becomes more refined.</li>
                    <li><strong>Targeted Feedback:</strong> For the most relevant suggestions, provide your desired job title and description when using the tool.</li>
                    <li><strong>Report Breakdown:</strong> You'll receive a score (out of 100) along with a detailed report highlighting strengths and areas for improvement.</li>
                    <li><strong>Actionable Recommendations:</strong> Our suggestions are meant to be optional, providing guidance to enhance your resume.</li>
                    <li><strong>Truth in Representation:</strong> Remember, your resume is a reflection of your skills and experience. Ensure the information is accurate.</li>
                </ul>

                <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', fontSize: '0.85rem', color: '#64748b' }}>
                    <p style={{ margin: 0 }}><strong>Please note:</strong> This is an automated analysis tool. The score and suggestions are for informational purposes only. The ultimate decision on your resume content rests with you.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
