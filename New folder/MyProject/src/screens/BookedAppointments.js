"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  StatusBar,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import axiosInstance from "../axiosInstance"
import Navigation from "../components/Navigation"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { bookedAppointmentsTranslations as translations } from "../translations/bookedAppointmentsTranslations"

export default function BookedAppointments() {
  const navigation = useNavigation()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [cancellingId, setCancellingId] = useState(null)
  const [filter, setFilter] = useState("all")
  const [packageTypeFilter, setPackageTypeFilter] = useState("travelagent") // Set default to "travelagent" instead of "all"
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false)
  const [feedbackAppt, setFeedbackAppt] = useState(null)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [language, setLanguage] = useState("en")

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

  const fetchAppointments = async () => {
    try {
      console.log("Fetching appointments from: appointment/viewAppointmentStatus")
      setLoading(true)

      // Build query parameters
      const params = {}
      if (packageTypeFilter === "travelagent") {
        params.type = "travelagent"
      } else if (packageTypeFilter === "customize") {
        params.type = "customize"
      }

      const { data } = await axiosInstance.get("appointment/viewAppointmentStatus", { params })
      console.log("API Response Data:", data)

      if (data.success) {
        setAppointments(data.data || [])
        console.log("Appointments successfully set.")
      } else {
        Alert.alert(t("errorTitle"), data.message || t("fetchErrorMsg"))
        console.error("API call failed (success: false). Message:", data.message)
      }
    } catch (err) {
      console.error("API Request Error:", err.message)
      console.error("Full Error Response (if available):", err.response)
      Alert.alert(t("errorTitle"), err.response?.data?.message || t("fetchErrorMsg"))
    } finally {
      console.log("Fetching process finished.")
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAppointments()
  }, [packageTypeFilter])

  const onRefresh = () => {
    setRefreshing(true)
    fetchAppointments()
  }

  const handleCancel = async (appt) => {
    const id = appt.id || appt._id || appt.appointmentId
    if (!["pending", "confirmed"].includes(appt.status)) {
      Alert.alert(t("cannotCancelTitle"), `${t("cannotCancelMsg")} ${appt.statusTranslated || appt.status}.`)
      return
    }

    Alert.alert(t("confirmCancelTitle"), t("confirmCancelMsg"), [
      { text: t("cancelNo"), style: "cancel" },
      {
        text: t("cancelYes"),
        style: "destructive",
        onPress: async () => {
          try {
            setCancellingId(id)
            const res = await axiosInstance.patch(`appointment/cancel-appointment/${id}`)
            if (res.data.success) {
              Alert.alert(t("successTitle"), res.data.message)
              fetchAppointments()
            } else {
              Alert.alert(t("errorTitle"), res.data.message)
            }
          } catch (err) {
            Alert.alert(t("errorTitle"), err.response?.data?.message || t("cancelFailedMsg"))
          } finally {
            setCancellingId(null)
          }
        },
      },
    ])
  }

  const handleOpenFeedback = (appt) => {
    if (appt?.customerFeedback?.submittedAt) {
      Alert.alert(t("feedbackAlreadyGivenTitle"), t("feedbackAlreadyGivenMsg"))
      return
    }
    setFeedbackAppt(appt)
    setRating(0)
    setComment("")
    setFeedbackModalVisible(true)
  }

  const handleSubmitFeedback = () => {
    if ((!rating || rating === 0) && (!comment || comment.trim() === "")) {
      Alert.alert(t("feedbackOrCommentTitle"), t("feedbackOrCommentMsg"))
      return
    }

    if (!rating || rating === 0 || rating < 1 || rating > 5) {
      Alert.alert(t("feedbackRequiredTitle"), t("feedbackRequiredMsg"))
      return
    }

    Alert.alert(t("confirmFeedbackTitle"), t("confirmFeedbackMsg"), [
      { text: t("feedbackNo"), style: "cancel" },
      {
        text: t("feedbackYes"),
        onPress: () => actuallySubmitFeedback(),
      },
    ])
  }

  const actuallySubmitFeedback = async () => {
    try {
      setSubmitting(true)
      const id = feedbackAppt._id || feedbackAppt.id || feedbackAppt.appointmentId
      const res = await axiosInstance.patch(`appointment/feedback-appointment/${id}`, {
        rating,
        comment,
      })
      if (res.data.success) {
        Alert.alert(t("thankYouTitle"), t("feedbackSuccessMsg"))
        fetchAppointments()
        setFeedbackModalVisible(false)
      } else {
        Alert.alert(t("errorTitle"), res.data.message || t("feedbackFailedMsg"))
      }
    } catch (err) {
      const msg = err.response?.data?.message
      if (msg?.includes("Only completed")) {
        Alert.alert(t("invalidFeedbackTitle"), t("invalidFeedbackMsg"))
      } else if (msg?.includes("Unauthorized")) {
        Alert.alert(t("unauthorizedTitle"), t("unauthorizedMsg"))
      } else if (msg?.includes("already submitted")) {
        Alert.alert(t("alreadySubmittedTitle"), t("alreadySubmittedMsg"))
      } else {
        Alert.alert(t("errorTitle"), msg || t("somethingWrongMsg"))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusStyle = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return { bg: "#E8F5E8", text: "#2E7D32", icon: "✅" }
      case "pending":
        return { bg: "#FFF8E1", text: "#F57C00", icon: "⏳" }
      case "confirmed":
        return { bg: "#E3F2FD", text: "#1976D2", icon: "✓" }
      case "cancelled":
        return { bg: "#FFEBEE", text: "#D32F2F", icon: "❌" }
      default:
        return { bg: "#F5F5F5", text: "#666", icon: "❓" }
    }
  }

  const formatDate = (d) => {
    const dt = new Date(d)
    return isNaN(dt)
      ? d
      : dt.toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        })
  }

  const filteredAppointments =
    filter === "all" ? appointments : appointments.filter((a) => (a.status || "").toLowerCase() === filter)

  const getFilterLabel = (filterType) => {
    switch (filterType) {
      case "all":
        return t("filterAll")
      case "confirmed":
        return t("filterConfirmed")
      case "pending":
        return t("filterPending")
      case "completed":
        return t("filterCompleted")
      case "cancelled":
        return t("filterCancelled")
      default:
        return filterType.charAt(0).toUpperCase() + filterType.slice(1)
    }
  }

  const getPackageTypeLabel = (typeFilter) => {
    switch (typeFilter) {
      case "travelagent":
        return t("Travel Agent") || "Travel Agent"
      case "customize":
        return t("Custom Packages") || "Custom Packages"
      default:
        return typeFilter.charAt(0).toUpperCase() + typeFilter.slice(1)
    }
  }

  const getStatusLabel = (status) => {
    switch ((status || "").toLowerCase()) {
      case "completed":
        return t("filterCompleted")
      case "pending":
        return t("filterPending")
      case "confirmed":
        return t("filterConfirmed")
      case "cancelled":
        return t("filterCancelled")
      default:
        return t("unknown")
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#BB9C66"]} tintColor="#BB9C66" />
        }
      >
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t("summaryTitle")}</Text>
          <Text style={styles.summaryText}>
            {`${filteredAppointments.length} ${filteredAppointments.length === 1 ? t("appointmentSingle") : t("appointmentPlural")}`}
            {filter !== "all" && ` ${t("withStatus")} ${getFilterLabel(filter)} ${t("statusText")}`}
          </Text>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>{t("Package Type") || "Package Type"}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.filterScrollView}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <View style={styles.filterContainer}>
              {["travelagent", "customize"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.filterButton, packageTypeFilter === type && styles.filterButtonActive]}
                  onPress={() => setPackageTypeFilter(type)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, packageTypeFilter === type && styles.filterTextActive]}>
                    {getPackageTypeLabel(type)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.filterSection}>
          <Text style={styles.filterTitle}>{t("filterTitle")}</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            style={styles.filterScrollView}
            contentContainerStyle={{ paddingRight: 20 }}
          >
            <View style={styles.filterContainer}>
              {["all", "confirmed", "pending", "completed", "cancelled"].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterButton, filter === s && styles.filterButtonActive]}
                  onPress={() => setFilter(s)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterText, filter === s && styles.filterTextActive]}>{getFilterLabel(s)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#BB9C66" size="large" />
            <Text style={styles.loadingText}>{t("loadingText")}</Text>
          </View>
        ) : filteredAppointments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🗓️</Text>
            <Text style={styles.emptyTitle}>{t("noAppointmentsTitle")}</Text>
            <Text style={styles.emptyText}>
              {filter === "all"
                ? t("noAppointmentsMsg")
                : `${t("noFilteredAppointments")} ${getFilterLabel(filter)} ${t("appointmentsFound")}`}
            </Text>
          </View>
        ) : (
          filteredAppointments.map((appt) => {
            const id = appt.id || appt._id || appt.appointmentId
            const status = appt.status || "unknown"
            const statusStyle = getStatusStyle(status)
            const canCancel = ["pending", "confirmed"].includes(status)
            const packageTitle =
              appt.packageType === "VendorCustomizeOption"
                ? appt.customRequest?.requestedOptions?.join(", ") || t("customPackage") || "Custom Package"
                : appt.package?.title || t("unnamedPackage")
            const packagePrice =
              appt.packageType === "VendorCustomizeOption"
                ? appt.customRequest?.finalPrice || appt.customRequest?.estimatedPrice || 0
                : appt.package?.price || 0
            const companyName =
              appt.packageType === "VendorCustomizeOption"
                ? appt.customRequest?.vendorCompanyName || appt.slot?.vendor || t("naText")
                : appt.package?.vendorCompanyName || appt.slot?.vendor || t("naText")

            return (
              <View key={id} style={styles.appointmentCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.packageTitle} numberOfLines={2}>
                    {packageTitle}
                  </Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                    <Text style={styles.statusIcon}>{statusStyle.icon}</Text>
                    <Text style={[styles.statusText, { color: statusStyle.text }]}>
                      {appt.statusTranslated || getStatusLabel(status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailsContainer}>
                  <DetailRow icon="🗓️" label={t("dateLabel")} value={formatDate(appt.date)} />
                  <DetailRow icon="🕐" label={t("timeLabel")} value={appt.time || t("naText")} />
                  <DetailRow icon="🏢" label={t("companyLabel")} value={companyName} />
                  <DetailRow
                    icon="📦"
                    label={t("typeLabel")}
                    value={appt.packageType === "VendorCustomizeOption" ? "Custom Package" : "Travel Agent Package"}
                  />
                  <DetailRow
                    icon="💰"
                    label={t("priceLabel")}
                    value={`PKR ${packagePrice.toLocaleString()}`}
                    isPrice={true}
                  />
                </View>

                <View style={styles.actionContainer}>
                  {canCancel && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.cancelButton]}
                      onPress={() => handleCancel(appt)}
                      disabled={cancellingId === id}
                      activeOpacity={0.8}
                    >
                      {cancellingId === id ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <>
                          <Text style={styles.actionButtonIcon}>❌</Text>
                          <Text style={styles.actionButtonText}>{t("cancelButton")}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}

                  {status === "completed" && (
                    <TouchableOpacity
                      style={[styles.actionButton, styles.feedbackButton]}
                      onPress={() => handleOpenFeedback(appt)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.actionButtonIcon}>⭐</Text>
                      <Text style={styles.actionButtonText}>{t("giveFeedbackButton")}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      <Navigation navigation={navigation} active="UmrahPackages" />

      <Modal
        visible={feedbackModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFeedbackModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("modalTitle")}</Text>
              <Text style={styles.modalSubtitle}>
                {feedbackAppt?.packageType === "VendorCustomizeOption"
                  ? feedbackAppt?.customRequest?.requestedOptions?.join(", ") || "Custom Package"
                  : feedbackAppt?.package?.title}
              </Text>
            </View>

            <View style={styles.ratingSection}>
              <Text style={styles.ratingLabel}>{t("ratingLabel")}</Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TouchableOpacity key={i} onPress={() => setRating(i)} style={styles.starButton} activeOpacity={0.8}>
                    <Text style={[styles.star, rating >= i ? styles.starActive : styles.starInactive]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.ratingText}>
                {rating > 0 ? `${t("ratingText")} ${rating} ${t("outOfStars")}` : t("tapToRate")}
              </Text>
            </View>

            <View style={styles.commentSection}>
              <Text style={styles.commentLabel}>{t("commentLabel")}</Text>
              <TextInput
                style={styles.commentInput}
                placeholder={t("commentPlaceholder")}
                value={comment}
                onChangeText={setComment}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setFeedbackModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalButtonText}>{t("modalCancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.submitModalButton]}
                onPress={handleSubmitFeedback}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitModalButtonText}>{t("submitFeedback")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const DetailRow = ({ icon, label, value, isPrice = false }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailLeft}>
      <Text style={styles.detailIcon}>{icon}</Text>
      <Text style={styles.detailLabel}>{label}</Text>
    </View>
    <Text style={[styles.detailValue, isPrice && styles.priceValue]}>{value}</Text>
  </View>
)

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: "#BB9C66",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 24,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 120,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  summaryText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
  },
  filterSection: {
    marginBottom: 20,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 12,
  },
  filterScrollView: {
    flexGrow: 0,
    marginHorizontal: -4,
    marginBottom: 8,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 4,
    paddingRight: 20,
  },
  filterButton: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    minWidth: 80,
    alignItems: "center",
    marginBottom: 4,
  },
  filterButtonActive: {
    backgroundColor: "#BB9C66",
    borderColor: "#BB9C66",
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  filterTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  packageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginRight: 12,
    lineHeight: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  detailIcon: {
    fontSize: 16,
    marginRight: 8,
    width: 20,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: "#2C2C2C",
    fontWeight: "600",
    textAlign: "right",
  },
  priceValue: {
    color: "#BB9C66",
    fontWeight: "700",
  },
  actionContainer: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: "#F44336",
  },
  feedbackButton: {
    backgroundColor: "#2196F3",
  },
  actionButtonIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  ratingSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: "row",
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 32,
    marginHorizontal: 4,
  },
  starActive: {
    color: "#FFD700",
  },
  starInactive: {
    color: "#E0E0E0",
  },
  ratingText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  commentSection: {
    marginBottom: 24,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#2C2C2C",
    backgroundColor: "#F8F9FA",
    minHeight: 80,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelModalButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  submitModalButton: {
    backgroundColor: "#BB9C66",
  },
  cancelModalButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  submitModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
