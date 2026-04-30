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

// LocalStorage Fallback Handlers
const getLocalReports = () => {
    try {
        return JSON.parse(localStorage.getItem('risklens_reports_fallback') || '[]');
    } catch {
        return [];
    }
};

const saveLocalReport = (report) => {
    try {
        const existing = getLocalReports();
        localStorage.setItem('risklens_reports_fallback', JSON.stringify([...existing, report]));
    } catch (e) {
        console.error("Local storage save failed", e);
    }
};

// Centralized Mock Logic connected to Firestore
const getMockResponse = async (config) => {
    if (!config) return null;
    const { url, method } = config;

    // Reports List
    if (matchMock(url, '/reports') && method === 'get') {
        let reports = [];
        const user = auth.currentUser;
        
        // Try getting Firebase data if logged in
        if (user) {
            try {
                const q = query(collection(db, "reports"), where("userId", "==", user.uid));
                const querySnapshot = await getDocs(q);
                reports = querySnapshot.docs.map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        date: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString().split('T')[0] : 'Unknown Date',
                        timestamp: data.createdAt ? data.createdAt.toMillis() : 0,
                        name: data.name || 'Scan Report',
                        originalText: data.result?.originalText,
                        riskScore: data.result?.riskScore,
                        status: data.result?.riskLevel
                    };
                });
            } catch (err) {
                console.warn("Firebase fetch failed, relying on local storage fallback.");
            }
        }

        // Always fetch from LocalStorage Fallback and append
        const localReports = getLocalReports();
        const mappedLocal = localReports.map(data => ({
            id: data.id,
            date: data.date,
            timestamp: data.timestamp || 0,
            name: data.name || 'Scan Report (Local)',
            originalText: data.result?.originalText,
            riskScore: data.result?.riskScore,
            status: data.result?.riskLevel
        }));

        const combinedReports = [...reports, ...mappedLocal];
        combinedReports.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        
        return { data: combinedReports, status: 200 };
    }



    // Save Report
    if (matchMock(url, '/reports/save') && method === 'post') {
        const payload = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        const user = auth.currentUser;
        
        try {
            if (user) {
                // Try Firebase remote save
                await addDoc(collection(db, "reports"), {
                    userId: user.uid,
                    createdAt: Timestamp.now(),
                    name: 'New Scan Report',
                    result: payload.result
                });
                return { data: { success: true }, status: 200 };
            } else {
                throw new Error("No active user to save to Firebase");
            }
        } catch (err) {
            console.warn("Firebase save failed or skipped. Using LocalStorage fallback:", err);
            // Engage Fallback
            saveLocalReport({
                id: 'local_' + new Date().getTime(),
                userId: user ? user.uid : 'guest',
                date: new Date().toISOString().split('T')[0],
                timestamp: new Date().getTime(),
                name: 'New Scan Report (Fallback)',
                result: payload.result
            });
            return { data: { success: true, localFallback: true }, status: 200 };
        }
    }

    // Report Detail
    if (url.match(/\/reports\/\w+/) && method === 'get') {
        const id = url.split('/').pop();
        
        // 1. Check LocalStorage exactly first
        if (id.startsWith('local_')) {
            const local = getLocalReports().find(r => r.id === id);
            if (local) {
                return {
                    data: {
                        id: local.id,
                        date: local.date,
                        timestamp: local.timestamp,
                        name: local.name,
                        riskScore: local.result?.riskScore,
                        status: local.result?.riskLevel,
                        details: local.result?.explanations?.join('\n') || 'No details available.',
                        result: local.result
                    },
                    status: 200
                };
            }
        }
        
        // 2. Otherwise try Firebase normally
        try {
            const docRef = doc(db, "reports", id);
            const docSnap = await getDoc(docRef);
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                return {
                    data: {
                        id: docSnap.id,
                        date: data.createdAt ? new Date(data.createdAt.toMillis()).toISOString().split('T')[0] : 'Unknown Date',
                        timestamp: data.createdAt ? data.createdAt.toMillis() : 0,
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
            return { error: true, status: 500, data: { message: "Failed to fetch report from database" }};
        }
    }

    return null;
};

export default api;
