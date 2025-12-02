import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Sound from 'react-native-sound';
import axios from 'axios';

const axiosInstance = axios.create({
  timeout: 60000,
});

const BASE_URL = 'https://pilgrimplannerbackend.onrender.com';

const ImageAnalysisScreen = () => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [language, setLanguage] = useState('ur');
  
  const soundRef = useRef(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }
    };
  }, []);

  const handleSelectImage = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.error('ImagePicker Error: ', response.error);
        Alert.alert('Error', 'Failed to select image');
      } else if (response.assets && response.assets[0]) {
        const image = response.assets[0];
        setSelectedImage({
          uri: image.uri,
          type: image.type || 'image/jpeg',
          fileName: image.fileName || 'image.jpg',
        });
        setAnalysisResult(null);
      }
    });
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) {
      Alert.alert('Error', 'Please select an image first');
      return;
    }

    setAnalysisLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type,
        name: selectedImage.fileName || 'image.jpg',
      });
      formData.append('language', language);

      console.log('📤 Sending image for analysis...');

      const response = await axiosInstance.post(
        `${BASE_URL}/api/visual/analyze`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setAnalysisResult(response.data.analysis);
        setSelectedImage(null);

        console.log('✅ Analysis completed successfully');

        if (response.data.analysis.audio_url) {
          console.log('🔊 Audio URL received:', response.data.analysis.audio_url);
        }
      } else {
        console.error('Analysis failed:', response.data.error);
        Alert.alert('Analysis Failed', response.data.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Error analyzing image:', error);
      let errorMessage = 'Failed to analyze image';

      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timeout. Please try again.';
      } else if (error.response?.status === 413) {
        errorMessage = 'Image too large. Please select a smaller image.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      Alert.alert('Analysis Error', errorMessage);
    } finally {
      setAnalysisLoading(false);
    }
  };

  // AUDIO
  const handlePlayAudio = () => {
    if (!analysisResult?.audio_url) {
      Alert.alert('Error', 'No audio available for this analysis');
      return;
    }

    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.release();
      soundRef.current = null;
    }

    const audioUrl = `${BASE_URL}${analysisResult.audio_url}`;
    console.log('🔊 Playing audio from:', audioUrl);

    setAudioPlaying(true);

    Sound.setCategory('Playback');
    soundRef.current = new Sound(audioUrl, '', (error) => {
      if (error) {
        console.error('Error loading sound:', error);
        Alert.alert('Audio Error', 'Failed to load audio file');
        setAudioPlaying(false);
        return;
      }

      console.log('✅ Sound loaded successfully');

      soundRef.current.play((success) => {
        if (success) {
          console.log('✅ Sound played successfully');
        } else {
          console.error('❌ Sound playback failed');
          Alert.alert('Playback Error', 'Failed to play audio');
        }
        setAudioPlaying(false);
        soundRef.current.release();
        soundRef.current = null;
      });
    });
  };

  const handleStopAudio = () => {
    if (soundRef.current) {
      soundRef.current.stop();
      soundRef.current.release();
      soundRef.current = null;
      setAudioPlaying(false);
      console.log('⏹ Audio stopped');
    }
  };

  const handleClearResults = () => {
    setAnalysisResult(null);
    setSelectedImage(null);
    if (soundRef.current) {
      handleStopAudio();
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>🕌 Pilgrim Planner</Text>
      <Text style={styles.subtitle}>Image Analysis & Audio Guide</Text>

      {/* Language Selector */}
      <View style={styles.languageContainer}>
        <Text style={styles.languageLabel}>Select Language:</Text>
        <View style={styles.languageButtons}>
          {['ur', 'ar', 'en'].map((lang) => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageButton,
                language === lang && styles.languageButtonActive,
              ]}
              onPress={() => setLanguage(lang)}>
              <Text
                style={[
                  styles.languageButtonText,
                  language === lang && styles.languageButtonTextActive,
                ]}>
                {lang.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Image Selection */}
      <TouchableOpacity style={styles.imageButton} onPress={handleSelectImage}>
        <Text style={styles.imageButtonText}>
          {selectedImage ? '🔄 Change Image' : '📷 Select Image'}
        </Text>
      </TouchableOpacity>

      {/* Selected Image Preview */}
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={handleAnalyzeImage}
            disabled={analysisLoading}>
            {analysisLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.analyzeButtonText}>🔍 Analyze Image</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <View style={styles.resultsContainer}>
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Analysis Results</Text>
            <TouchableOpacity onPress={handleClearResults}>
              <Text style={styles.clearButton}>🗑 Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.resultSection}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.resultText}>{analysisResult.description}</Text>
          </View>

          {/* Historical Context */}
          {analysisResult.context_or_history && (
            <View style={styles.resultSection}>
              <Text style={styles.sectionTitle}>Historical Context</Text>
              <Text style={styles.resultText}>{analysisResult.context_or_history}</Text>
            </View>
          )}

          {/* Audio Controls */}
          {analysisResult.audio_url && (
            <View style={styles.audioContainer}>
              <Text style={styles.sectionTitle}>Audio Guide</Text>
              <View style={styles.audioButtons}>
                {audioPlaying ? (
                  <TouchableOpacity style={styles.stopButton} onPress={handleStopAudio}>
                    <Text style={styles.stopButtonText}>⏹ Stop Audio</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.playButton} onPress={handlePlayAudio}>
                    <Text style={styles.playButtonText}>🔊 Play Audio</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.metadataContainer}>
            <Text style={styles.metadataText}>
              Language: {analysisResult.language.toUpperCase()}
            </Text>
            <Text style={styles.metadataText}>
              Confidence: {analysisResult.confidence}
            </Text>
          </View>
        </View>
      )}

      {/* Loading Overlay */}
      {analysisLoading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2e86ab" />
            <Text style={styles.loadingText}>Analyzing Image...</Text>
            <Text style={styles.loadingSubtext}>This may take a few seconds</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2e86ab',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    color: '#6c757d',
    marginBottom: 30,
  },
  languageContainer: {
    marginBottom: 20,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#495057',
  },
  languageButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  languageButton: {
    flex: 1,
    padding: 12,
    marginHorizontal: 5,
    backgroundColor: '#e9ecef',
    borderRadius: 8,
    alignItems: 'center',
  },
  languageButtonActive: {
    backgroundColor: '#2e86ab',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c757d',
  },
  languageButtonTextActive: {
    color: '#fff',
  },
  imageButton: {
    backgroundColor: '#2e86ab',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  imageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  imagePreview: {
    width: '100%',
    height: 250,
    borderRadius: 10,
    marginBottom: 15,
  },
  analyzeButton: {
    backgroundColor: '#28a745',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingBottom: 10,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2e86ab',
  },
  clearButton: {
    color: '#dc3545',
    fontSize: 14,
    fontWeight: '600',
  },
  resultSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#6c757d',
    textAlign: 'left',
  },
  audioContainer: {
    marginBottom: 20,
  },
  audioButtons: {
    flexDirection: 'row',
  },
  playButton: {
    backgroundColor: '#17a2b8',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  playButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  metadataContainer: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2e86ab',
  },
  metadataText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 4,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    color: '#2e86ab',
  },
  loadingSubtext: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 5,
  },
});

export default ImageAnalysisScreen;
