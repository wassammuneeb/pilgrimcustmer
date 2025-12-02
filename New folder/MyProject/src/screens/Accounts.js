"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  StatusBar,
  ActivityIndicator,
} from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { useNavigation } from "@react-navigation/native"
import axiosInstance from "../axiosInstance"
import Navigation from "../components/Navigation"
import { accountsTranslations as translations } from "../translations/accountsTranslations"

const Accounts = () => {
  const navigation = useNavigation()
  const [user, setUser] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [tempName, setTempName] = useState("")
  const [tempPhone, setTempPhone] = useState("")

  const [passwordModal, setPasswordModal] = useState(false)
  const [languageModal, setLanguageModal] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")

  const t = (section, key) => {
    const lang = user?.preferredLanguage || "en"
    const translation =
      (translations[lang] && translations[lang][section] && translations[lang][section][key]) ||
      (translations["en"] && translations["en"][section] && translations["en"][section][key]) ||
      `${section}.${key}`
    return typeof translation === "string" ? translation : `${section}.${key}`
  }

  const languageOptions = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "ur", name: "اردو (Urdu)", flag: "🇵🇰" },
    { code: "ar", name: "العربية (Arabic)", flag: "🇸🇦" },
    { code: "roman-ur", name: "Roman Urdu", flag: "🇵🇰" },
  ]

  useEffect(() => {
    fetchUserProfile()
  }, [])

  const fetchUserProfile = async () => {
    setIsLoading(true)
    try {
      const { data } = await axiosInstance.get("/customer/viewcustomerprofile")
      if (data.success) {
        const customer = data.customer || data.data
        setUser(customer)
        setTempName(customer?.name || "")
        setTempPhone(customer?.phoneNo || "")
      } else {
        Alert.alert(t("common", "errorTitle"), data.message || t("accounts", "loadProfileFailedMessage"))
      }
    } catch (err) {
      console.error("Profile fetch error:", err.response?.data || err.message)
      const errorMsg = err.response?.data?.message || t("accounts", "loadProfileFailedMessage")
      Alert.alert(t("common", "errorTitle"), errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const validateProfileUpdate = () => {
    if (!tempName.trim()) {
      Alert.alert(t("accounts", "nameRequiredTitle"), t("accounts", "nameRequiredMessage"))
      return false
    }
    if (tempName.length < 3) {
      Alert.alert(t("accounts", "invalidNameTitle"), t("accounts", "invalidNameMessage"))
      return false
    }
    if (tempName.length > 50) {
      Alert.alert(t("accounts", "nameTooLongTitle"), t("accounts", "nameTooLongMessage"))
      return false
    }
    if (!tempPhone.trim()) {
      Alert.alert(t("accounts", "phoneRequiredTitle"), t("accounts", "phoneRequiredMessage"))
      return false
    }
    if (!/^[0-9]{11}$/.test(tempPhone.trim())) {
      Alert.alert(t("accounts", "invalidPhoneTitle"), t("accounts", "invalidPhoneMessage"))
      return false
    }
    return true
  }

  const handleSave = async () => {
    if (!validateProfileUpdate()) return

    setIsLoading(true)
    try {
      const updatePayload = {
        name: tempName.trim(),
        phoneNo: tempPhone.trim(),
      }

      const { data } = await axiosInstance.patch("/customer/updatecustomerprofile", updatePayload)

      if (data.success) {
        const updated = data.customer ||
          data.data || {
            ...user,
            name: tempName.trim(),
            phoneNo: tempPhone.trim(),
          }
        setUser(updated)
        setIsEditing(false)
        Alert.alert(t("common", "successTitle"), t("accounts", "profileUpdatedMessage"))
      } else {
        Alert.alert(t("common", "updateFailedTitle"), data.message)
      }
    } catch (err) {
      console.error("Update error:", err.response?.data || err.message)
      const errorMsg = err.response?.data?.message || t("accounts", "failedToUpdateProfileMessage")
      Alert.alert(t("common", "errorTitle"), errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLanguageUpdate = async (selectedLanguage) => {
    try {
      setIsLoading(true)
      console.log("LANGUAGE API - Attempting to update language to:", selectedLanguage)

      let response
      try {
        response = await axiosInstance.patch("/customer/updatepreferredlanguage", {
          language: selectedLanguage,
        })
      } catch (e) {
        if (e?.response?.status === 404) {
          response = await axiosInstance.patch("/customer/customer-updatepreferredlanguage", {
            language: selectedLanguage,
          })
        } else {
          throw e
        }
      }

      const { data } = response
      console.log("LANGUAGE API - Response received:", data)

      if (data.success) {
        const newLang = data.preferredLanguage || selectedLanguage
        setUser({ ...user, preferredLanguage: newLang })
        await AsyncStorage.setItem(
          "userData",
          JSON.stringify({
            ...user,
            preferredLanguage: newLang,
          }),
        )
        setLanguageModal(false)
        Alert.alert(t("common", "successTitle"), t("accounts", "languageUpdatedMessage"))
        console.log("LANGUAGE API - Language updated successfully to:", newLang)
      } else {
        Alert.alert(t("common", "updateFailedTitle"), data.message)
        console.error("LANGUAGE API - Update failed:", data.message)
      }
    } catch (err) {
      console.error("LANGUAGE API - Language update error:", err.response?.data || err.message)
      const errorMsg = err.response?.data?.message || t("accounts", "failedToUpdateLanguageMessage")
      Alert.alert(t("common", "errorTitle"), errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const validatePassword = () => {
    if (!oldPassword || !newPassword) {
      Alert.alert(t("accounts", "requiredFieldsTitle"), t("accounts", "requiredFieldsMessage"))
      return false
    }
    if (oldPassword === newPassword) {
      Alert.alert(t("accounts", "newPasswordErrorTitle"), t("accounts", "newPasswordErrorMessage"))
      return false
    }
    if (newPassword.length < 6) {
      Alert.alert(t("accounts", "weakPasswordTitle"), t("accounts", "weakPasswordLengthMessage"))
      return false
    }
    if (
      !/[A-Z]/.test(newPassword) ||
      !/[a-z]/.test(newPassword) ||
      !/[0-9]/.test(newPassword) ||
      !/[@$!%*?&]/.test(newPassword)
    ) {
      Alert.alert(t("accounts", "weakPasswordTitle"), t("accounts", "weakPasswordComplexityMessage"))
      return false
    }
    return true
  }

  const handlePasswordUpdate = async () => {
    if (!validatePassword()) return

    setIsLoading(true)
    try {
      const { data } = await axiosInstance.put("/customer/updatecustomerpassword", {
        oldPassword,
        newPassword,
      })
      if (data.success) {
        Alert.alert(t("common", "successTitle"), data.message)
        setPasswordModal(false)
        setOldPassword("")
        setNewPassword("")
      } else {
        Alert.alert(t("common", "errorTitle"), data.message)
      }
    } catch (err) {
      console.error("Password error:", err.response?.data || err.message)
      const errorMsg = err.response?.data?.message || t("accounts", "failedToUpdatePasswordMessage")
      Alert.alert(t("common", "errorTitle"), errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert(t("common", "confirmLogoutTitle"), t("common", "confirmLogoutMessage"), [
      { text: t("common", "cancel"), style: "cancel" },
      {
        text: t("common", "logout"),
        style: "destructive",
        onPress: async () => {
          try {
            const refreshToken = await AsyncStorage.getItem("refreshToken")
            if (refreshToken) {
              await axiosInstance.post(
                "/auth/customer/logoutcustomer",
                {},
                {
                  headers: {
                    Authorization: `Bearer ${refreshToken}`,
                    "x-client-type": "react-native",
                  },
                },
              )
            }
          } catch (error) {
            console.warn("Logout Warning:", error.response?.data || error.message)
          } finally {
            await AsyncStorage.removeItem("accessToken")
            await AsyncStorage.removeItem("refreshToken")
            navigation.reset({
              index: 0,
              routes: [{ name: "Welcome" }],
            })
          }
        },
      },
    ])
  }

  const getCurrentLanguage = () => {
    const currentLang = user?.preferredLanguage || "en"
    return languageOptions.find((lang) => lang.code === currentLang) || languageOptions[0]
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          <Text style={styles.headerTitle}>{t("accounts", "myAccountTitle")}</Text>

          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BB9C66" />
          <Text style={styles.loadingText}>{t("accounts", "loadingText")}</Text>
        </View>
        <Navigation navigation={navigation} active="Accounts" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>{t("accounts", "myAccountTitle")}</Text>

        <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(!isEditing)} activeOpacity={0.8}>
          <Text style={styles.editButtonText}>
            {isEditing ? t("accounts", "cancelButton") : t("accounts", "editButton")}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Header Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: user.profilePicture || "https://via.placeholder.com/150" }} style={styles.avatar} />
            <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8}>
              <Text style={styles.cameraIcon}>📷</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>

          <View style={styles.statsContainer}>
            {/* Loyalty Points Badge */}
            <View style={styles.statBadge}>
              <Text style={styles.statIcon}>⭐</Text>
              <View>
                <Text style={styles.statLabel}>{t("accounts", "loyaltyPointsLabel")}</Text>
                <Text style={styles.statValue}>{user.loyaltyPoints || "0"}</Text>
              </View>
            </View>

            <View style={styles.statBadge}>
              <Text style={styles.statIcon}>📅</Text>
              <View>
                <Text style={styles.statLabel}>Total Bookings</Text>
                <Text style={styles.statValue}>{user.totalBookings || "0"}</Text>
              </View>
            </View>

            {user.status && (
              <View style={styles.statBadge}>
                <Text style={styles.statIcon}>🔔</Text>
                <View>
                  <Text style={styles.statLabel}>Status</Text>
                  <Text style={[styles.statValue, { textTransform: "capitalize" }]}>{user.status}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Account Information Card */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t("accounts", "accountInfoTitle")}</Text>

          {/* Name Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldIcon}>👤</Text>
              <Text style={styles.fieldLabel}>{t("accounts", "fullNameLabel")}</Text>
            </View>
            {isEditing ? (
              <TextInput
                value={tempName}
                onChangeText={setTempName}
                style={styles.editInput}
                placeholder={t("accounts", "fullNamePlaceholder")}
                placeholderTextColor="#999"
                editable={!isLoading}
              />
            ) : (
              <Text style={styles.fieldValue}>{user.name}</Text>
            )}
          </View>

          {/* Email Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldIcon}>📧</Text>
              <Text style={styles.fieldLabel}>{t("accounts", "emailLabel")}</Text>
              <View style={styles.readOnlyBadge}>
                <Text style={styles.readOnlyText}>{t("accounts", "readOnlyLabel")}</Text>
              </View>
            </View>
            <Text style={[styles.fieldValue, styles.readOnlyValue]}>{user.email}</Text>
          </View>

          {/* Phone Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldIcon}>📱</Text>
              <Text style={styles.fieldLabel}>{t("accounts", "phoneLabel")}</Text>
            </View>
            {isEditing ? (
              <TextInput
                value={tempPhone}
                onChangeText={setTempPhone}
                style={styles.editInput}
                placeholder={t("accounts", "phonePlaceholder")}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
                editable={!isLoading}
              />
            ) : (
              <Text style={styles.fieldValue}>{user.phoneNo || t("accounts", "notProvidedText")}</Text>
            )}
          </View>


          {/* Language Field */}
          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Text style={styles.fieldIcon}>🌐</Text>
              <Text style={styles.fieldLabel}>{t("accounts", "preferredLanguageLabel")}</Text>
            </View>
            <TouchableOpacity
              style={styles.languageSelector}
              onPress={() => {
                if (!isLoading) setLanguageModal(true)
              }}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <View style={styles.languageDisplay}>
                <Text style={styles.languageFlag}>{getCurrentLanguage().flag}</Text>
                <Text style={styles.languageName}>{getCurrentLanguage().name}</Text>
              </View>
              <Text style={styles.languageArrow}>→</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          {isEditing ? (
            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.disabledButton]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.saveButtonText}>{t("accounts", "savingText")}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.saveButtonIcon}>✓</Text>
                  <Text style={styles.saveButtonText}>{t("accounts", "saveChangesButton")}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.actionButton} onPress={() => setPasswordModal(true)} activeOpacity={0.8}>
                <Text style={styles.actionIcon}>🔒</Text>
                <Text style={styles.actionText}>{t("accounts", "changePasswordButton")}</Text>
                <Text style={styles.actionArrow}>→</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.logoutAction]}
                onPress={handleLogout}
                activeOpacity={0.8}
              >
                <Text style={styles.actionIcon}>🚪</Text>
                <Text style={styles.actionText}>{t("accounts", "logoutButton")}</Text>
                <Text style={styles.actionArrow}>→</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>

      <Navigation navigation={navigation} active="Accounts" />

      {/* Password Modal */}
      <Modal visible={passwordModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("accounts", "changePasswordTitle")}</Text>
              <Text style={styles.modalSubtitle}>{t("accounts", "changePasswordSubtitle")}</Text>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("accounts", "currentPasswordLabel")}</Text>
                <TextInput
                  secureTextEntry
                  style={styles.modalInput}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder={t("accounts", "currentPasswordPlaceholder")}
                  placeholderTextColor="#999"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>{t("accounts", "newPasswordLabel")}</Text>
                <TextInput
                  secureTextEntry
                  style={styles.modalInput}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder={t("accounts", "newPasswordPlaceholder")}
                  placeholderTextColor="#999"
                  editable={!isLoading}
                />
                <Text style={styles.passwordHint}>{t("accounts", "passwordHint")}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setPasswordModal(false)
                  setOldPassword("")
                  setNewPassword("")
                }}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>{t("accounts", "cancelButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton, isLoading && styles.disabledButton]}
                onPress={handlePasswordUpdate}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.updateButtonText}>{t("accounts", "updatePasswordButton")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Language Selection Modal */}
      <Modal visible={languageModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("accounts", "selectLanguageTitle")}</Text>
              <Text style={styles.modalSubtitle}>{t("accounts", "selectLanguageSubtitle")}</Text>
            </View>

            <View style={styles.languageModalBody}>
              {languageOptions.map((language) => (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    getCurrentLanguage().code === language.code && styles.selectedLanguage,
                  ]}
                  onPress={() => handleLanguageUpdate(language.code)}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <View style={styles.languageOptionContent}>
                    <Text style={styles.languageOptionFlag}>{language.flag}</Text>
                    <Text
                      style={[
                        styles.languageOptionName,
                        getCurrentLanguage().code === language.code && styles.selectedLanguageText,
                      ]}
                    >
                      {language.name}
                    </Text>
                  </View>
                  {getCurrentLanguage().code === language.code && <Text style={styles.selectedCheck}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setLanguageModal(false)}
                activeOpacity={0.8}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>{t("accounts", "cancelButton")}</Text>
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
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
  editButton: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  editButtonText: {
    color: "#666",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    marginTop: 16,
  },
  profileSection: {
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 32,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: "#BB9C66",
  },
  cameraButton: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#BB9C66",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  cameraIcon: {
    fontSize: 14,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: "#666",
    marginBottom: 20,
  },
  statsContainer: {
    width: "100%",
    gap: 12,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  statIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 16,
    color: "#BB9C66",
    fontWeight: "700",
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  fieldIcon: {
    fontSize: 18,
    marginRight: 12,
    width: 24,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "600",
    flex: 1,
  },
  readOnlyBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  readOnlyText: {
    fontSize: 10,
    color: "#999",
    fontWeight: "500",
  },
  fieldValue: {
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "600",
    marginLeft: 36,
  },
  readOnlyValue: {
    color: "#666",
  },
  editInput: {
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "600",
    marginLeft: 36,
    borderBottomWidth: 2,
    borderBottomColor: "#BB9C66",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  multilineInput: {
    borderBottomWidth: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginLeft: 0,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 12,
    color: "#999",
    marginLeft: 36,
    marginTop: 4,
  },
  languageSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginLeft: 36,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  languageDisplay: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  languageFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  languageName: {
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  languageArrow: {
    fontSize: 16,
    color: "#BB9C66",
    fontWeight: "600",
  },
  actionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: "#BB9C66",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonIcon: {
    fontSize: 18,
    color: "#FFFFFF",
    marginRight: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  actionButton: {
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  logoutAction: {
    borderLeftColor: "#F44336",
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 16,
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  actionArrow: {
    fontSize: 16,
    color: "#BB9C66",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
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
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "center",
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
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: "#2C2C2C",
    backgroundColor: "#F8F9FA",
  },
  passwordHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    lineHeight: 16,
  },
  languageModalBody: {
    padding: 24,
    maxHeight: 300,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  selectedLanguage: {
    backgroundColor: "#BB9C66",
    borderColor: "#BB9C66",
  },
  languageOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  languageOptionFlag: {
    fontSize: 24,
    marginRight: 16,
  },
  languageOptionName: {
    fontSize: 16,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  selectedLanguageText: {
    color: "#FFFFFF",
  },
  selectedCheck: {
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  modalActions: {
    flexDirection: "row",
    padding: 24,
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
  cancelButton: {
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
  updateButton: {
    backgroundColor: "#BB9C66",
  },
  updateButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})

export default Accounts
