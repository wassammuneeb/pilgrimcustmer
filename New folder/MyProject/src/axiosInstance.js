import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const axiosInstance = axios.create({
  baseURL: 'https://pilgrimplannerbackend.onrender.com/api/',
  withCredentials: false,
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('accessToken');
    console.log('[Request Interceptor] Using accessToken:', token);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const userData = await AsyncStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    const preferredLanguage = user?.preferredLanguage || 'en';
    config.headers['x-lang'] = preferredLanguage;

    config.headers['x-client-type'] = 'react-native';
    return config;
  },
  (error) => {
    console.error('[Request Interceptor] Error:', error);
    return Promise.reject(error);
  }
);


// Token Refresh Mechanism
let isRefreshing = false;
let refreshSubscribers = [];

function onRefreshed(newToken) {
  console.log('[Token Refresh] Notifying queued requests with new token');
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

function rejectSubscribers(err) {
  console.warn('[Token Refresh] Rejecting all queued requests');
  refreshSubscribers.forEach((callback) => callback(Promise.reject(err)));
  refreshSubscribers = [];
}

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error?.response?.status === 401 &&
      !originalRequest?._retry
    ) {
      console.warn('[Response Interceptor] 401 detected. Attempting token refresh...');
      originalRequest._retry = true;

      if (isRefreshing) {
        console.log('[Response Interceptor] Token refresh in progress. Queuing request...');
        return new Promise((resolve, reject) => {
          subscribeTokenRefresh((newToken) => {
            if (typeof newToken === 'string') {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              resolve(axiosInstance(originalRequest));
            } else {
              reject(newToken);
            }
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem('refreshToken');
        console.log('[Token Refresh] Using refreshToken:', refreshToken);

        if (!refreshToken) {
          console.error('[Token Refresh] No refresh token found. Logging out.');
          throw new Error('No refresh token');
        }

        const { data } = await axios.post(
          'https://pilgrimplannerbackend.onrender.com/api/authrefresh/refreshtoken',
          { refreshToken },
          {
            headers: {
              'x-client-type': 'react-native',
            },
          }
        );

        console.log('[Token Refresh] Response data:', data);

        const newAccessToken = data?.accessToken;
        const newRefreshToken = data?.refreshToken;

        if (!newAccessToken || !newRefreshToken) {
          console.error('[Token Refresh] Backend did not return both tokens.');
          throw new Error('Incomplete token response from server');
        }

        await AsyncStorage.setItem('accessToken', newAccessToken.trim());
        await AsyncStorage.setItem('refreshToken', newRefreshToken.trim());

        console.log('[Token Refresh] New tokens saved to AsyncStorage');

        onRefreshed(newAccessToken);
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        console.error('[Token Refresh] Refresh failed:', refreshErr.message || refreshErr);

        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('refreshToken');
        rejectSubscribers(refreshErr);

        console.warn('[Auth] Tokens cleared due to refresh failure. User should re-login.');
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
  // 🚨 Force logout
  // if (navigationRef?.current) {
  //   navigationRef.current.reset({
  //     index: 0,
  //     routes: [{ name: 'Login' }],
  //   });
  // }
    return Promise.reject(error);
  }
);

export default axiosInstance;


// import axios from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const axiosInstance = axios.create({
//   baseURL: 'https://pilgrimplannerbackend.onrender.com/api/',
//   withCredentials: false, // no cookies for React Native
// });

// // Add access token before every request
// axiosInstance.interceptors.request.use(
//   async (config) => {
//     const token = await AsyncStorage.getItem('accessToken');
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     config.headers['x-client-type'] = 'react-native'; // always identify client
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// // Track if we're already refreshing
// let isRefreshing = false;
// let refreshSubscribers = [];

// function onRefreshed(newToken) {
//   refreshSubscribers.forEach((callback) => callback(newToken));
//   refreshSubscribers = [];
// }

// function subscribeTokenRefresh(callback) {
//   refreshSubscribers.push(callback);
// }

// // Response interceptor for auto-refreshing tokens
// axiosInstance.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     const originalRequest = error.config;

//     // If 401 due to expired token and not already retried
//     if (
//       error.response &&
//       error.response.status === 401 &&
//       !originalRequest._retry
//     ) {
//       originalRequest._retry = true;

//       if (isRefreshing) {
//         // Wait until refresh completes
//         return new Promise((resolve) => {
//           subscribeTokenRefresh((newToken) => {
//             originalRequest.headers.Authorization = `Bearer ${newToken}`;
//             resolve(axiosInstance(originalRequest));
//           });
//         });
//       }

//       isRefreshing = true;

//       try {
//         const refreshToken = await AsyncStorage.getItem('refreshToken');
//         const { data } = await axios.post(
//           'https://pilgrimplannerbackend.onrender.com/api/auth/customer/refresh-token-customer',
//           { refreshToken, // ✅ Send in body
// },
//           {
//             headers: {
//               // Authorization: `Bearer ${refreshToken}`,
//               'x-client-type': 'react-native',
//             },
//           }
//         );

//         const newAccessToken = data.accessToken;
//         const newRefreshToken = data.refreshToken;

//         // Save new tokens
//         await AsyncStorage.setItem('accessToken', newAccessToken);
//         await AsyncStorage.setItem('refreshToken', newRefreshToken);

//         onRefreshed(newAccessToken);
//         originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
//         return axiosInstance(originalRequest);
//       } catch (refreshErr) {
//         // Token refresh failed → logout
//         await AsyncStorage.removeItem('accessToken');
//         await AsyncStorage.removeItem('refreshToken');
//         console.error('Auto-refresh failed. Forcing logout.');
//         return Promise.reject(refreshErr);
//       } finally {
//         isRefreshing = false;
//       }
//     }

//     return Promise.reject(error);
//   }
// );

// export default axiosInstance;

