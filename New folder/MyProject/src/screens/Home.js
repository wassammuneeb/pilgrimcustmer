import { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  AppState,
  PermissionsAndroid,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import moment from "moment"
import Geolocation from "react-native-geolocation-service"
import Navigation from "../components/Navigation"
import axiosInstance from "../axiosInstance"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { homeTranslations as translations } from "../translations/homeTranslations"
import { launchImageLibrary, launchCamera } from "react-native-image-picker"
import Sound from "react-native-sound"

const DEFAULT_COORDS = { latitude: 24.8933, longitude: 67.0882 }

const Home = ({ navigation }) => {
  const [remainingSeconds, setRemainingSeconds] = useState(null)
  const [nextPrayerLabel, setNextPrayerLabel] = useState("")
  const [targetTime, setTargetTime] = useState(null)
  const [language, setLanguage] = useState("en")
  const appState = useRef(AppState.currentState)

  const [showImageAnalysisModal, setShowImageAnalysisModal] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [audioPlaying, setAudioPlaying] = useState(false)
  const soundRef = useRef(null)

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData")
        if (userDataStr) {
          const userData = JSON.parse(userDataStr)
          if (userData?.preferredLanguage) {
            setLanguage(userData.preferredLanguage)
            return
          }
        }
        const storedLang = await AsyncStorage.getItem("selectedLanguage")
        if (storedLang) {
          setLanguage(storedLang)
          return
        }
      } catch (err) {
        console.warn("Language load error:", err)
      }
    }
    loadLanguage()
  }, [])

  const t = (key) => {
    const lang = language || "en"
    return (translations[lang] && translations[lang][key]) || (translations["en"] && translations["en"][key]) || key
  }

  const requestLocationPermission = async () => {
    if (Platform.OS === "android") {
      try {
        const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION)
        return granted === PermissionsAndroid.RESULTS.GRANTED
      } catch (err) {
        console.warn(err)
        return false
      }
    }
    return true
  }

  const fetchPrayerTime = async () => {
    let usedDefault = false
    let locationString = t("yourLocationText")

    const loadPrayerTimes = async (latitude, longitude, isDefault = false) => {
      try {
        if (!isDefault) {
          try {
            const geoResponse = await axiosInstance.get(`https://nominatim.openstreetmap.org/reverse`, {
              headers: {
                "User-Agent": "PilgrimPlannerApp/1.0 (support@pilgrimplanner.com)",
              },
              params: {
                lat: latitude,
                lon: longitude,
                format: "json",
                "accept-language": "en",
              },
            })
            const address = geoResponse.data.address
            console.log("🌎 Full address:", address)
            const place = address.suburb || address.neighbourhood || address.village || address.town
            const city = address.city || address.county
            const state = address.state
            const country = address.country
            locationString = [place, city, state, country].filter(Boolean).join(", ")
          } catch (geoErr) {
            console.error("Reverse geocode failed", geoErr)
          }
        } else {
          locationString = t("karachiDefaultText")
        }

        const response = await axiosInstance.get("https://api.aladhan.com/v1/timings/today", {
          params: {
            latitude,
            longitude,
            method: 1,
            school: 1,
            timezonestring: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        })

        const timings = response.data.data.timings
        console.log("🕌 Prayer Timings:", timings)

        const prayerOrder = ["Fajr", "Dhuhr", "Asr", "Maghrib", "Isha"]
        const now = moment()
        let nextPrayer = null
        let secondsLeft = null
        let targetMoment = null

        for (let i = 0; i < prayerOrder.length; i++) {
          const prayerName = prayerOrder[i]
          const cleanTime = timings[prayerName].split(" ")[0]
          const [hour, minute] = cleanTime.split(":")
          const prayerTime = moment().set({
            hour: Number.parseInt(hour),
            minute: Number.parseInt(minute),
            second: 0,
            millisecond: 0,
          })

          if (prayerTime.isAfter(now)) {
            nextPrayer = prayerName
            secondsLeft = prayerTime.diff(now, "seconds")
            targetMoment = prayerTime.toDate()
            break
          }
        }

        if (!nextPrayer) {
          const cleanTime = timings["Fajr"].split(" ")[0]
          const [hour, minute] = cleanTime.split(":")
          const prayerTime = moment()
            .add(1, "day")
            .set({
              hour: Number.parseInt(hour),
              minute: Number.parseInt(minute),
              second: 0,
              millisecond: 0,
            })
          nextPrayer = "Fajr"
          secondsLeft = prayerTime.diff(now, "seconds")
          targetMoment = prayerTime.toDate()
        }

        setRemainingSeconds(secondsLeft)
        setNextPrayerLabel(`${t("remainingTimeText")} ${nextPrayer} ${t("prayerText")} (${locationString})`)
        setTargetTime(targetMoment)
      } catch (err) {
        console.error("Error loading prayer times:", err)
      }
    }

    try {
      const hasPermission = await requestLocationPermission()
      if (hasPermission) {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords
            console.log("🛰️ Current location:", latitude, longitude)
            loadPrayerTimes(latitude, longitude)
          },
          (error) => {
            console.error("Location error:", error)
            usedDefault = true
            loadPrayerTimes(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, true)
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        )
      } else {
        console.log("🚫 Location permission denied. Using default location.")
        usedDefault = true
        loadPrayerTimes(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, true)
      }
    } catch (err) {
      console.error("Permission/location error. Using default.", err)
      usedDefault = true
      loadPrayerTimes(DEFAULT_COORDS.latitude, DEFAULT_COORDS.longitude, true)
    }
  }

  useEffect(() => {
    fetchPrayerTime()
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        console.log("App returned to foreground. Refreshing prayer times...")
        fetchPrayerTime()
      }
    })
    return () => subscription.remove()
  }, [])

  const handlePickImage = () => {
    launchImageLibrary(
      {
        mediaType: "photo",
        quality: 0.9,
      },
      (response) => {
        if (response.didCancel) {
          console.log("Image picker cancelled")
        } else if (response.errorCode) {
          console.error("Image picker error:", response.errorMessage)
        } else {
          setSelectedImage(response.assets[0])
        }
      },
    )
  }

  const handleCameraImage = () => {
    launchCamera(
      {
        mediaType: "photo",
        quality: 0.9,
      },
      (response) => {
        if (response.didCancel) {
          console.log("Camera cancelled")
        } else if (response.errorCode) {
          console.error("Camera error:", response.errorMessage)
        } else {
          setSelectedImage(response.assets[0])
        }
      },
    )
  }

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return

    setAnalysisLoading(true)
    try {
      const userId = await AsyncStorage.getItem("userId")
      const formData = new FormData()
      formData.append("image", {
        uri: selectedImage.uri,
        type: selectedImage.type,
        name: selectedImage.fileName || "image.jpg",
      })
      formData.append("userId", userId)
      formData.append("language", language)

      const response = await axiosInstance.post(
        "https://pilgrimplannerbackend.onrender.com/api/visual/analyze",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      )
      console.log("📌 API RESPONSE:", response.data)

      if (response.data.success) {
        setAnalysisResult(response.data.analysis)
        setSelectedImage(null)
      } else {
        console.error("Analysis failed:", response.data.error)
      }
    } catch (error) {
      console.error("Error analyzing image:", error)
    } finally {
      setAnalysisLoading(false)
    }
  }
const handlePlayAudio = () => {
  if (!analysisResult?.audio_url) return;

  // Use your Cloudinary link directly
   const audioUrl = analysisResult.audio_url;

  // Stop previous sound if playing
  if (soundRef.current) {
    soundRef.current.stop();
    soundRef.current.release();
    soundRef.current = null;
  }

  Sound.setCategory("Playback");

  const sound = new Sound(audioUrl, null, (error) => {
    if (error) {
      console.error("Error loading sound:", error);
      return;
    }

    soundRef.current = sound;

    sound.play((success) => {
      if (success) {
        console.log("Sound played successfully");
      } else {
        console.error("Sound playback failed");
      }
      setAudioPlaying(false);
    });

    setAudioPlaying(true);
  });
};

  const closeImageAnalysisModal = () => {
    setShowImageAnalysisModal(false)
    setSelectedImage(null)
    setAnalysisResult(null)
    if (soundRef.current) {
      soundRef.current.stop()
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.topSection}>
          <TouchableOpacity
            style={styles.largeCard}
            onPress={() => navigation.navigate("UmrahPackages", { packageType: "Hajj" })}
            activeOpacity={0.8}
          >
            <Text style={styles.cardTitle}>{t("hajjTitle")}</Text>
            <Text style={styles.cardSubtitle}>{t("hajjSubtitle")}</Text>
            <Text style={styles.plus}>→</Text>
          </TouchableOpacity>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.smallCard}
              onPress={() => navigation.navigate("UmrahPackages", { packageType: "Umrah" })}
              activeOpacity={0.8}
            >
              <Text style={styles.cardTitle}>{t("umrahTitle")}</Text>
              <Text style={styles.cardSubtitle}>{t("umrahSubtitle")}</Text>
              <Text style={styles.plus}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallCardSpecial}
              onPress={() => navigation.navigate("Login")}
              activeOpacity={0.8}
            >
              <Text style={styles.cardTitleSpecial}>{t("roozaTitle")}</Text>
              <Text style={styles.cardSubtitleSpecial}>{t("roozaSubtitle")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {targetTime && (
          <View style={styles.countdownSection}>
            <ImageBackground
              source={require("../assets/pic.jpg")}
              style={styles.imageBackground}
              imageStyle={styles.imageStyle}
            >
              <View style={styles.countdownOverlay}>
                <Text style={styles.countdownLabel}>{nextPrayerLabel}</Text>
                <CountdownTimer targetTime={targetTime} language={language} t={t} />
              </View>
            </ImageBackground>
          </View>
        )}

        {/* <View style={styles.aiAnalysisSection}>
          <TouchableOpacity
            style={styles.aiAnalysisCard}
            onPress={() => setShowImageAnalysisModal(true)}
            activeOpacity={0.7}
          >

            <View style={styles.aiAnalysisCardBackground}>
              <View style={styles.aiAnalysisGradientOverlay} />
              <View style={styles.aiAnalysisContent}>
                <View style={styles.aiAnalysisIconWrapper}>
                  <Text style={styles.aiAnalysisIcon}>🤖</Text>
                </View>
                <Text style={styles.aiAnalysisTitle}>AI Image Analyzer</Text>
                <Text style={styles.aiAnalysisSubtitle}>Extract insights with advanced intelligence</Text>
                <View style={styles.aiAnalysisBadgeContainer}>
                  <View style={styles.aiAnalysisBadge}>
                    <Text style={styles.aiAnalysisBadgeText}>✨ POWERED BY AI</Text>
                  </View>
                </View>
                <View style={styles.aiAnalysisArrow}>
                  <Text style={styles.arrowText}>→</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        </View> */}
<View style={styles.aiAnalysisSection}>

  {/* AI Image Analyzer Card */}
  <TouchableOpacity
    style={styles.aiAnalysisCard}
    onPress={() => setShowImageAnalysisModal(true)}
    activeOpacity={0.7}
  >
    <View style={styles.aiAnalysisCardBackground}>
      <View style={styles.aiAnalysisGradientOverlay} />
      <View style={styles.aiAnalysisContent}>
        <View style={styles.aiAnalysisIconWrapper}>
          <Text style={styles.aiAnalysisIcon}>🤖</Text>
        </View>
        <Text style={styles.aiAnalysisTitle}>AI Image Analyzer</Text>
        <Text style={styles.aiAnalysisSubtitle}>Extract insights with advanced intelligence</Text>
        <View style={styles.aiAnalysisBadgeContainer}>
          <View style={styles.aiAnalysisBadge}>
            <Text style={styles.aiAnalysisBadgeText}>✨ POWERED BY AI</Text>
          </View>
        </View>
        <View style={styles.aiAnalysisArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>

  {/* Spacing between cards */}
  <View style={{ height: 20 }} />

  {/* AI Translator Card */}
  <TouchableOpacity
    style={styles.aiAnalysisCard}
    onPress={() => navigation.navigate("AITranslations")}
    activeOpacity={0.7}
  >
    <View style={styles.aiAnalysisCardBackground}>
      <View style={styles.aiAnalysisGradientOverlay} />
      <View style={styles.aiAnalysisContent}>
        <View style={styles.aiAnalysisIconWrapper}>
          <Text style={styles.aiAnalysisIcon}>🌍</Text>
        </View>
        <Text style={styles.aiAnalysisTitle}>AI Translator</Text>
        <Text style={styles.aiAnalysisSubtitle}>Translate text instantly with AI</Text>
        <View style={styles.aiAnalysisBadgeContainer}>
          <View style={styles.aiAnalysisBadge}>
            <Text style={styles.aiAnalysisBadgeText}>🗣️ TEXT TRANSLATION</Text>
          </View>
        </View>
        <View style={styles.aiAnalysisArrow}>
          <Text style={styles.arrowText}>→</Text>
        </View>
      </View>
    </View>
  </TouchableOpacity>

</View>

          
        <View style={styles.createTripSection}>
          <TouchableOpacity
            style={styles.createTripCard}
            onPress={() => navigation.navigate("CreateTrip")}
            activeOpacity={0.85}
          >
            <View style={styles.createTripContent}>
              <Text style={styles.createTripIcon}>✈️</Text>
              <Text style={styles.createTripTitle}>{t("createTripTitle")}</Text>
              <Text style={styles.createTripSubtitle}>{t("createTripSubtitle")}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.thikrSection}>
          <View style={styles.row}>
            <TouchableOpacity style={styles.thikrCard} activeOpacity={0.8}>
              <View style={styles.thikrIconContainer}>
                <Text style={styles.thikrIcon}>🌅</Text>
              </View>
              <Text style={styles.thikrText}>{t("morningZikrTitle")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.thikrCard} activeOpacity={0.8}>
              <View style={styles.thikrIconContainer}>
                <Text style={styles.thikrIcon}>🌆</Text>
              </View>
              <Text style={styles.thikrText}>{t("eveningZikrTitle")}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.thikrSection}>
          <View style={styles.row}>
            <TouchableOpacity style={styles.thikrCard} activeOpacity={0.8}>
              <View style={styles.thikrIconContainer}>
                <Text style={styles.thikrIcon}>📖</Text>
              </View>
              <Text style={styles.thikrText}>{t("umrahGuideTitle")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.thikrCard} activeOpacity={0.8}>
              <View style={styles.thikrIconContainer}>
                <Text style={styles.thikrIcon}>🌙</Text>
              </View>
              <Text style={styles.thikrText}>{t("nightPrayersTitle")}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showImageAnalysisModal}
        transparent={true}
        animationType="slide"
        onRequestClose={closeImageAnalysisModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeImageAnalysisModal} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>AI Image Analysis</Text>
              <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Image Selection Stage */}
              {!selectedImage && !analysisResult && (
                <View style={styles.stageContainer}>
                  <Text style={styles.stageTitle}>Upload Image</Text>
                  <Text style={styles.stageDescription}>Choose an image to analyze</Text>

                  <TouchableOpacity
                    style={styles.imageActionButton}
                    onPress={handlePickImage}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.imageActionIcon}>📸</Text>
                    <Text style={styles.imageActionText}>Select from Gallery</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.imageActionButton, styles.cameraButton]}
                    onPress={handleCameraImage}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.imageActionIcon}>📷</Text>
                    <Text style={styles.imageActionText}>Take Photo</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Image Preview and Analysis Stage */}
              {selectedImage && !analysisResult && (
                <View style={styles.stageContainer}>
                  <Text style={styles.stageTitle}>Preview Image</Text>
                  <Image
                    source={{ uri: selectedImage.uri }}
                    style={styles.previewImage}
                    resizeMode="contain"
                  />

                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handlePickImage}
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

              {/* Analysis Results Stage - display correct API fields */}
              {analysisResult && (
                <View style={styles.stageContainer}>
                  <Text style={styles.stageTitle}>Analysis Results</Text>

                  {/* Image Description */}
                  {analysisResult.description && (
                    <View style={styles.resultCard}>
                      <Text style={styles.resultLabel}>Description</Text>
                      <Text style={styles.resultText}>{analysisResult.description}</Text>
                    </View>
                  )}

                  {/* Context & History */}
                  {analysisResult.context_or_history && (
                    <View style={styles.resultCard}>
                      <Text style={styles.resultLabel}>Context & History</Text>
                      <Text style={styles.resultText}>{analysisResult.context_or_history}</Text>
                    </View>
                  )}

                  {/* Metadata */}
                  {(analysisResult.language || analysisResult.confidence) && (
                    <View style={styles.resultCard}>
                      <Text style={styles.resultLabel}>Information</Text>
                      <View style={styles.metadataContainer}>
                        {analysisResult.language && (
                          <View style={styles.metadataTag}>
                            <Text style={styles.metadataTagText}>
                              Language: {analysisResult.language.toUpperCase()}
                            </Text>
                          </View>
                        )}
                        {analysisResult.confidence && (
                          <View style={styles.metadataTag}>
                            <Text style={styles.metadataTagText}>
                              Confidence: {analysisResult.confidence}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* Audio Playback */}
                  {analysisResult.audio_url && (
                    <TouchableOpacity
                      style={[styles.audioButton, audioPlaying && styles.audioButtonActive]}
                      onPress={handlePlayAudio}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.audioIcon}>{audioPlaying ? "🔊" : "🔉"}</Text>
                      <Text style={styles.audioButtonText}>{audioPlaying ? "Playing..." : "Play Audio"}</Text>
                    </TouchableOpacity>
                  )}

                  {/* New Analysis Button */}
                  <TouchableOpacity
                    style={styles.newAnalysisButton}
                    onPress={() => {
                      setSelectedImage(null)
                      setAnalysisResult(null)
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.newAnalysisButtonText}>New Analysis</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Navigation active="Home" navigation={navigation} />
    </View>
  )
}

const CountdownTimer = ({ targetTime, language, t }) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetTime))

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetTime))
    }, 1000)
    return () => clearInterval(interval)
  }, [targetTime])

  if (timeLeft.total <= 0) {
    return <Text style={styles.countdownText}>{t("prayerTimeText")}</Text>
  }

  return (
    <View style={styles.timerContainer}>
      <View style={styles.timeBox}>
        <Text style={styles.timeNumber}>{String(timeLeft.hours).padStart(2, "0")}</Text>
        <Text style={styles.timeLabel}>{t("hoursText")}</Text>
      </View>
      <Text style={styles.timeSeparator}>:</Text>
      <View style={styles.timeBox}>
        <Text style={styles.timeNumber}>{String(timeLeft.minutes).padStart(2, "0")}</Text>
        <Text style={styles.timeLabel}>{t("minText")}</Text>
      </View>
      <Text style={styles.timeSeparator}>:</Text>
      <View style={styles.timeBox}>
        <Text style={styles.timeNumber}>{String(timeLeft.seconds).padStart(2, "0")}</Text>
        <Text style={styles.timeLabel}>{t("secText")}</Text>
      </View>
    </View>
  )
}

function getTimeLeft(target) {
  const now = new Date()
  const total = target - now
  return {
    total,
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / 1000 / 60) % 60),
    seconds: Math.floor((total / 1000) % 60),
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 100,
  },
  topSection: {
    backgroundColor: "#BB9C66",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    padding: 20,
    paddingTop: 70,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  largeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  smallCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "48%",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  smallCardSpecial: {
    backgroundColor: "rgba(128, 128, 128, 0.9)",
    borderRadius: 16,
    padding: 20,
    width: "48%",
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  plus: {
    position: "absolute",
    top: 15,
    right: 20,
    fontSize: 24,
    color: "#BB9C66",
    fontWeight: "700",
  },
  cardTitle: {
    color: "#2C2C2C",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 6,
  },
  cardTitleSpecial: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
    marginBottom: 6,
  },
  cardSubtitle: {
    color: "#666666",
    fontSize: 14,
    fontWeight: "500",
  },
  cardSubtitleSpecial: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "500",
  },
  countdownSection: {
    padding: 20,
    paddingTop: 25,
  },
  imageBackground: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  imageStyle: {
    borderRadius: 20,
  },
  countdownOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    paddingHorizontal: 20,
  },
  countdownLabel: {
    color: "#FFFFFF",
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
    fontWeight: "600",
  },
  timerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  timeBox: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    minWidth: 60,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  timeNumber: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  timeLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "600",
    marginTop: 2,
  },
  timeSeparator: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "700",
    marginHorizontal: 8,
  },
  countdownText: {
    fontSize: 22,
    color: "#FFFFFF",
    fontWeight: "700",
    textAlign: "center",
  },

  aiAnalysisSection: {
    padding: 20,
    paddingTop: 10,
  },
  aiAnalysisCard: {
    overflow: "hidden",
    borderRadius: 24,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  aiAnalysisCardBackground: {
    backgroundColor: "#7f6539ff",
    position: "relative",
    overflow: "hidden",
  },
  aiAnalysisGradientOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#BB9C66",
    opacity: 0.3,
  },
  aiAnalysisContent: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    position: "relative",
    zIndex: 1,
  },
  aiAnalysisIconWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
    borderWidth: 2,
    borderColor: "rgba(255, 215, 0, 0.4)",
  },
  aiAnalysisIcon: {
    fontSize: 40,
  },
  aiAnalysisTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 10,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  aiAnalysisSubtitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.85)",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  aiAnalysisBadgeContainer: {
    marginBottom: 16,
  },
  aiAnalysisBadge: {
    backgroundColor: "rgba(255, 215, 0, 0.15)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "rgba(255, 215, 0, 0.5)",
  },
  aiAnalysisBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#040404ff",
    letterSpacing: 1,
  },
  aiAnalysisArrow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
  },
  arrowText: {
    fontSize: 20,
    color: "#FFD700",
    fontWeight: "700",
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
    maxHeight: "95%",
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
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
    flex: 1,
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  stageContainer: {
    alignItems: "center",
  },
  stageTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  stageDescription: {
    fontSize: 14,
    color: "#666666",
    marginBottom: 28,
    textAlign: "center",
  },
  imageActionButton: {
    backgroundColor: "#BB9C66",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  cameraButton: {
    backgroundColor: "#8B7355",
  },
  analyzeButton: {
    backgroundColor: "#BB9C66",
    marginTop: 16,
  },
  imageActionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  imageActionText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  previewImage: {
    width: Dimensions.get("window").width - 60,
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
    backgroundColor: "#F5F5F5",
  },
  changeImageButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#BB9C66",
    borderRadius: 12,
  },
  changeImageButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#BB9C66",
    textAlign: "center",
  },
  resultCard: {
    backgroundColor: "#F9F7F4",
    borderRadius: 16,
    padding: 18,
    marginBottom: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#BB9C66",
  },
  resultLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#BB9C66",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  resultText: {
    fontSize: 15,
    color: "#2C2C2C",
    lineHeight: 22,
    fontWeight: "500",
  },
  metadataContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metadataTag: {
    backgroundColor: "#BB9C66",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  metadataTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  audioButton: {
    backgroundColor: "#F0E5D8",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    borderWidth: 2,
    borderColor: "#BB9C66",
  },
  audioButtonActive: {
    backgroundColor: "#BB9C66",
  },
  audioIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  audioButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  newAnalysisButton: {
    backgroundColor: "#BB9C66",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  newAnalysisButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
  },

  createTripSection: {
    padding: 20,
    paddingTop: 10,
  },
  createTripCard: {
    backgroundColor: "#BB9C66",
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  createTripContent: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    position: "relative",
  },
  createTripIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  createTripTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
    textAlign: "center",
  },
  createTripSubtitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.95)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  createTripArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  arrowIcon: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  thikrSection: {
    backgroundColor: "#F8F9FA",
    padding: 18,
    borderRadius: 20,
    marginHorizontal: 15,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
  },
  thikrCard: {
    backgroundColor: "#FFFFFF",
    width: "48%",
    borderRadius: 16,
    alignItems: "center",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  thikrIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#BB9C66",
  },
  thikrIcon: {
    fontSize: 24,
    textAlign: "center",
  },
  thikrText: {
    color: "#2C2C2C",
    fontSize: 13,
    textAlign: "center",
    fontWeight: "600",
    lineHeight: 18,
  },
})

export default Home