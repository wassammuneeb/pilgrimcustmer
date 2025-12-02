import { useState, useEffect } from "react"
import { View, Text, TouchableOpacity, StyleSheet, StatusBar } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { welcomeTranslations as translations } from "../translations/welcomeTranslations"

export default function Welcome({ navigation }) {
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>🕌</Text>
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.heading}>{t("welcomeToText")}</Text>
          <Text style={styles.subHeading}>{t("appNameText")}</Text>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.paragraph}>"{t("descriptionText")}"</Text>
        </View>
      </View>

      {/* Action Buttons Section */}
      <View style={styles.buttonsContainer}>
        {/* Buttons */}
        {/* <TouchableOpacity style={styles.guestButton} onPress={() => alert('Continue as Guest')}>
          <Text style={styles.buttonText}>Continue as a guest</Text>
        </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.accountButton}
          onPress={() => navigation.navigate("CreateAccount")}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{t("createAccountButton")}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.loginButton} onPress={() => navigation.navigate("Login")} activeOpacity={0.8}>
          <Text style={styles.buttonTextLogin}>{t("loginButton")}</Text>
        </TouchableOpacity>
      </View>

      {/* Footer Section */}
      <View style={styles.footerSection}>
        <Text style={styles.footerText}>{t("footerText")}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA", // White background
  },
  heroSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  logoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#BB9C66",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logoIcon: {
    fontSize: 48,
    color: "#FFFFFF",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  heading: {
    fontSize: 32,
    fontWeight: "300",
    color: "#2C2C2C",
    letterSpacing: 1,
  },
  subHeading: {
    fontSize: 36,
    fontWeight: "700",
    fontStyle: "italic",
    color: "#BB9C66",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  descriptionContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  paragraph: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    lineHeight: 24,
    fontStyle: "italic",
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  guestButton: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 16,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  accountButton: {
    backgroundColor: "#BB9C66",
    paddingVertical: 16,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#BB9C66",
    paddingVertical: 14,
    width: "100%",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonTextLogin: {
    color: "#BB9C66",
    fontSize: 16,
    fontWeight: "700",
  },
  footerSection: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 16,
  },
})
