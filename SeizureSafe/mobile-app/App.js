import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, SafeAreaView, Alert, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import mqtt from 'precompiled-mqtt';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import 'react-native-url-polyfill/auto';
import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { REACT_APP_MQTT_BROKER, REACT_APP_MQTT_PORT, REACT_APP_MQTT_TOPIC, REACT_APP_MQTT_USERNAME, REACT_APP_MQTT_PASSWORD } from '@env';
global.Buffer = Buffer;
global.process = require('process');
global.stream = require('stream-browserify');
global.assert = require('assert');
global.events = require('events');
global.util = require('util');

// MQTT settings
const BROKER = REACT_APP_MQTT_BROKER;
const PORT = Number(REACT_APP_MQTT_PORT);
const TOPIC = REACT_APP_MQTT_TOPIC;
const USERNAME = REACT_APP_MQTT_USERNAME;
const PASSWORD = REACT_APP_MQTT_PASSWORD;

function LoginRegisterScreen({ onLogin }) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loginError, setLoginError] = useState('');
  const [userEmail, setUserEmail] = useState('');

  const handleRegister = async () => {
    setLoginError('');
    if (!email || !password || !confirmPassword || !fullName) {
      setLoginError('All fields are required');
      return;
    }
    if (password !== confirmPassword) {
      setLoginError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setLoginError('Password must be at least 6 characters');
      return;
    }
    try {
      const existingUsers = await AsyncStorage.getItem('users');
      const users = existingUsers ? JSON.parse(existingUsers) : {};
      if (users[email]) {
        setLoginError('Email already registered');
        return;
      }
      users[email] = {
        password,
        fullName,
        createdAt: new Date().toISOString()
      };
      await AsyncStorage.setItem('users', JSON.stringify(users));
      await AsyncStorage.setItem('userData', JSON.stringify({ email, fullName }));
      setUserEmail(email);
      onLogin();
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      setLoginError('Registration failed. Please try again.');
    }
  };

  const handleLogin = async () => {
    setLoginError('');
    if (!email || !password) {
      setLoginError('Email and password are required');
      return;
    }
    try {
      const existingUsers = await AsyncStorage.getItem('users');
      const users = existingUsers ? JSON.parse(existingUsers) : {};
      if (users[email] && users[email].password === password) {
        await AsyncStorage.setItem('userData', JSON.stringify({ email, fullName: users[email].fullName }));
        setUserEmail(email);
        onLogin();
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (error) {
      setLoginError('Login failed. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loginContainer}>
            <Text style={styles.loginTitle}>SeizureSafe</Text>
            <Text style={styles.loginSubtitle}>{isRegistering ? 'Create your account' : 'Login to your account'}</Text>
            {isRegistering && (
              <TextInput style={styles.input} placeholder="Full Name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
            )}
            <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
            <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} />
            {isRegistering && (
              <TextInput style={styles.input} placeholder="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} />
            )}
            {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
            <TouchableOpacity style={styles.loginButton} onPress={isRegistering ? handleRegister : handleLogin}>
              <Text style={styles.loginButtonText}>{isRegistering ? 'Create Account' : 'Login'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchButton} onPress={() => {
              setIsRegistering(!isRegistering);
              setLoginError('');
              setEmail('');
              setPassword('');
              setConfirmPassword('');
              setFullName('');
            }}>
              <Text style={styles.switchButtonText}>{isRegistering ? 'Already have an account? Login' : 'Don\'t have an account? Register'}</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DashboardScreen({ navigation, onLogout, userEmail }) {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [braceletData, setBraceletData] = useState({
    heart_rate: '--',
    previous_heart_rate: '--',
    fall_detected: false,
    seizure_detected: false,
    timestamp: '--:--:--'
  });
  const [seizureAlertPlayed, setSeizureAlertPlayed] = useState(false);
  const clientRef = useRef(null);
  const soundRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  async function playSeizureAlert() {
    if (isPlaying) {
      // Don't play again if already playing
      return;
    }
    setIsPlaying(true);
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      console.log('Attempting to play seizure alert sound...');

      // Stop and unload previous sound if still playing
      if (soundRef.current) {
        try {
          await soundRef.current.stopAsync();
        } catch (e) {}
        try {
          await soundRef.current.unloadAsync();
        } catch (e) {}
        soundRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        require('./assets/seizure_alert.mp3')
      );
      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          sound.unloadAsync().catch(() => {});
          soundRef.current = null;
          setIsPlaying(false);
        }
      });

      await sound.playAsync();
      console.log('Audio played!');
    } catch (error) {
      setIsPlaying(false);
      console.error('Error playing alert sound:', error);
      Alert.alert('Audio Error', error.message || 'Could not play sound');
      // Always try to clean up
      if (soundRef.current) {
        try { await soundRef.current.unloadAsync(); } catch (e) {}
        soundRef.current = null;
      }
    }
  }

  useEffect(() => {
    const options = {
      protocol: 'wss',
      hostname: BROKER,
      port: PORT,
      username: USERNAME,
      password: PASSWORD,
      clean: true,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
    };
    const client = mqtt.connect(`wss://${BROKER}:${PORT}/mqtt`, options);
    clientRef.current = client;

    client.on('connect', () => {
      setConnectionStatus('Connected');
      client.subscribe(TOPIC, { qos: 1 });
    });
    client.on('message', (topic, message) => {
      try {
        console.log('Received MQTT message:', message.toString());
        const data = JSON.parse(message.toString());
        setBraceletData(data);
        if (data.seizure_detected && !seizureAlertPlayed && !isPlaying) {
          setSeizureAlertPlayed(true);
          playSeizureAlert();
          Alert.alert('Seizure Detected!', 'A seizure has been detected. Please check on the patient immediately.');
        } else if (!data.seizure_detected && seizureAlertPlayed && !isPlaying) {
          setSeizureAlertPlayed(false);
        }
      } catch (e) {}
    });
    client.on('error', () => setConnectionStatus('Error'));
    client.on('close', () => setConnectionStatus('Disconnected'));
    return () => {
      client.end();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [seizureAlertPlayed]);

  useEffect(() => {
    // Check for existing session
    (async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setUserEmail(JSON.parse(userData).email);
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SeizureSafe Dashboard</Text>
        <Text style={[styles.status, connectionStatus === 'Connected' ? styles.connected : styles.disconnected]}>
          {connectionStatus}
        </Text>
      </View>
      <View style={styles.card}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name="heart-pulse" size={40} color="#e74c3c" style={{ marginRight: 10 }} />
          <Text style={styles.heartRate}>{braceletData.heart_rate} <Text style={{ fontSize: 24 }}>BPM</Text></Text>
        </View>
        <Text style={styles.timestamp}>{braceletData.timestamp}</Text>
      </View>
      <View style={[styles.card, braceletData.seizure_detected && styles.emergencyCard]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <MaterialCommunityIcons name={braceletData.seizure_detected ? "alert" : "shield-check"} size={32} color={braceletData.seizure_detected ? "#e74c3c" : "#2ecc71"} style={{ marginRight: 8 }} />
          <Text style={styles.statusText}>
            {braceletData.seizure_detected ? 'SEIZURE DETECTED!' : 'No Seizure Detected'}
          </Text>
        </View>
        {braceletData.fall_detected && (
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 8 }}>
            <MaterialCommunityIcons name="alert-circle" size={24} color="#e67e22" style={{ marginRight: 6 }} />
            <Text style={styles.warningText}>Fall Detected</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.aboutButton} onPress={() => navigation.navigate('About')}>
        <MaterialCommunityIcons name="information-outline" size={22} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.aboutButtonText}>About</Text>
      </TouchableOpacity>
      {userEmail === 'admin@seizuresafe.com' && (
        <TouchableOpacity style={styles.aboutButton} onPress={() => navigation.navigate('Users')}>
          <MaterialCommunityIcons name="account-group" size={22} color="white" style={{ marginRight: 8 }} />
          <Text style={styles.aboutButtonText}>Manage Users</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
        <MaterialCommunityIcons name="logout" size={22} color="white" style={{ marginRight: 8 }} />
        <Text style={styles.logoutButtonText}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.aboutCard}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <MaterialCommunityIcons name="information" size={48} color="#3498db" />
          <Text style={styles.aboutTitle}>About SeizureSafe</Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Research on Seizures</Text>
          <Text style={styles.sectionText}>
            Seizures are sudden, uncontrolled electrical disturbances in the brain that can cause changes in behavior, movements, feelings, and levels of consciousness. They are a common symptom of epilepsy, affecting approximately 50 million people worldwide.
          </Text>
        </View>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Research Findings:</Text>
          <Text style={styles.sectionText}>• Heart rate typically increases by 10-20 BPM during a seizure</Text>
          <Text style={styles.sectionText}>• Falls are a common occurrence during seizures</Text>
          <Text style={styles.sectionText}>• Early detection can significantly reduce the risk of injury</Text>
          <Text style={styles.sectionText}>• Most seizures last between 30 seconds to 2 minutes</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function UsersScreen() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    (async () => {
      const usersStr = await AsyncStorage.getItem('users');
      setUsers(usersStr ? Object.entries(JSON.parse(usersStr)) : []);
    })();
  }, []);
  const deleteUser = async (email) => {
    const usersStr = await AsyncStorage.getItem('users');
    const usersObj = usersStr ? JSON.parse(usersStr) : {};
    delete usersObj[email];
    await AsyncStorage.setItem('users', JSON.stringify(usersObj));
    setUsers(Object.entries(usersObj));
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.aboutCard}>
        <Text style={styles.aboutTitle}>All Users</Text>
        {users.length === 0 ? (
          <Text style={styles.sectionText}>No users found.</Text>
        ) : (
          users.map(([email, user]) => (
            <View key={email} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <View>
                <Text style={{ fontWeight: 'bold' }}>{user.fullName || email}</Text>
                <Text style={{ color: '#7f8c8d' }}>{email}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteUser(email)} style={{ backgroundColor: '#e74c3c', padding: 8, borderRadius: 6 }}>
                <MaterialCommunityIcons name="delete" size={20} color="white" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </SafeAreaView>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  useEffect(() => {
    // Check for existing session
    (async () => {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setIsLoggedIn(true);
        setUserEmail(JSON.parse(userData).email);
      }
    })();
  }, []);
  const handleLogout = async () => {
    await AsyncStorage.removeItem('userData');
    setIsLoggedIn(false);
  };
  if (!isLoggedIn) {
    return <LoginRegisterScreen onLogin={() => setIsLoggedIn(true)} />;
  }
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Dashboard" component={props => <DashboardScreen {...props} onLogout={handleLogout} userEmail={userEmail} />} options={{ headerShown: false }} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="Users" component={UsersScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  status: {
    padding: 8,
    borderRadius: 20,
    fontWeight: 'bold',
  },
  connected: {
    backgroundColor: '#2ecc71',
    color: 'white',
  },
  disconnected: {
    backgroundColor: '#e74c3c',
    color: 'white',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emergencyCard: {
    borderColor: '#e74c3c',
    borderWidth: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  heartRate: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  timestamp: {
    fontSize: 14,
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: 5,
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  warningText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginTop: 10,
  },
  aboutButton: {
    flexDirection: 'row',
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'center',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  aboutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 10,
  },
  aboutCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginTop: 32,
    marginBottom: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  aboutTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
    marginTop: 8,
    marginBottom: 8,
    textAlign: 'center',
  },
  section: {
    marginBottom: 18,
  },
  loginContainer: {
    padding: 20,
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  loginSubtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 20,
  },
  input: {
    padding: 12,
    borderWidth: 2,
    borderColor: '#3498db',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: 'white',
    fontSize: 18,
    color: '#2c3e50',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10,
  },
  loginButton: {
    padding: 15,
    borderRadius: 5,
    backgroundColor: '#3498db',
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  switchButton: {
    padding: 15,
    borderRadius: 5,
    backgroundColor: '#7f8c8d',
    alignItems: 'center',
    marginTop: 10,
  },
  switchButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'center',
    shadowColor: '#e74c3c',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
}); 