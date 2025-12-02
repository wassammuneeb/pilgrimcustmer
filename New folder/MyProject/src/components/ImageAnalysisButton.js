import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

const ImageAnalysisButton = ({ onPress, t }) => {
  return (
    <TouchableOpacity
      style={styles.aiAnalysisCard}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={styles.aiAnalysisIcon}>🤖</Text>
      <Text style={styles.aiAnalysisTitle}>AI Image Analysis</Text>
      <Text style={styles.aiAnalysisSubtitle}>Analyze images with advanced AI</Text>
      <View style={styles.aiAnalysisBadge}>
        <Text style={styles.aiAnalysisBadgeText}>NEW</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  aiAnalysisCard: {
    backgroundColor: '#BB9C66',
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginHorizontal: 15,
    marginVertical: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  aiAnalysisIcon: {
    fontSize: 42,
    marginBottom: 12,
  },
  aiAnalysisTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
    textAlign: 'center',
  },
  aiAnalysisSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.95)',
    textAlign: 'center',
    marginBottom: 12,
  },
  aiAnalysisBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiAnalysisBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8B7355',
  },
});

export default ImageAnalysisButton;
