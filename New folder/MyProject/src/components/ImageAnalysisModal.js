import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';
import Sound from 'react-native-sound';
import axiosInstance from '../axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ImageAnalysisModal = ({ visible, onClose, t, language }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const soundRef = useRef(null);

  const stage = !selectedImage && !analysisResult ? 'upload' : selectedImage && !analysisResult ? 'preview' : 'results';

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.9,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('Gallery cancelled');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else {
        setSelectedImage(response.assets[0]);
      }
    });
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo',
      quality: 0.9,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('Camera cancelled');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage);
      } else {
        setSelectedImage(response.assets[0]);
      }
    });
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;

    setAnalysisLoading(true);
    try {
      const userDataStr = await AsyncStorage.getItem('userData');
      const userData = userDataStr ? JSON.parse(userDataStr) : {};
      const userId = userData?.id || 'unknown';

      const formData = new FormData();
      formData.append('image', {
        uri: selectedImage.uri,
        type: selectedImage.type || 'image/jpeg',
        name: selectedImage.fileName || 'image.jpg',
      });
      formData.append('userId', userId);
      formData.append('language', language);

      const response = await axiosInstance.post(
        'https://pilgrimplannerbackend.onrender.com/api/visual/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setAnalysisResult(response.data.analysis);
      } else {
        Alert.alert('Error', response.data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze image');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handlePlayAudio = () => {
    if (analysisResult?.audio_url) {
      const audioUrl = `https://pilgrimplannerbackend.onrender.com${analysisResult.audio_url}`;
      Sound.setCategory('Playback');
      const sound = new Sound(audioUrl, '', (error) => {
        if (error) {
          console.error('Error loading sound:', error);
          Alert.alert('Error', 'Could not load audio');
        } else {
          sound.play((success) => {
            if (success) {
              setAudioPlaying(false);
            }
          });
          setAudioPlaying(true);
          soundRef.current = sound;
        }
      });
    }
  };

  const handleClose = () => {
    if (soundRef.current) {
      soundRef.current.stop();
    }
    setSelectedImage(null);
    setAnalysisResult(null);
    setAudioPlaying(false);
    onClose();
  };

  const handleReset = () => {
    setSelectedImage(null);
    setAnalysisResult(null);
    setAudioPlaying(false);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>AI Image Analysis</Text>
            <View style={{ width: 44 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Upload Stage */}
            {stage === 'upload' && (
              <View style={styles.stageContainer}>
                <Text style={styles.stageTitle}>Upload Image</Text>
                <Text style={styles.stageDescription}>Choose an image to analyze</Text>

                <TouchableOpacity
                  style={styles.imageActionButton}
                  onPress={openGallery}
                  activeOpacity={0.85}
                >
                  <Text style={styles.imageActionIcon}>📸</Text>
                  <Text style={styles.imageActionText}>Select from Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageActionButton, styles.cameraButton]}
                  onPress={openCamera}
                  activeOpacity={0.85}
                >
                  <Text style={styles.imageActionIcon}>📷</Text>
                  <Text style={styles.imageActionText}>Take Photo</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Preview Stage */}
            {stage === 'preview' && selectedImage && (
              <View style={styles.stageContainer}>
                <Text style={styles.stageTitle}>Preview Image</Text>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <Text style={styles.previewFileName}>{selectedImage.fileName || 'Selected Image'}</Text>

                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={openGallery}
                  activeOpacity={0.85}
                >
                  <Text style={styles.changeImageButtonText}>Change Image</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.imageActionButton, styles.analyzeButton]}
                  onPress={handleAnalyzeImage}
                  disabled={analysisLoading}
                  activeOpacity={0.85}
                >
                  {analysisLoading ? (
                    <ActivityIndicator size="large" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.imageActionIcon}>✨</Text>
                      <Text style={styles.imageActionText}>Analyze Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Results Stage */}
            {stage === 'results' && analysisResult && (
              <View style={styles.stageContainer}>
                <Text style={styles.stageTitle}>Analysis Results</Text>

                {/* Analysis Text Card */}
                <View style={styles.resultCard}>
                  <Text style={styles.resultLabel}>Analysis Text</Text>
                  <Text style={styles.resultText}>{analysisResult.analysis_text}</Text>
                </View>

                {/* Detected Objects Card */}
                {analysisResult.detected_objects && analysisResult.detected_objects.length > 0 && (
                  <View style={styles.resultCard}>
                    <Text style={styles.resultLabel}>Detected Objects</Text>
                    <View style={styles.objectsContainer}>
                      {analysisResult.detected_objects.map((obj, index) => (
                        <View key={index} style={styles.objectTag}>
                          <Text style={styles.objectTagText}>{obj}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Audio Playback Card */}
                {analysisResult.audio_url && (
                  <TouchableOpacity
                    style={[styles.audioButton, audioPlaying && styles.audioButtonActive]}
                    onPress={handlePlayAudio}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.audioIcon}>{audioPlaying ? '⏸' : '▶'}</Text>
                    <Text style={styles.audioButtonText}>
                      {audioPlaying ? 'Playing...' : 'Play Audio Narration'}
                    </Text>
                  </TouchableOpacity>
                )}

                {/* New Analysis Button */}
                <TouchableOpacity
                  style={styles.newAnalysisButton}
                  onPress={handleReset}
                  activeOpacity={0.85}
                >
                  <Text style={styles.newAnalysisButtonText}>Analyze Another Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '95%',
    paddingTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    color: '#2C2C2C',
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C2C2C',
    textAlign: 'center',
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  stageContainer: {
    alignItems: 'center',
  },
  stageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 8,
    textAlign: 'center',
  },
  stageDescription: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 28,
    textAlign: 'center',
  },
  imageActionButton: {
    backgroundColor: '#BB9C66',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 14,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cameraButton: {
    backgroundColor: '#8B7355',
  },
  analyzeButton: {
    backgroundColor: '#BB9C66',
    marginTop: 16,
  },
  imageActionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  imageActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  previewImage: {
    width: Dimensions.get('window').width - 60,
    height: 300,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#F5F5F5',
  },
  previewFileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
  },
  changeImageButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#BB9C66',
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  changeImageButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#BB9C66',
  },
  resultCard: {
    backgroundColor: '#F9F7F4',
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: '#BB9C66',
    width: '100%',
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BB9C66',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resultText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2C2C2C',
    lineHeight: 22,
  },
  objectsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  objectTag: {
    backgroundColor: '#BB9C66',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  objectTagText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  audioButton: {
    backgroundColor: '#F0E5D8',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    borderWidth: 2,
    borderColor: '#BB9C66',
    width: '100%',
  },
  audioButtonActive: {
    backgroundColor: '#BB9C66',
  },
  audioIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  audioButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  newAnalysisButton: {
    backgroundColor: '#BB9C66',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
    width: '100%',
  },
  newAnalysisButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default ImageAnalysisModal;
