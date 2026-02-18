import axios from 'axios';

// Use relative URL in production (Vercel), localhost in development
export const API_URL = import.meta.env.PROD ? '' : 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

export const uploadResume = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/parse', formData);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network Error');
    }
};

export const scoreResume = async (text, jobDescription = "", metadata = {}) => {
    const response = await api.post('/score', { resume_text: text, job_description: jobDescription, metadata }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};

export const enhanceText = async (text, type = "general", jobDescription = "", provider = "openai") => {
    const response = await api.post('/enhance', { text, type, job_description: jobDescription, provider }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};

export const generateResume = async (data, format = "pdf", template = "classic") => {
    try {
        const response = await api.post('/generate', { data, format, template }, {
            headers: { 'Content-Type': 'application/json' }
        });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network Error');
    }
};

export const sendChatMessage = async (message, context, provider = "openai") => {
    const response = await api.post('/chat', { message, context, provider }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};
