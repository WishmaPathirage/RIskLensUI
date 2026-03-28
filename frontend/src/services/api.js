import axios from 'axios';
import { collection, addDoc, getDocs, getDoc, doc, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to determine if a URL matches a mock path
const matchMock = (url, endpoint) => {
    return url === endpoint || url === `/api${endpoint}` || url.endsWith(endpoint);
};

api.interceptors.response.use(
    async (response) => {
        const { config } = response;
        const mockResponse = await getMockResponse(config);
        if (mockResponse) {
            if (mockResponse.error) {
                return Promise.reject({
                    response: {
                        status: mockResponse.status || 400,
                        data: mockResponse.data
                    }
                });
            }
            return mockResponse;
        }
        return response;
    },
    async (error) => {
        const { config } = error;
        const mockResponse = await getMockResponse(config);
        if (mockResponse) {
            if (!mockResponse.error) {
                return mockResponse;
            }
            return Promise.reject({
                response: {
                    status: mockResponse.status || 400,
                    data: mockResponse.data
                }
            });
        }
        return Promise.reject(error);
    }
);

// Centralized Mock Logic connected to Firestore
const getMockResponse = async (config) => {
    if (!config) return null;
    const { url, method } = config;

    // Reports List
    if (matchMock(url, '/reports') && method === 'get') {
        const user = auth.currentUser;
        if (!user) return { data: [], status: 200 };

        try {
            const q = query(collection(db, "reports"), where("userId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const reports = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    date: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString().split('T')[0] : 'Unknown Date',
                    name: data.name || 'Scan Report',
                    riskScore: data.result?.riskScore,
                    status: data.result?.riskLevel
                };
            });
            // Sort by newest by default string sorting on ISO date, or just keep as is
            reports.sort((a, b) => new Date(b.date) - new Date(a.date));
            return { data: reports, status: 200 };
        } catch (err) {
            return { error: true, status: 500, data: { message: "Failed to fetch reports" }};
        }
    }



    // Save Report
    if (matchMock(url, '/reports/save') && method === 'post') {
        const user = auth.currentUser;
        if (!user) return { error: true, status: 401, data: { message: 'Unauthorized' } };
        
        const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        
        try {
            await addDoc(collection(db, "reports"), {
                userId: user.uid,
                createdAt: Timestamp.now(),
                name: 'New Scan Report',
                result: payload.result
            });
            return { data: { success: true }, status: 200 };
        } catch (err) {
            console.error(err);
            return { error: true, status: 500, data: { message: "Failed to save report" }};
        }
    }

    // Report Detail
    if (url.match(/\/reports\/\w+/) && method === 'get') {
        const id = url.split('/').pop();
        try {
            const docRef = doc(db, "reports", id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    data: {
                        id: docSnap.id,
                        date: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString().split('T')[0] : 'Unknown Date',
                        name: data.name || 'Scan Report',
                        riskScore: data.result?.riskScore,
                        status: data.result?.riskLevel,
                        details: data.result?.explanations?.join('\n') || 'No details available.',
                        result: data.result
                    },
                    status: 200,
                };
            } else {
                return { error: true, status: 404, data: { message: "Report not found" } };
            }
        } catch (err) {
            return { error: true, status: 500, data: { message: "Failed to fetch report" }};
        }
    }

    return null;
};

export default api;
