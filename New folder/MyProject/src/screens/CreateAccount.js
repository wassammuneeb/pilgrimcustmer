import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView,
  StatusBar,
  ActivityIndicator 
} from 'react-native';
import axiosInstance from '../axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAccountTranslations as translations } from '../translations/createAccountTranslations';

export default function CreateAccount({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showRequirements, setShowRequirements] = useState(false);
  const [language, setLanguage] = useState('en'); // default

  // Load selected language from AsyncStorage on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const userDataStr = await AsyncStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          if (userData?.preferredLanguage) {
            setLanguage(userData.preferredLanguage);
            return;
          }
        }
        const storedLang = await AsyncStorage.getItem('selectedLanguage');
        if (storedLang) {
          setLanguage(storedLang);
          return;
        }
      } catch (err) {
        console.warn('Language load error:', err);
      }
    };
    loadLanguage();
  }, []);

  const t = (section, key) => {
    const lang = language || "en";
    return (
      (translations[lang] &&
        translations[lang][key]) ||
      (translations["en"] &&
        translations["en"][key]) ||
      `${section}.${key}`
    );
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const trimmedPassword = password.trim();
    const trimmedRePassword = rePassword.trim();

    if (!trimmedName || !trimmedEmail || !trimmedPhone || !trimmedPassword || !trimmedRePassword) {
      Alert.alert(t("createAccount", "missingInfoTitle"), t("createAccount", "missingInfoMsg"));
      return;
    }

    if (trimmedName.length < 3 || trimmedName.length > 50) {
      Alert.alert(t("createAccount", "nameIssueTitle"), t("createAccount", "nameIssueMsg"));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      Alert.alert(t("createAccount", "invalidEmailTitle"), t("createAccount", "invalidEmailMsg"));
      return;
    }

    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(trimmedPhone)) {
      Alert.alert(t("createAccount", "phoneErrorTitle"), t("createAccount", "phoneErrorMsg"));
      return;
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;
    if (!passwordRegex.test(trimmedPassword)) {
      Alert.alert(t("createAccount", "weakPasswordTitle"), t("createAccount", "weakPasswordMsg"));
      return;
    }

    if (trimmedPassword !== trimmedRePassword) {
      Alert.alert(t("createAccount", "passwordMismatchTitle"), t("createAccount", "passwordMismatchMsg"));
      return;
    }

    const payload = {
      name: trimmedName,
      email: trimmedEmail,
      phoneNo: trimmedPhone,
      password: trimmedPassword,
      role: "customer",
      profilePicture: "",
    };

    setLoading(true);
    try {
      const response = await axiosInstance.post('auth/customer/registercustomer', payload);
      const data = response.data;
      if (response.status === 201 || response.status === 200) {
        Alert.alert(
          t("createAccount", "welcomeTitle"),
          t("createAccount", "welcomeMsg"),
          [
            { text: t("createAccount", "welcomeButtonText"), onPress: () => navigation.navigate('Login') }
          ]
        );
      } else {
        let errorMsg = data.message || t("createAccount", "genericErrorMsg");
        Alert.alert(t("createAccount", "couldNotRegisterTitle"), errorMsg);
      }
    } catch (error) {
      console.error("❌ Error:", error.response?.data || error.message);
      let message = t("createAccount", "genericErrorMsg");
      if (error.response?.data?.message) {
        const msg = (error.response.data.message || "").toLowerCase();
        if (msg.includes("customer already registered") || msg.includes("already registered")) {
          message = t("createAccount", "alreadyExistsMsg");
        } else if (msg.includes("validation failed")) {
          const errors = error.response.data.errors;
          message = errors?.join('\n') || t("createAccount", "invalidInputMsg");
        } else if (msg.includes("internal server error")) {
          message = t("createAccount", "serverErrorMsg");
        } else {
          message = error.response.data.message;
        }
      }
      Alert.alert(t("createAccount", "registrationFailedTitle"), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("createAccount", "headerTitle")}</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>{t("createAccount", "createAccountTitle")}</Text>
          <Text style={styles.welcomeSubtitle}>{t("createAccount", "createAccountSubtitle")}</Text>
        </View>

        {/* Registration Form Card */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{t("createAccount", "formTitle")}</Text>
          
          {/* Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("createAccount", "fullNameLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>👤</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("createAccount", "fullNamePlaceholder")}
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("createAccount", "emailLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📧</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("createAccount", "emailPlaceholder")}
                keyboardType="email-address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("createAccount", "phoneLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>📱</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("createAccount", "phonePlaceholder")}
                keyboardType="phone-pad"
                placeholderTextColor="#999"
                value={phone}
                onChangeText={setPhone}
                maxLength={11}
              />
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("createAccount", "passwordLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("createAccount", "passwordPlaceholder")}
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
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>{t("createAccount", "confirmPasswordLabel")}</Text>
            <View style={styles.inputWrapper}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.textInput}
                placeholder={t("createAccount", "confirmPasswordPlaceholder")}
                placeholderTextColor="#999"
                secureTextEntry={!showRePassword}
                value={rePassword}
                onChangeText={setRePassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowRePassword(!showRePassword)}
                activeOpacity={0.8}
              >
                <Text style={styles.eyeIcon}>{showRePassword ? '👁️' : '👁️‍🗨️'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Collapsible Password Requirements */}
          <View style={styles.passwordRequirements}>
            <TouchableOpacity 
              style={styles.requirementsHeader}
              onPress={() => setShowRequirements(!showRequirements)}
              activeOpacity={0.8}
            >
              <Text style={styles.requirementsTitle}>{t("createAccount", "passwordRequirementsTitle")}</Text>
              <Text style={styles.expandIcon}>{showRequirements ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            
            {showRequirements && (
              <View style={styles.requirementsList}>
                <Text style={styles.requirementItem}>{}</Text>
                <Text style={styles.requirementItem}>{t("createAccount", "passwordRequirement1")}</Text>
                <Text style={styles.requirementItem}>{t("createAccount", "passwordRequirement2")}</Text>
                <Text style={styles.requirementItem}>{t("createAccount", "passwordRequirement3")}</Text>
                <Text style={styles.requirementItem}>{t("createAccount", "passwordRequirement4")}</Text>
                <Text style={styles.requirementItem}>{t("createAccount", "passwordRequirement5")}</Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color="#FFFFFF" size="small" />
                <Text style={styles.loadingText}>{t("createAccount", "creatingAccount")}</Text>
              </View>
            ) : (
              <Text style={styles.submitButtonText}>{t("createAccount", "createAccountButton")}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Section */}
        <View style={styles.bottomSection}>
          <Text style={styles.bottomText}>{t("createAccount", "alreadyHaveAccount")}</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginLink}>{t("createAccount", "signInLink")}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 20,
    color: '#2C2C2C',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 30,
    paddingBottom: 40,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 30,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
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
    color: '#2C2C2C',
    paddingVertical: 12,
  },
  eyeButton: {
    padding: 4,
  },
  eyeIcon: {
    fontSize: 18,
  },
  passwordRequirements: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'hidden',
  },
  requirementsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2C',
  },
  expandIcon: {
    fontSize: 14,
    color: '#BB9C66',
    fontWeight: '600',
  },
  requirementsList: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  requirementItem: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#BB9C66',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#BB9C66',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomText: {
    fontSize: 14,
    color: '#666',
    marginRight: 4,
  },
  loginLink: {
    fontSize: 14,
    color: '#BB9C66',
    fontWeight: '700',
  },
});