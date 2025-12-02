import { useEffect, useState } from "react"
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
} from "react-native"
import { Picker } from "@react-native-picker/picker"
import DateTimePicker from "@react-native-community/datetimepicker"
import { useNavigation } from "@react-navigation/native"
import Navigation from "../components/Navigation"
import axiosInstance from "../axiosInstance"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { createTripTranslations as translations } from "../translations/createTripTranslations"
import moment from "moment"

export default function CreateTrip() {
  const navigation = useNavigation()
  const [planItems, setPlanItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalVisible, setModalVisible] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    title: "",
    note: "",
    expectedAt: "",
    status: "pending",
  })
  const [editingItem, setEditingItem] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [language, setLanguage] = useState("en")
  const [languageLoaded, setLanguageLoaded] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem("userData")
        if (userDataStr) {
          const userData = JSON.parse(userDataStr)
          if (userData?.preferredLanguage) {
            setLanguage(userData.preferredLanguage)
          }
        }
        const storedLang = await AsyncStorage.getItem("selectedLanguage")
        if (storedLang) {
          setLanguage(storedLang)
        }
      } catch (err) {
        console.warn("Language load error:", err)
      } finally {
        setLanguageLoaded(true)
      }
    }
    loadLanguage()
  }, [])

  const t = (key) => {
    const lang = language || "en"
    return (translations[lang] && translations[lang][key]) || (translations["en"] && translations["en"][key]) || key
  }

  useEffect(() => {
    if (!languageLoaded) return
    fetchCustomerPlan()
  }, [languageLoaded])

  const fetchCustomerPlan = async () => {
    setLoading(true)
    try {
      const { data } = await axiosInstance.get(`customer/trip/plan`)
      if (data.success && data.data) {
        setPlanItems(data.data.notes || [])
      } else {
        Alert.alert(t("errorTitle"), data.message || t("couldNotFetchMsg"))
        setPlanItems([])
      }
    } catch (err) {
      if (err.response?.status === 404 && err.response?.data?.message?.toLowerCase().includes("no personal plan")) {
        setPlanItems([])
        Alert.alert(t("noPlanYetTitle"), t("noPlanYetMsg"))
      } else {
        Alert.alert(t("noPlanYetTitle"), t("noPlanYetMsg"))
        setPlanItems([])
      }
    } finally {
      setLoading(false)
    }
  }

  const validateItemForm = (form) => {
    if (!form.title.trim()) {
      Alert.alert(t("oopsTitle"), t("titleRequiredMsg"))
      return false
    }
    if (form.expectedAt) {
      const isStrictValid = moment(form.expectedAt, "YYYY-MM-DD", true).isValid()
      const isIsoValid = moment(form.expectedAt).isValid()
      if (!isStrictValid && !isIsoValid) {
        Alert.alert(t("oopsTitle"), t("invalidDateMsg"))
        return false
      }
      const parsedDate = new Date(form.expectedAt)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (parsedDate < today) {
        Alert.alert(t("oopsTitle"), t("pastDateMsg"))
        return false
      }
    }
    return true
  }

  const handleAddItem = async () => {
    if (!validateItemForm(newItemForm)) return
    setIsSubmitting(true)
    try {
      const payload = {
        title: newItemForm.title.trim(),
        note: newItemForm.note.trim(),
        expectedAt: newItemForm.expectedAt
          ? moment(newItemForm.expectedAt).hour(12).minute(0).second(0).millisecond(0).toISOString()
          : undefined,
        status: newItemForm.status,
      }
      const { data } = await axiosInstance.post(`customer/trip/plan`, payload)
      if (data.success) {
        Alert.alert(t("successTitle"), t("itemAddedMsg"))
        setModalVisible(false)
        setNewItemForm({ title: "", note: "", expectedAt: "", status: "pending" })
        fetchCustomerPlan()
      } else {
        Alert.alert(t("errorTitle"), data.message || t("failedToAddMsg"))
      }
    } catch (err) {
      console.error("Add item error:", err.response?.data || err.message)
      Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToAddMsg"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdateItem = async () => {
    if (!editingItem || !validateItemForm(newItemForm)) return
    setIsSubmitting(true)
    try {
      const payload = {
        title: newItemForm.title.trim(),
        note: newItemForm.note.trim(),
        expectedAt: newItemForm.expectedAt
          ? moment(newItemForm.expectedAt).hour(12).minute(0).second(0).millisecond(0).toISOString()
          : undefined,
        status: newItemForm.status,
      }
      const { data } = await axiosInstance.patch(`customer/trip/plan/item/${editingItem._id}`, payload)
      if (data.success) {
        Alert.alert(t("successTitle"), t("itemUpdatedMsg"))
        setModalVisible(false)
        setEditingItem(null)
        fetchCustomerPlan()
      } else {
        Alert.alert(t("errorTitle"), data.message || t("failedToUpdateMsg"))
      }
    } catch (err) {
      console.error("Update item error:", err.response?.data || err.message)
      Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToUpdateMsg"))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteItem = (itemId) => {
    Alert.alert(t("confirmDeleteTitle"), t("confirmDeleteMsg"), [
      { text: t("cancelButtonText"), style: "cancel" },
      {
        text: t("deleteButton"),
        style: "destructive",
        onPress: async () => {
          try {
            const { data } = await axiosInstance.delete(`customer/trip/plan/item/${itemId}`)
            if (data.success) {
              Alert.alert(t("successTitle"), t("itemDeletedMsg"))
              fetchCustomerPlan()
            } else {
              Alert.alert(t("errorTitle"), data.message || t("failedToDeleteMsg"))
            }
          } catch (err) {
            console.error("Delete item error:", err.response?.data || err.message)
            Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToDeleteMsg"))
          }
        },
      },
    ])
  }

  const handleToggleItemStatus = async (item) => {
    const newStatus = item.status === "done" ? "pending" : "done"
    try {
      const { data } = await axiosInstance.patch(`customer/trip/plan/item/${item._id}`, {
        status: newStatus,
      })
      if (data.success) {
        setPlanItems((prev) =>
          prev.map((i) =>
            i._id === item._id
              ? { ...i, status: newStatus, completedAt: newStatus === "done" ? new Date().toISOString() : null }
              : i,
          ),
        )
      } else {
        Alert.alert(t("errorTitle"), data.message || t("failedToUpdateStatusMsg"))
      }
    } catch (err) {
      console.error("Toggle status error:", err.response?.data || err.message)
      Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToUpdateStatusMsg"))
    }
  }

  const handleMarkAllDone = () => {
    Alert.alert(t("confirmMarkAllTitle"), t("confirmMarkAllMsg"), [
      { text: t("cancelButtonText"), style: "cancel" },
      {
        text: t("yesButton"),
        onPress: async () => {
          try {
            const { data } = await axiosInstance.patch(`customer/trip/plan/complete-all`)
            if (data.success) {
              Alert.alert(t("successTitle"), t("allMarkedDoneMsg"))
              fetchCustomerPlan()
            } else {
              Alert.alert(t("errorTitle"), data.message || t("failedToMarkAllMsg"))
            }
          } catch (err) {
            console.error("Mark all done error:", err.response?.data || err.message)
            Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToMarkAllMsg"))
          }
        },
      },
    ])
  }

  const handleResetAllToPending = () => {
    Alert.alert(t("confirmResetAllTitle"), t("confirmResetAllMsg"), [
      { text: t("cancelButtonText"), style: "cancel" },
      {
        text: t("yesButton"),
        onPress: async () => {
          try {
            const { data } = await axiosInstance.patch(`customer/trip/plan/reset`)
            if (data.success) {
              Alert.alert(t("successTitle"), t("allResetMsg"))
              fetchCustomerPlan()
            } else {
              Alert.alert(t("errorTitle"), data.message || t("failedToResetAllMsg"))
            }
          } catch (err) {
            console.error("Reset all pending error:", err.response?.data || err.message)
            Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToResetAllMsg"))
          }
        },
      },
    ])
  }

  const handleDeleteEntirePlan = () => {
    Alert.alert(t("confirmDeletePlanTitle"), t("confirmDeletePlanMsg"), [
      { text: t("cancelButtonText"), style: "cancel" },
      {
        text: t("deletePlanButtonText"),
        style: "destructive",
        onPress: async () => {
          try {
            const { data } = await axiosInstance.delete(`customer/trip/plan`)
            if (data.success) {
              Alert.alert(t("successTitle"), t("planDeletedMsg"))
              setPlanItems([])
            } else {
              Alert.alert(t("errorTitle"), data.message || t("failedToDeletePlanMsg"))
            }
          } catch (err) {
            console.error("Delete plan error:", err.response?.data || err.message)
            Alert.alert(t("errorTitle"), err.response?.data?.message || t("failedToDeletePlanMsg"))
          }
        },
      },
    ])
  }

  const openAddItemModal = () => {
    setEditingItem(null)
    setNewItemForm({ title: "", note: "", expectedAt: "", status: "pending" })
    setModalVisible(true)
  }

  const openEditItemModal = (item) => {
    setEditingItem(item)
    setNewItemForm({
      title: item.title,
      note: item.note || "",
      expectedAt: item.expectedAt ? moment(item.expectedAt).format("YYYY-MM-DD") : "",
      status: item.status || "pending",
    })
    setModalVisible(true)
  }

  if (loading) {
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
  }

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
          <Text style={styles.summaryText}>{t("summaryText")}</Text>
        </View>

        <TouchableOpacity style={styles.addButton} onPress={openAddItemModal} activeOpacity={0.8}>
          <Text style={styles.addButtonText}>{t("addNewItemButton")}</Text>
        </TouchableOpacity>

        {planItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
            <Text style={styles.emptyText}>{t("emptyText")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.bulkActionsContainer}>
              <TouchableOpacity style={styles.bulkActionButton} onPress={handleMarkAllDone} activeOpacity={0.8}>
                <Text style={styles.bulkActionButtonText}>{t("markAllDoneButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bulkActionButton} onPress={handleResetAllToPending} activeOpacity={0.8}>
                <Text style={styles.bulkActionButtonText}>{t("resetAllButton")}</Text>
              </TouchableOpacity>
            </View>

            {planItems.map((item) => (
              <View key={item._id} style={styles.itemCard}>
                <TouchableOpacity
                  style={styles.itemStatusToggle}
                  onPress={() => handleToggleItemStatus(item)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.itemStatusIcon}>{item.status === "done" ? "✅" : "⬜"}</Text>
                </TouchableOpacity>
                <View style={styles.itemContent}>
                  <Text style={[styles.itemTitle, item.status === "done" && styles.itemTitleDone]}>{item.title}</Text>
                  {item.note && <Text style={styles.itemNote}>{item.note}</Text>}
                  {item.expectedAt && (
                    <Text style={styles.itemDate}>
                      {t("expectedText")} {moment(item.expectedAt).format("MMM Do, YYYY")}
                    </Text>
                  )}
                  {item.completedAt && item.status === "done" && (
                    <Text style={styles.itemDate}>
                      {t("completedText")} {moment(item.completedAt).format("MMM Do, YYYY")}
                    </Text>
                  )}
                </View>
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.editButton]}
                    onPress={() => openEditItemModal(item)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.editButtonText}>{t("editButton")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.deleteButton]}
                    onPress={() => handleDeleteItem(item._id)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.deleteButtonText}>{t("deleteButton")}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.deletePlanButton} onPress={handleDeleteEntirePlan} activeOpacity={0.8}>
              <Text style={styles.deletePlanButtonText}>{t("deletePlanButton")}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <Navigation navigation={navigation} active="Bookings" />

      {/* Add/Edit Item Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingItem ? t("editItemModalTitle") : t("addItemModalTitle")}</Text>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("titleLabel")}</Text>
                <TextInput
                  placeholder={t("titlePlaceholder")}
                  style={styles.textInput}
                  value={newItemForm.title}
                  onChangeText={(text) => setNewItemForm((prev) => ({ ...prev, title: text }))}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("notesLabel")}</Text>
                <TextInput
                  placeholder={t("notesPlaceholder")}
                  style={[styles.textInput, { minHeight: 80, textAlignVertical: "top" }]}
                  multiline
                  numberOfLines={4}
                  value={newItemForm.note}
                  onChangeText={(text) => setNewItemForm((prev) => ({ ...prev, note: text }))}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>{t("expectedDateLabel")}</Text>
                <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.textInput}>
                  <Text style={{ color: newItemForm.expectedAt ? "#000" : "#999" }}>
                    {newItemForm.expectedAt
                      ? moment(newItemForm.expectedAt).format("MMM Do, YYYY")
                      : t("selectDateText")}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={newItemForm.expectedAt ? new Date(newItemForm.expectedAt) : new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false)
                      if (selectedDate) {
                        setNewItemForm((prev) => ({
                          ...prev,
                          expectedAt: selectedDate.toISOString(),
                        }))
                      }
                    }}
                  />
                )}
              </View>

              {editingItem && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>{t("statusLabel")}</Text>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={newItemForm.status}
                      onValueChange={(itemValue) => setNewItemForm((prev) => ({ ...prev, status: itemValue }))}
                      style={styles.picker}
                    >
                      <Picker.Item label={t("pendingStatus")} value="pending" />
                      <Picker.Item label={t("doneStatus")} value="done" />
                    </Picker>
                  </View>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelModalButton]}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                <Text style={styles.cancelModalButtonText}>{t("cancelButton")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveModalButton]}
                onPress={editingItem ? handleUpdateItem : handleAddItem}
                activeOpacity={0.8}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveModalButtonText}>
                    {editingItem ? t("updateItemButton") : t("addItemButton")}
                  </Text>
                )}
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
    paddingVertical: 60,
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
    alignItems: "center",
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 8,
    textAlign: "center",
  },
  summaryText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: "#BB9C66",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#BB9C66",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  bulkActionsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    gap: 10,
  },
  bulkActionButton: {
    flex: 1,
    backgroundColor: "#EAE3DB",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CDBBA9",
  },
  bulkActionButtonText: {
    color: "#6B5C57",
    fontSize: 13,
    fontWeight: "600",
  },
  itemCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 3,
    alignItems: "center",
  },
  itemStatusToggle: {
    marginRight: 12,
    padding: 5,
  },
  itemStatusIcon: {
    fontSize: 24,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 4,
  },
  itemTitleDone: {
    textDecorationLine: "line-through",
    color: "#999",
  },
  itemNote: {
    fontSize: 13,
    color: "#666",
    marginBottom: 4,
  },
  itemDate: {
    fontSize: 12,
    color: "#BB9C66",
    fontWeight: "500",
  },
  itemActions: {
    marginLeft: 15,
    alignItems: "flex-end",
  },
  actionButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    minWidth: 60,
    alignItems: "center",
    marginBottom: 8,
  },
  editButton: {
    backgroundColor: "#2196F3",
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
  deletePlanButton: {
    backgroundColor: "#F44336",
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#F44336",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3,
  },
  deletePlanButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
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
  dateHint: {
    fontSize: 12,
    color: "#999",
    marginTop: 4,
    marginLeft: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#F8F9FA",
    overflow: "hidden",
    marginBottom: 30,
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
  saveModalButton: {
    backgroundColor: "#BB9C66",
  },
  saveModalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
})
