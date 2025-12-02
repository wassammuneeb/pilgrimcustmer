"use client"

import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  StatusBar,
} from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import axiosInstance from "../axiosInstance"
import Navigation from "../components/Navigation"

export default function VendorCustomOptions() {
  const navigation = useNavigation()
  const route = useRoute()
  const vendorId = route.params?.vendorId
  const requestedKeys = route.params?.requestedKeys || []
  const [days, setDays] = useState(route.params?.days || 1)

  const [loading, setLoading] = useState(false)
  const [vendor, setVendor] = useState(null)
  const [vendorCustomizeOptionId, setVendorCustomizeOptionId] = useState(null)
  const [options, setOptions] = useState([])
  const [estimate, setEstimate] = useState(0)

  const fetchDetails = async (d) => {
    try {
      setLoading(true)
      console.log("Fetching vendor options for:", vendorId, "days:", d)
      const { data } = await axiosInstance.post(`customer/options/vendordetail/${vendorId}/options`, {
        requestedKeys,
        days: Number(d) || 1,
      })

      console.log("Backend response:", data)

      if (!data?.success) {
        throw new Error(data?.message || "Failed to fetch vendor options")
      }

      if (!data.vendorCustomizeOptionId) {
        console.warn("vendorCustomizeOptionId missing in backend response!")
      }

      setVendor(data.vendor)
      setOptions(Array.isArray(data.options) ? data.options : [])
      setEstimate(Number(data.estimatedAmountPerPerson || 0))
      setVendorCustomizeOptionId(data.vendorCustomizeOptionId || null)
    } catch (err) {
      console.error("[VendorCustomOptions] getVendorCustomOptions error:", err?.response?.data || err.message)
      Alert.alert("Error", err?.response?.data?.message || "Unable to load vendor details. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (vendorId) fetchDetails(days)
  }, [vendorId])

  const onDaysChange = (txt) => {
    const cleaned = (txt || "").replace(/[^0-9]/g, "")
    setDays(cleaned)
  }

  const onRefreshEstimate = () => {
    const d = Number(days) || 1
    fetchDetails(d)
  }

  const onProceed = () => {
    if (!vendorId) {
      return Alert.alert("Error", "Missing vendor information.")
    }

    if (!vendorCustomizeOptionId) {
      console.warn("vendorCustomizeOptionId is null on proceed!")
    }

    console.log("Proceed button pressed")
    console.log("Current values:", {
      vendorId,
      vendorCustomizeOptionId,
      vendor,
      estimate,
    })

    const pkg = {
      id: vendorCustomizeOptionId || vendorId,
      vendorId: vendorId,
      title: vendor?.businessName || vendor?.name || "Custom Package",
      price: Number(estimate) || 0,
      packageType: "VendorCustomizeOption",
    }

    console.log("Constructed pkg object:", pkg)

    const requestedOptions = (options || []).map((o) => ({
      id: o.optionId,
      key: o.optionKey,
      name: o.optionName,
      pricePerDay: Number(o.pricePerDay || 0),
      costForDays: Number(o.costForDays || 0),
    }))

    navigation.navigate("BookAppointments", {
      pkg,
      vendorId,
      days: Number(days) || 1,
      requestedOptions,
    })
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#BB9C66" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Vendor Options</Text>
          <Text style={styles.headerSubtitle}>Review details and estimated cost</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#BB9C66" size="large" />
          <Text style={styles.loadingText}>Loading vendor details…</Text>
        </View>
      ) : !vendor ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>ℹ️</Text>
          <Text style={styles.emptyTitle}>No vendor data</Text>
          <Text style={styles.emptyText}>Please try again later.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {/* Vendor Card */}
          <View style={styles.vendorCard}>
            <Text style={styles.vendorTitle}>{vendor.businessName || vendor.name}</Text>
            <Text style={styles.vendorMeta}>{vendor.businessAddress || "Address not available"}</Text>
            <Text style={styles.vendorMeta}>Email: {vendor.email || "N/A"}</Text>
            <Text style={styles.vendorMeta}>Phone: {vendor.phone || "N/A"}</Text>
            <Text style={styles.vendorMeta}>Rating: {vendor.rating || 0}</Text>
          </View>

          {/* Days and Estimate */}
          <View style={styles.estimateCard}>
            <Text style={styles.estimateTitle}>Trip Duration (days)</Text>
            <View style={styles.row}>
              <TextInput
                value={String(days)}
                onChangeText={onDaysChange}
                keyboardType="numeric"
                style={styles.input}
                placeholder="Days"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.refreshBtn} onPress={onRefreshEstimate} activeOpacity={0.9}>
                <Text style={styles.refreshText}>Update</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.estimateValue}>Estimated per person: PKR {Number(estimate).toLocaleString()}</Text>
          </View>

          {/* Options */}
          <View style={{ paddingHorizontal: 16 }}>
            <Text style={styles.sectionTitle}>Matching Options</Text>
            {options.length === 0 ? (
              <View style={styles.emptyOptions}>
                <Text style={styles.emptyText}>No options found for this vendor.</Text>
              </View>
            ) : (
              options.map((o) => (
                <View key={o.optionKey} style={styles.optionRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionLabel}>{o.optionName}</Text>
                    <Text style={styles.optionMeta}>PKR {Number(o.pricePerDay || 0).toLocaleString()} / day</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.optionPrice}>PKR {Number(o.costForDays || 0).toLocaleString()}</Text>
                    <Text style={styles.optionSub}>For {Number(days) || 1} day(s)</Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* CTA */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <TouchableOpacity style={styles.cta} onPress={onProceed} activeOpacity={0.9}>
              <Text style={styles.ctaText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <Navigation navigation={navigation} active="UmrahPackages" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  header: {
    backgroundColor: "#BB9C66",
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 16,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonText: { fontSize: 20, color: "#FFFFFF", fontWeight: "600" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#FFFFFF" },
  headerSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.9)" },
  loadingWrap: { alignItems: "center", paddingTop: 40 },
  loadingText: { marginTop: 10, color: "#6B5C57" },
  emptyWrap: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 44, marginBottom: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#2C2C2C" },
  emptyText: { fontSize: 14, color: "#666" },
  vendorCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 3,
  },
  vendorTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6B5C57",
    marginBottom: 6,
  },
  vendorMeta: { fontSize: 12, color: "#A6928C", marginBottom: 2 },
  estimateCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 3,
  },
  estimateTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B5C57",
    marginBottom: 8,
  },
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    height: 44,
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    paddingHorizontal: 12,
    color: "#2C2C2C",
  },
  refreshBtn: {
    backgroundColor: "#BB9C66",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CDBBA9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginLeft: 8,
  },
  refreshText: { color: "#fff", fontWeight: "800" },
  estimateValue: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#6B5C57",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#6B5C57",
    marginBottom: 8,
  },
  emptyOptions: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    marginBottom: 12,
  },
  optionRow: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    flexDirection: "row",
    alignItems: "center",
  },
  optionLabel: { fontSize: 15, fontWeight: "800", color: "#6B5C57" },
  optionMeta: { fontSize: 12, color: "#A6928C" },
  optionPrice: { fontSize: 14, fontWeight: "800", color: "#BB9C66" },
  optionSub: { fontSize: 11, color: "#A6928C" },
  cta: {
    backgroundColor: "#BB9C66",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#CDBBA9",
    elevation: 6,
  },
  ctaText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },
})
