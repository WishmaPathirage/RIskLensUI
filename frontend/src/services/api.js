import axios from 'axios';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Mock Adapter using interceptors for response
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // Mock logic
        const { config } = error;

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));

        // Mock Login
        if (config.url === '/auth/login' && config.method === 'post') {
            const { email, password } = JSON.parse(config.data);
            if (email === 'test@risklens.com' && password === 'password123') {
                return {
                    data: {
                        token: 'mock-jwt-token-123456',
                        user: { name: 'Demo User', email: 'test@risklens.com' }
                    }
                };
            }
            return Promise.reject({ response: { status: 401, data: { message: 'Invalid credentials' } } });
        }

        // Mock Register
        if (config.url === '/auth/register' && config.method === 'post') {
            return {
                data: {
                    token: 'mock-jwt-token-789012',
                    user: JSON.parse(config.data)
                }
            };
        }

        // Mock Reports List
        if (config.url === '/reports' && config.method === 'get') {
            return {
                data: [
                    { id: 1, date: '2023-10-25', name: 'Chatbot Logs V1', riskScore: 85, status: 'High' },
                    { id: 2, date: '2023-10-24', name: 'Customer Data Set', riskScore: 45, status: 'Medium' },
                    { id: 3, date: '2023-10-20', name: 'Marketing Copy', riskScore: 12, status: 'Low' },
                ]
            };
        }

        // Mock Scan
        if (config.url === '/scan' && config.method === 'post') {
            return {
                data: {
                    riskScore: Math.floor(Math.random() * 100),
                    riskLevel: 'High', // Logic could be dynamic
                    confidence: 95,
                    explanations: [
                        'Sensiive PII detected in standard text fields.',
                        'Potential data leakage in validation error messages.',
                        'Unencrypted storage patterns found.'
                    ]
                }
            };
        }

        // Mock Save Report
        if (config.url === '/reports/save' && config.method === 'post') {
            return { data: { success: true } };
        }

        // Mock Report Detail
        if (config.url.match(/\/reports\/\d+/) && config.method === 'get') {
            return {
                data: {
                    id: config.url.split('/').pop(),
                    date: '2023-10-25',
                    name: 'Detailed Analysis Report',
                    riskScore: 78,
                    status: 'High',
                    details: 'Full report content here...'
                }
            };
        }

        return Promise.reject(error);
    }
);

export default api;
