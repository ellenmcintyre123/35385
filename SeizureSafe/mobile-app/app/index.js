import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import mqtt from 'precompiled-mqtt';

// MQTT settings
const BROKER = 'ed733e7d.ala.eu-central-1.emqxsl.com';
const PORT = 8084;
const TOPIC = 'seizureSafe/test';
const USERNAME = 'ellenmcintyre123';
const PASSWORD = 'Happy1234a!*';

export default function App() {
  const router = useRouter();
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

  useEffect(() => {
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
      console.log('Using topic:', TOPIC);
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
            client.publish(TOPIC, JSON.stringify({ test: 'Mobile app connected' }));
          }
        });

        // Subscribe to wildcard topic to see all messages for debugging
        client.subscribe('seizureSafe/#', { qos: 1 }, (err) => {
          if (err) {
            console.error('Wildcard subscribe error:', err);
          } else {
            console.log('Subscribed to wildcard topic: seizureSafe/#');
          }
        });
      });

      client.on('message', (topic, message) => {
        try {
          console.log('Topic received:', topic);
          console.log('Raw message received:', message.toString());
          const data = JSON.parse(message.toString());
          console.log('Parsed data:', data);
          
          // Only update if we have valid heart rate data
          if (data.heart_rate) {
            console.log('Updating bracelet data with heart rate:', data.heart_rate);
            setBraceletData(data);
            
            if (data.seizure_detected) {
              console.log('Seizure detected!');
              const currentTime = Date.now();
              if (currentTime - lastSeizureTime >= 8000) {
                setSeizureCount(prev => prev + 1);
                setLastSeizureTime(currentTime);
                Alert.alert(
                  'Seizure Detected!',
                  'A seizure has been detected. Please check on the patient immediately.',
                  [{ text: 'OK' }]
                );
              }
            }
          }
        } catch (e) {
          console.error('Error processing message:', e);
          console.error('Raw message that failed:', message.toString());
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
  }, [lastSeizureTime]);

  // Reset seizure count every 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      setSeizureCount(0);
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

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

      <TouchableOpacity
        style={styles.aboutButton}
        onPress={() => router.push('/about')}
      >
        <Text style={styles.aboutButtonText}>About SeizureSafe</Text>
      </TouchableOpacity>
    </SafeAreaView>
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
  aboutButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 'auto',
  },
  aboutButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  }
}); 