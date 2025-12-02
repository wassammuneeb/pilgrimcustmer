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
} from 'react-native';
import Sound from 'react-native-sound';

const AnalysisResultModal = ({ visible, onClose, analysisData, t }) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [sound, setSound] = useState(null);

  const playAudio = () => {
    if (analysisData?.audioAvailable && analysisData?.analysis?.audio_url) {
      const audioPath = analysisData.analysis.audio_url;

      const newSound = new Sound(audioPath, Sound.MAIN_BUNDLE, (error) => {
        if (error) {
          console.error('Error loading sound:', error);
          return;
        }
        newSound.play((success) => {
          if (success) {
            setIsPlayingAudio(false);
          }
        });
      });

      setSound(newSound);
      setIsPlayingAudio(true);
    }
  };

  const stopAudio = () => {
    if (sound) {
      sound.stop(() => {
        sound.release();
        setSound(null);
        setIsPlayingAudio(false);
      });
    }
  };

  const handleClose = () => {
    stopAudio();
    onClose();
  };

  if (!analysisData) {
    return null;
  }

  const { analysis, userId } = analysisData;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('analysisResultText') || 'Analysis Result'}</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            {/* Analysis Title */}
            <View style={styles.resultCard}>
              <Text style={styles.cardLabel}>{t('detectedObjectsText') || 'Detected Objects'}</Text>
              {analysis?.detected_objects && analysis.detected_objects.length > 0 ? (
                <View style={styles.objectsList}>
                  {analysis.detected_objects.map((obj, idx) => (
                    <View key={idx} style={styles.objectItem}>
                      <Text style={styles.objectBullet}>•</Text>
                      <View style={styles.objectContent}>
                        <Text style={styles.objectName}>{obj.name}</Text>
                        <Text style={styles.objectConfidence}>
                          {t('confidenceText') || 'Confidence'}: {(obj.confidence * 100).toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.noDataText}>
                  {t('noObjectsDetectedText') || 'No objects detected'}
                </Text>
              )}
            </View>

            {/* Analysis Text */}
            {analysis?.analysis_text && (
              <View style={styles.resultCard}>
                <Text style={styles.cardLabel}>{t('analysisDescriptionText') || 'Analysis Description'}</Text>
                <Text style={styles.analysisText}>{analysis.analysis_text}</Text>
              </View>
            )}

            {/* Audio Playback */}
            {analysisData?.audioAvailable && (
              <View style={styles.resultCard}>
                <Text style={styles.cardLabel}>{t('audioNarrationText') || 'Audio Narration'}</Text>
                <TouchableOpacity
                  style={[styles.audioButton, isPlayingAudio && styles.audioButtonActive]}
                  onPress={isPlayingAudio ? stopAudio : playAudio}
                >
                  <Text style={styles.audioIcon}>{isPlayingAudio ? '⏸' : '▶'}</Text>
                  <Text style={styles.audioButtonText}>
                    {isPlayingAudio ? (t('stopText') || 'Stop') : (t('playText') || 'Play')} {t('audioText') || 'Audio'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Metadata */}
            <View style={styles.resultCard}>
              <Text style={styles.cardLabel}>{t('informationText') || 'Information'}</Text>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{t('userText') || 'User ID'}:</Text>
                <Text style={styles.metadataValue}>{userId}</Text>
              </View>
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>{t('timestampText') || 'Timestamp'}:</Text>
                <Text style={styles.metadataValue}>{analysisData.timestamp}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.closeModalButton} onPress={handleClose}>
              <Text style={styles.closeModalButtonText}>{t('doneText') || 'Done'}</Text>
            </TouchableOpacity>
          </View>
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
    maxHeight: '95%',
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
    paddingVertical: 16,
  },
  resultCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#BB9C66',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  objectsList: {
    gap: 10,
  },
  objectItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  objectBullet: {
    fontSize: 16,
    color: '#BB9C66',
    fontWeight: '700',
    marginRight: 10,
    marginTop: 2,
  },
  objectContent: {
    flex: 1,
  },
  objectName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 4,
  },
  objectConfidence: {
    fontSize: 12,
    color: '#999999',
    fontWeight: '500',
  },
  noDataText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  analysisText: {
    fontSize: 14,
    color: '#2C2C2C',
    lineHeight: 22,
    fontWeight: '500',
  },
  audioButton: {
    backgroundColor: '#BB9C66',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  audioButtonActive: {
    backgroundColor: '#9A7F54',
  },
  audioIcon: {
    fontSize: 20,
    color: '#FFFFFF',
  },
  audioButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  metadataRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
  },
  metadataLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2C2C2C',
    marginTop: 4,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  closeModalButton: {
    backgroundColor: '#BB9C66',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default AnalysisResultModal;
