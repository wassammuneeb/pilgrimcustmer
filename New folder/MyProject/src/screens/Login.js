"use client"

import { useState, useEffect } from "react"
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, StatusBar } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axiosInstance from "../axiosInstance"
import { requestAndSendFcmToken } from "../utils/fcm"
import { loginTranslations as translations } from "../translations/loginTranslations"

export default function Login({ navigation }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [language, setLanguage] = useState("en") // default

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

  const handleLogin = async () => {
    const payload = {
      email: email.trim().toLowerCase(),
      password: password.trim(),
    }

    setLoading(true)
    try {
      const response = await axiosInstance.post("auth/customer/logincustomer", payload, {
        headers: {
          "x-client-type": "react-native",
        },
      })

      const { accessToken, refreshToken, message } = response.data

      if (accessToken && refreshToken) {
        await AsyncStorage.setItem("accessToken", accessToken.trim())
        await AsyncStorage.setItem("refreshToken", refreshToken.trim())
        console.log("✅ Tokens saved after login")

        await requestAndSendFcmToken()

        Alert.alert("Welcome !", message || "")
        navigation.replace("Home")
      } else {
        Alert.alert("We are sorry !", message || t("loginFailedMsg"))
      }
    } catch (error) {
      const backendMsg = error.response?.data?.message || t("loginFailedMsg")
      Alert.alert("We are sorry !", backendMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate("CreateAccount")}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t("welcomeTitle")}</Text>
          <Text style={styles.welcomeSubtitle}>{t("welcomeSubtitle")}</Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t("formTitle")}</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("emailLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("emailPlaceholder")}
                keyboardType="email-address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("passwordLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("passwordPlaceholder")}
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.8}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "👁" : "👁‍🗨"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.loadingText}>{t("signingInText")}</Text>
              </View>
            ) : (
              <Text style={styles.loginButtonText}>{t("signInButton")}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <Text style={styles.bottomText}>{t("bottomText")}</Text>
          <TouchableOpacity onPress={() => navigation.navigate("CreateAccount")} activeOpacity={0.8}>
            <Text style={styles.signUpLink}>{t("signUpLink")}</Text>
          </TouchableOpacity>
        </View>
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
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    color: "#2C2C2C",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  formTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 24,
    textAlign: "center",
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: "#2C2C2C",
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  loginButton: {
    backgroundColor: "#BB9C66",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  forgotPasswordButton: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: "#BB9C66",
    fontSize: 14,
    fontWeight: "600",
  },
  bottomSection: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 40,
    paddingBottom: 40,
  },
  bottomText: {
    fontSize: 14,
    color: "#666",
    marginRight: 4,
  },
  signUpLink: {
    fontSize: 14,
    color: "#BB9C66",
    fontWeight: "700",
  },
})
