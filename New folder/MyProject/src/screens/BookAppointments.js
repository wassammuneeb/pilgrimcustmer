"use client"

// NOTE: This file is converted to .js and updated to align with new backend logic:
// - Adds packageType and timezone to payload
// - For VendorCustomizeOption, also includes requestedOptions and days
// The rest of the code and comments are preserved.

import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native"
import axiosInstance from "../axiosInstance"
import Navigation from "../components/Navigation"
import DateTimePicker from "@react-native-community/datetimepicker"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { bookAppointmentsTranslations as translations } from "../translations/bookAppointmentsTranslations"

const NUMBER_TO_DAY = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
}

const DAY_TO_NUMBER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
}

export default function BookAppointments({ route, navigation }) {
  const {
    pkg = {},
    vendorId: vendorIdParam,
    days: daysParam,
    requestedOptions: requestedOptionsParam,
  } = route.params || {}
  const vendorId = pkg.vendorId || vendorIdParam
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [selectedDay, setSelectedDay] = useState(null)
  const [date, setDate] = useState(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [time, setTime] = useState(new Date())
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [booking, setBooking] = useState(false)
  const [showSeeAppointment, setShowSeeAppointment] = useState(true)
  const [language, setLanguage] = useState("en") // default

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
  const t = (key, vars = {}) => {
    const lang = language || "en"
    let str = (translations[lang] && translations[lang][key]) || (translations["en"] && translations["en"][key]) || key
    Object.keys(vars).forEach((v) => {
      str = str.replace(`{${v}}`, vars[v])
    })
    return str
  }

  const fetchSlots = async () => {
    try {
      setLoading(true)
      console.log("[v0] Fetching slots for vendorId:", vendorId)
      const { data } = await axiosInstance.get(`availability/viewavailabilityslots/${vendorId}`)
      console.log("[v0] Slots API raw:", { success: data?.success, count: (data?.data || []).length })
      if (data.success) {
        const normalizedSlots = (data.data || []).map((slot) => ({
          ...slot,
          recurringDays: (slot.recurringDays || []).map((day) => (typeof day === "number" ? NUMBER_TO_DAY[day] : day)),
        }))
        console.log("[v0] Normalized slots sample:", normalizedSlots[0])
        setSlots(normalizedSlots)
      } else {
        Alert.alert(t("errorTitle"), data.message || t("fetchErrorMsg"))
      }
    } catch (err) {
      console.log("[v0] Fetch slots error response:", err?.response?.data)
      console.error("❌ Fetch slots error:", err.response?.data || err.message)
      Alert.alert(t("errorTitle"), t("fetchErrorMsg"))
    } finally {
      setLoading(false)
    }
  }

  // ⭐ Helper
  const timeToMinutes = (t) => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }

  const normalizeRequestedOptions = (items = []) => {
    try {
      return (items || []).map((it) => ({
        optionId: it.optionId || it.vendorOption || it.id || it._id || "",
        value: it.value ?? it.selectedValue ?? it.input ?? "",
        price: typeof it.price === "number" ? it.price : Number(it.price) || 0,
        key: it.key || it.name || "",
      }))
    } catch (e) {
      console.log("[v0] normalizeRequestedOptions error:", e?.message)
      return []
    }
  }

  const allowedTypes = ["TravelAgentPackage", "VendorCustomizeOption"]

  const customDaysRaw = Number(daysParam || pkg.days || 1)
  const daysToSend = Math.max(1, Number.parseInt(customDaysRaw || 1, 10) || 1)

  const customRequestedOptionsRaw = requestedOptionsParam || pkg.requestedOptions || []
  const customRequestedOptions = normalizeRequestedOptions(customRequestedOptionsRaw)

  const resolvedPackageType = allowedTypes.includes(pkg.packageType)
    ? pkg.packageType
    : customRequestedOptions.length > 0
      ? "VendorCustomizeOption"
      : "TravelAgentPackage"

const resolvedPackageId =
  pkg.vendorCustomizeOptionId ||
  pkg.id ||
  pkg._id ||
  route?.params?.vendorCustomizeOptionId ||
  route?.params?.packageId ||
  route?.params?._id ||
  null

if (!resolvedPackageId) {
  console.warn("⚠️ resolvedPackageId is missing! pkg=", pkg, "route.params=", route?.params)
}


  console.log("[v0] Resolved booking inputs:", {
    vendorId,
    resolvedPackageType,
    resolvedPackageId,
    hasRequestedOptions: customRequestedOptions.length > 0,
    daysToSend,
  })

  const handleBook = async () => {
    if (!selectedSlot || !selectedDay) {
      console.log("[v0] Book blocked: slot/day not selected", { selectedSlot, selectedDay })
      return Alert.alert(t("incompleteSelectionTitle"), t("incompleteSelectionMsg"))
    }

    if (!resolvedPackageId) {
      console.log("[v0] Book blocked: missing resolvedPackageId. pkg=", pkg, "route.params=", route?.params)
      return Alert.alert(t("errorTitle"), "Package identifier missing. Please go back and select the package again.")
    }

    // ✅ Check if selected date matches the selectedDay
    const jsDay = date.getDay() // Sunday=0
    const backendDay = jsDay === 0 ? 7 : jsDay
    const selectedWeekday = NUMBER_TO_DAY[backendDay]

    console.log("📅 handleBook day check:", {
      selectedDayFromSlot: selectedDay,
      selectedDate: date.toDateString(),
      computedWeekday: selectedWeekday,
    })

    if (selectedWeekday !== selectedDay) {
      console.log("❌ Booking validation failed: selected weekday does not match required slot day.")
      console.log("Raw t():", t("invalidDayMsg", { day: selectedDay }))
      return Alert.alert(t("invalidDayTitle"), t("invalidDayMsg", { day: selectedDay }))
    }

    // ⭐ Format
    const pad = (n) => (n < 10 ? "0" + n : n)
    const formattedTime = `${pad(time.getHours())}:${pad(time.getMinutes())}`
    const formattedDate = date.toISOString().split("T")[0]
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const bookingDate = new Date(date)
    bookingDate.setHours(0, 0, 0, 0)

    if (bookingDate < today) {
      return Alert.alert(t("invalidDateTitle"), t("invalidDateMsg"))
    }

    if (time.getTime() !== time.getTime()) {
      return Alert.alert(t("invalidTimeTitle"), t("invalidTimeMsg"))
    }

    const fullBookingDateTime = new Date(bookingDate)
    fullBookingDateTime.setHours(time.getHours(), time.getMinutes(), 0, 0)
    const diffInHours = (fullBookingDateTime - new Date()) / (1000 * 60 * 60)

    console.log("[v0] Book date validations:", {
      formattedDate,
      formattedTime,
      diffInHours,
      slotWindow: { start: selectedSlot.startTime, end: selectedSlot.endTime },
    })

    if (diffInHours < 24) {
      return Alert.alert(t("tooSoonTitle"), t("tooSoonMsg"))
    }

    // ⭐ Check time in slot
    const slotStart = timeToMinutes(selectedSlot.startTime)
    const slotEnd = timeToMinutes(selectedSlot.endTime)
    const selectedTimeMinutes = time.getHours() * 60 + time.getMinutes()

    if (selectedTimeMinutes < slotStart || selectedTimeMinutes >= slotEnd) {
      return Alert.alert(
        t("timeErrorTitle"),
        t("timeErrorMsg", { start: selectedSlot.startTime, end: selectedSlot.endTime }),
      )
    }

    // ⭐ Finally book
    try {
      setBooking(true)

      const timeZone =
        (Intl && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) || "Asia/Karachi"

      const payload = {
        slotId: selectedSlot._id || selectedSlot.id,
        packageId: resolvedPackageId,
        packageType: resolvedPackageType, // "TravelAgentPackage" | "VendorCustomizeOption"
        date: formattedDate,
        time: formattedTime,
        timezone: timeZone,
        ...(resolvedPackageType === "VendorCustomizeOption"
          ? {
              requestedOptions: customRequestedOptions,
              days: daysToSend,
            }
          : {}),
      }

      console.log("[v0] Booking payload ->", payload)

      const res = await axiosInstance.post("appointment/book-appointment", payload)
      console.log("[v0] Booking response:", res?.data)

      if (res.data.success) {
        Alert.alert(t("successTitle"), t("successMsg"))
        setShowSeeAppointment(true)
      } else {
        console.log("[v0] Booking failed:", res.data)
        Alert.alert(t("errorTitle"), res.data.message || t("errorMsg"))
      }
    } catch (err) {
      console.log("[v0] Booking error response:", err?.response?.data)
      console.error("❌ Book error:", err.response?.data || err.message)
      Alert.alert(t("errorTitle"), err.response?.data?.message || t("errorMsg"))
    } finally {
      setBooking(false)
    }
  }

  const handleDayPress = (day, slot) => {
    setSelectedSlot(slot)
    setSelectedDay(day)
    const today = new Date()
    const jsDay = today.getDay() // Sunday=0
    const backendDay = jsDay === 0 ? 7 : jsDay
    const targetDay = DAY_TO_NUMBER[day]
    let delta = targetDay - backendDay
    if (delta < 0) delta += 7
    const nextDate = new Date(today)
    nextDate.setDate(today.getDate() + delta)
    console.log("📅 handleDayPress (professional):", {
      today: today.toDateString(),
      selectedDay: day,
      slotAvailableDays: slot.recurringDays,
      currentJsDay: jsDay,
      mappedBackendDay: backendDay,
      targetDay,
      delta,
      selectedDate: nextDate.toDateString(),
    })
    setDate(nextDate)
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Package Info Card */}
        <View style={styles.packageCard}>
          <Text style={styles.packageTitle}>{pkg.title}</Text>
          <Text style={styles.packagePrice}>
            {t("packagePriceLabel")} {pkg.price?.toLocaleString()}
          </Text>
        </View>

        {/* Available Slots Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("availableSlotsTitle")}</Text>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#BB9C66" size="large" />
              <Text style={styles.loadingText}>{t("loadingSlots")}</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>{t("noSlotsTitle")}</Text>
              <Text style={styles.emptyText}>{t("noSlotsText")}</Text>
            </View>
          ) : (
            slots.map((slot) => (
              <View
                key={slot.id || slot._id}
                style={[
                  styles.slotCard,
                  selectedSlot?.id === slot.id || selectedSlot?._id === slot._id ? styles.selectedSlot : null,
                ]}
              >
                <View style={styles.slotHeader}>
                  <View style={styles.slotTimeContainer}>
                    <Text style={styles.slotTimeLabel}>{t("timeWindow")}</Text>
                    <Text style={styles.slotTime}>
                      {slot.startTime} – {slot.endTime}
                    </Text>
                  </View>
                  <View style={styles.slotCapacityContainer}>
                    <Text style={styles.slotCapacityLabel}>{t("maxCapacity")}</Text>
                    <Text style={styles.slotCapacity}>{slot.maxCapacity}</Text>
                  </View>
                </View>

                <Text style={styles.daysLabel}>{t("availableDays")}</Text>
                <View style={styles.dayButtonsContainer}>
                  {slot.recurringDays.map((day) => (
                    <TouchableOpacity
                      key={day}
                      onPress={() => handleDayPress(day, slot)}
                      style={[
                        styles.dayButton,
                        selectedSlot?.id === slot.id && selectedDay === day && styles.dayButtonSelected,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dayButtonText,
                          selectedSlot?.id === slot.id && selectedDay === day && styles.dayButtonTextSelected,
                        ]}
                      >
                        {day.substring(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>

        {/* Date & Time Selection */}
        {selectedSlot && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("selectDateTime")}</Text>

            <View style={styles.dateTimeContainer}>
              <View style={styles.dateTimeCard}>
                <Text style={styles.dateTimeLabel}>{t("dateLabel")}</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowDatePicker(true)}
                  disabled={!selectedDay}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateTimeText, !selectedDay && styles.disabledText]}>{date.toDateString()}</Text>
                  <Text style={styles.dateTimeIcon}>🗓️</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dateTimeCard}>
                <Text style={styles.dateTimeLabel}>{t("timeLabel")}</Text>
                <TouchableOpacity
                  style={styles.dateTimeButton}
                  onPress={() => setShowTimePicker(true)}
                  disabled={!selectedSlot}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dateTimeText, !selectedSlot && styles.disabledText]}>
                    {`${time.getHours().toString().padStart(2, "0")}:${time.getMinutes().toString().padStart(2, "0")}`}
                  </Text>
                  <Text style={styles.dateTimeIcon}>🕐</Text>
                </TouchableOpacity>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "calendar"}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false)
                  if (event?.type === "set" && selectedDate) {
                    setDate(selectedDate)
                  }
                }}
              />
            )}

            {showTimePicker && (
              <DateTimePicker
                value={time}
                mode="time"
                display={Platform.OS === "ios" ? "spinner" : "clock"}
                onChange={(event, selectedTime) => {
                  setShowTimePicker(false)
                  if (event?.type === "set" && selectedTime) setTime(selectedTime)
                }}
              />
            )}
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.bookButton, (!selectedDay || !selectedSlot || booking) && styles.disabledButton]}
            onPress={handleBook}
            disabled={booking || !selectedDay || !selectedSlot}
            activeOpacity={0.8}
          >
            {booking ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.bookButtonIcon}>🗓️</Text>
            )}
            <Text style={styles.bookButtonText}>{booking ? t("bookingLoading") : t("bookingButton")}</Text>
          </TouchableOpacity>

          {showSeeAppointment && (
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => navigation.navigate("BookedAppointments")}
              activeOpacity={0.8}
            >
              <Text style={styles.viewButtonIcon}>📋</Text>
              <Text style={styles.viewButtonText}>{t("viewAppointments")}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Navigation navigation={navigation} active="UmrahPackages" />
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  packageCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  packageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    textAlign: "center",
    marginBottom: 8,
  },
  packagePrice: {
    fontSize: 24,
    fontWeight: "700",
    color: "#BB9C66",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  slotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  selectedSlot: {
    borderColor: "#BB9C66",
    borderWidth: 2,
    shadowColor: "#BB9C66",
    shadowOpacity: 0.2,
  },
  slotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  slotTimeContainer: {
    flex: 1,
  },
  slotTimeLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  slotTime: {
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "700",
  },
  slotCapacityContainer: {
    alignItems: "flex-end",
  },
  slotCapacityLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  slotCapacity: {
    fontSize: 16,
    color: "#BB9C66",
    fontWeight: "700",
  },
  daysLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    marginBottom: 12,
  },
  dayButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayButton: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  dayButtonSelected: {
    backgroundColor: "#BB9C66",
    borderColor: "#BB9C66",
  },
  dayButtonText: {
    color: "#666",
    fontWeight: "600",
    fontSize: 12,
  },
  dayButtonTextSelected: {
    color: "#FFFFFF",
  },
  dateTimeContainer: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  dateTimeLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "600",
    marginBottom: 8,
  },
  dateTimeButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  dateTimeText: {
    fontSize: 14,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  dateTimeIcon: {
    fontSize: 16,
  },
  disabledText: {
    color: "#999",
  },
  actionSection: {
    marginTop: 8,
  },
  bookButton: {
    backgroundColor: "#BB9C66",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 25,
    marginBottom: 12,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    backgroundColor: "#CCC",
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  viewButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#BB9C66",
  },
  viewButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  viewButtonText: {
    color: "#BB9C66",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
})
