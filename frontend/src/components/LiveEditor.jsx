import React, { useState, useEffect } from 'react';
import { enhanceText } from '../api';


function LiveEditor() {
    const [text, setText] = useState('');
    const [suggestions, setSuggestions] = useState('');
    const [loading, setLoading] = useState(false);
    const [debouncedText, setDebouncedText] = useState(text);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedText(text);
        }, 1000); // 1 second debounce

        return () => clearTimeout(timer);
    }, [text]);

    useEffect(() => {
        if (debouncedText.length > 20) {
            getSuggestions(debouncedText);
        }
    }, [debouncedText]);

    const getSuggestions = async (inputText) => {
        setLoading(true);
        try {
            // Use 'general' enhancement for now, which improves phrasing
            const result = await enhanceText(inputText, "general");
            if (result && result.enhanced) {
                setSuggestions(result.enhanced);
            }
        } catch (error) {
            console.error("Error getting suggestions:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>AI Resume Builder</h1>
                <p style={{ color: '#94a3b8' }}>Live Editor Mode</p>
                <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back to Home</button>
            </div>
            <div style={{ maxWidth: '1000px', margin: '2rem auto', padding: '0 1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

                {/* Editor Column */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>Live Editor</h2>
                    <p style={{ color: '#64748b', marginBottom: '1rem' }}>Type your bullet points here. AI will suggest improvements in real-time.</p>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="e.g. Responsible for managing a team of 5 developers..."
                        style={{
                            width: '100%',
                            height: '400px',
                            padding: '1rem',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            fontSize: '1rem',
                            lineHeight: '1.6',
                            resize: 'none',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                    />
                </div>

                {/* Suggestions Column */}
                <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1e293b' }}>
                        AI Suggestions {loading && <span style={{ fontSize: '1rem', fontWeight: 'normal', color: '#64748b' }}>(Writing...)</span>}
                    </h2>

                    {!text ? (
                        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                            Start typing to see magic...
                        </div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.5rem', letterSpacing: '0.05em' }}>Improved Version</h3>
                                <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '8px', color: '#0369a1', borderLeft: '4px solid #0ea5e9', lineHeight: '1.6' }}>
                                    {suggestions || "Thinking..."}
                                </div>
                            </div>

                            <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
                                <strong>Tip:</strong> Focus on using Action Verbs and Numbers. <br />
                                <em>Example: "Managed team" &rarr; "Led a cross-functional team of 5..."</em>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LiveEditor;
