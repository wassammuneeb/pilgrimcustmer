import { useEffect, useState } from "react"
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable, Alert, TouchableOpacity } from "react-native"
import Navigation from "../components/Navigation"
import axiosInstance from "../axiosInstance"
import { useNotifications } from "../contexts/NotificationContext" // ✅ import global context
import AsyncStorage from "@react-native-async-storage/async-storage"
import { translations as notifTranslations } from "../translations/notificationsTranslations"

const Notifications = ({ navigation }) => {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [language, setLanguage] = useState("en") // default
  const { unreadCount, fetchUnreadCount } = useNotifications() // ✅ use global count

  // 🌐 Load selected language from AsyncStorage
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
        }
      } catch (err) {
        console.warn("Language load error:", err)
      }
    }
    loadLanguage()
  }, [])

  // Translation helper
  const t = (section, key) => {
    const lang = language || "en"
    return (
      (notifTranslations[lang] &&
        notifTranslations[lang][section] &&
        notifTranslations[lang][section][key]) ||
      (notifTranslations["en"] &&
        notifTranslations["en"][section] &&
        notifTranslations["en"][section][key]) ||
      `${section}.${key}`
    )
  }

  const fetchNotifications = async () => {
    try {
      const res = await axiosInstance.get("fcm/notifications", {
        params: {
          page: 1,
          limit: 50
        }
      })
      setNotifications(res.data.data || [])
    } catch (err) {
      console.error("Notification fetch error:", err.message)
      Alert.alert(t("common", "errorTitle"), t("notifications", "loadFailed"))
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([fetchNotifications(), fetchUnreadCount()]) // ✅ also update global count
      setLoading(false)
    }

    loadData()
  }, [language])

  const handleNotificationPress = async (note) => {
    try {
      if (!note.isRead) {
        await axiosInstance.patch(`fcm/notifications/${note._id}/read`)
        setNotifications((prev) => prev.map((n) => (n._id === note._id ? { ...n, isRead: true } : n)))
        fetchUnreadCount() // ✅ refresh global unread count
      }
      if (note.link) {
        const screen = note.link.replace("/", "")
        navigation.navigate(screen)
      }
    } catch (err) {
      console.error("Mark read error:", err.message)
    }
  }

  const handleBackPress = () => {
    navigation.goBack()
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("notifications", "title")}</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#A6928C" />
          <Text style={styles.loadingText}>{t("notifications", "loading")}</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("notifications", "title")}</Text>
        <View style={styles.bellContainer}>
          <Text style={styles.bell}>🔔</Text>
          {unreadCount > 0 && ( // ✅ using global count
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>{t("notifications", "emptyTitle")}</Text>
            <Text style={styles.emptyDescription}>{t("notifications", "emptyDescription")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryText}>
                {notifications.length}{" "}
                {notifications.length === 1
                  ? t("notifications", "singleNotification")
                  : t("notifications", "multipleNotifications")}
                {unreadCount > 0 && ` • ${unreadCount} ${t("notifications", "unread")}`}
              </Text>
            </View>

            {notifications.map((note) => (
              <Pressable
                key={note._id}
                style={[styles.notificationCard, !note.isRead && styles.unreadCard]}
                onPress={() => handleNotificationPress(note)}
                android_ripple={{ color: "rgba(166, 146, 140, 0.1)" }}
              >
                <View style={styles.notificationHeader}>
                  <Text style={[styles.notificationTitle, !note.isRead && styles.unreadTitle]} numberOfLines={2}>
                    {note.title}
                  </Text>
                  {!note.isRead && <View style={styles.unreadDot} />}
                </View>

                <Text style={[styles.notificationMessage, !note.isRead && styles.unreadMessage]} numberOfLines={3}>
                  {note.message}
                </Text>

                <View style={styles.notificationFooter}>
                  <Text style={styles.notificationDate}>
                    {new Date(note.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {note.link && <Text style={styles.tapToOpen}>{t("notifications", "tapToOpen")}</Text>}
                </View>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      <Navigation navigation={navigation} active="Notifications" />
    </View>
  )
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCF8F5", // Creamy Off-White background
  },

  // Header Section
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#BB9C66", // Soft Dusty Rose
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "bold",
    marginLeft: -2, // Adjust arrow position
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#FFFFFF",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 10,
  },
  headerRight: {
    width: 40, // Balance the back button
  },
  bellContainer: {
    position: "relative",
    padding: 8,
  },
  bell: {
    fontSize: 24,
  },
  badge: {
    position: "absolute",
    right: 4,
    top: 2,
    backgroundColor: "#FF4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "bold",
  },

  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: "#A6928C",
    fontWeight: "500",
  },

  // Content
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },

  // Summary
  summaryContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EAE3DB",
  },
  summaryText: {
    fontSize: 16,
    color: "#6B5C57",
    fontWeight: "600",
    textAlign: "center",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#6B5C57",
    marginBottom: 10,
  },
  emptyDescription: {
    fontSize: 16,
    color: "#A6928C",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 40,
  },

  // Notification Cards
  notificationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  unreadCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#CDBBA9",
    borderWidth: 2,
    shadowOpacity: 0.12,
  },
  notificationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#6B5C57",
    flex: 1,
    lineHeight: 24,
  },
  unreadTitle: {
    fontWeight: "bold",
    color: "#6B5C57",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#A6928C",
    marginLeft: 10,
    marginTop: 8,
  },
  notificationMessage: {
    fontSize: 15,
    color: "#6B5C57",
    lineHeight: 22,
    marginBottom: 12,
  },
  unreadMessage: {
    fontWeight: "500",
    color: "#6B5C57",
  },
  notificationFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  notificationDate: {
    fontSize: 13,
    color: "#A6928C",
    fontWeight: "500",
  },
  tapToOpen: {
    fontSize: 12,
    color: "#A6928C",
    fontWeight: "600",
    fontStyle: "italic",
  },
})

export default Notifications
