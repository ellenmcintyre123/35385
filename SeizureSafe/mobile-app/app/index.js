import React, { useState, useEffect, useRef } from 'react';
import { 
  SafeAreaView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import mqtt from 'precompiled-mqtt';
import AsyncStorage from '@react-native-async-storage/async-storage';

// MQTT settings
const BROKER = 'ed733e7d.ala.eu-central-1.emqxsl.com';
const PORT = 8084;
const TOPIC = 'seizureSafe/test';
const USERNAME = 'ellenmcintyre123';
const PASSWORD = 'Happy1234a!*';

// Predefined users for demo (in real app, this would be in a secure backend)
const VALID_USERS = {
  'demo@seizuresafe.com': 'demo123',
  'test@seizuresafe.com': 'test123'
};

export default function App() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loginError, setLoginError] = useState('');

  // MQTT States
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [braceletData, setBraceletData] = useState({
    heart_rate: '--',
    previous_heart_rate: '--',
    fall_detected: false,
    seizure_detected: false,
    timestamp: '--:--:--'
  });
  const [seizureCount, setSeizureCount] = useState(0);
  const [lastSeizureTime, setLastSeizureTime] = useState(0);
  const clientRef = useRef(null);

  // Load user session on startup
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (userData) {
        setIsLoggedIn(true);
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }
  };

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
      // Check if user already exists
      const existingUsers = await AsyncStorage.getItem('users');
      const users = existingUsers ? JSON.parse(existingUsers) : {};

      if (users[email]) {
        setLoginError('Email already registered');
        return;
      }

      // Save new user
      users[email] = {
        password,
        fullName,
        createdAt: new Date().toISOString()
      };

      await AsyncStorage.setItem('users', JSON.stringify(users));
      await AsyncStorage.setItem('userData', JSON.stringify({ email, fullName }));

      // Auto login after registration
      setIsLoggedIn(true);
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      console.error('Error during registration:', error);
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
        await AsyncStorage.setItem('userData', JSON.stringify({ 
          email, 
          fullName: users[email].fullName 
        }));
        setIsLoggedIn(true);
      } else {
        setLoginError('Invalid email or password');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userData');
      setIsLoggedIn(false);
      setEmail('');
      setPassword('');
      setFullName('');
      if (clientRef.current) {
        clientRef.current.end();
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // MQTT connection effect
  useEffect(() => {
    if (!isLoggedIn) return;

    const options = {
      protocol: 'wss',
      hostname: BROKER,
      port: PORT,
      path: '/mqtt',
      clientId: 'mobile_' + Math.random().toString(16).substr(2, 8),
      username: USERNAME,
      password: PASSWORD,
      clean: true,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
      connectTimeout: 5000
    };

    try {
      console.log('Attempting to connect to MQTT broker...', BROKER, PORT);
      const client = mqtt.connect(`wss://${BROKER}:${PORT}/mqtt`, options);
      clientRef.current = client;

      client.on('connect', () => {
        console.log('Connected to MQTT broker');
        setConnectionStatus('Connected');
        client.subscribe(TOPIC, { qos: 1 }, (err) => {
          if (err) {
            console.error('Subscribe error:', err);
          } else {
            console.log('Successfully subscribed to topic:', TOPIC);
            // Send a test message to confirm subscription
            client.publish(TOPIC, JSON.stringify({ test: 'mobile connected' }));
          }
        });

        // Also subscribe to wildcard topic for debugging
        client.subscribe('seizureSafe/#', { qos: 1 }, (err) => {
          if (err) {
            console.error('Wildcard subscribe error:', err);
          } else {
            console.log('Subscribed to wildcard topic for debugging');
          }
        });
      });

      client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          
          if (data.heart_rate) {
            setBraceletData(data);
            
            if (data.seizure_detected) {
              const currentTime = Date.now();
              if (currentTime - lastSeizureTime >= 15000) {
                setSeizureCount(prev => prev + 1);
                setLastSeizureTime(currentTime);
                Alert.alert(
                  'Seizure Detected!',
                  `A seizure has been detected.\nHeart Rate: ${data.heart_rate} BPM`,
                  [{ text: 'OK' }]
                );
              }
            }
          }
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      });

      client.on('error', (err) => {
        console.error('MQTT error:', err);
        setConnectionStatus('Error: ' + err.message);
      });

      client.on('close', () => {
        console.log('Connection closed');
        setConnectionStatus('Disconnected');
      });

      client.on('offline', () => {
        console.log('Client went offline');
        setConnectionStatus('Offline');
      });

      client.on('reconnect', () => {
        console.log('Client trying to reconnect');
        setConnectionStatus('Reconnecting...');
      });

    } catch (error) {
      console.error('Error setting up MQTT:', error);
      setConnectionStatus('Error');
    }

    return () => {
      if (clientRef.current) {
        clientRef.current.end();
      }
    };
  }, [isLoggedIn, lastSeizureTime]);

  // Reset seizure count every 24 hours
  useEffect(() => {
    if (!isLoggedIn) return;

    const interval = setInterval(() => {
      setSeizureCount(0);
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <SafeAreaView style={styles.container}>
            <View style={styles.loginContainer}>
              <Text style={styles.loginTitle}>SeizureSafe</Text>
              <Text style={styles.loginSubtitle}>
                {isRegistering ? 'Create your account' : 'Login to your account'}
              </Text>
              
              {isRegistering && (
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              )}

              <TextInput
                style={styles.input}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              
              <TextInput
                style={styles.input}
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
              />

              {isRegistering && (
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              )}
              
              {loginError ? <Text style={styles.errorText}>{loginError}</Text> : null}
              
              <TouchableOpacity 
                style={styles.loginButton} 
                onPress={isRegistering ? handleRegister : handleLogin}
              >
                <Text style={styles.loginButtonText}>
                  {isRegistering ? 'Create Account' : 'Login'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.switchButton}
                onPress={() => {
                  setIsRegistering(!isRegistering);
                  setLoginError('');
                  setEmail('');
                  setPassword('');
                  setConfirmPassword('');
                  setFullName('');
                }}
              >
                <Text style={styles.switchButtonText}>
                  {isRegistering 
                    ? 'Already have an account? Login' 
                    : 'Don\'t have an account? Register'}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SeizureSafe</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.status, connectionStatus === 'Connected' ? styles.connected : styles.disconnected]}>
            {connectionStatus}
          </Text>
          <Text style={styles.seizureCount}>24h Seizures: {seizureCount}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Heart Rate</Text>
        <Text style={styles.heartRate}>{braceletData.heart_rate} BPM</Text>
        <Text style={styles.timestamp}>{braceletData.timestamp}</Text>
      </View>

      <View style={[styles.card, braceletData.seizure_detected && styles.emergencyCard]}>
        <Text style={[styles.cardTitle, braceletData.seizure_detected && styles.emergencyText]}>
          Seizure Detection
        </Text>
        <Text style={[styles.statusText, braceletData.seizure_detected ? styles.emergencyText : styles.normalText]}>
          {braceletData.seizure_detected ? 'SEIZURE DETECTED!' : 'No Seizure Detected'}
        </Text>
        {braceletData.fall_detected && (
          <Text style={[styles.warningText, braceletData.seizure_detected ? styles.emergencyText : styles.normalText]}>
            Fall Detected
          </Text>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.aboutButton}
          onPress={() => router.push('/about')}
        >
          <Text style={styles.aboutButtonText}>About SeizureSafe</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
    padding: 20,
  },
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  loginSubtitle: {
    fontSize: 18,
    color: '#7f8c8d',
    marginBottom: 30,
  },
  input: {
    width: '100%',
    height: 50,
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 15,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  loginButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#3498db',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: '#e74c3c',
    marginBottom: 10,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  status: {
    padding: 10,
    borderRadius: 20,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  connected: {
    backgroundColor: '#2ecc71',
    color: 'white',
  },
  disconnected: {
    backgroundColor: '#e74c3c',
    color: 'white',
  },
  seizureCount: {
    backgroundColor: '#e74c3c',
    color: 'white',
    padding: 10,
    borderRadius: 20,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emergencyCard: {
    backgroundColor: '#e74c3c',
  },
  cardTitle: {
    fontSize: 20,
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
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
    fontSize: 16,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  warningText: {
    fontSize: 20,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  emergencyText: {
    color: '#ffffff',
  },
  normalText: {
    color: '#2c3e50',
  },
  buttonContainer: {
    marginTop: 'auto',
    gap: 10,
  },
  aboutButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  aboutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#e74c3c',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  switchButton: {
    marginTop: 20,
    padding: 10,
  },
  switchButtonText: {
    color: '#3498db',
    fontSize: 16,
    textAlign: 'center',
  },
}); 