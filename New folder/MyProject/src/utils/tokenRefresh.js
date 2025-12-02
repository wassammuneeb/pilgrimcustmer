import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const refreshAccessToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) return null;

    const response = await axios.post('https://pilgrimplannerbackend.onrender.com/api/authrefresh/refreshtoken', {
      refreshToken,
    }, {
      headers: {
        'x-client-type': 'react-native', // 👈 To tell backend you're mobile
      },
    });

    const { accessToken, refreshToken: newRefreshToken } = response.data;
  // 🟦 Log new tokens
    console.log("✅ New Access Token:", accessToken);
    console.log("🔁 New Refresh Token:", newRefreshToken);
    
    // Save new tokens
    await AsyncStorage.setItem('accessToken', accessToken);
    await AsyncStorage.setItem('refreshToken', newRefreshToken);

    return accessToken;
  } catch (error) {
    console.error('Refresh token failed:', error.response?.data || error.message);
    return null;
  }
};