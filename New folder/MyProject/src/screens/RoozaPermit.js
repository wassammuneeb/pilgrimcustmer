import { useState, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Linking, Alert, StatusBar } from "react-native"
import { useNavigation } from "@react-navigation/native"
import Navigation from "../components/Navigation"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { roozaPermitTranslations as translations } from "../translations/roozaPermitTranslations"

export default function RoozaPermit() {
  const navigation = useNavigation()
  const [expandedFaq, setExpandedFaq] = useState(null)
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

  const handleOpenNusuk = () => {
    Alert.alert(t("openNusukTitle"), t("openNusukMessage"), [
      { text: t("cancelText"), style: "cancel" },
      {
        text: t("openWebsiteText"),
        onPress: () => Linking.openURL("https://www.nusuk.sa/"),
      },
      {
        text: t("openAppStoreText"),
        onPress: () => Linking.openURL("https://apps.apple.com/app/nusuk/id1509732606"),
      },
    ])
  }

  const handleCallSupport = () => {
    Alert.alert(t("contactSupportTitle"), t("contactSupportMessage"), [
      { text: t("cancelText"), style: "cancel" },
      { text: t("callNowText"), onPress: () => Linking.openURL("tel:+966920000890") },
    ])
  }

  const faqData = [
    {
      question: t("faq1Question"),
      answer: t("faq1Answer"),
    },
    {
      question: t("faq2Question"),
      answer: t("faq2Answer"),
    },
    {
      question: t("faq3Question"),
      answer: t("faq3Answer"),
    },
    {
      question: t("faq4Question"),
      answer: t("faq4Answer"),
    },
  ]

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index)
  }

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />

      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🕌</Text>
          <Text style={styles.heroTitle}>{t("heroTitle")}</Text>
          <Text style={styles.heroSubtitle}>{t("heroSubtitle")}</Text>
        </View>

        {/* Main Info Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardIcon}>📋</Text>
            <Text style={styles.cardTitle}>{t("cardTitle")}</Text>
          </View>
          <Text style={styles.mainMessage}>{t("mainMessage")}</Text>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.primaryButton} onPress={handleOpenNusuk} activeOpacity={0.8}>
              <Text style={styles.primaryButtonText}>{t("openNusukButton")}</Text>
            </TouchableOpacity>

            {/* <TouchableOpacity               style={styles.secondaryButton}              onPress={handleCallSupport}              activeOpacity={0.8}            >              <Text style={styles.secondaryButtonText}>📞 Need Help?</Text>            </TouchableOpacity> */}
          </View>
        </View>

        {/* Quick Steps Section */}
        <View style={styles.stepsSection}>
          <Text style={styles.sectionTitle}>{t("stepsTitle")}</Text>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t("step1Title")}</Text>
              <Text style={styles.stepDescription}>{t("step1Description")}</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t("step2Title")}</Text>
              <Text style={styles.stepDescription}>{t("step2Description")}</Text>
            </View>
          </View>

          <View style={styles.stepCard}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <View style={styles.stepContent}>
              <Text style={styles.stepTitle}>{t("step3Title")}</Text>
              <Text style={styles.stepDescription}>{t("step3Description")}</Text>
            </View>
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.sectionTitle}>{t("faqTitle")}</Text>

          {faqData.map((faq, index) => (
            <TouchableOpacity key={index} style={styles.faqCard} onPress={() => toggleFaq(index)} activeOpacity={0.8}>
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqToggle}>{expandedFaq === index ? "▲" : "▼"}</Text>
              </View>
              {expandedFaq === index && <Text style={styles.faqAnswer}>{faq.answer}</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {/* Important Notice */}
        <View style={styles.noticeCard}>
          <Text style={styles.noticeIcon}>⚠️</Text>
          <Text style={styles.noticeTitle}>{t("noticeTitle")}</Text>
          <Text style={styles.noticeText}>{t("noticeText")}</Text>
        </View>
      </ScrollView>

      <Navigation navigation={navigation} active="Home" />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  header: {
    backgroundColor: "#BB9C66",
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
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
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  headerSpacer: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  heroIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  mainCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  cardIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
  },
  mainMessage: {
    fontSize: 16,
    color: "#666",
    lineHeight: 24,
    marginBottom: 24,
    textAlign: "center",
  },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#BB9C66",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#BB9C66",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#BB9C66",
    fontSize: 16,
    fontWeight: "700",
  },
  stepsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 16,
  },
  stepCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#BB9C66",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 18,
  },
  faqSection: {
    marginBottom: 24,
  },
  faqCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2C2C2C",
    flex: 1,
    marginRight: 12,
  },
  faqToggle: {
    fontSize: 14,
    color: "#BB9C66",
    fontWeight: "600",
  },
  faqAnswer: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  noticeCard: {
    backgroundColor: "#FFF8E1",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#FFE082",
    alignItems: "center",
  },
  noticeIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#F57F17",
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: "#F57F17",
    textAlign: "center",
    lineHeight: 20,
  },
})
