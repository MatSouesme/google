import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add auth token to requests if available
apiClient.interceptors.request.use(async (config) => {
    // You can add token logic here if needed later
    // const token = await auth.currentUser?.getIdToken();
    // if (token) {
    //     config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
});

export default apiClient;
export { API_BASE_URL };
