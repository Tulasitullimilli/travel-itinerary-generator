import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT and optional Gemini API Key
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const geminiKey = localStorage.getItem('travel_gemini_key');
    if (geminiKey) {
      config.headers['x-gemini-key'] = geminiKey;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (userData) => API.post('/auth/register', userData),
  login: (credentials) => API.post('/auth/login', credentials),
  getMe: () => API.get('/auth/me'),
};

export const itineraryAPI = {
  uploadDoc: (formData) => {
    return API.post('/itineraries/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  generate: (itineraryData) => API.post('/itineraries/generate', itineraryData),
  getAll: () => API.get('/itineraries'),
  getById: (id) => API.get(`/itineraries/${id}`),
  update: (id, data) => API.put(`/itineraries/${id}`, data),
  delete: (id) => API.delete(`/itineraries/${id}`),
  getShared: (shareId) => API.get(`/itineraries/share/${shareId}`),
};

export default API;
