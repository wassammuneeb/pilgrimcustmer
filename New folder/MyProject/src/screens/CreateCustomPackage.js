"use client"

import { useEffect, useState } from "react"
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, StatusBar } from "react-native"
import { useNavigation } from "@react-navigation/native"
import axiosInstance from "../axiosInstance"
import Navigation from "../components/Navigation"

export default function CreateCustomPackage() {
  const navigation = useNavigation()
  const [loading, setLoading] = useState(false)
  const [categories, setCategories] = useState([])
  const [selected, setSelected] = useState({})

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true)
        const { data } = await axiosInstance.get("customer/options/master")
        if (!data?.success) {
          throw new Error(data?.message || "Failed to fetch options")
        }

        const cats = Array.isArray(data.categories) ? data.categories : []
        setCategories(cats)
      } catch (err) {
        console.error("[CreateCustomPackage] getAllMasterOptions error:", err?.response?.data || err.message)
        Alert.alert("Error", err?.response?.data?.message || "Unable to load options. Please try again.")
      } finally {
        setLoading(false)
      }
    }
    fetchOptions()
  }, [])

  const toggle = (key) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const onFindVendors = () => {
    const requestedKeys = Object.keys(selected).filter((k) => selected[k])
    if (!requestedKeys.length) {
      Alert.alert("Select Options", "Please select at least one option to find matching vendors.")
      return
    }
    navigation.navigate("MatchedVendors", { requestedKeys })
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
          <Text style={styles.headerTitle}>Create Your Package</Text>
          <Text style={styles.headerSubtitle}>Select preferences to match the best vendors</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#BB9C66" size="large" />
          <Text style={styles.loadingText}>Loading options…</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 240 }} showsVerticalScrollIndicator={false}>
          {categories.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>No options available</Text>
              <Text style={styles.emptyText}>Please try again later.</Text>
            </View>
          ) : (
            categories.map((cat) => (
              <View key={cat.categoryId || cat.categoryLabel} style={styles.groupCard}>
                <Text style={styles.groupTitle}>{cat.categoryLabel || "Others"}</Text>
                {(cat.options || []).map((opt) => {
                  const isOn = !!selected[opt.key]
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.optionRow, isOn && styles.optionRowActive]}
                      onPress={() => toggle(opt.key)}
                      activeOpacity={0.85}
                    >
                      <View style={[styles.checkbox, isOn && styles.checkboxOn]}>
                        {isOn ? <Text style={styles.checkboxMark}>✓</Text> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.optionLabel}>{opt.name}</Text>
                        <Text style={styles.optionMeta}>Tap to select</Text>
                      </View>
                    </TouchableOpacity>
                  )
                })}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.cta} onPress={onFindVendors} activeOpacity={0.9}>
          <Text style={styles.ctaText}>Find Matching Vendors</Text>
        </TouchableOpacity>
      </View>

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
  groupCard: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 3,
  },
  groupTitle: { fontSize: 16, fontWeight: "800", color: "#6B5C57", marginBottom: 8 },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EAE3DB",
    backgroundColor: "#FFFFFF",
    marginBottom: 8,
  },
  optionRowActive: { backgroundColor: "#FCF8F5", borderColor: "#CDBBA9" },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#CDBBA9",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxOn: { backgroundColor: "#BB9C66", borderColor: "#BB9C66" },
  checkboxMark: { color: "#FFFFFF", fontWeight: "800", fontSize: 12 },
  optionLabel: { fontSize: 15, fontWeight: "700", color: "#6B5C57" },
  optionMeta: { fontSize: 12, color: "#A6928C" },
  footer: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 96,
    zIndex: 10,
    elevation: 10,
  },
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
