"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from "react-native"
import { useNavigation, useRoute } from "@react-navigation/native"
import axiosInstance from "../axiosInstance"
import Navigation from "../components/Navigation"

export default function MatchedVendors() {
  const navigation = useNavigation()
  const route = useRoute()
  const requestedKeys = route.params?.requestedKeys || []

  const [loading, setLoading] = useState(false)
  const [vendors, setVendors] = useState([])

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setLoading(true)
        const { data } = await axiosInstance.post("customer/options/vendors/find", {
          requestedKeys,
        })
        if (!data?.success) {
          throw new Error(data?.message || "Failed to fetch vendors")
        }
        setVendors(Array.isArray(data.vendors) ? data.vendors : [])
      } catch (err) {
        console.error("[MatchedVendors] findVendorsByOptions error:", err?.response?.data || err.message)
        Alert.alert("Error", err?.response?.data?.message || "Unable to find vendors. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    console.log("Requested keys sent to backend:", requestedKeys)

    if (requestedKeys.length) fetchVendors()
  }, [requestedKeys])

  const onViewVendor = (vendorId) => {
    navigation.navigate("VendorCustomOptions", {
      vendorId,
      requestedKeys,
      days: 1,
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
          <Text style={styles.headerTitle}>Matched Vendors</Text>
          <Text style={styles.headerSubtitle}>Based on your selected preferences</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#BB9C66" size="large" />
          <Text style={styles.loadingText}>Finding vendors…</Text>
        </View>
      ) : vendors.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No matches found</Text>
          <Text style={styles.emptyText}>Try selecting different options.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {vendors.map((v) => (
              <View key={v.vendorId} style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{v.businessName || v.name}</Text>
                  <Text style={styles.cardMeta}>Match Count: {v.matchCount}</Text>
                  <Text style={styles.cardMeta}>Rating: {v.rating || 0}</Text>
                  <Text style={styles.cardMeta}>Email: {v.email || "N/A"}</Text>
                </View>
                <TouchableOpacity style={styles.viewBtn} onPress={() => onViewVendor(v.vendorId)} activeOpacity={0.9}>
                  <Text style={styles.viewBtnText}>View Options</Text>
                </TouchableOpacity>
              </View>
            ))}
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
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#6B5C57", marginBottom: 4 },
  cardMeta: { fontSize: 12, color: "#A6928C", marginBottom: 2 },
  viewBtn: {
    backgroundColor: "#BB9C66",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CDBBA9",
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginLeft: 10,
  },
  viewBtnText: { color: "#FFFFFF", fontWeight: "800" },
})
