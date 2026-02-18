import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'multipart/form-data',
    },
});

export const uploadResume = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/parse', formData);
    return response.data;
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
    const response = await api.post('/generate', { data, format, template }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};

export const sendChatMessage = async (message, context, provider = "openai") => {
    const response = await api.post('/chat', { message, context, provider }, {
        headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
};
