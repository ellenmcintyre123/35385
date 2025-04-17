import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaView, StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import MQTT from 'react-native-mqtt';

const Stack = createNativeStackNavigator();

function DashboardScreen({ navigation }) {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [braceletData, setBraceletData] = useState({
    heart_rate: '--',
    previous_heart_rate: '--',
    fall_detected: false,
    seizure_detected: false,
    timestamp: '--:--:--'
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [seizureCount, setSeizureCount] = useState(0);
  const mqttClient = useRef(null);
  const [lastSeizureTime, setLastSeizureTime] = useState(0);

  useEffect(() => {
    // Initialize MQTT client
    const client = new MQTT.Client('wss://ed733e7d.ala.eu-central-1.emqxsl.com:8084/mqtt', {
      clientId: 'mobile_' + Math.random().toString(16).substr(2, 8),
      username: 'ellenmcintyre123',
      password: 'Happy1234a!',
      clean: true,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
      connectTimeout: 5000
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('Connected');
      client.subscribe('seizureSafe/data');
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received data:', data);
        setBraceletData(data);
        
        // Update seizure count
        if (data.seizure_detected) {
          setSeizureCount(prev => prev + 1);
          // Show alert for seizure
          Alert.alert(
            'Seizure Detected!',
            'A seizure has been detected. Please check on the patient immediately.',
            [{ text: 'OK' }]
          );
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

    mqttClient.current = client;
    client.connect();

    return () => {
      client.disconnect();
    };
  }, []);

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
        <Text style={styles.cardTitle}>Seizure Detection</Text>
        <Text style={styles.statusText}>
          {braceletData.seizure_detected ? '🚨 SEIZURE DETECTED!' : 'No Seizure Detected'}
        </Text>
        {braceletData.fall_detected && (
          <Text style={styles.warningText}>⚠️ Fall Detected</Text>
        )}
      </View>

      <View style={styles.chartContainer}>
        <LineChart
          data={{
            labels: historicalData.map(data => data.timestamp),
            datasets: [{
              data: historicalData.map(data => data.heart_rate)
            }]
          }}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(44, 62, 80, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          bezier
          style={styles.chart}
        />
      </View>

      <TouchableOpacity
        style={styles.aboutButton}
        onPress={() => navigation.navigate('About')}
      >
        <Text style={styles.aboutButtonText}>About SeizureSafe</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.aboutContent}>
        <Text style={styles.aboutTitle}>About SeizureSafe</Text>
        
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

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen 
          name="Dashboard" 
          component={DashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="About" 
          component={AboutScreen}
          options={{ headerShown: false }}
        />
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
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  seizureCount: {
    backgroundColor: '#e74c3c',
    color: 'white',
    padding: 8,
    borderRadius: 20,
    fontWeight: 'bold',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  heartRate: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2c3e50',
    textAlign: 'center',
  },
  timestamp: {
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  statusText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  warningText: {
    color: '#f1c40f',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
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
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  aboutButton: {
    backgroundColor: '#3498db',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  aboutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  aboutContent: {
    padding: 20,
  },
  aboutTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  sectionText: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
  },
}); 