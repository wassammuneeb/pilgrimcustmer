"use client"

import { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  Alert,
  StatusBar,
  ActivityIndicator,
} from "react-native"
import { useNavigation } from "@react-navigation/native"
import Navigation from "../components/Navigation"
import AsyncStorage from "@react-native-async-storage/async-storage"
import axiosInstance from "../axiosInstance"
import { packageDetailsTranslations as translations } from "../translations/packageDetailsTranslations"

export default function PackageDetails({ route }) {
  const { id } = route.params
  const navigation = useNavigation()
  const fadeAnim = useRef(new Animated.Value(0)).current
  const [language, setLanguage] = useState("en")
  const [pkg, setPkg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // 🌐 Load selected language
  useEffect(() => {
    const loadLang = async () => {
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
    loadLang()
  }, [])

  useEffect(() => {
    const fetchPackageDetails = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data } = await axiosInstance.get(`getpackage/getpackagebycustomer/${id}`, {
          headers: { lang: language || "en" },
        })

        if (data.success && data.data) {
          setPkg(data.data)
          console.log("Package fetched successfully:", data.data)
        } else {
          setError(data.message || "Failed to fetch package details")
          Alert.alert("Error", data.message || "Unable to load package details")
        }
      } catch (err) {
        console.error("Fetch package error:", err)
        const errorMsg = err.response?.data?.message || "Unable to fetch package details. Please try again."
        setError(errorMsg)
        Alert.alert("Error", errorMsg)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchPackageDetails()
    }
  }, [id, language])

  const t = (key) => {
    const lang = language || "en"
    return (translations[lang] && translations[lang][key]) || translations["en"][key] || key
  }

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start()
  }, [pkg])

  const renderStars = (rating) => {
    const stars = []
    const fullStars = Math.floor(rating)
    const halfStar = rating % 1 >= 0.5
    for (let i = 0; i < fullStars; i++) stars.push("★")
    if (halfStar) stars.push("☆")
    while (stars.length < 5) stars.push("☆")
    return stars.join(" ")
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const openHotelInfo = () => Alert.alert(t("hotelInfoTitle"), t("hotelInfoMsg"))
  const openFlightsInfo = () => Alert.alert(t("flightInfoTitle"), t("flightInfoMsg"))
  const openMealsInfo = () => Alert.alert(t("mealInfoTitle"), t("mealInfoMsg"))

  if (loading) {
    return (
      <View style={styles.wrapper}>
        <StatusBar barStyle="light-content" backgroundColor="#A6928C" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#BB9C66" />
          <Text style={styles.loadingText}>{t("loadingText") || "Loading package details..."}</Text>
        </View>
        <Navigation navigation={navigation} active="UmrahPackages" />
      </View>
    )
  }

  if (error || !pkg) {
    return (
      <View style={styles.wrapper}>
        <StatusBar barStyle="light-content" backgroundColor="#A6928C" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Package not found"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => navigation.goBack()}>
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
        <Navigation navigation={navigation} active="UmrahPackages" />
      </View>
    )
  }

  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#A6928C" />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("headerTitle")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Hero Image Section */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: pkg.images?.[0] || "https://via.placeholder.com/400" }} style={styles.image} />
          <View style={styles.imageBadge}>
            <Text style={styles.imageBadgeText}>{pkg.packageType}</Text>
          </View>
        </View>

        {/* Main Info Section */}
        <View style={styles.mainInfoSection}>
          <Text style={styles.title}>{pkg.title}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>PKR {pkg.price?.toLocaleString()}</Text>
            <Text style={styles.priceLabel}>{t("perPerson")}</Text>
          </View>

          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Text style={styles.ratingStars}>{pkg.rating > 0 ? renderStars(pkg.rating) : "☆ ☆ ☆ ☆ ☆"}</Text>
            <Text style={styles.ratingText}>
              {pkg.rating > 0 ? `${pkg.rating}/5` : t("noRatings")} {pkg.totalRatings > 0 && `(${pkg.totalRatings})`}
            </Text>
          </View>
          <Text style={styles.description}>{pkg.description}</Text>
        </View>

        {/* Quick Info Cards */}
        <View style={styles.quickInfoSection}>
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoIcon}>🗓️</Text>
            <Text style={styles.quickInfoLabel}>{t("duration")}</Text>
            <Text style={styles.quickInfoValue}>
              {pkg.duration} {t("days")}
            </Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoIcon}>👥</Text>
            <Text style={styles.quickInfoLabel}>{t("groupSize")}</Text>
            <Text style={styles.quickInfoValue}>{pkg.groupSize || t("unlimited")}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <Text style={styles.quickInfoIcon}>📂</Text>
            <Text style={styles.quickInfoLabel}>{t("category")}</Text>
            <Text style={styles.quickInfoValue}>{pkg.packageCategory}</Text>
          </View>
        </View>

        {/* Package Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>{t("packageFeatures")}</Text>
          <View style={styles.featureGrid}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>{pkg.visaIncluded ? "✅" : "❌"}</Text>
              <Text style={styles.featureLabel}>{t("visaIncluded")}</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>{pkg.installmentAvailable ? "✅" : "❌"}</Text>
              <Text style={styles.featureLabel}>{t("installmentAvailable")}</Text>
            </View>
          </View>
        </View>

        {/* Agent Information */}
        <View style={styles.agentSection}>
          <Text style={styles.sectionTitle}>{t("travelAgent")}</Text>
          <View style={styles.agentCard}>
            <View style={styles.agentInfo}>
              <Text style={styles.agentName}>{pkg.vendorCompanyName}</Text>
              <Text style={styles.agentCompany}>{pkg.vendorCompanyName}</Text>
            </View>
          </View>
        </View>

        {/* Services Section */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionTitle}>{t("includedServices")}</Text>

          {/* Accommodation */}
          <TouchableOpacity style={styles.serviceCard} onPress={openHotelInfo} activeOpacity={0.8}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>🏨</Text>
              <Text style={styles.serviceTitle}>{t("accommodation")}</Text>
              <Text style={styles.serviceArrow}>→</Text>
            </View>
            <Text style={styles.serviceText}>{pkg.hotel?.name || t("accommodationDefault")}</Text>
            <Text style={styles.serviceLocation}>📍 {pkg.hotel?.location || t("locationDefault")}</Text>
            {pkg.hotel?.stars && (
              <Text style={styles.serviceText}>
                ⭐ {pkg.hotel.stars} {t("stars")}
              </Text>
            )}
          </TouchableOpacity>

          {/* Multiple Hotels */}
          {pkg.hotels && pkg.hotels.length > 0 && (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceIcon}>🏩</Text>
                <Text style={styles.serviceTitle}>{t("hotels")}</Text>
              </View>
              {pkg.hotels.map((hotel, index) => (
                <View key={index} style={styles.hotelItem}>
                  <Text style={styles.hotelName}>{hotel.name}</Text>
                  <Text style={styles.hotelDetail}>📍 {hotel.city}</Text>
                  {hotel.stars && (
                    <Text style={styles.hotelDetail}>
                      ⭐ {hotel.stars} {t("stars")}
                    </Text>
                  )}
                  {hotel.distance && <Text style={styles.hotelDetail}>📏 {hotel.distance}</Text>}
                </View>
              ))}
            </View>
          )}

          {/* Flights */}
          <TouchableOpacity style={styles.serviceCard} onPress={openFlightsInfo} activeOpacity={0.8}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>✈️</Text>
              <Text style={styles.serviceTitle}>{t("flightDetails")}</Text>
              <Text style={styles.serviceArrow}>→</Text>
            </View>
            {pkg.flights && pkg.flights.length > 0 ? (
              pkg.flights.map((flight, index) => (
                <View key={index} style={styles.flightItem}>
                  <Text style={styles.serviceText}>
                    {t("airlineLabel")}: {flight.airline}
                  </Text>
                  <Text style={styles.serviceText}>
                    {t("classLabel")}: {flight.class}
                  </Text>
                  <Text style={styles.serviceText}>
                    {flight.from} → {flight.to}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.serviceText}>{t("airlineDefault")}</Text>
            )}
          </TouchableOpacity>

          {/* Meals */}
          <TouchableOpacity style={styles.serviceCard} onPress={openMealsInfo} activeOpacity={0.8}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>🍽️</Text>
              <Text style={styles.serviceTitle}>{t("mealPlan")}</Text>
              <Text style={styles.serviceArrow}>→</Text>
            </View>
            <View style={styles.mealOptions}>
              <View style={styles.mealItem}>
                <Text style={styles.mealStatus}>{pkg.meals?.breakfast ? "✅" : "❌"}</Text>
                <Text style={styles.mealText}>{t("breakfast")}</Text>
              </View>
              <View style={styles.mealItem}>
                <Text style={styles.mealStatus}>{pkg.meals?.lunch ? "✅" : "❌"}</Text>
                <Text style={styles.mealText}>{t("lunch")}</Text>
              </View>
              <View style={styles.mealItem}>
                <Text style={styles.mealStatus}>{pkg.meals?.dinner ? "✅" : "❌"}</Text>
                <Text style={styles.mealText}>{t("dinner")}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Transportation */}
          <View style={styles.serviceCard}>
            <View style={styles.serviceHeader}>
              <Text style={styles.serviceIcon}>🚌</Text>
              <Text style={styles.serviceTitle}>{t("transportation")}</Text>
            </View>
            <Text style={styles.serviceText}>{pkg.transport || t("transportationDefault")}</Text>
          </View>

          {/* Ziyarat (Holy Sites) */}
          {pkg.ziyarat && pkg.ziyarat.length > 0 && (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <Text style={styles.serviceIcon}>🕌</Text>
                <Text style={styles.serviceTitle}>{t("holySites")}</Text>
              </View>
              {pkg.ziyarat.map((site, index) => (
                <View key={index} style={styles.ziyaratItem}>
                  <Text style={styles.ziyaratName}>{site.placeName}</Text>
                  <Text style={styles.ziyaratDetail}>📍 {site.city}</Text>
                  {site.description && <Text style={styles.ziyaratDescription}>{site.description}</Text>}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Services Included & Excluded */}
        <View style={styles.servicesListSection}>
          {pkg.servicesIncluded && pkg.servicesIncluded.length > 0 && (
            <View style={styles.serviceListCard}>
              <Text style={styles.serviceListTitle}>✅ {t("ServicesIncluded")}</Text>
              {pkg.servicesIncluded.map((service, index) => (
                <View key={index} style={styles.serviceListItem}>
                  <Text style={styles.serviceListBullet}>•</Text>
                  <Text style={styles.serviceListText}>{service}</Text>
                </View>
              ))}
            </View>
          )}

          {pkg.servicesExcluded && pkg.servicesExcluded.length > 0 && (
            <View style={styles.serviceListCard}>
              <Text style={styles.serviceListTitle}>❌ {t("ServicesExcluded")}</Text>
              {pkg.servicesExcluded.map((service, index) => (
                <View key={index} style={styles.serviceListItem}>
                  <Text style={styles.serviceListBullet}>•</Text>
                  <Text style={styles.serviceListText}>{service}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Package Info Footer */}
        <View style={styles.packageInfoFooter}>
          <Text style={styles.footerLabel}>{t("PackageCreated")}</Text>
          <Text style={styles.footerValue}>{formatDate(pkg.createdAt)}</Text>
        </View>

        {/* Book Button */}
        <View style={styles.bookButtonContainer}>
          <TouchableOpacity
            style={styles.bookButton}
            onPress={() => {
              if (!pkg.vendorId || pkg.vendorId.length < 10) {
                Alert.alert(t("errorTitle"), t("vendorMissing"))
                return
              }
              navigation.navigate("BookAppointments", {
                pkg: {
                  ...pkg,
                  vendorId: pkg.vendorId,
                },
              })
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.bookButtonText}>{t("bookAppointment")}</Text>
          </TouchableOpacity>
        </View>
      </Animated.ScrollView>

      <Navigation navigation={navigation} active="UmrahPackages" />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#FCF8F5",
  },
  header: {
    backgroundColor: "#BB9C66",
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#6B5C57",
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
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  backButtonText: {
    fontSize: 24,
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: -2,
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
  container: {
    paddingBottom: 120,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#D32F2F",
    textAlign: "center",
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "#BB9C66",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  imageContainer: {
    position: "relative",
    margin: 20,
    marginBottom: 0,
  },
  image: {
    width: "100%",
    height: 240,
    borderRadius: 20,
    backgroundColor: "#EAE3DB",
  },
  imageBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(166, 146, 140, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  mainInfoSection: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    margin: 20,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#6B5C57",
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 30,
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "baseline",
    marginBottom: 16,
  },
  price: {
    fontSize: 28,
    color: "#A6928C",
    fontWeight: "700",
    marginRight: 8,
  },
  priceLabel: {
    fontSize: 16,
    color: "#6B5C57",
    fontWeight: "500",
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingStars: {
    fontSize: 20,
    color: "#CDBBA9",
    marginRight: 8,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B5C57",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#6B5C57",
    textAlign: "center",
  },
  quickInfoSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  quickInfoIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  quickInfoLabel: {
    fontSize: 12,
    color: "#A6928C",
    fontWeight: "500",
    marginBottom: 4,
  },
  quickInfoValue: {
    fontSize: 16,
    color: "#6B5C57",
    fontWeight: "700",
  },
  featuresSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featureGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  featureItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  featureIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 12,
    color: "#6B5C57",
    fontWeight: "600",
    textAlign: "center",
  },
  agentSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B5C57",
    marginBottom: 12,
  },
  agentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  agentInfo: {
    alignItems: "center",
  },
  agentName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#6B5C57",
    marginBottom: 4,
  },
  agentCompany: {
    fontSize: 16,
    fontWeight: "600",
    color: "#A6928C",
    marginBottom: 8,
  },
  servicesSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  serviceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  serviceIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  serviceTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#6B5C57",
  },
  serviceArrow: {
    fontSize: 16,
    color: "#A6928C",
    fontWeight: "600",
  },
  serviceText: {
    fontSize: 15,
    color: "#6B5C57",
    marginBottom: 6,
    lineHeight: 20,
  },
  serviceLocation: {
    fontSize: 14,
    color: "#A6928C",
    fontWeight: "500",
    marginBottom: 8,
  },
  hotelItem: {
    backgroundColor: "#F9F6F3",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#BB9C66",
  },
  hotelName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B5C57",
    marginBottom: 4,
  },
  hotelDetail: {
    fontSize: 14,
    color: "#A6928C",
    marginBottom: 2,
  },
  flightItem: {
    backgroundColor: "#F9F6F3",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#BB9C66",
  },
  ziyaratItem: {
    backgroundColor: "#F9F6F3",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#BB9C66",
  },
  ziyaratName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B5C57",
    marginBottom: 4,
  },
  ziyaratDetail: {
    fontSize: 14,
    color: "#A6928C",
    marginBottom: 2,
  },
  ziyaratDescription: {
    fontSize: 13,
    color: "#6B5C57",
    marginTop: 4,
    fontStyle: "italic",
  },
  mealOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  mealItem: {
    alignItems: "center",
  },
  mealStatus: {
    fontSize: 20,
    marginBottom: 4,
  },
  mealText: {
    fontSize: 14,
    color: "#6B5C57",
    fontWeight: "500",
  },
  servicesListSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  serviceListCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    shadowColor: "#6B5C57",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  serviceListTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#6B5C57",
    marginBottom: 12,
  },
  serviceListItem: {
    flexDirection: "row",
    marginBottom: 10,
    alignItems: "flex-start",
  },
  serviceListBullet: {
    fontSize: 16,
    color: "#A6928C",
    marginRight: 10,
    fontWeight: "700",
  },
  serviceListText: {
    flex: 1,
    fontSize: 15,
    color: "#6B5C57",
    lineHeight: 20,
  },
  packageInfoFooter: {
    paddingHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    marginHorizontal: 20,
  },
  footerLabel: {
    fontSize: 14,
    color: "#A6928C",
    fontWeight: "600",
    marginBottom: 4,
  },
  footerValue: {
    fontSize: 16,
    color: "#6B5C57",
    fontWeight: "700",
  },
  bookButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  bookButton: {
    backgroundColor: "#BB9C66",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: "#A6928C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#CDBBA9",
  },
  bookButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
})
