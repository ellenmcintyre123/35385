import React, { useEffect, useState } from 'react';
import mqtt from 'mqtt';
import { Box, Typography, Alert } from '@mui/material';

const MQTT_CONFIG = {
  broker: 'wss://ed733e7d.ala.eu-central-1.emqxsl.com:8084/mqtt',
  options: {
    username: 'seizuresafe',
    password: 'seizuresafe123',
    clientId: 'seizuresafe-web-' + Math.random().toString(16).substr(2, 8),
  },
  topic: 'seizuresafe/data'
};

const Dashboard: React.FC = () => {
  const [status, setStatus] = useState('Disconnected');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Connect to MQTT broker
    const client = mqtt.connect(MQTT_CONFIG.broker, MQTT_CONFIG.options);

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setStatus('Connected');
      
      client.subscribe(MQTT_CONFIG.topic, (err) => {
        if (err) {
          console.error('Subscription error:', err);
          setStatus('Subscription error');
        }
      });
    });

    client.on('message', (topic, message) => {
      console.log('Received:', message.toString());
      setMessage(message.toString());
    });

    client.on('error', (err) => {
      console.error('MQTT error:', err);
      setStatus('Error: ' + err.message);
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        SeizureSafe Dashboard
      </Typography>

      <Alert severity={status === 'Connected' ? 'success' : 'error'} sx={{ mb: 2 }}>
        Status: {status}
      </Alert>

      {message && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="h6">Last Message:</Typography>
          <Typography variant="body1">{message}</Typography>
        </Box>
      )}
    </Box>
  );
};

export default Dashboard; 