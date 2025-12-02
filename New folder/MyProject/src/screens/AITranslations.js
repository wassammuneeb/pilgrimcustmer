"use client"
import React, { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Alert,
  PermissionsAndroid,
} from "react-native"
import axiosInstance from "../axiosInstance"
import AsyncStorage from "@react-native-async-storage/async-storage"
import AudioRecorderPlayer from 'react-native-audio-recorder-player'
import RNFS from 'react-native-fs'
import Sound from 'react-native-sound'

const AITranslations = ({ navigation }) => {
  const [sourceLanguage, setSourceLanguage] = useState("ur")
  const [targetLanguage, setTargetLanguage] = useState("ar")
  const [inputText, setInputText] = useState("")
  const [translatedText, setTranslatedText] = useState("")
  const [translatedAudioUrl, setTranslatedAudioUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showLanguageModal, setShowLanguageModal] = useState(false)
  const [languageType, setLanguageType] = useState("source")
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPlayingTranslatedAudio, setIsPlayingTranslatedAudio] = useState(false)
  const [recordTime, setRecordTime] = useState("00:00:00")
  const [playTime, setPlayTime] = useState("00:00:00")
  const [duration, setDuration] = useState("00:00:00")
  const [audioPath, setAudioPath] = useState("")

  const scrollViewRef = useRef(null)
  const audioRecorderPlayer = useRef(AudioRecorderPlayer).current
  const soundRef = useRef(null)
  const translatedSoundRef = useRef(null)

  // <CHANGE> Updated language codes to match backend: ar instead of arabi, en instead of english
  const languages = [
    { code: "ur", name: "Urdu" },
    { code: "romanur", name: "Roman Urdu" },
    { code: "ar", name: "Arabic" },
    { code: "en", name: "English" },
  ]

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.release()
      }
      if (translatedSoundRef.current) {
        translatedSoundRef.current.release()
      }
    }
  }, [])

  // Request microphone permission
  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        )
        console.log('Permission result:', granted)
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission required',
            'Please allow microphone permission to record audio'
          )
          return false
        }
        return true
      } catch (err) {
        console.warn('Permission error:', err)
        return false
      }
    }
    return true
  }

  // Generate audio path
  const getAudioPath = () => {
    const timestamp = new Date().getTime()
    return Platform.OS === 'ios'
      ? `voice_${timestamp}.wav`
      : `${RNFS.ExternalDirectoryPath}/voice_${timestamp}.wav`
  }

  // Start recording
  const startRecording = async () => {
    try {
      const hasPermission = await requestAudioPermission()
      if (!hasPermission) return
      const path = getAudioPath()
      console.log('Recording to path:', path)
      setIsRecording(true)
      setRecordTime("00:00:00")
      setAudioPath("")
      const result = await audioRecorderPlayer.startRecorder(path)
      console.log('Recorder started, result path:', result)
      audioRecorderPlayer.addRecordBackListener((e) => {
        setRecordTime(audioRecorderPlayer.mmssss(Math.floor(e.current_position)))
      })
      setAudioPath(result)
    } catch (error) {
      console.error('Failed to start recording:', error)
      Alert.alert('Error', 'Failed to start recording')
      setIsRecording(false)
    }
  }

  // Stop recording
  const stopRecording = async () => {
    try {
      const result = await audioRecorderPlayer.stopRecorder()
      audioRecorderPlayer.removeRecordBackListener()
      setIsRecording(false)
      setAudioPath(result)
      console.log('Recording stopped. Path:', result)

      // Auto-translate after recording stops
      if (result) {
        await handleVoiceTranslate(result)
      }
    } catch (error) {
      console.error('Failed to stop recording:', error)
      Alert.alert('Error', 'Failed to stop recording')
      setIsRecording(false)
    }
  }

  // Play recorded audio
  const playAudio = async () => {
    if (!audioPath) {
      Alert.alert('No audio', 'Please record audio first')
      return
    }

    try {
      const pathToPlay = Platform.OS === 'android'
        ? audioPath.replace('file://', '')
        : audioPath
      const exists = await RNFS.exists(pathToPlay)
      console.log('Playback path exists:', exists, 'Path:', pathToPlay)
      if (!exists) {
        Alert.alert('Error', 'Audio file not found')
        return
      }

      setIsPlaying(true)
      soundRef.current = new Sound(pathToPlay, '', (error) => {
        if (error) {
          console.log('Sound load error:', error)
          setIsPlaying(false)
          Alert.alert('Error', 'Failed to play audio')
          return
        }
        console.log('Sound loaded, duration:', soundRef.current.getDuration())
        setDuration(audioRecorderPlayer.mmssss(Math.floor(soundRef.current.getDuration() * 1000)))

        soundRef.current.play((success) => {
          if (success) {
            console.log('Sound playback finished successfully')
          } else {
            console.log('Sound playback failed')
          }
          setIsPlaying(false)
          soundRef.current.release()
          soundRef.current = null
        })
      })
    } catch (error) {
      console.error('Failed to play audio:', error)
      Alert.alert('Error', 'Failed to play audio')
      setIsPlaying(false)
    }
  }

  // Stop playing audio
  const stopAudio = () => {
    if (soundRef.current) {
      soundRef.current.stop(() => {
        console.log('Playback stopped manually')
        setIsPlaying(false)
        soundRef.current.release()
        soundRef.current = null
      })
    }
  }

  // <CHANGE> Play translated audio from API result
  const playTranslatedAudio = async () => {
    if (!translatedAudioUrl) {
      Alert.alert('No audio', 'No audio available for this translation')
      return
    }

    try {
      setIsPlayingTranslatedAudio(true)
      translatedSoundRef.current = new Sound(translatedAudioUrl, '', (error) => {
        if (error) {
          console.log('Sound load error:', error)
          setIsPlayingTranslatedAudio(false)
          Alert.alert('Error', 'Failed to play audio')
          return
        }

        translatedSoundRef.current.play((success) => {
          if (success) {
            console.log('Translated audio playback finished successfully')
          } else {
            console.log('Translated audio playback failed')
          }
          setIsPlayingTranslatedAudio(false)
          translatedSoundRef.current.release()
          translatedSoundRef.current = null
        })
      })
    } catch (error) {
      console.error('Failed to play translated audio:', error)
      Alert.alert('Error', 'Failed to play audio')
      setIsPlayingTranslatedAudio(false)
    }
  }

  // Stop playing translated audio
  const stopTranslatedAudio = () => {
    if (translatedSoundRef.current) {
      translatedSoundRef.current.stop(() => {
        console.log('Translated audio playback stopped manually')
        setIsPlayingTranslatedAudio(false)
        translatedSoundRef.current.release()
        translatedSoundRef.current = null
      })
    }
  }

  // <CHANGE> Handle voice translation with correct language codes and audio extraction
  const handleVoiceTranslate = async (audioUri) => {
    setLoading(true)
    setError("")
    try {
      const userId = await AsyncStorage.getItem("userId")
      const filePath = Platform.OS === 'android'
        ? audioUri.replace('file://', '')
        : audioUri

      const fileExists = await RNFS.exists(filePath)
      if (!fileExists) {
        throw new Error('Audio file not found')
      }

      const fileInfo = await RNFS.stat(filePath)
      console.log('File info:', fileInfo)

      const formData = new FormData()
      formData.append('audio', {
        uri: Platform.OS === 'android' ? `file://${filePath}` : filePath,
        type: 'audio/wav',
        name: 'recording.wav',
      })
      // <CHANGE> Using backend-compatible language codes
      formData.append('source_lang', sourceLanguage)
      formData.append('target_lang', targetLanguage)

      console.log("[Voice Translation API] Request payload prepared")
      console.log(`[Voice Translation API] Languages: ${sourceLanguage} → ${targetLanguage}`)

      const response = await axiosInstance.post(
        "https://pilgrimplannerbackend.onrender.com/api/visual/translation-chat/translate-voice",
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 30000,
        }
      )

      console.log("[Voice Translation API] Response status:", response.status)
      console.log("[Voice Translation API] Response data:", JSON.stringify(response.data, null, 2))

      if (response.data.success) {
        // <CHANGE> Extract translated text
        const translatedTextString = response.data.translation.translated_text || response.data.translation

        // <CHANGE> Extract audio URL if available
        const audioUrl = response.data.translation.audio_url || response.data.translation.audio || ""

        setTranslatedText(translatedTextString)
        setTranslatedAudioUrl(audioUrl)
        Keyboard.dismiss()

        if (response.data.transcription) {
          setInputText(response.data.transcription)
        }
      } else {
        const errorMsg = response.data.error || "Voice translation failed"
        console.error("[Voice Translation API] Error response:", errorMsg)
        setError(errorMsg)
        Alert.alert("Translation Error", errorMsg, [{ text: "OK", onPress: () => {} }])
      }
    } catch (err) {
      console.error("[Voice Translation API] Exception occurred:", err)
      const errorMsg = err.response?.data?.error || err.message || "Failed to translate voice. Please try again."
      setError(errorMsg)
      Alert.alert("Error", errorMsg, [{ text: "OK", onPress: () => {} }])
    } finally {
      setLoading(false)
    }
  }

  // <CHANGE> Handle text translation with correct language codes
  const handleTranslate = async () => {
    if (sourceLanguage === targetLanguage) {
      Alert.alert(
        "Invalid Selection",
        "Source and target languages cannot be the same. Please select different languages.",
        [{ text: "OK", onPress: () => {} }],
      )
      return
    }

    if (!inputText.trim()) {
      Alert.alert("Empty Text", "Please enter text to translate.", [{ text: "OK", onPress: () => {} }])
      return
    }

    setLoading(true)
    setError("")
    try {
      const userId = await AsyncStorage.getItem("userId")
      const payload = {
        text: inputText.trim(),
        // <CHANGE> Using backend-compatible language codes
        source_lang: sourceLanguage,
        target_lang: targetLanguage,
        generate_audio: false,
      }

      console.log("[Translation API] Request payload:", JSON.stringify(payload, null, 2))
      console.log(`[Translation API] Languages: ${sourceLanguage} → ${targetLanguage}`)

      const response = await axiosInstance.post(
        "https://pilgrimplannerbackend.onrender.com/api/visual/translation-chat/translate-text",
        payload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      console.log("[Translation API] Response status:", response.status)
      console.log("[Translation API] Response data:", JSON.stringify(response.data, null, 2))

      if (response.data.success) {
        const translatedTextString = response.data.translation.translated_text || response.data.translation
        setTranslatedText(translatedTextString)
        setTranslatedAudioUrl("")
        Keyboard.dismiss()
      } else {
        const errorMsg = response.data.error || "Translation failed"
        console.error("[Translation API] Error response:", errorMsg)
        setError(errorMsg)
        Alert.alert("Translation Error", errorMsg, [{ text: "OK", onPress: () => {} }])
      }
    } catch (err) {
      console.error("[Translation API] Exception occurred:", err)
      const errorMsg = "Failed to translate. Please try again."
      setError(errorMsg)
      Alert.alert("Error", errorMsg, [{ text: "OK", onPress: () => {} }])
    } finally {
      setLoading(false)
    }
  }

  const swapLanguages = () => {
    const newSource = targetLanguage
    const newTarget = sourceLanguage
    if (newSource === newTarget) {
      Alert.alert("Invalid Swap", "Cannot swap languages to the same language.", [{ text: "OK", onPress: () => {} }])
      return
    }
    setSourceLanguage(newSource)
    setTargetLanguage(newTarget)
    setInputText(translatedText)
    setTranslatedText(inputText)
    setTranslatedAudioUrl("")
  }

  const selectLanguage = (code) => {
    if (languageType === "source") {
      if (code === targetLanguage) {
        Alert.alert("Same Language", "Source and target languages cannot be the same.", [
          { text: "OK", onPress: () => {} },
        ])
        return
      }
      setSourceLanguage(code)
    } else {
      if (code === sourceLanguage) {
        Alert.alert("Same Language", "Source and target languages cannot be the same.", [
          { text: "OK", onPress: () => {} },
        ])
        return
      }
      setTargetLanguage(code)
    }
    setShowLanguageModal(false)
  }

  const getLanguageName = (code) => {
    return languages.find((lang) => lang.code === code)?.name || code
  }

  const clearAll = () => {
    setInputText("")
    setTranslatedText("")
    setTranslatedAudioUrl("")
    setError("")
    setAudioPath("")
    setRecordTime("00:00:00")
    setPlayTime("00:00:00")
    setDuration("00:00:00")
    if (soundRef.current) {
      stopAudio()
    }
    if (translatedSoundRef.current) {
      stopTranslatedAudio()
    }
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Translator</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoidView}>
        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Language Selection */}
          <View style={styles.languageSelector}>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => {
                setLanguageType("source")
                setShowLanguageModal(true)
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.languageButtonLabel}>From</Text>
              <Text style={styles.languageButtonValue}>{getLanguageName(sourceLanguage)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.swapButton} onPress={swapLanguages} activeOpacity={0.7}>
              <Text style={styles.swapButtonText}>⇄</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.languageButton}
              onPress={() => {
                setLanguageType("target")
                setShowLanguageModal(true)
              }}
              activeOpacity={0.75}
            >
              <Text style={styles.languageButtonLabel}>To</Text>
              <Text style={styles.languageButtonValue}>{getLanguageName(targetLanguage)}</Text>
            </TouchableOpacity>
          </View>

          {/* Voice Recording Section */}
          <View style={styles.voiceSection}>
            <Text style={styles.sectionLabel}>Voice Translation</Text>
            <View style={styles.voiceControls}>
              <TouchableOpacity
                style={[
                  styles.recordButton,
                  isRecording && styles.recordButtonActive,
                  loading && styles.recordButtonDisabled,
                ]}
                onPress={isRecording ? stopRecording : startRecording}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={[styles.recordButtonText, isRecording && styles.recordButtonTextActive]}>
                  {isRecording ? "⏹️ Stop" : "🎤 Record"}
                </Text>
              </TouchableOpacity>
              {audioPath && !isRecording && (
                <TouchableOpacity
                  style={[styles.playButton, isPlaying && styles.playButtonActive]}
                  onPress={isPlaying ? stopAudio : playAudio}
                  activeOpacity={0.8}
                >
                  <Text style={styles.playButtonText}>
                    {isPlaying ? "⏸️ Pause" : "▶️ Play"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {(isRecording || audioPath) && (
              <View style={styles.audioInfo}>
                <Text style={styles.audioTime}>
                  {isRecording ? `Recording: ${recordTime}` : `Playback: ${playTime} / ${duration}`}
                </Text>
              </View>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Input Section */}
          <View style={styles.inputSection}>
            <Text style={styles.sectionLabel}>Text to Translate</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="Enter text here..."
                placeholderTextColor="#999999"
                value={inputText}
                onChangeText={setInputText}
                multiline
                textAlignVertical="top"
                editable={!loading}
              />
              {inputText.length > 0 && (
                <TouchableOpacity style={styles.clearButton} onPress={() => setInputText("")} activeOpacity={0.7}>
                  <Text style={styles.clearButtonText}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.charCount}>{inputText.length} characters</Text>
          </View>

          {/* Translate Button */}
          <TouchableOpacity
            style={[styles.translateButton, loading && styles.translateButtonDisabled]}
            onPress={handleTranslate}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="large" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.translateButtonIcon}>✨</Text>
                <Text style={styles.translateButtonText}>Translate</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Error Message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Output Section */}
          {translatedText && (
            <View style={styles.outputSection}>
              <Text style={styles.sectionLabel}>Translation</Text>
              <View style={styles.outputWrapper}>
                <Text style={styles.translatedText}>{translatedText}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => {
                    Alert.alert("Copied!", "Translation copied to clipboard")
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.copyButtonText}>📋</Text>
                </TouchableOpacity>
              </View>
                         
              {/* <CHANGE> Added audio playback for translated result */}
              {translatedAudioUrl && (
                <View style={styles.translatedAudioSection}>
                  <Text style={styles.audioSectionLabel}>Audio Result</Text>
                  <TouchableOpacity
                    style={[
                      styles.playTranslatedAudioButton,
                      isPlayingTranslatedAudio && styles.playTranslatedAudioButtonActive,
                    ]}
                    onPress={isPlayingTranslatedAudio ? stopTranslatedAudio : playTranslatedAudio}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.playTranslatedAudioButtonText}>
                      {isPlayingTranslatedAudio ? "⏸️ Pause Audio" : "🔊 Play Audio"}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Clear All Button */}
          {(inputText || translatedText || audioPath) && (
            <TouchableOpacity style={styles.clearAllButton} onPress={clearAll} activeOpacity={0.7}>
              <Text style={styles.clearAllButtonText}>Clear All</Text>
            </TouchableOpacity>
          )}

          {/* Info Section */}
          <View style={styles.infoSection}>
            <View style={styles.infoCard}>
              <Text style={styles.infoIcon}>💡</Text>
              <View style={styles.infoContent}>
                <Text style={styles.infoTitle}>Pro Tips</Text>
                <Text style={styles.infoText}>• Use clear and simple text for better translations</Text>
                <Text style={styles.infoText}>• You can swap languages with the swap button</Text>
                <Text style={styles.infoText}>• Record voice in a quiet environment for better accuracy</Text>
                <Text style={styles.infoText}>• Voice recordings auto-translate when you stop recording</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {languageType === "source" ? "Source" : "Target"} Language</Text>
              <TouchableOpacity onPress={() => setShowLanguageModal(false)} style={styles.modalCloseButton}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.languageList}>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    (languageType === "source" ? sourceLanguage : targetLanguage) === lang.code &&
                      styles.languageOptionSelected,
                  ]}
                  onPress={() => selectLanguage(lang.code)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.languageOptionText,
                      (languageType === "source" ? sourceLanguage : targetLanguage) === lang.code &&
                        styles.languageOptionSelectedText,
                    ]}
                  >
                    {lang.name}
                  </Text>
                  {(languageType === "source" ? sourceLanguage : targetLanguage) === lang.code && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  keyboardAvoidView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#BB9C66",
    paddingTop: 50,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    paddingBottom: 60,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
    backgroundColor: "#F8F8F8",
    borderRadius: 20,
    padding: 12,
  },
  languageButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    alignItems: "center",
  },
  languageButtonLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#999999",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  languageButtonValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#BB9C66",
  },
  swapButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#BB9C66",
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  swapButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  voiceSection: {
    marginBottom: 20,
  },
  voiceControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  recordButton: {
    flex: 1,
    backgroundColor: "#FF6B6B",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  recordButtonActive: {
    backgroundColor: "#4ECDC4",
  },
  recordButtonDisabled: {
    opacity: 0.6,
  },
  recordButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  recordButtonTextActive: {
    color: "#FFFFFF",
  },
  playButton: {
    flex: 1,
    backgroundColor: "#4ECDC4",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playButtonActive: {
    backgroundColor: "#FF6B6B",
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  audioInfo: {
    marginTop: 8,
    alignItems: "center",
  },
  audioTime: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: "600",
    color: "#999999",
  },
  inputSection: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 10,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#2C2C2C",
    minHeight: 120,
    maxHeight: 200,
    fontWeight: "500",
  },
  clearButton: {
    position: "absolute",
    top: 10,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
  },
  clearButtonText: {
    fontSize: 16,
    color: "#999999",
    fontWeight: "600",
  },
  charCount: {
    fontSize: 12,
    color: "#999999",
    fontWeight: "500",
    textAlign: "right",
  },
  translateButton: {
    backgroundColor: "#BB9C66",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  translateButtonDisabled: {
    opacity: 0.7,
  },
  translateButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  translateButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  errorContainer: {
    backgroundColor: "#FFE8E8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#FF4444",
  },
  errorIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#CC0000",
    fontWeight: "600",
    flex: 1,
  },
  outputSection: {
    marginBottom: 24,
  },
  outputWrapper: {
    position: "relative",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#BB9C66",
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 100,
  },
  translatedText: {
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "500",
    lineHeight: 24,
    paddingRight: 40,
  },
  copyButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  copyButtonText: {
    fontSize: 16,
  },
  // <CHANGE> Added styles for translated audio section
  translatedAudioSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  audioSectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#999999",
    marginBottom: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  playTranslatedAudioButton: {
    backgroundColor: "#4ECDC4",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    shadowColor: "#4ECDC4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  playTranslatedAudioButtonActive: {
    backgroundColor: "#FF6B6B",
  },
  playTranslatedAudioButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  clearAllButton: {
    backgroundColor: "#666666",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  clearAllButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  infoSection: {
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: "rgba(187, 156, 102, 0.1)",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    borderLeftWidth: 4,
    borderLeftColor: "#BB9C66",
  },
  infoIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#BB9C66",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 13,
    color: "#666666",
    fontWeight: "500",
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: "80%",
    paddingTop: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    flex: 1,
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseText: {
    fontSize: 20,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  languageList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  languageOption: {
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  languageOptionSelected: {
    backgroundColor: "#BB9C66",
  },
  languageOptionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  languageOptionSelectedText: {
    color: "#FFFFFF",
  },
  checkmark: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
  },
})

export default AITranslations