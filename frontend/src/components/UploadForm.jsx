import React, { useState } from 'react';
import { uploadResume, enhanceText } from '../api';

const ManualEntryForm = ({ onSubmit, loading }) => {
    const [formData, setFormData] = useState({
        name: '', email: '', phone: '', countryCode: '+1', location: '', linkedin: '', github: '', portfolio: '',
        targetRole: '', jobDescription: '',
        summary: '',
        education: [], experience: [], projects: [],
        technicalSkills: '', toolsSkills: '', softSkills: ''
    });

    // Location State
    const [locationSuggestions, setLocationSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [mapUrl, setMapUrl] = useState('');
    const [enhancing, setEnhancing] = useState({});

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'location') {
            if (value.length > 2) {
                // Debounce simple implementation
                const timer = setTimeout(() => {
                    fetchLocation(value);
                }, 300);
                return () => clearTimeout(timer);
            } else {
                setLocationSuggestions([]);
                setShowSuggestions(false); // Hide suggestions if query is too short
            }
        }
    };

    const fetchLocation = async (query) => {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=5`);
            const data = await res.json();
            setLocationSuggestions(data);
            setShowSuggestions(true);
        } catch (err) {
            console.error("Location fetch failed", err);
        }
    };

    const selectLocation = (place) => {
        setFormData(prev => ({ ...prev, location: place.display_name }));
        setMapUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${place.boundingbox[2]},${place.boundingbox[0]},${place.boundingbox[3]},${place.boundingbox[1]}&layer=mapnik&marker=${place.lat},${place.lon}`);
        setShowSuggestions(false);
    };

    const addArrayItem = (field) => {
        const templates = {
            education: { school: '', degree: '', fieldOfStudy: '', major: '', dates: '', startDate: '', endDate: '', isCurrent: false, isExpected: false, location: '', score: '', showScore: false, coursework: '', honors: '', thesis: '' },
            experience: { company: '', role: '', dates: '', startDate: '', endDate: '', isCurrent: false, location: '', details: '' },
            projects: { name: '', description: '', link: '' }
        };
        setFormData(prev => ({ ...prev, [field]: [...prev[field], templates[field]] }));
    };

    const removeArrayItem = (field, index) => {
        setFormData(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== index) }));
    };

    const handleEnhance = async (field, index = null, subfield = null) => {
        const key = index !== null ? `${field}-${index}-${subfield}` : field;
        setEnhancing(prev => ({ ...prev, [key]: true }));
        try {
            let text = "";
            let type = "general";

            if (field === 'summary') {
                text = formData.summary;
                type = "summary";
            } else if (field === 'experience') {
                text = formData.experience[index][subfield];
                type = "bullet_points";
            } else if (field === 'projects') {
                text = formData.projects[index][subfield];
                type = "bullet_points";
            }

            if (!text || text.length < 10) {
                alert("Please enter some text (at least 10 chars) first to enhance.");
                setEnhancing(prev => ({ ...prev, [key]: false }));
                return;
            }

            const result = await enhanceText(text, type, formData.jobDescription);
            if (result && result.enhanced) {
                if (index !== null) {
                    handleArrayChange(field, index, subfield, result.enhanced);
                } else {
                    setFormData(prev => ({ ...prev, [field]: result.enhanced }));
                }
            }
        } catch (err) {
            console.error("Enhancement failed:", err);
            alert("Failed to enhance text. Please check the console or try again.");
        } finally {
            setEnhancing(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleArrayChange = (field, index, subField, value) => {
        const newArray = [...formData[field]];
        newArray[index] = { ...newArray[index], [subField]: value };
        setFormData(prev => ({ ...prev, [field]: newArray }));
    };

    const [errors, setErrors] = useState({});

    const validateForm = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Full Name is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        if (!formData.phone.replace(/\D/g, '').length >= 10) newErrors.phone = "Phone number must have at least 10 digits";
        if (!formData.location.trim()) newErrors.location = "Location is required";
        if (!formData.summary.trim()) newErrors.summary = "Professional Summary is required";

        if (!formData.technicalSkills.trim() && !formData.toolsSkills.trim() && !formData.softSkills.trim()) {
            newErrors.skills = "At least one skill category (Technical, Tools, or Soft) must be filled";
        }

        if (formData.education.length === 0) {
            newErrors.education = "At least one education entry is required";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return; // Errors state will update UI
        }

        // Convert to structure expected by parent
        const structuredData = {
            name: formData.name,
            email: formData.email,
            phone: `${formData.countryCode || "+1"} ${formData.phone}`,
            location: formData.location,
            linkedin: formData.linkedin,
            github: formData.github,
            portfolio: formData.portfolio,
            target_role: formData.targetRole,
            job_description: formData.jobDescription,
            summary: formData.summary,
            skills: {
                "Technical": formData.technicalSkills.split(',').map(s => s.trim()).filter(s => s),
                "Tools": formData.toolsSkills.split(',').map(s => s.trim()).filter(s => s),
                "Soft": formData.softSkills.split(',').map(s => s.trim()).filter(s => s)
            },
            education: formData.education,
            experience: formData.experience.map(e => ({ ...e, details: [e.details] })), // Backend expects array of strings for details
            projects: formData.projects
        };

        // Create simple text representation for scoring (basic concatenation)
        const educationText = formData.education.map(e => {
            const line1 = `${e.school}, ${e.location}`;
            let endDateStr = e.endDate;
            if (e.isCurrent) endDateStr = "Present";
            else if (e.isExpected) endDateStr = `Expected ${e.endDate}`;

            const dateStr = `${e.startDate} - ${endDateStr}`;

            // Format: Degree in FieldOfStudy | Major
            let educationTitle = e.degree;
            if (e.fieldOfStudy) educationTitle += ` in ${e.fieldOfStudy}`;
            if (e.major) educationTitle += ` | ${e.major}`;

            const line2 = `${educationTitle}    ${dateStr}`;
            const line3 = (e.score && e.showScore) ? `CGPA: ${e.score}` : '';
            const line4 = e.coursework ? `Relevant Coursework: ${e.coursework}` : '';
            const line5 = e.honors ? `Honors: ${e.honors}` : '';
            const line6 = e.thesis ? `Thesis: ${e.thesis}` : '';
            return [line1, line2, line3, line4, line5, line6].filter(l => l).join('\n');
        }).join('\n\n');

        const experienceText = formData.experience.map(e => {
            const dateStr = e.isCurrent
                ? `${e.startDate} - Present`
                : `${e.startDate} - ${e.endDate}`;
            return `${e.company} ${e.role}    ${dateStr}\n${e.details}`;
        }).join('\n\n');

        const textRep = `
        Target Role: ${formData.targetRole}
        ${formData.name}
        ${formData.email} | ${formData.countryCode || "+1"} ${formData.phone} | ${formData.location}
        Portfolio: ${formData.portfolio}
        ${formData.summary}
        Skills:
        Technical: ${formData.technicalSkills}
        Tools: ${formData.toolsSkills}
        Soft: ${formData.softSkills}

        Education: ${educationText}
        Experience: ${experienceText}
        
        Job Description Context: ${formData.jobDescription}
        `;

        onSubmit({ text: textRep, parsed_data: structuredData });
    };

    return (
        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
            <div className="grid">
                <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: '500' }}>Full Name <span style={{ color: 'red' }}>*</span></label>
                    <input
                        name="name"
                        placeholder="John Doe"
                        onChange={handleChange}
                        style={{ borderColor: errors.name ? 'red' : '#e2e8f0' }}
                    />
                    {errors.name && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.2rem' }}>{errors.name}</p>}
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: '500' }}>Email <span style={{ color: 'red' }}>*</span></label>
                    <input
                        name="email"
                        placeholder="john.doe@example.com"
                        onChange={handleChange}
                        style={{ borderColor: errors.email ? 'red' : '#e2e8f0' }}
                    />
                    {errors.email && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.2rem' }}>{errors.email}</p>}
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ display: 'block', marginBottom: '0.2rem', fontWeight: '500' }}>Phone Number <span style={{ color: 'red' }}>*</span></label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                            name="countryCode"
                            value={formData.countryCode || "+1"}
                            onChange={handleChange}
                            style={{ width: '80px', padding: '0.5rem' }}
                        >
                            <option value="+1">🇺🇸/🇨🇦 +1</option>
                            <option value="+91">🇮🇳 +91</option>
                            <option value="+44">🇬🇧 +44</option>
                            <option value="+61">🇦🇺 +61</option>
                            <option value="+49">🇩🇪 +49</option>
                            <option value="+33">🇫🇷 +33</option>
                            <option value="+81">🇯🇵 +81</option>
                            <option value="+86">🇨🇳 +86</option>
                            <option value="+971">🇦🇪 +971</option>
                            <option value="+65">🇸🇬 +65</option>
                            <option value="+39">🇮🇹 +39</option>
                            <option value="+34">🇪🇸 +34</option>
                            <option value="+31">🇳🇱 +31</option>
                            <option value="+55">🇧🇷 +55</option>
                            <option value="+7">🇷🇺 +7</option>
                            <option value="+82">🇰🇷 +82</option>
                            <option value="+27">🇿🇦 +27</option>
                            <option value="+64">🇳🇿 +64</option>
                            <option value="+52">🇲🇽 +52</option>
                            <option value="+62">🇮🇩 +62</option>
                            <option value="+90">🇹🇷 +90</option>
                            <option value="+234">🇳🇬 +234</option>
                            <option value="+54">🇦🇷 +54</option>
                            <option value="+20">🇪🇬 +20</option>
                            <option value="+63">🇵🇭 +63</option>
                            <option value="+351">🇵🇹 +351</option>
                            <option value="+48">🇵🇱 +48</option>
                            <option value="+46">🇸🇪 +46</option>
                            <option value="+47">🇳🇴 +47</option>
                            <option value="+358">🇫🇮 +358</option>
                            <option value="+45">🇩🇰 +45</option>
                            <option value="+43">🇦🇹 +43</option>
                            <option value="+32">🇧🇪 +32</option>
                            <option value="+41">🇨🇭 +41</option>
                        </select >
                        <input
                            name="phone"
                            placeholder="12345 67890"
                            value={formData.phone}
                            onChange={(e) => {
                                const val = e.target.value;
                                // Allow digits, spaces, hyphens
                                if (/^[\d\s-]*$/.test(val)) {
                                    handleChange(e);
                                }
                            }}
                            style={{ flex: 1, borderColor: errors.phone ? 'red' : '#e2e8f0' }}
                        />
                    </div>

                    {/* Location Search */}
                    < div style={{ position: 'relative' }}>
                        <input
                            name="location"
                            placeholder="Location (Type to search map...)"
                            value={formData.location}
                            onChange={handleChange}
                            autoComplete="off"
                        />
                        {
                            showSuggestions && locationSuggestions.length > 0 && (
                                <div style={{
                                    position: 'absolute', top: '100%', left: 0, right: 0,
                                    background: '#1e293b', border: '1px solid #475569',
                                    zIndex: 10, borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
                                }}>
                                    {locationSuggestions.map((place, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => selectLocation(place)}
                                            style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #334155', color: '#f8fafc' }}
                                            onMouseEnter={(e) => e.target.style.background = '#334155'}
                                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                                        >
                                            📍 {place.display_name}
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </div >


                    <div>
                        <input
                            name="linkedin"
                            placeholder="LinkedIn (https://linkedin.com/in/username)"
                            value={formData.linkedin}
                            onChange={handleChange}
                            style={{
                                borderColor: formData.linkedin && !formData.linkedin.includes('linkedin.com/in/') ? 'orange' : 'inherit'
                            }}
                        />
                        {formData.linkedin && !formData.linkedin.includes('linkedin.com/in/') && (
                            <p style={{ color: 'orange', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                ⚠️ Format: https://linkedin.com/in/username
                            </p>
                        )}
                    </div>

                    <div>
                        <input
                            name="github"
                            placeholder="GitHub (https://github.com/username)"
                            value={formData.github}
                            onChange={handleChange}
                            style={{
                                borderColor: formData.github && !formData.github.includes('github.com/') ? 'orange' : 'inherit'
                            }}
                        />
                        {formData.github && !formData.github.includes('github.com/') && (
                            <p style={{ color: 'orange', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                                ⚠️ Format: https://github.com/username
                            </p>
                        )}
                    </div>
                    <div>
                        <input
                            name="portfolio"
                            placeholder="Portfolio/Website (Optional)"
                            value={formData.portfolio}
                            onChange={handleChange}
                        />
                    </div>
                </div >
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '0.5rem' }}>
                    <label style={{ fontWeight: 'bold', color: '#1e293b' }}>Professional Summary</label>
                    <span style={{
                        fontSize: '0.85rem',
                        color: (formData.summary.length >= 150 && formData.summary.length <= 250) ? '#16a34a' : '#64748b',
                        fontWeight: (formData.summary.length >= 150 && formData.summary.length <= 250) ? 'bold' : 'normal'
                    }}>
                        {formData.summary.length} / 300 characters
                    </span>
                </div>
                <textarea
                    name="summary"
                    placeholder="Brief 2-3 line summary highlighting your specialization and key strengths..."
                    value={formData.summary}
                    onChange={handleChange}
                    rows="4"
                    style={{
                        width: '100%',
                        borderColor: formData.summary.length > 300 ? '#ef4444' : '#e2e8f0',
                        fontSize: '0.95rem'
                    }}
                />
                <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.3rem', fontStyle: 'italic' }}>
                    💡 Tip: Aim for 150-250 characters. Avoid essays or oneliners.
                </p>
            </div>

            {/* Categorized Skills Section */}
            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '1rem', marginTop: '1rem' }}>🛠️ Skills</h3>
            <div className="grid" style={{ gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>Technical Skills</label>
                    <textarea
                        name="technicalSkills"
                        placeholder="e.g. Python, JavaScript, React, SQL, Machine Learning..."
                        value={formData.technicalSkills}
                        onChange={handleChange}
                        rows="2"
                        style={{ width: '100%', fontSize: '0.9rem' }}
                    />
                </div>
                <div>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>Tools & Platforms</label>
                    <textarea
                        name="toolsSkills"
                        placeholder="e.g. Git, Docker, AWS, Figma, Jira, VS Code..."
                        value={formData.toolsSkills}
                        onChange={handleChange}
                        rows="2"
                        style={{ width: '100%', fontSize: '0.9rem' }}
                    />
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569', display: 'block', marginBottom: '0.3rem' }}>Soft Skills</label>
                    <textarea
                        name="softSkills"
                        placeholder="e.g. Leadership, Communication, Problem Solving, Teamwork..."
                        value={formData.softSkills}
                        onChange={handleChange}
                        rows="2"
                        style={{ width: '100%', fontSize: '0.9rem' }}
                    />
                </div>
            </div>

            <div style={{ borderTop: '1px solid #eee', margin: '1.5rem 0' }}></div>

            {/* Dynamic Education Section */}
            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#1e293b', marginBottom: '0.5rem' }}>🎓 Education</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1rem' }}>
                    <strong>ATS Tip:</strong> Use full degree names (e.g., "Bachelor of Technology") and standard date formats.
                </p>

                {formData.education.map((edu, index) => (
                    <div key={index} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                        <div className="grid" style={{ gap: '1rem' }}>
                            {/* Row 1: University & Location */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <input
                                    placeholder="Institution/University Name (e.g. ATLAS SkillTech University)"
                                    value={edu.school}
                                    onChange={(e) => handleArrayChange('education', index, 'school', e.target.value)}
                                    style={{ width: '100%', fontWeight: 'bold' }}
                                />
                            </div>

                            {/* Row 2: Degree & Major */}
                            {/* Row 2: Degree, Field, Major */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                                <input
                                    placeholder="Degree (e.g. B.Tech)"
                                    value={edu.degree}
                                    onChange={(e) => {
                                        handleArrayChange('education', index, 'degree', e.target.value);
                                        if (['btech', 'b.tech', 'bsc', 'msc', 'mba'].includes(e.target.value.toLowerCase().replace('.', ''))) {
                                        }
                                    }}
                                />
                                <input
                                    placeholder="Field of Study (e.g. CS)"
                                    value={edu.fieldOfStudy}
                                    onChange={(e) => handleArrayChange('education', index, 'fieldOfStudy', e.target.value)}
                                />
                                <input
                                    placeholder="Major/Spec. (e.g. AI & ML)"
                                    value={edu.major}
                                    onChange={(e) => handleArrayChange('education', index, 'major', e.target.value)}
                                />
                            </div>

                            {/* Row 3: Dates & Location */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Start Date (e.g. June 2023)"
                                    onFocus={(e) => e.target.type = 'month'}
                                    onBlur={(e) => e.target.type = 'text'}
                                    value={edu.startDate}
                                    onChange={(e) => handleArrayChange('education', index, 'startDate', e.target.value)}
                                />
                                <div>
                                    <input
                                        type="text"
                                        placeholder={edu.isCurrent ? "Present" : "End Date (e.g. July 2027)"}
                                        onFocus={(e) => !edu.isCurrent && (e.target.type = 'month')}
                                        onBlur={(e) => e.target.type = 'text'}
                                        value={edu.isCurrent ? '' : edu.endDate}
                                        onChange={(e) => !edu.isCurrent && handleArrayChange('education', index, 'endDate', e.target.value)}
                                        disabled={edu.isCurrent}
                                        style={{ backgroundColor: edu.isCurrent ? '#f1f5f9' : 'white', width: '100%' }}
                                    />
                                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem' }}>
                                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={edu.isCurrent || false}
                                                onChange={(e) => {
                                                    handleArrayChange('education', index, 'isCurrent', e.target.checked);
                                                    if (e.target.checked) handleArrayChange('education', index, 'isExpected', false);
                                                }}
                                                style={{ marginRight: '0.4rem', width: 'auto' }}
                                            />
                                            Currently Pursuing
                                        </label>
                                        <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', color: '#64748b', cursor: 'pointer' }}>
                                            <input
                                                type="checkbox"
                                                checked={edu.isExpected || false}
                                                onChange={(e) => {
                                                    handleArrayChange('education', index, 'isExpected', e.target.checked);
                                                    if (e.target.checked) handleArrayChange('education', index, 'isCurrent', false);
                                                }}
                                                disabled={edu.isCurrent}
                                                style={{ marginRight: '0.4rem', width: 'auto' }}
                                            />
                                            Expected
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <input
                                placeholder="City, Country (e.g. Mumbai, India)"
                                value={edu.location}
                                onChange={(e) => handleArrayChange('education', index, 'location', e.target.value)}
                            />

                            {/* Row 4: Score (Conditional logic handled in UI display or validation) */}
                            <div style={{ marginTop: '0.5rem' }}>
                                <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.9rem', color: '#475569', cursor: 'pointer', userSelect: 'none' }}>
                                    <input
                                        type="checkbox"
                                        checked={edu.showScore || false}
                                        onChange={(e) => {
                                            handleArrayChange('education', index, 'showScore', e.target.checked);
                                            // Optional: Clear score if unchecked, but we handle it in submit logic to be safe
                                            if (!e.target.checked) {
                                                // We can leave the value in state but ignore it on submit
                                            }
                                        }}
                                        style={{ marginRight: '0.5rem', width: 'auto' }}
                                    />
                                    Include CGPA/Percentage (Only if &gt; 8.0/10 or 75%)
                                </label>
                                {edu.showScore && (
                                    <input
                                        placeholder="CGPA (e.g. 8.5/10) or Percentage (e.g. 75%)"
                                        value={edu.score}
                                        onChange={(e) => handleArrayChange('education', index, 'score', e.target.value)}
                                        style={{ marginTop: '0.5rem', width: '100%' }}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Optional Long Fields */}
                        <div style={{ marginTop: '1rem' }}>
                            {/* Coursework Tagging System */}
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: '0.3rem' }}>
                                    Relevant Coursework <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Max 6 most relevant items)</span>
                                </label>
                                <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: '0.5rem',
                                    padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '6px',
                                    background: 'white', minHeight: '42px'
                                }}>
                                    {edu.coursework && edu.coursework.split(',').filter(c => c.trim()).map((course, cIdx) => (
                                        <span key={cIdx} style={{
                                            background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem',
                                            borderRadius: '16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem'
                                        }}>
                                            {course.trim()}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const courses = edu.coursework.split(',').filter(c => c.trim());
                                                    courses.splice(cIdx, 1);
                                                    handleArrayChange('education', index, 'coursework', courses.join(', '));
                                                }}
                                                style={{ border: 'none', background: 'transparent', color: '#0369a1', cursor: 'pointer', padding: 0, fontWeight: 'bold' }}
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    <input
                                        placeholder={edu.coursework.split(',').filter(c => c.trim()).length >= 6 ? "Max items reached" : "Type & press Enter..."}
                                        disabled={edu.coursework.split(',').filter(c => c.trim()).length >= 6}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                const val = e.target.value.trim();
                                                const currentCourses = edu.coursework.split(',').filter(c => c.trim());
                                                if (val && currentCourses.length < 6 && !currentCourses.includes(val)) {
                                                    handleArrayChange('education', index, 'coursework', [...currentCourses, val].join(', '));
                                                    e.target.value = '';
                                                }
                                            }
                                        }}
                                        style={{
                                            border: 'none', outline: 'none', flexGrow: 1, fontSize: '0.9rem',
                                            background: 'transparent', minWidth: '150px'
                                        }}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <input
                                        placeholder="Academic Honors (Dean's List, University Rank 5, Merit Scholarship)"
                                        value={edu.honors}
                                        onChange={(e) => handleArrayChange('education', index, 'honors', e.target.value)}
                                        style={{ fontSize: '0.9rem', width: '100%' }}
                                    />
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem', fontStyle: 'italic' }}>
                                        Only include significant academic recognition
                                    </p>
                                </div>
                                <input
                                    placeholder="Final Year Project/Thesis (Brief description)"
                                    value={edu.thesis}
                                    onChange={(e) => handleArrayChange('education', index, 'thesis', e.target.value)}
                                    style={{ fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>

                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => removeArrayItem('education', index)} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.5rem 1rem', borderRadius: '4px', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                🗑️ Delete Entry
                            </button>
                        </div>

                        {/* Validation Feedback Inline */}
                        {edu.degree && ['btech', 'b.tech', 'bsc', 'm.tech', 'msc'].includes(edu.degree.toLowerCase().replace(/[^a-z]/g, '')) && (
                            <div style={{ color: '#eab308', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                                ⚠️ ATS Recommendation: Use full degree name (e.g., "Bachelor of Technology") instead of "{edu.degree}".
                            </div>
                        )}
                    </div>
                ))}
                <button type="button" onClick={() => addArrayItem('education')} style={{ background: 'white', color: '#2563eb', border: '1px dashed #3b82f6', width: '100%', padding: '0.8rem', borderRadius: '6px', fontWeight: '500' }}>
                    + Add Education
                </button>
            </div>


            {/* Dynamic Experience Section */}
            <h3 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Work Experience</h3>
            {
                formData.experience.map((exp, index) => (
                    <div key={index} style={{ marginBottom: '1.5rem', padding: '1rem', background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0', position: 'relative' }}>
                        <div className="grid" style={{ gap: '1rem' }}>
                            {/* Row 1: Company & Role */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    placeholder="Company Name (e.g. Google)"
                                    value={exp.company}
                                    onChange={(e) => handleArrayChange('experience', index, 'company', e.target.value)}
                                    style={{ fontWeight: 'bold' }}
                                />
                                <input
                                    placeholder="Role/Title (e.g. Senior Frontend Engineer)"
                                    value={exp.role}
                                    onChange={(e) => handleArrayChange('experience', index, 'role', e.target.value)}
                                />
                            </div>

                            {/* Row 2: Dates & Location */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Start Date (e.g. Jan 2022)"
                                    onFocus={(e) => e.target.type = 'month'}
                                    onBlur={(e) => e.target.type = 'text'}
                                    value={exp.startDate}
                                    onChange={(e) => handleArrayChange('experience', index, 'startDate', e.target.value)}
                                />
                                <div>
                                    <input
                                        type="text"
                                        placeholder={exp.isCurrent ? "Present" : "End Date (e.g. Dec 2024)"}
                                        onFocus={(e) => !exp.isCurrent && (e.target.type = 'month')}
                                        onBlur={(e) => e.target.type = 'text'}
                                        value={exp.isCurrent ? '' : exp.endDate}
                                        onChange={(e) => !exp.isCurrent && handleArrayChange('experience', index, 'endDate', e.target.value)}
                                        disabled={exp.isCurrent}
                                        style={{ backgroundColor: exp.isCurrent ? '#f1f5f9' : 'white', width: '100%' }}
                                    />
                                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem', marginTop: '0.3rem', color: '#64748b', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={exp.isCurrent || false}
                                            onChange={(e) => handleArrayChange('experience', index, 'isCurrent', e.target.checked)}
                                            style={{ marginRight: '0.4rem', width: 'auto' }}
                                        />
                                        Currently Working Here
                                    </label>
                                </div>
                            </div>

                            <input
                                placeholder="Location (e.g. San Francisco, CA)"
                                value={exp.location}
                                onChange={(e) => handleArrayChange('experience', index, 'location', e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Details</label>
                            <button
                                type="button"
                                onClick={() => handleEnhance('experience', index, 'details')}
                                disabled={enhancing[`experience-${index}-details`]}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none',
                                    padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer'
                                }}
                            >
                                {enhancing[`experience-${index}-details`] ? '✨ Improving...' : '✨ Rewrite with AI'}
                            </button>
                        </div>
                        <textarea
                            placeholder="Details/Responsibilities (Use bullet points for better readability)"
                            value={exp.details}
                            onChange={(e) => handleArrayChange('experience', index, 'details', e.target.value)}
                            rows="4"
                            style={{ marginTop: '0.2rem', width: '100%' }}
                        />
                        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => removeArrayItem('experience', index)} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                🗑️ Delete Position
                            </button>
                        </div>
                    </div>
                ))
            }
            <button type="button" onClick={() => addArrayItem('experience')} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px dashed #bfdbfe', width: '100%', padding: '0.5rem' }}>
                + Add Experience
            </button>


            {/* Dynamic Projects Section */}
            <h3 style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Projects</h3>
            {
                formData.projects.map((proj, index) => (
                    <div key={index} style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '4px', position: 'relative' }}>
                        <input placeholder="Project Name" value={proj.name} onChange={(e) => handleArrayChange('projects', index, 'name', e.target.value)} style={{ marginBottom: '0.5rem' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                            <label style={{ fontSize: '0.85rem', color: '#64748b' }}>Description</label>
                            <button
                                type="button"
                                onClick={() => handleEnhance('projects', index, 'description')}
                                disabled={enhancing[`projects-${index}-description`]}
                                style={{
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none',
                                    padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', cursor: 'pointer'
                                }}
                            >
                                {enhancing[`projects-${index}-description`] ? '✨...' : '✨ AI Enhance'}
                            </button>
                        </div>
                        <textarea
                            placeholder="Description"
                            value={proj.description}
                            onChange={(e) => handleArrayChange('projects', index, 'description', e.target.value)}
                            rows="2"
                            style={{ marginBottom: '0.5rem', width: '100%' }}
                        />
                        <input placeholder="Link (Optional)" value={proj.link} onChange={(e) => handleArrayChange('projects', index, 'link', e.target.value)} />
                        {formData.projects.length > 0 && (
                            <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => removeArrayItem('projects', index)} style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', padding: '0.4rem 0.8rem', borderRadius: '4px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 'bold' }}>
                                    🗑️ Delete Project
                                </button>
                            </div>
                        )}
                    </div>
                ))
            }
            <button type="button" onClick={() => addArrayItem('projects')} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px dashed #bfdbfe', width: '100%', padding: '0.5rem' }}>
                + Add Project
            </button>

            {/* Target Job Optimization Section */}
            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f0f9ff', borderRadius: '6px', border: '1px solid #bae6fd' }}>
                <h3 style={{ fontSize: '1.1rem', color: '#0369a1', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🎯 Target Job Details <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: '#0284c7' }}>(Critical for ATS Optimization)</span>
                </h3>

                <div style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <label style={{ fontWeight: '500', color: '#1e293b' }}>Professional Summary</label>
                        <button
                            type="button"
                            onClick={() => handleEnhance('summary')}
                            disabled={enhancing['summary']}
                            style={{
                                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', border: 'none',
                                padding: '0.3rem 0.8rem', borderRadius: '15px', fontSize: '0.8rem', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: '5px'
                            }}
                        >
                            {enhancing['summary'] ? '✨ Magic...' : '✨ Enhance with AI'}
                        </button>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <textarea
                            name="summary"
                            placeholder="Craft a compelling professional summary (AI can help here!)"
                            value={formData.summary}
                            onChange={handleChange}
                            rows="4"
                            style={{ width: '100%', fontSize: '0.9rem' }}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: '600', color: '#0369a1' }}>Target Job Title</label>
                    <input
                        name="targetRole"
                        placeholder="e.g. Frontend Developer, Data Scientist, Product Manager"
                        value={formData.targetRole}
                        onChange={handleChange}
                        style={{ width: '100%' }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '0.3rem', fontWeight: '600', color: '#0369a1' }}>Job Description (JD)</label>
                    <textarea
                        name="jobDescription"
                        placeholder="Paste the full job description here. The AI will optimize your keywords to match this specific role."
                        value={formData.jobDescription}
                        onChange={handleChange}
                        rows="6"
                        style={{ width: '100%', fontSize: '0.9rem' }}
                    />
                    <p style={{ fontSize: '0.8rem', color: '#0284c7', marginTop: '0.3rem' }}>
                        ℹ️ This allows the system to tailor your resume's keywords and skills to match the job requirements.
                    </p>
                </div>
            </div>

            <button type="submit" disabled={loading} style={{ width: '100%', marginTop: '2rem', padding: '1rem', fontSize: '1.1rem' }}>
                {loading ? 'Processing...' : 'Generate Resume'}
            </button>
        </form >
    );
};

const UploadForm = ({ onUploadSuccess }) => {
    const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'manual'
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setError('Please select a file first.');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const parseResult = await uploadResume(file);
            // No scoring here, just return parsed data
            onUploadSuccess(parseResult);
        } catch (err) {
            console.error(err);
            setError('Failed to process resume. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleManualSubmit = async (data) => {
        setLoading(true);
        try {
            // No scoring here, just return manual data
            onUploadSuccess(data);
        } catch (err) {
            console.error(err);
            setError('Failed to analyze data.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('upload')}
                    style={{
                        background: activeTab === 'upload' ? 'var(--primary-color)' : 'transparent',
                        color: activeTab === 'upload' ? 'white' : 'var(--text-color)',
                        border: activeTab === 'upload' ? 'none' : '1px solid var(--border-color)'
                    }}
                >
                    Option 1: Upload File
                </button>
                <button
                    onClick={() => setActiveTab('manual')}
                    style={{
                        background: activeTab === 'manual' ? 'var(--primary-color)' : 'transparent',
                        color: activeTab === 'manual' ? 'white' : 'var(--text-color)',
                        border: activeTab === 'manual' ? 'none' : '1px solid var(--border-color)'
                    }}
                >
                    Option 2: Manual Entry
                </button>
            </div>

            <h2>{activeTab === 'upload' ? 'Upload Existing Resume' : 'Enter Resume Details'}</h2>

            {activeTab === 'upload' ? (
                <form onSubmit={handleUploadSubmit}>
                    <div style={{ margin: '2rem 0', border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: '0.5rem' }}>
                        <input
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                            style={{ width: 'auto', background: 'transparent', border: 'none' }}
                        />
                    </div>
                    {error && <p style={{ color: '#ef4444' }}>{error}</p>}
                    <button type="submit" disabled={loading} style={{ width: '100%' }}>
                        {loading ? 'Processing...' : 'Analyze Resume'}
                    </button>
                </form>
            ) : (
                <ManualEntryForm onSubmit={handleManualSubmit} loading={loading} />
            )}
        </div>
    );
};

export default UploadForm;
