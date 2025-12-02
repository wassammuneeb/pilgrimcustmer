import React, { useState } from 'react';
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
} from 'react-native';
import { launchImageLibrary, launchCamera } from 'react-native-image-picker';

const ImagePickerModal = ({ visible, onClose, onImageSelect, t }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [stage, setStage] = useState('options'); // 'options' | 'preview' | 'uploading'

  const openGallery = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('Gallery cancelled');
      } else if (response.errorCode) {
        Alert.alert(t('errorText') || 'Error', response.errorMessage);
      } else {
        setSelectedImage(response.assets[0]);
        setStage('preview');
      }
    });
  };

  const openCamera = () => {
    const options = {
      mediaType: 'photo',
      includeBase64: false,
      maxHeight: 2000,
      maxWidth: 2000,
    };

    launchCamera(options, (response) => {
      if (response.didCancel) {
        console.log('Camera cancelled');
      } else if (response.errorCode) {
        Alert.alert(t('errorText') || 'Error', response.errorMessage);
      } else {
        setSelectedImage(response.assets[0]);
        setStage('preview');
      }
    });
  };

  const handleAnalyze = () => {
    if (selectedImage) {
      setStage('uploading');
      onImageSelect(selectedImage);
    }
  };

  const resetModal = () => {
    setStage('options');
    setSelectedImage(null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {stage === 'options' ? t('selectImageText') || 'Select Image' : t('previewImageText') || 'Preview Image'}
            </Text>
            <TouchableOpacity onPress={resetModal}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {stage === 'options' && (
              <>
                <Text style={styles.description}>{t('chooseImageSourceText') || 'Choose image source'}</Text>
                <TouchableOpacity style={styles.optionButton} onPress={openGallery}>
                  <Text style={styles.optionIcon}>🖼️</Text>
                  <Text style={styles.optionTitle}>{t('galleryText') || 'Gallery'}</Text>
                  <Text style={styles.optionDesc}>{t('selectFromGalleryText') || 'Select from gallery'}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.optionButton} onPress={openCamera}>
                  <Text style={styles.optionIcon}>📷</Text>
                  <Text style={styles.optionTitle}>{t('cameraText') || 'Camera'}</Text>
                  <Text style={styles.optionDesc}>{t('takePhotoText') || 'Take a photo'}</Text>
                </TouchableOpacity>
              </>
            )}

            {stage === 'preview' && selectedImage && (
              <>
                <Image
                  source={{ uri: selectedImage.uri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
                <Text style={styles.previewText}>
                  {selectedImage.fileName || 'Selected Image'}
                </Text>
              </>
            )}

            {stage === 'uploading' && (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#BB9C66" />
                <Text style={styles.uploadingText}>{t('analyzingText') || 'Analyzing image...'}</Text>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          {stage === 'preview' && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setSelectedImage(null);
                  setStage('options');
                }}
              >
                <Text style={styles.cancelButtonText}>{t('backText') || 'Back'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.analyzeButton} onPress={handleAnalyze}>
                <Text style={styles.analyzeButtonText}>{t('analyzeText') || 'Analyze'}</Text>
              </TouchableOpacity>
            </View>
          )}

          {stage === 'options' && (
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelButton} onPress={resetModal}>
                <Text style={styles.cancelButtonText}>{t('cancelText') || 'Cancel'}</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
  },
  closeButton: {
    fontSize: 24,
    color: '#666666',
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  optionButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#EFEFEF',
  },
  optionIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 6,
  },
  optionDesc: {
    fontSize: 13,
    color: '#999999',
    fontWeight: '500',
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    marginBottom: 16,
    backgroundColor: '#F0F0F0',
  },
  previewText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 20,
  },
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  uploadingText: {
    fontSize: 16,
    color: '#2C2C2C',
    marginTop: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#666666',
  },
  analyzeButton: {
    flex: 1,
    backgroundColor: '#BB9C66',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default ImagePickerModal;
