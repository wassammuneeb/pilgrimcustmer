import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { NotificationProvider, useNotifications } from './src/contexts/NotificationContext';
import { requestAndSendFcmToken } from './src/utils/fcm';

import Welcome from './src/screens/Welcome';
import Login from './src/screens/Login';
import CreateAccount from './src/screens/CreateAccount';
import Home from './src/screens/Home';
import UmrahPackages from './src/screens/UmrahPackages';
import PackageDetails from './src/screens/PackageDetails';
import Bookings from './src/screens/Bookings';
import Accounts from './src/screens/Accounts';
import Notifications from './src/screens/Notifications';
import BookAppointments from './src/screens/BookAppointments';
import BookedAppointments from './src/screens/BookedAppointments';
import RoozaPermit from './src/screens/RoozaPermit';
import AuthLoading from './src/screens/AuthLoading'; 
import ViewTrip from './src/screens/ViewTrip'; 
import CreateTrip from './src/screens/CreateTrip'; 
import CreateCustomPackage from './src/screens/CreateCustomPackage'; 
import MatchedVendors from "./src/screens/MatchedVendors"
import VendorCustomOptions from "./src/screens/VendorCustomOptions"
import ImageAnalysisScreen from "./src/screens/ImageAnalysisScreen"
import VoiceTestScreen from "./src/screens/VoiceTestScreen"
import AITranslations from "./src/screens/AITranslations"
const Stack = createStackNavigator();

const AppContent = () => {
  const { fetchUnreadCount } = useNotifications();

  useEffect(() => {
    requestAndSendFcmToken();

    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('📬 FCM Push in foreground:', remoteMessage);

      // optional alert if you still want it
      // Alert.alert(
      //   remoteMessage.notification?.title || 'Notification',
      //   remoteMessage.notification?.body || 'You have a new message.'
      // );

      fetchUnreadCount(); // 🔥 immediately refresh unread count
    });

    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="AuthLoading"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="AuthLoading" component={AuthLoading} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="CreateAccount" component={CreateAccount} />
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="UmrahPackages" component={UmrahPackages} />
        <Stack.Screen name="PackageDetails" component={PackageDetails} />
        <Stack.Screen name="Bookings" component={Bookings} />
        <Stack.Screen name="Accounts" component={Accounts} />
        <Stack.Screen name="Notifications" component={Notifications} />
        <Stack.Screen name="BookAppointments" component={BookAppointments} />
        <Stack.Screen name="BookedAppointments" component={BookedAppointments} />
        <Stack.Screen name="RoozaPermit" component={RoozaPermit} />
        <Stack.Screen name="ViewTrip" component={ViewTrip} />
        <Stack.Screen name="CreateTrip" component={CreateTrip} />
        <Stack.Screen name="CreateCustomPackage" component={CreateCustomPackage} />
        <Stack.Screen name="MatchedVendors" component={MatchedVendors} />
        <Stack.Screen name="VendorCustomOptions" component={VendorCustomOptions} />
        <Stack.Screen name="ImageAnalysisScreen" component={ImageAnalysisScreen} />
        <Stack.Screen name="VoiceTestScreen" component={VoiceTestScreen} />
        <Stack.Screen name="AITranslations" component={AITranslations} />

      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  return (
    <NotificationProvider>
      <AppContent />
    </NotificationProvider>
  );
}
