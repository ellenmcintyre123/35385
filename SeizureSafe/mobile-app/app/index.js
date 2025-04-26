import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
import mqtt from 'mqtt';

// MQTT Configuration
const MQTT_USERNAME = 'seizuresafe';
const MQTT_PASSWORD = 'SeizureSafe2024!';
const MQTT_URL = 'wss://ed733e7d.ala.eu-central-1.emqxsl.com:8084';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const mqttClient = useRef(null);

  useEffect(() => {
    console.log('Setting up MQTT connection...');
    
    try {
      // Create a client instance
      const client = mqtt.connect(MQTT_URL, {
        username: MQTT_USERNAME,
        password: MQTT_PASSWORD,
        clientId: 'seizuresafe-mobile-' + Math.random().toString(16).substr(2, 8)
      });

      // Set event handlers
      client.on('close', () => {
        console.log('Connection closed');
        setConnectionStatus('Disconnected');
      });

      client.on('error', (error) => {
        console.log('Connection error:', error);
        setConnectionStatus('Error: ' + error.message);
      });

      client.on('message', (topic, message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('Received data:', data);
        } catch (e) {
          console.error('Error parsing message:', e);
        }
      });

      client.on('connect', () => {
        console.log('Connected to MQTT broker successfully');
        setConnectionStatus('Connected');
        client.subscribe('seizureSafe/data');
      });

      mqttClient.current = client;

      return () => {
        console.log('Cleaning up MQTT connection');
        if (client) {
          client.end();
        }
      };
    } catch (error) {
      console.error('Setup error:', error);
      setConnectionStatus('Setup Error: ' + error.message);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SeizureSafe</Text>
        <View style={styles.statusContainer}>
          <Text style={[styles.status, connectionStatus === 'Connected' ? styles.connected : styles.disconnected]}>
            {connectionStatus}
          </Text>
        </View>
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
  }
});

export default App; 