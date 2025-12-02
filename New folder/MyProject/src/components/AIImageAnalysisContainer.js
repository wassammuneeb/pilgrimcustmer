import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import FormData from 'form-data';
import ImageAnalysisButton from './ImageAnalysisButton';
import ImagePickerModal from './ImagePickerModal';
import AnalysisResultModal from './AnalysisResultModal';
import axiosInstance from '../axiosInstance';

const AIImageAnalysisContainer = ({ t }) => {
  const [showImagePickerModal, setShowImagePickerModal] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleImageSelect = async (image) => {
    setIsLoading(true);
    try {
      // Get user ID from AsyncStorage
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : {};
      const userId = userData?.id || 'unknown';

      // Get language preference
      const languageStr = await AsyncStorage.getItem('selectedLanguage');
      const language = languageStr || 'en';

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('image', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || `image-${Date.now()}.jpg`,
      });
      formData.append('user_id', userId);
      formData.append('language', language);

      // Make API call
      const response = await axiosInstance.post(
        'https://pilgrimplannerbackend.onrender.com/api/visual/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
// ⭐ Log full response here
    console.log("📌 API RESPONSE:", response.data);
      if (response.data.success) {
        setAnalysisResult(response.data);
        setShowImagePickerModal(false);
        setShowResultModal(true);
      } else {
        Alert.alert(
          t('errorText') || 'Error',
          response.data.message || t('analysisFailed') || 'Analysis failed'
        );
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert(
        t('errorText') || 'Error',
        error.message || t('analysisErrorText') || 'Failed to analyze image'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ImageAnalysisButton
        onPress={() => setShowImagePickerModal(true)}
        t={t}
      />
      <ImagePickerModal
        visible={showImagePickerModal}
        onClose={() => setShowImagePickerModal(false)}
        onImageSelect={handleImageSelect}
        t={t}
      />
      <AnalysisResultModal
        visible={showResultModal}
        onClose={() => setShowResultModal(false)}
        analysisData={analysisResult}
        t={t}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});

export default AIImageAnalysisContainer;
