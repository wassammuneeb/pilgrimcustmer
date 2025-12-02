"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  StatusBar,
  Platform,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import { useNavigation } from "@react-navigation/native"
import Navigation from "../components/Navigation"
import axiosInstance from "../axiosInstance"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { bookingsTranslations as translations } from "../translations/bookingsTranslations"
import DateTimePicker from "@react-native-community/datetimepicker"

export default function Bookings() {
  const navigation = useNavigation()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState(null)
  const [editTravelerId, setEditTravelerId] = useState(null)
  const [travelerForm, setTravelerForm] = useState({
    fullName: "",
    cnic: "",
    passportNumber: "",
    gender: "",
    dob: "",
  })
  const [expanded, setExpanded] = useState({})
  const [cancellationReason, setCancellationReason] = useState("")
  const [policyModalVisible, setPolicyModalVisible] = useState(false)
  const [policyDetails, setPolicyDetails] = useState(null)
  const [withdrawVisible, setWithdrawVisible] = useState({})
  const [language, setLanguage] = useState("en")
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentHistoryVisible, setPaymentHistoryVisible] = useState({})
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    transactionId: "",
  })
  const [paymentLoading, setPaymentLoading] = useState(false)

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
    fetchBookings()
  }, [])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get("/bookings/view-own-bookings")
      console.log("[v0] API Response:", data)
      if (data.success && data.data) {
        setBookings(data.data)
      } else {
        throw new Error(data.message || "Failed to fetch bookings")
      }
    } catch (err) {
      console.log("[v0] API Error fetching bookings:", err.response?.data || err.message)
      Alert.alert(t("errorTitle"), t("couldNotFetchMsg"))
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }))

  const toggleWithdrawSection = (bookingId) => {
    setWithdrawVisible((prev) => ({ ...prev, [bookingId]: !prev[bookingId] }))
  }

  const togglePaymentHistory = (bookingId) => {
    setPaymentHistoryVisible((prev) => ({ ...prev, [bookingId]: !prev[bookingId] }))
  }

  const openPaymentModal = (bookingId) => {
    setSelectedBookingId(bookingId)
    setPaymentForm({ amount: "", transactionId: "" })
    setPaymentModalVisible(true)
  }

  const handleAddPayment = async () => {
    if (!paymentForm.amount.trim() || !paymentForm.transactionId.trim()) {
      Alert.alert(t("oopsTitle"), "Please enter both amount and transaction ID")
      return
    }

    const amount = Number.parseFloat(paymentForm.amount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert(t("oopsTitle"), "Please enter a valid amount")
      return
    }

    const currentBooking = bookings.find((b) => b._id === selectedBookingId || b.id === selectedBookingId)
    if (!currentBooking) {
      Alert.alert(t("oopsTitle"), "Booking not found")
      return
    }

    const remainingAmount =
      currentBooking.remainingAmount || currentBooking.totalAmount - currentBooking.totalPaidAmount

    if (amount > remainingAmount) {
      Alert.alert(
        "Payment Limit Exceeded",
        `The remaining amount for this booking is PKR ${remainingAmount.toLocaleString()}. You can only add payment up to this amount. Please enter a valid amount.`,
        [{ text: "OK" }],
      )
      return
    }

    setPaymentLoading(true)
    try {
      console.log("[v0] Payment API call starting with params:", {
        bookingId: selectedBookingId,
        amount: amount,
        transactionId: paymentForm.transactionId.trim(),
      })

      const { data } = await axiosInstance.patch(`/bookings/customer/add-transaction-id/${selectedBookingId}`, {
        amount: amount,
        transactionId: paymentForm.transactionId.trim(),
      })

      console.log("[v0] Payment API response received:", data)

      if (data.success) {
        Alert.alert(t("successTitle"), "Payment recorded successfully!")
        setPaymentModalVisible(false)
        setPaymentForm({ amount: "", transactionId: "" })
        fetchBookings()
      } else {
        console.log("[v0] Payment API error response:", data.message)
        Alert.alert(t("oopsTitle"), data.message || "Failed to record payment")
      }
    } catch (err) {
      console.log("[v0] Payment API error:", err.response?.data || err.message)
      Alert.alert(t("oopsTitle"), err.response?.data?.message || "Failed to add payment. Please try again.")
    } finally {
      setPaymentLoading(false)
    }
  }

  const openTravelerModal = (bookingId, traveler = null) => {
    setSelectedBookingId(bookingId)
    if (traveler) {
      setTravelerForm({
        fullName: traveler.name || traveler.fullName || "",
        cnic: traveler.cnic || "",
        passportNumber: traveler.passportNumber || "",
        gender: traveler.gender || "",
        dob: traveler.dob || "",
      })
      setEditTravelerId(traveler.id || traveler._id)
    } else {
      setTravelerForm({ fullName: "", cnic: "", passportNumber: "", gender: "", dob: "" })
      setEditTravelerId(null)
    }
    setModalVisible(true)
  }

  const handleDateChange = (event, date) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false)
    }
    if (date) {
      setSelectedDate(date)
      const formattedDate = date.toISOString().split("T")[0]
      setTravelerForm((prev) => ({ ...prev, dob: formattedDate }))
    }
  }

  const validateTravelerForm = () => {
    const { fullName, cnic, passportNumber, gender, dob } = travelerForm

    if (!fullName || !cnic || !passportNumber || !gender || !dob) {
      Alert.alert(t("pleaseCheckDetailsTitle"), t("allFieldsRequiredMsg"))
      return false
    }

    // CNIC validation: 13 digits only
    const cleanCnic = cnic.replace(/-/g, "")
    if (!/^\d{13}$/.test(cleanCnic)) {
      Alert.alert(t("pleaseCheckDetailsTitle"), "CNIC must be 13 digits (format: XXXXX-XXXXXXX-X or 13 digits)")
      return false
    }

    // Gender and CNIC last digit validation
    const lastDigit = Number.parseInt(cleanCnic[12], 10)
    if (gender === "male" && lastDigit % 2 === 0) {
      Alert.alert(
        t("pleaseCheckDetailsTitle"),
        "Either CNIC is invalid or gender is incorrect (Male: CNIC last digit must be odd)",
      )
      return false
    }
    if (gender === "female" && lastDigit % 2 !== 0) {
      Alert.Alert.alert(
        t("pleaseCheckDetailsTitle"),
        "Either CNIC is invalid or gender is incorrect (Female: CNIC last digit must be even)",
      )
      return false
    }

    // Passport validation: 6-9 alphanumeric uppercase
    if (!/^[A-Z0-9]{6,9}$/.test(passportNumber.trim())) {
      Alert.alert(t("pleaseCheckDetailsTitle"), "Passport must be 6-9 alphanumeric characters (uppercase only)")
      return false
    }

    // DOB validation: ensure it's a valid date
    if (!dob || isNaN(new Date(dob).getTime())) {
      Alert.alert(t("pleaseCheckDetailsTitle"), "Date of Birth must be a valid date")
      return false
    }

    return true
  }

  const handleSaveTraveler = async () => {
    if (!validateTravelerForm()) return

    try {
      if (editTravelerId) {
        const { data } = await axiosInstance.patch(
          `/bookings/update-traveler/${selectedBookingId}/travelers/${editTravelerId}`,
          {
            fullName: travelerForm.fullName,
            cnic: travelerForm.cnic,
            passportNumber: travelerForm.passportNumber,
            gender: travelerForm.gender,
            dob: travelerForm.dob,
          },
        )
        if (data.success) {
          Alert.alert(t("successTitle"), t("travelerUpdatedMsg"))
          setModalVisible(false)
          fetchBookings()
        } else throw new Error(data.message)
      } else {
        const { data } = await axiosInstance.patch("/bookings/add-travelers", {
          bookingId: selectedBookingId,
          travelers: [
            {
              fullName: travelerForm.fullName,
              cnic: travelerForm.cnic,
              passportNumber: travelerForm.passportNumber,
              gender: travelerForm.gender,
              dob: travelerForm.dob,
            },
          ],
        })
        if (data.success) {
          Alert.alert(t("successTitle"), t("travelerAddedMsg"))
          setModalVisible(false)
          fetchBookings()
        } else throw new Error(data.message)
      }
    } catch (err) {
      const errors = err.response?.data?.errors?.join("\n") || err.response?.data?.message || t("couldNotSaveMsg")
      Alert.alert(t("errorTitle"), errors)
    }
  }

  const handleDeleteTraveler = async (bookingId, travelerId) => {
    Alert.alert(t("confirmDeleteTitle"), t("confirmDeleteTravelerMsg"), [
      { text: t("cancelButton") },
      {
        text: t("deleteButton"),
        style: "destructive",
        onPress: async () => {
          try {
            const { data } = await axiosInstance.delete(
              `/bookings/delete-traveler/${bookingId}/travelers/${travelerId}`,
            )
            if (data.success) {
              Alert.alert(t("successTitle"), t("travelerDeletedMsg"))
              fetchBookings()
            } else throw new Error(data.message)
          } catch (err) {
            Alert.alert(t("oopsTitle"), err.response?.data?.message || t("couldNotDeleteMsg"))
          }
        },
      },
    ])
  }

  const handleRequestCancellation = async (bookingId) => {
    try {
      const { data } = await axiosInstance.get(`/bookings/cancellation-policy/${bookingId}`)
      if (data.success) {
        setPolicyDetails(data)
        setSelectedBookingId(bookingId)
        setPolicyModalVisible(true)
      } else {
        Alert.alert(t("oopsTitle"), data.message || t("couldNotRetrievePolicyMsg"))
      }
    } catch (err) {
      Alert.alert(t("oopsTitle"), err.response?.data?.message || t("couldNotRetrievePolicyMsg"))
    }
  }

  const confirmCancellation = async () => {
    if (!cancellationReason.trim() || cancellationReason.trim().length < 5) {
      Alert.alert(t("oopsTitle"), t("reasonRequiredMsg"))
      return
    }

    try {
      const res = await axiosInstance.patch("/bookings/request-cancellation", {
        bookingId: selectedBookingId,
        reason: cancellationReason.trim(),
      })
      if (res.data.success) {
        Alert.alert(t("successTitle"), res.data.message || t("cancellationSubmittedMsg"))
        setPolicyModalVisible(false)
        setCancellationReason("")
        fetchBookings()
      } else {
        Alert.alert(t("oopsTitle"), res.data.message || t("failedToCancelMsg"))
      }
    } catch (err) {
      const msg = err.response?.data?.message || t("failedToCancelMsg")
      Alert.alert(t("oopsTitle"), msg)
    }
  }

  const withdrawCancellation = async (bookingId) => {
    Alert.alert(t("withdrawCancellationTitle"), t("withdrawCancellationMsg"), [
      { text: t("noButton") },
      {
        text: t("yesWithdrawButton"),
        style: "destructive",
        onPress: async () => {
          try {
            const res = await axiosInstance.patch(`/bookings/withdraw-cancellation/${bookingId}`)
            if (res.data.success) {
              Alert.alert(t("successTitle"), res.data.message || t("cancellationWithdrawnMsg"))
              setWithdrawVisible((prev) => ({ ...prev, [bookingId]: false }))
              fetchBookings()
            } else {
              Alert.Alert.alert(t("oopsTitle"), res.data.message || t("failedToWithdrawMsg"))
            }
          } catch (err) {
            const msg = err.response?.data?.message || t("failedToWithdrawMsg")
            Alert.alert(t("oopsTitle"), msg)
          }
        },
      },
    ])
  }

  if (loading)
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

  if (!bookings.length)
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
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("emptyText")}</Text>
        </View>
        <Navigation navigation={navigation} active="Bookings" />
      </View>
    )

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
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{t("summaryTitle")}</Text>
          <Text style={styles.summaryText}>
            {t("youHaveText")} {bookings.length} {bookings.length === 1 ? t("bookingText") : t("bookingsText")}
          </Text>
        </View>

        {bookings.map((booking) => {
          const id = booking._id || booking.id
          const isOpen = expanded[id]
          const hasRequestedCancellation =
            booking.cancellationRequest?.requested === true ||
            booking.cancellationRequested === true ||
            booking.isCancellationRequested === true ||
            booking.status === "cancellation-requested" ||
            booking.cancellationRequest?.status === "accepted" ||
            booking.cancellationRequest?.status === "rejected"
          const confirmedStatuses = ["Confirmed", "Completed", "تصدیق شدہ", "Tasdeeq ho gayi", "تم التأكيد"]
          const isConfirmedOrCompleted = confirmedStatuses.includes(booking.bookingStatus.trim())

          if (!booking.package && !booking.customRequest) {
            return (
              <View key={id} style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.packageTitle} numberOfLines={2}>
                    {t("packageUnavailableText") || "Package Information"}
                  </Text>
                  <View style={styles.priceContainer}>
                    <Text style={styles.price}>PKR {booking.totalAmount?.toLocaleString() || "0"}</Text>
                  </View>
                </View>

                <View style={styles.detailsContainer}>
                  <DetailRow icon="📧" label={t("vendorLabel")} value={booking.vendor?.email || "N/A"} />
                  <DetailRow
                    icon="💰"
                    label={t("totalAmountLabel")}
                    value={`PKR ${booking.totalAmount?.toLocaleString() || "0"}`}
                  />
                  <DetailRow
                    icon="✅"
                    label={t("paidAmountLabel")}
                    value={`PKR ${booking.totalPaidAmount?.toLocaleString() || "0"}`}
                  />
                  <DetailRow
                    icon="⏳"
                    label={t("remainingLabel")}
                    value={`PKR ${(booking.remainingAmount || booking.totalAmount - booking.totalPaidAmount)?.toLocaleString() || "0"}`}
                  />
                </View>

                <View style={styles.statusSection}>
                  <StatusBadge label={t("tripStatusLabel")} value={booking.tripStatus} />
                  <StatusBadge label={t("bookingStatusLabel")} value={booking.bookingStatus} />
                  <StatusBadge label={t("paymentStatusLabel")} value={booking.paymentStatus} />
                  {(hasRequestedCancellation || booking.cancellationRequest?.status) && (
                    <StatusBadge
                      label={t("cancellationStatusLabel")}
                      value={booking.cancellationRequest?.status || t("pendingText")}
                    />
                  )}
                </View>

                <TouchableOpacity
                  style={styles.paymentHistoryHeader}
                  onPress={() => togglePaymentHistory(id)}
                  activeOpacity={0.8}
                >
                  <View style={styles.paymentHistoryHeaderLeft}>
                    <Text style={styles.paymentHistoryIcon}>💳</Text>
                    <Text style={styles.paymentHistoryTitle}>Payment History</Text>
                  </View>
                  <Text style={styles.expandIcon}>{paymentHistoryVisible[id] ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {paymentHistoryVisible[id] && (
                  <View style={styles.paymentHistoryContainer}>
                    {booking.paymentHistory && booking.paymentHistory.length > 0 ? (
                      booking.paymentHistory.map((payment, idx) => (
                        <View key={idx} style={styles.paymentHistoryCard}>
                          <View style={styles.paymentHistoryContent}>
                            <Text style={styles.paymentAmount}>
                              PKR {Number.parseFloat(payment.amount).toLocaleString()}
                            </Text>
                            <Text style={styles.paymentTransactionId}>
                              Transaction: {payment.customerTransactionId}
                            </Text>
                            <Text style={styles.paymentDate}>{new Date(payment.paidAt).toLocaleDateString()}</Text>
                          </View>
                          <View style={styles.paymentCheckmark}>
                            <Text style={styles.checkmarkIcon}>✓</Text>
                          </View>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.noPaymentText}>No payment history yet</Text>
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.travelersHeader} onPress={() => toggleExpanded(id)} activeOpacity={0.8}>
                  <View style={styles.travelersHeaderLeft}>
                    <Text style={styles.travelersIcon}>👥</Text>
                    <Text style={styles.travelersTitle}>
                      {t("travelersTitle")} ({booking.travelers?.length || 0})
                    </Text>
                  </View>
                  <Text style={styles.expandIcon}>{isOpen ? "▲" : "▼"}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.travelersContainer}>
                    {booking.travelers?.length ? (
                      booking.travelers.map((traveler, idx) => (
                        <View key={idx} style={styles.travelerCard}>
                          <View style={styles.travelerInfo}>
                            <Text style={styles.travelerName}>👤 {traveler.name || traveler.fullName}</Text>
                            <Text style={styles.travelerDetail}>🆔 {traveler.cnic}</Text>
                            <Text style={styles.travelerDetail}>🛂 {traveler.passportNumber}</Text>
                            <Text style={styles.travelerDetail}>⚧ {traveler.gender}</Text>
                          </View>
                          <View style={styles.travelerActions}>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.editButton]}
                              onPress={() => openTravelerModal(id, traveler)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.editButtonText}>{t("editButton")}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.actionButton, styles.deleteButton]}
                              onPress={() => handleDeleteTraveler(id, traveler.id || traveler._id)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.deleteButtonText}>{t("deleteButton")}</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))
                    ) : (
                      <View style={styles.noTravelersContainer}>
                        <Text style={styles.noTravelersText}>{t("noTravelersText")}</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.actionButtonsContainer}>
                  <TouchableOpacity
                    style={[styles.primaryButton, styles.paymentButton]}
                    onPress={() => openPaymentModal(id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.paymentButtonIcon}>💳</Text>
                    <Text style={styles.primaryButtonText}>Add Payment</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => openTravelerModal(id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryButtonIcon}>➕</Text>
                    <Text style={styles.primaryButtonText}>{t("addTravelerButton")}</Text>
                  </TouchableOpacity>

                  {isConfirmedOrCompleted && (
                    <TouchableOpacity
                      style={[styles.secondaryButton, styles.viewTripButton]}
                      onPress={() => navigation.navigate("ViewTrip", { bookingId: id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.viewTripButtonIcon}>🗺️</Text>
                      <Text style={styles.viewTripButtonText}>{t("viewTripPlanButton")}</Text>
                    </TouchableOpacity>
                  )}

                  {hasRequestedCancellation && booking.cancellationRequest?.status !== "rejected" ? (
                    <TouchableOpacity disabled style={[styles.secondaryButton, styles.disabledButton]}>
                      <Text style={styles.disabledButtonIcon}>⏳</Text>
                      <Text style={styles.disabledButtonText}>{t("cancellationRequestedButton")}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.secondaryButton, styles.cancelButton]}
                      onPress={() => handleRequestCancellation(id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonIcon}>❌</Text>
                      <Text style={styles.cancelButtonText}>{t("requestCancellationButton")}</Text>
                    </TouchableOpacity>
                  )}

                  {booking.cancellationRequest?.status === "pending" && (
                    <View style={styles.withdrawSection}>
                      <TouchableOpacity
                        style={styles.withdrawToggle}
                        onPress={() => toggleWithdrawSection(id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.withdrawToggleText}>{t("withdrawToggleText")}</Text>
                        <Text style={styles.withdrawToggleIcon}>{withdrawVisible[id] ? "▲" : "▼"}</Text>
                      </TouchableOpacity>
                      {withdrawVisible[id] && (
                        <TouchableOpacity
                          style={[styles.secondaryButton, styles.withdrawButton]}
                          onPress={() => withdrawCancellation(id)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.withdrawButtonIcon}>↩️</Text>
                          <Text style={styles.withdrawButtonText}>{t("withdrawCancellationButton")}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            )
          }

          return (
            <View key={id} style={styles.bookingCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.packageTitle} numberOfLines={2}>
                  {booking.package?.title || booking.customRequest?.type || booking.customRequest?.title || "Package"}
                </Text>
                <View style={styles.priceContainer}>
                  <Text style={styles.price}>
                    PKR {(booking.package?.price || booking.totalAmount)?.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.detailsContainer}>
                {booking.package && (
                  <>
                    {booking.package.type === "Customized Package" ? (
                      <>
                        <DetailRow
                          icon="🏢"
                          label={t("companyLabel")}
                          value={booking.package.vendorName || booking.package.vendorCompanyName || "N/A"}
                        />
                        <DetailRow icon="📧" label={t("vendorLabel")} value={booking.vendor?.contactNo || "N/A"} />
                        <DetailRow icon="🎯" label={t("typeLabel")} value={booking.package.type} />
                        <DetailRow icon="🏷️" label={t("categoryLabel")} value={booking.package.type} />
                      </>
                    ) : (
                      <>
                        <DetailRow icon="🏢" label={t("companyLabel")} value={booking.package.vendorCompanyName} />
                        <DetailRow icon="📧" label={t("vendorLabel")} value={booking.vendor?.contactNo || "N/A"} />
                        <DetailRow icon="🎯" label={t("typeLabel")} value={booking.package.packageType} />
                        <DetailRow icon="🏷️" label={t("categoryLabel")} value={booking.package.packageCategory} />
                      </>
                    )}
                    <DetailRow
                      icon="⏱️"
                      label={t("durationLabel")}
                      value={`${booking.package.duration} ${t("daysText")}`}
                    />
                  </>
                )}
                {booking.customRequest && (
                  <>
                    <DetailRow
                      icon="🏢"
                      label={t("companyLabel")}
                      value={booking.package?.vendorCompanyName || booking.vendor?.companyName || "N/A"}
                    />
                    <DetailRow
                      icon="🎯"
                      label={t("typeLabel")}
                      value={booking.customRequest?.type || "Customized Package"}
                    />
                  </>
                )}
                <DetailRow
                  icon="💰"
                  label={t("Total Amount")}
                  value={`PKR ${booking.totalAmount?.toLocaleString() || "0"}`}
                />
                <DetailRow
                  icon="✅"
                  label={t("Paid Amount")}
                  value={`PKR ${booking.totalPaidAmount?.toLocaleString() || "0"}`}
                />
                <DetailRow
                  icon="⏳"
                  label={t("Remaining Amount")}
                  value={`PKR ${(booking.remainingAmount || booking.totalAmount - booking.totalPaidAmount)?.toLocaleString() || "0"}`}
                />
              </View>

              <View style={styles.statusSection}>
                <StatusBadge label={t("tripStatusLabel")} value={booking.tripStatus} />
                <StatusBadge label={t("bookingStatusLabel")} value={booking.bookingStatus} />
                <StatusBadge label={t("paymentStatusLabel")} value={booking.paymentStatus} />
                {(hasRequestedCancellation || booking.cancellationRequest?.status) && (
                  <StatusBadge
                    label={t("cancellationStatusLabel")}
                    value={booking.cancellationRequest?.status || t("pendingText")}
                  />
                )}
              </View>

              <TouchableOpacity
                style={styles.paymentHistoryHeader}
                onPress={() => togglePaymentHistory(id)}
                activeOpacity={0.8}
              >
                <View style={styles.paymentHistoryHeaderLeft}>
                  <Text style={styles.paymentHistoryIcon}>💳</Text>
                  <Text style={styles.paymentHistoryTitle}>Payment History</Text>
                </View>
                <Text style={styles.expandIcon}>{paymentHistoryVisible[id] ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {paymentHistoryVisible[id] && (
                <View style={styles.paymentHistoryContainer}>
                  {booking.paymentHistory && booking.paymentHistory.length > 0 ? (
                    booking.paymentHistory.map((payment, idx) => (
                      <View key={idx} style={styles.paymentHistoryCard}>
                        <View style={styles.paymentHistoryContent}>
                          <Text style={styles.paymentAmount}>
                            PKR {Number.parseFloat(payment.amount).toLocaleString()}
                          </Text>
                          <Text style={styles.paymentTransactionId}>Transaction: {payment.customerTransactionId}</Text>
                          <Text style={styles.paymentDate}>{new Date(payment.paidAt).toLocaleDateString()}</Text>
                        </View>
                        <View style={styles.paymentCheckmark}>
                          <Text style={styles.checkmarkIcon}>✓</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={styles.noPaymentText}>No payment history yet</Text>
                  )}
                </View>
              )}

              <TouchableOpacity style={styles.travelersHeader} onPress={() => toggleExpanded(id)} activeOpacity={0.8}>
                <View style={styles.travelersHeaderLeft}>
                  <Text style={styles.travelersIcon}>👥</Text>
                  <Text style={styles.travelersTitle}>
                    {t("travelersTitle")} ({booking.travelers?.length || 0})
                  </Text>
                </View>
                <Text style={styles.expandIcon}>{isOpen ? "▲" : "▼"}</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.travelersContainer}>
                  {booking.travelers?.length ? (
                    booking.travelers.map((traveler, idx) => (
                      <View key={idx} style={styles.travelerCard}>
                        <View style={styles.travelerInfo}>
                          <Text style={styles.travelerName}>👤 {traveler.name || traveler.fullName}</Text>
                          <Text style={styles.travelerDetail}>🆔 {traveler.cnic}</Text>
                          <Text style={styles.travelerDetail}>🛂 {traveler.passportNumber}</Text>
                          <Text style={styles.travelerDetail}>⚧ {traveler.gender}</Text>
                        </View>
                        <View style={styles.travelerActions}>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.editButton]}
                            onPress={() => openTravelerModal(id, traveler)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.editButtonText}>{t("editButton")}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionButton, styles.deleteButton]}
                            onPress={() => handleDeleteTraveler(id, traveler.id || traveler._id)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.deleteButtonText}>{t("deleteButton")}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  ) : (
                    <View style={styles.noTravelersContainer}>
                      <Text style={styles.noTravelersText}>{t("noTravelersText")}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.primaryButton, styles.paymentButton]}
                  onPress={() => openPaymentModal(id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.paymentButtonIcon}>💳</Text>
                  <Text style={styles.primaryButtonText}>Add Payment</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => openTravelerModal(id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonIcon}>➕</Text>
                  <Text style={styles.primaryButtonText}>{t("addTravelerButton")}</Text>
                </TouchableOpacity>

                {isConfirmedOrCompleted && (
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.viewTripButton]}
                    onPress={() => navigation.navigate("ViewTrip", { bookingId: id })}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.viewTripButtonIcon}>🗺️</Text>
                    <Text style={styles.viewTripButtonText}>{t("viewTripPlanButton")}</Text>
                  </TouchableOpacity>
                )}

                {hasRequestedCancellation && booking.cancellationRequest?.status !== "rejected" ? (
                  <TouchableOpacity disabled style={[styles.secondaryButton, styles.disabledButton]}>
                    <Text style={styles.disabledButtonIcon}>⏳</Text>
                    <Text style={styles.disabledButtonText}>{t("cancellationRequestedButton")}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.secondaryButton, styles.cancelButton]}
                    onPress={() => handleRequestCancellation(id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonIcon}>❌</Text>
                    <Text style={styles.cancelButtonText}>{t("requestCancellationButton")}</Text>
                  </TouchableOpacity>
                )}

                {booking.cancellationRequest?.status === "pending" && (
                  <View style={styles.withdrawSection}>
                    <TouchableOpacity
                      style={styles.withdrawToggle}
                      onPress={() => toggleWithdrawSection(id)}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.withdrawToggleText}>{t("withdrawToggleText")}</Text>
                      <Text style={styles.withdrawToggleIcon}>{withdrawVisible[id] ? "▲" : "▼"}</Text>
                    </TouchableOpacity>
                    {withdrawVisible[id] && (
                      <TouchableOpacity
                        style={[styles.secondaryButton, styles.withdrawButton]}
                        onPress={() => withdrawCancellation(id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.withdrawButtonIcon}>↩️</Text>
                        <Text style={styles.withdrawButtonText}>{t("withdrawCancellationButton")}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          )
        })}
      </ScrollView>

      <Modal visible={policyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("cancellationPolicyTitle")}</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {policyDetails ? (
                <>
                  {policyDetails.startDate ? (
                    <View style={styles.policyInfoContainer}>
                      <Text style={styles.policyInfoText}>
                        {t("startDateText")} {new Date(policyDetails.startDate).toDateString()}
                      </Text>
                      <Text style={styles.policyInfoText}>
                        {t("daysRemainingText")} {policyDetails.daysRemaining ?? "N/A"}
                      </Text>
                      <Text style={styles.policyInfoText}>
                        {t("refundPercentageText")} {policyDetails.refundPercent}%
                      </Text>
                      <Text style={styles.policyInfoText}>
                        {t("refundAmountText")} PKR {policyDetails.refundAmount?.toLocaleString()}
                      </Text>
                      <Text style={styles.policyMessage}>{policyDetails.message}</Text>
                    </View>
                  ) : (
                    <Text style={styles.policyMessage}>{t("startDateNotSetMsg")}</Text>
                  )}
                  <Text style={styles.policyListTitle}>{t("fullRefundPolicyText")}</Text>
                  {policyDetails.fullPolicy?.length ? (
                    policyDetails.fullPolicy.map((rule, idx) => (
                      <Text key={idx} style={styles.policyRule}>
                        • {t("ifYouCancelText")}{" "}
                        {rule.minDays === 0
                          ? t("lessThanDaysText")
                          : `${t("moreThanDaysText")} ${rule.minDays} ${t("daysBefore")}`}
                        , {t("youWillReceiveText")} {rule.refundPercent}% {t("refundText")}
                      </Text>
                    ))
                  ) : (
                    <Text style={styles.policyRule}>{t("noPolicyDataMsg")}</Text>
                  )}
                  <TextInput
                    placeholder={t("reasonPlaceholder")}
                    multiline
                    style={styles.reasonInput}
                    value={cancellationReason}
                    onChangeText={setCancellationReason}
                    placeholderTextColor="#999"
                  />
                </>
              ) : (
                <Text style={styles.loadingPolicyText}>{t("loadingPolicyText")}</Text>
              )}
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setPolicyModalVisible(false)
                  setCancellationReason("")
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalButtonText}>{t("cancelButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmModalButton]}
                onPress={confirmCancellation}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmModalButtonText}>{t("agreeRequestButton")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTravelerId ? t("editTravelerTitle") : t("addTravelerTitle")}</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("fullNameLabel")}</Text>
                <TextInput
                  placeholder={t("fullNamePlaceholder")}
                  style={styles.textInput}
                  value={travelerForm.fullName}
                  onChangeText={(text) => setTravelerForm((prev) => ({ ...prev, fullName: text }))}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("cnicLabel")}</Text>
                <TextInput
                  placeholder={t("cnicPlaceholder")}
                  style={styles.textInput}
                  keyboardType="numeric"
                  value={travelerForm.cnic}
                  onChangeText={(text) => setTravelerForm((prev) => ({ ...prev, cnic: text }))}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("passportLabel")}</Text>
                <TextInput
                  placeholder={t("passportPlaceholder")}
                  style={styles.textInput}
                  value={travelerForm.passportNumber}
                  onChangeText={(text) => setTravelerForm((prev) => ({ ...prev, passportNumber: text.toUpperCase() }))}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputContainer}>
             {/* <Text style={styles.inputLabel}>{t("dateOfBirthLabel")}</Text> */}
                <Text style={styles.inputLabel}>{t("Date Of Birth")}</Text>
                <TouchableOpacity
                  style={styles.datePickerButton}
                  onPress={() => setShowDatePicker(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.datePickerButtonText}>
                    {/* {travelerForm.dob || t("selectDatePlaceholder") || "Select Date"} */}
                    {travelerForm.dob || t("SelectDateOfBirth") || "Select Date"}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={selectedDate}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                  />
                )}
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("genderLabel")}</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={travelerForm.gender}
                    onValueChange={(itemValue) => setTravelerForm((prev) => ({ ...prev, gender: itemValue }))}
                    style={styles.picker}
                  >
                    <Picker.Item label={t("selectGenderText")} value="" />
                    <Picker.Item label={t("maleText")} value="male" />
                    <Picker.Item label={t("femaleText")} value="female" />
                    <Picker.Item label={t("otherText")} value="other" />
                  </Picker>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelModalButtonText}>{t("cancelButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleSaveTraveler}
                activeOpacity={0.8}
              >
                <Text style={styles.saveModalButtonText}>{editTravelerId ? t("updateButton") : t("addButton")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={paymentModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Payment</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Amount (PKR)</Text>
                <TextInput
                  placeholder="Enter payment amount"
                  style={styles.textInput}
                  keyboardType="decimal-pad"
                  value={paymentForm.amount}
                  onChangeText={(text) => setPaymentForm((prev) => ({ ...prev, amount: text }))}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Transaction ID</Text>
                <TextInput
                  placeholder="Enter transaction ID (e.g., reference number)"
                  style={styles.textInput}
                  value={paymentForm.transactionId}
                  onChangeText={(text) => setPaymentForm((prev) => ({ ...prev, transactionId: text }))}
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.paymentInfoBox}>
                <Text style={styles.paymentInfoTitle}>💡 Payment Information</Text>
                <Text style={styles.paymentInfoText}>
                  Enter your transaction details below. This payment will be recorded and added to your booking history.
                </Text>
              </View>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => {
                  setPaymentModalVisible(false)
                  setPaymentForm({ amount: "", transactionId: "" })
                }}
                activeOpacity={0.8}
                disabled={paymentLoading}
              >
                <Text style={styles.cancelModalButtonText}>{t("cancelButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={handleAddPayment}
                activeOpacity={0.8}
                disabled={paymentLoading}
              >
                <Text style={styles.saveModalButtonText}>{paymentLoading ? "Processing..." : "Add Payment"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Navigation navigation={navigation} active="Bookings" />
    </View>
  )
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

const StatusBadge = ({ label, value }) => {
  const getStatusColor = (status) => {
    const statusLower = status.toLowerCase()
    const doneStatuses = ["completed", "confirmed", "full-paid", "approved", "accepted", "withdrawn by user"]
    const inProgressStatuses = ["pending", "in-process", "upcoming", "active", "partial", "cancellation-requested"]
    const failedStatuses = ["cancelled", "unpaid", "failed", "rejected"]

    if (doneStatuses.some((s) => statusLower.includes(s))) {
      return { bg: "#E8F5E8", text: "#2E7D32" }
    } else if (inProgressStatuses.some((s) => statusLower.includes(s))) {
      return { bg: "#FFF8E1", text: "#F57C00" }
    } else if (failedStatuses.some((s) => statusLower.includes(s))) {
      return { bg: "#FFEBEE", text: "#D32F2F" }
    }
    return { bg: "#F5F5F5", text: "#666" }
  }

  const colors = getStatusColor(value)

  return (
    <View style={styles.statusBadgeContainer}>
      <Text style={styles.statusLabel}>{label}</Text>
      <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
        <Text style={[styles.statusText, { color: colors.text }]}>{value}</Text>
      </View>
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
  bookingCard: {
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
  priceContainer: {
    alignItems: "flex-end",
  },
  price: {
    fontSize: 18,
    fontWeight: "700",
    color: "#BB9C66",
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
    flex: 1,
  },
  statusSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  statusBadgeContainer: {
    flex: 1,
    minWidth: "30%",
  },
  statusLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentHistoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    marginBottom: 8,
  },
  paymentHistoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  paymentHistoryIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  paymentHistoryTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2E7D32",
  },
  paymentHistoryContainer: {
    marginBottom: 16,
  },
  paymentHistoryCard: {
    flexDirection: "row",
    backgroundColor: "#F1F8F5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#C8E6C9",
    alignItems: "center",
    justifyContent: "space-between",
  },
  paymentHistoryContent: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
    marginBottom: 4,
  },
  paymentTransactionId: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  paymentDate: {
    fontSize: 12,
    color: "#999",
  },
  paymentCheckmark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  checkmarkIcon: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  noPaymentText: {
    fontSize: 14,
    color: "#999",
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 12,
  },
  travelersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    marginBottom: 8,
  },
  travelersHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  travelersIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  travelersTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  expandIcon: {
    fontSize: 16,
    color: "#BB9C66",
    fontWeight: "600",
  },
  travelersContainer: {
    marginBottom: 16,
  },
  travelerCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 18,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  travelerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  travelerName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    lineHeight: 22,
  },
  travelerDetail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
    lineHeight: 20,
    fontWeight: "500",
  },
  travelerActions: {
    justifyContent: "space-between",
    marginLeft: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    minWidth: 60,
  },
  editButton: {
    backgroundColor: "#2196F3",
    marginBottom: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#F44336",
  },
  deleteButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  noTravelersContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noTravelersText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  actionButtonsContainer: {
    gap: 8,
  },
  primaryButton: {
    backgroundColor: "#BB9C66",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  paymentButton: {
    backgroundColor: "#2E7D32",
    shadowColor: "#2E7D32",
  },
  paymentButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  primaryButtonIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BB9C66",
    backgroundColor: "#fff",
  },
  cancelButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#F44336",
  },
  cancelButtonIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  cancelButtonText: {
    color: "#F44336",
    fontSize: 14,
    fontWeight: "600",
  },
  withdrawButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#666",
  },
  withdrawButtonIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  withdrawButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  viewTripButton: {
    backgroundColor: "#FFFFFF",
    borderColor: "#2196F3",
  },
  viewTripButtonIcon: {
    fontSize: 14,
    marginRight: 8,
    color: "#2196F3",
  },
  viewTripButtonText: {
    color: "#2196F3",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
    opacity: 0.8,
  },
  disabledButtonIcon: {
    fontSize: 14,
    marginRight: 8,
    color: "#999",
  },
  disabledButtonText: {
    color: "#999",
    fontSize: 14,
    fontWeight: "600",
  },
  withdrawSection: {
    marginTop: 8,
  },
  withdrawToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#FFF8E1",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE082",
    marginBottom: 8,
  },
  withdrawToggleText: {
    flex: 1,
    fontSize: 14,
    color: "#F57C00",
    fontWeight: "500",
    lineHeight: 20,
  },
  withdrawToggleIcon: {
    fontSize: 14,
    color: "#F57C00",
    fontWeight: "600",
    marginLeft: 8,
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
    maxHeight: "80%",
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
    maxHeight: 400,
    padding: 20,
  },
  policyInfoContainer: {
    backgroundColor: "#F8F9FA",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  policyInfoText: {
    fontSize: 14,
    color: "#2C2C2C",
    marginBottom: 4,
  },
  policyMessage: {
    fontSize: 14,
    color: "#666",
    marginVertical: 12,
    lineHeight: 20,
  },
  policyListTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
    marginTop: 16,
    marginBottom: 8,
  },
  policyRule: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
    lineHeight: 20,
  },
  reasonInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#2C2C2C",
    backgroundColor: "#F8F9FA",
    minHeight: 80,
    textAlignVertical: "top",
    marginTop: 16,
  },
  loadingPolicyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    paddingVertical: 40,
  },
  inputContainer: {
    marginBottom: 16,
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
  },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#F8F9FA",
    justifyContent: "center",
  },
  datePickerButtonText: {
    fontSize: 14,
    color: "#2C2C2C",
    fontWeight: "500",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#2C2C2C",
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
    backgroundColor: "#F44336",
  },
  confirmModalButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  saveModalButton: {
    backgroundColor: "#BB9C66",
  },
  saveModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  paymentInfoBox: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
    marginBottom: 8,
  },
  paymentInfoText: {
    fontSize: 13,
    color: "#558B2F",
    lineHeight: 20,
  },
})
