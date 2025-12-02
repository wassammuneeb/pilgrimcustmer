"use client"

import { useState, useEffect } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import Navigation from "../components/Navigation"
import axiosInstance from "../axiosInstance"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { umrahPackagesTranslations as translations } from "../translations/umrahPackagesTranslations"

export default function UmrahPackages({ navigation, route }) {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [selectedReview, setSelectedReview] = useState("")
  const [minPrice, setMinPrice] = useState("")
  const [maxPrice, setMaxPrice] = useState("")
  const [packages, setPackages] = useState([])
  const [categories, setCategories] = useState([])
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(false)
  const [language, setLanguage] = useState("en")
  const packageType = route.params?.packageType || ""

  // 🌐 Load selected language
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

  const t = (key) => {
    const lang = language || "en"
    return (translations[lang] && translations[lang][key]) || (translations["en"] && translations["en"][key]) || key
  }

  // 🚀 Fetch categories & agents
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const { data } = await axiosInstance.get("getpackage/getpackagebycustomer", {
          params: { limit: 10 },
          headers: { lang: language || "en" },
        })
        const allPackages = data.data || []
        setCategories([...new Set(allPackages.map((pkg) => pkg.packageCategory).filter(Boolean))])
        setAgents([...new Set(allPackages.map((pkg) => pkg.vendorCompanyName).filter(Boolean))])
      } catch (err) {
        console.error("Meta fetch error:", err.response?.data || err.message)
      }
    }
    fetchMeta()
  }, [language])

  // 🚀 Fetch filtered packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        setLoading(true)

        const params = {
          min_price: minPrice || undefined,
          max_price: maxPrice || undefined,
          packageCategory: selectedCategory || undefined,
          vendorCompanyName: selectedAgent || undefined,
          min_rating: selectedReview === t("top10Label") ? 4 : undefined,
          page: 1,
          limit: 10,
        }

        const { data } = await axiosInstance.get("getpackage/getpackagebycustomer", {
          params,
          headers: { lang: language || "en" },
        })

        if (data.success && Array.isArray(data.data)) {
          setPackages(data.data)
        } else {
          console.error("❌ API error:", data.message)
          setPackages([])
        }
      } catch (error) {
        console.error("Fetch packages error:", error.response?.data || error.message)
        Alert.alert("Error", "Unable to fetch packages. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    fetchPackages()
  }, [selectedCategory, selectedAgent, selectedReview, minPrice, maxPrice, language])

  const defaultDuration = packages?.[0]?.duration || 1

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{t("headerDefaultTitle")}</Text>
            <Text style={styles.headerSubtitle}>{t("headerSubtitle")}</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={styles.filtersContainer}>
            <Text style={styles.filtersTitle}>{t("filtersTitle")}</Text>

            <View style={styles.dropdownRow}>
              {/* Category */}
              <View style={styles.dropdown}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedCategory}
                    onValueChange={setSelectedCategory}
                    style={styles.picker}
                    dropdownIconColor="#BB9C66"
                  >
                    <Picker.Item label={t("categoriesLabel")} value="" />
                    {categories.map((cat, idx) => (
                      <Picker.Item key={idx} label={cat} value={cat} />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Rating */}
              <View style={styles.dropdown}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedReview}
                    onValueChange={setSelectedReview}
                    style={styles.picker}
                    dropdownIconColor="#BB9C66"
                  >
                    <Picker.Item label={t("ratingLabel")} value="" />
                    <Picker.Item label={t("top10Label")} value={t("top10Label")} />
                  </Picker>
                </View>
              </View>

              {/* Agent */}
              <View style={styles.dropdown}>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedAgent}
                    onValueChange={setSelectedAgent}
                    style={styles.picker}
                    dropdownIconColor="#BB9C66"
                  >
                    <Picker.Item label={t("agentsLabel")} value="" />
                    {agents.map((agent, idx) => (
                      <Picker.Item key={idx} label={agent} value={agent} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            {/* Price Filter */}
            <View style={styles.priceRow}>
              <Text style={styles.priceTitle}>{t("priceRangeLabel")}</Text>
              <View style={styles.priceInputContainer}>
                <TextInput
                  placeholder={t("minPricePlaceholder")}
                  style={styles.priceInput}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
                <Text style={styles.priceSeparator}>-</Text>
                <TextInput
                  placeholder={t("maxPricePlaceholder")}
                  style={styles.priceInput}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Results */}
          <View style={styles.resultsSection}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#BB9C66" />
                <Text style={styles.loadingText}>{t("loadingText")}</Text>
              </View>
            ) : packages.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📦</Text>
                <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
                <Text style={styles.emptyText}>{t("emptyText")}</Text>
              </View>
            ) : (
              packages.map((pkg, index) => (
                <TouchableOpacity
                  key={pkg.id || index}
                  onPress={() => navigation.navigate("PackageDetails", { id: pkg.id })}
                  style={styles.card}
                  activeOpacity={0.85}
                >
                  {/* <CHANGE> Professional card image with overlay badge */}
                  <View style={styles.cardImageContainer}>
                    <Image
                      source={{ uri: pkg.image || "https://via.placeholder.com/300" }}
                      style={styles.cardImage}
                    />
                    <View style={styles.imageOverlay} />
                    <View style={styles.badgeContainer}>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{pkg.packageCategory}</Text>
                      </View>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{pkg.packageType}</Text>
                      </View>
                    </View>
                  </View>

                  {/* <CHANGE> Reorganized card content with better hierarchy */}
                  <View style={styles.cardContent}>
                    {/* Title Section */}
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {pkg.title}
                    </Text>

                    {/* Vendor Section */}
                    <View style={styles.vendorSection}>
                      <Text style={styles.vendorLabel}>Vendor</Text>
                      <Text style={styles.vendorName}>{pkg.vendorCompanyName}</Text>
                    </View>

                    {/* Info Grid */}
                    <View style={styles.infoGrid}>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Duration</Text>
                        <Text style={styles.infoValue}>{pkg.duration} days</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Rating</Text>
                        <Text style={styles.infoValue}>{pkg.rating > 0 ? `${pkg.rating}⭐` : "N/A"}</Text>
                      </View>
                      <View style={styles.infoItem}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{new Date(pkg.createdAt).toLocaleDateString()}</Text>
                      </View>
                    </View>

                    {/* Price Section */}
                    <View style={styles.priceSection}>
                      <Text style={styles.priceLabel}>Starting from</Text>
                      <Text style={styles.priceValue}>Rs. {pkg.price.toLocaleString()}</Text>
                    </View>

                    {/* CTA Button */}
                    <TouchableOpacity
                      style={styles.ctaButton}
                      onPress={() => navigation.navigate("PackageDetails", { id: pkg.id })}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.ctaButtonText}>View Details →</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <Navigation navigation={navigation} active="UmrahPackages" />
      <View style={styles.createButtonContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => navigation.navigate("CreateCustomPackage", { defaultDays: defaultDuration })}
          activeOpacity={0.9}
        >
          <Text style={styles.createButtonText}>Create your own package</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAFAFA",
  },
  headerSection: {
    backgroundColor: "#BB9C66",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.9)",
    fontWeight: "400",
  },
  filtersContainer: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  filtersTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 14,
    textAlign: "center",
  },
  dropdownRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  dropdown: {
    flex: 1,
    marginHorizontal: 3,
  },
  pickerContainer: {
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
    height: 44,
    justifyContent: "center",
  },
  picker: {
    height: 44,
    color: "#2C2C2C",
    fontSize: 11,
    marginTop: -4,
    marginBottom: -4,
    paddingHorizontal: 8,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
    marginRight: 12,
    minWidth: 100,
  },
  priceInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceInput: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: "#2C2C2C",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  priceSeparator: {
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "600",
  },
  resultsSection: {
    paddingHorizontal: 16,
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
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
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
  // <CHANGE> Professional card styling with improved layout
  card: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  cardImageContainer: {
    position: "relative",
    height: 180,
    backgroundColor: "#F0F0F0",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F0F0",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  badgeContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    flexDirection: "column",
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: "rgba(187, 156, 102, 0.95)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  typeBadge: {
    backgroundColor: "rgba(44, 44, 44, 0.85)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  typeBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  cardContent: {
    padding: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
    lineHeight: 24,
  },
  vendorSection: {
    marginBottom: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  vendorLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  vendorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C2C2C",
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    paddingVertical: 12,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2C2C2C",
  },
  priceSection: {
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  priceLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#BB9C66",
    letterSpacing: 0.3,
  },
  ctaButton: {
    backgroundColor: "#BB9C66",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  createButtonContainer: {
    position: "absolute",
    right: 16,
    bottom: 100,
    zIndex: 100,
    elevation: 14,
  },
  createButton: {
    backgroundColor: "#BB9C66",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#EADBC8",
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 14,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ scale: 1 }],
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
})