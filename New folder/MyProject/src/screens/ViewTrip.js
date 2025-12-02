import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  StatusBar,
  Modal,
  TextInput,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import Navigation from "../components/Navigation"
import axiosInstance from "../axiosInstance"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { viewTripTranslations as translations } from "../translations/viewTripTranslations"
import moment from "moment"

export default function ViewTrip({ route }) {
  const navigation = useNavigation()
  const { bookingId } = route.params
  const [tripData, setTripData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checklist, setChecklist] = useState([])
  const [language, setLanguage] = useState("en")
  // <CHANGE> State for checklist item detail modal
  const [itemModalVisible, setItemModalVisible] = useState(false)
  const [selectedChecklistItem, setSelectedChecklistItem] = useState(null)
  const [itemNote, setItemNote] = useState("")

  // Load selected language from AsyncStorage on mount
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

  useEffect(() => {
    const fetchTripDetails = async () => {
      setLoading(true)
      try {
        // <CHANGE> Updated route to use bookingId - fetches trip details including checklist
        const { data } = await axiosInstance.get(`/trip/view-trip/${bookingId}`)
        console.log("[Trip API Response]:", JSON.stringify(data, null, 2))
        if (data.success && data.data) {
          setTripData(data.data)
          // <CHANGE> Extract checklist directly from trip data instead of separate fetch
          setChecklist(data.data.trip?.checklist || [])
          console.log("[Trip Data]", data.data)
          console.log("[Checklist Items]", data.data.trip?.checklist)
        } else {
          console.warn("[Trip API failure]:", data)
          Alert.alert(t("tripPlanTitle"), data.message || t("couldNotRetrieveMsg"))
          setTripData(null)
        }
      } catch (err) {
        // console.error("[Trip Fetch Error]:", err.response?.data || err.message)
        Alert.alert(t("No plans yet!"), err.response?.data?.message || t("failedToLoadMsg"))
        setTripData(null)
      } finally {
        setLoading(false)
      }
    }

    if (bookingId) {
      fetchTripDetails()
    } else {
      Alert.alert(t("missingBookingTitle"), t("missingBookingMsg"))
      setLoading(false)
    }
  }, [bookingId])

  // Function to open the checklist item detail modal
  const handleChecklistItemPress = (item) => {
    setSelectedChecklistItem(item)
    setItemNote(item.note || "")
    setItemModalVisible(true)
  }

  // Function to update checklist item status and note
  const handleUpdateChecklistItem = async () => {
    if (!selectedChecklistItem || !tripData?.trip?._id) {
      Alert.alert(t("errorTitle"), t("invalidItemMsg"))
      return
    }

    const currentStatus = selectedChecklistItem.status
    const newStatus = currentStatus === "done" ? "pending" : "done"
    const tripId = tripData.trip._id
    const itemId = selectedChecklistItem._id

    // Optimistically update UI
    setChecklist((prev) =>
      prev.map((item) => (item._id === itemId ? { ...item, status: newStatus, note: itemNote } : item)),
    )
    setItemModalVisible(false)

    try {
      // <CHANGE> Updated PATCH route to match new backend endpoint structure
      const { data } = await axiosInstance.patch(
        `/trip/update-checklist/${tripId}/checklist/${itemId}`,
        {
          status: newStatus,
          note: itemNote.trim(),
        }
      )
      if (data.success) {
        Alert.alert(t("successTitle"), data.message || t("checklistUpdatedMsg"))
      } else {
        // Revert UI on errora
        setChecklist((prev) =>
          prev.map((item) =>
            item._id === itemId ? { ...item, status: currentStatus, note: selectedChecklistItem.note } : item,
          ),
        )
        Alert.alert(t("updateFailedTitle"), data.message || t("couldNotUpdateMsg"))
      }
    } catch (err) {
      // Revert UI on network error
      setChecklist((prev) =>
        prev.map((item) =>
          item._id === itemId ? { ...item, status: currentStatus, note: selectedChecklistItem.note } : item,
        ),
      )
      console.error("Error updating checklist item:", err.response?.data || err.message)
      Alert.alert(t("networkErrorTitle"), err.response?.data?.message || t("networkErrorMsg"))
    }
  }

  const DetailRow = ({ icon, label, value }) => (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <Text style={styles.detailIcon}>{icon}</Text>
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )

  if (loading) {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BB9C66" />
          <Text style={styles.loadingText}>{t("loadingText")}</Text>
        </View>
        <Navigation navigation={navigation} active="Bookings" />
      </View>
    )
  }

  if (!tripData) {
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
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>⚠️</Text>
          <Text style={styles.emptyTitle}>{t("noTripTitle")}</Text>
          <Text style={styles.emptyText}>{t("noTripText")}</Text>
        </View>
        <Navigation navigation={navigation} active="Bookings" />
      </View>
    )
  }

  const { booking, trip, package: packageDetails } = tripData
  // <CHANGE> Get package from response instead of trip.booking.package

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

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Trip Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>✈️ {packageDetails?.title ?? "Package Title N/A"}</Text>
          <Text style={styles.summaryText}>{t("spiritualJourneyText")}</Text>
          <View style={styles.tripDates}>
            <Text style={styles.tripDateText}>
              {t("fromText")} {moment(booking.startDate).format("MMM Do, YYYY")}
            </Text>
            <Text style={styles.tripDateText}>
              {t("toText")} {moment(booking.endDate).format("MMM Do, YYYY")}
            </Text>
          </View>
        </View>

        {/* Booking Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("bookingDetailsTitle")}</Text>
          <DetailRow
            icon="🏢"
            label={t("companyLabel")}
            value={booking.vendor?.vendorCompanyName ?? t("notProvidedText")}
          />
          <DetailRow icon="🎯" label={t("typeLabel")} value={packageDetails?.packageType ?? t("naText")} />
        </View>

        {/* Itinerary Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("dayByDayPlanTitle")}</Text>
          {trip.itinerary && trip.itinerary.length > 0 ? (
            trip.itinerary.map((item, index) => (
              <View key={index} style={styles.itineraryItem}>
                <Text style={styles.itineraryDay}>
                  {t("dayText")} {item.day ?? t("naText")} - {moment(item.date).format("MMM Do, YYYY")}
                </Text>
                <Text style={styles.itineraryDescription}>
                  {item.title}: {item.description ?? t("naText")}
                </Text>
                {item.location && <Text style={styles.itineraryLocation}>📍 {item.location}</Text>}
                {item.transportInfo && <Text style={styles.itineraryLocation}>🚌 {item.transportInfo}</Text>}
              </View>
            ))
          ) : (
            <Text style={styles.noItineraryText}>{t("noItineraryText")}</Text>
          )}
        </View>

        {/* Checklist Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("checklistSectionTitle")}</Text>
          {checklist.length > 0 ? (
            checklist.map((item) => (
              <TouchableOpacity
                key={item._id}
                style={styles.checklistItem}
                onPress={() => handleChecklistItemPress(item)}
                activeOpacity={0.7}
              >
                <Text style={styles.checklistIcon}>{item.status === "done" ? "✅" : "⬜"}</Text>
                <Text style={[styles.checklistText, item.status === "done" && styles.checklistTextCompleted]}>
                  {item.title ?? t("unnamedItemText")}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.noChecklistText}>{t("noChecklistText")}</Text>
          )}
        </View>

        {/* Hotel Details */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("hotelDetailsTitle")}</Text>
          <DetailRow icon="🏠" label={t("nameLabel")} value={trip.hotel?.name ?? t("naText")} />
          <DetailRow icon="📍" label={t("locationLabel")} value={trip.hotel?.location ?? t("naText")} />
        </View>

        {/* Flight Info */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("flightInfoTitle")}</Text>
          <DetailRow icon="🛫" label={t("airlineLabel")} value={trip.flights?.airline ?? t("naText")} />
          <DetailRow icon="💺" label={t("classLabel")} value={trip.flights?.class ?? t("naText")} />
        </View>

        {/* Meals */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t("mealsTitle")}</Text>
          <DetailRow icon="🍳" label={t("breakfastLabel")} value={trip.meals?.breakfast ? t("yesText") : t("noText")} />
          <DetailRow icon="🥗" label={t("lunchLabel")} value={trip.meals?.lunch ? t("yesText") : t("noText")} />
          <DetailRow icon="🍛" label={t("dinnerLabel")} value={trip.meals?.dinner ? t("yesText") : t("noText")} />
        </View>

        {/* Additional Trip Info */}
        {trip.notes && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>{t("importantNotesTitle")}</Text>
            <Text style={styles.notesText}>{trip.notes}</Text>
          </View>
        )}
      </ScrollView>

      <Navigation navigation={navigation} active="Bookings" />

      {/* Checklist Item Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={itemModalVisible}
        onRequestClose={() => setItemModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("checklistItemDetailsTitle")}</Text>
            </View>
            {selectedChecklistItem && (
              <ScrollView style={styles.modalScrollView}>
                <Text style={styles.modalItemTitle}>{selectedChecklistItem.title ?? t("unnamedItemTitle")}</Text>
                <Text style={styles.modalItemStatus}>
                  {t("statusText")}{" "}
                  <Text style={{ color: selectedChecklistItem.status === "done" ? "#28a745" : "#BB9C66" }}>
                    {selectedChecklistItem.status === "done" ? t("doneStatusText") : t("pendingStatusText")}
                  </Text>
                </Text>
                <Text style={styles.inputLabel}>{t("notesLabel")}</Text>
                <TextInput
                  style={styles.textInput}
                  multiline
                  numberOfLines={4}
                  placeholder={t("notesPlaceholder")}
                  placeholderTextColor="#999"
                  value={itemNote}
                  onChangeText={setItemNote}
                />
              </ScrollView>
            )}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setItemModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalButtonText}>{t("cancelButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={handleUpdateChecklistItem}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalButtonText}>
                  {selectedChecklistItem?.status === "done" ? t("markAsPendingButton") : t("markAsDoneButton")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: "#BB9C66",
    paddingTop: 50,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
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
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  summaryText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  tripDates: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  tripDateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#BB9C66",
  },
  sectionCard: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 15,
    textAlign: "center",
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
    flex: 1,
  },
  itineraryItem: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  itineraryDay: {
    fontSize: 16,
    fontWeight: "700",
    color: "#BB9C66",
    marginBottom: 5,
  },
  itineraryDescription: {
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20,
    marginBottom: 5,
  },
  itineraryLocation: {
    fontSize: 13,
    color: "#666",
    fontStyle: "italic",
  },
  noItineraryText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingVertical: 10,
  },
  notesText: {
    fontSize: 14,
    color: "#2C2C2C",
    lineHeight: 20,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  checklistIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  checklistText: {
    flex: 1,
    fontSize: 15,
    color: "#2C2C2C",
    lineHeight: 22,
  },
  checklistTextCompleted: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  noChecklistText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    paddingVertical: 10,
    fontStyle: "italic",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
  },
  modalScrollView: {
    maxHeight: 300,
    padding: 20,
  },
  modalItemTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 10,
    textAlign: "center",
  },
  modalItemStatus: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#2C2C2C",
    backgroundColor: "#F8F9FA",
    minHeight: 80,
    textAlignVertical: "top",
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
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
  cancelModalButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmModalButton: {
    backgroundColor: "#BB9C66",
  },
  confirmModalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
})