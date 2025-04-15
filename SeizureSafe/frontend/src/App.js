import React, { useEffect, useState, useRef } from 'react';
import mqtt from 'mqtt';
import './App.css';

function App() {
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');
  const [braceletData, setBraceletData] = useState({
    heart_rate: '--',
    previous_heart_rate: '--',
    fall_detected: false,
    seizure_detected: false,
    battery: 100,
    timestamp: '--:--:--'
  });
  
  const audioRef = useRef(null);

  useEffect(() => {
    // Create audio element for alerts
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current = audio;
    
    // MQTT connection options
    const options = {
      protocol: 'wss',
      clientId: 'frontend_' + Math.random().toString(16).substr(2, 8),
      username: 'ellenmcintyre123',
      password: 'Happy1234a!*',
      clean: true,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
      connectTimeout: 5000
    };

    console.log('Connecting to MQTT broker...');
    const client = mqtt.connect('wss://ed733e7d.ala.eu-central-1.emqxsl.com:8084/mqtt', options);

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('Connected');
      client.subscribe('seizureSafe/data', (err) => {
        if (err) {
          console.error('Subscribe error:', err);
        } else {
          console.log('Successfully subscribed to data topic');
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received data:', data);
        setBraceletData(data);
        
        // Play audio alert if seizure is detected
        if (data.seizure_detected && audioRef.current) {
          audioRef.current.play().catch(e => console.error('Error playing audio:', e));
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

    return () => {
      client.end();
    };
  }, []);

  return (
    <div className="App">
      <div className="dashboard">
        <h1>SeizureSafe</h1>
        <div className={`status-badge ${connectionStatus.toLowerCase()}`}>
          {connectionStatus}
        </div>

        <div className="grid-container">
          <div className="card heart-rate">
            <div className="card-header">
              <h3>Heart Rate</h3>
              <span className="timestamp">{braceletData.timestamp}</span>
            </div>
            <div className="card-content">
              <div className="value">{braceletData.heart_rate}</div>
              <div className="unit">BPM</div>
              <div className="heart-rate-change">
                {braceletData.heart_rate !== '--' && braceletData.previous_heart_rate !== '--' && (
                  <span className={braceletData.heart_rate - braceletData.previous_heart_rate > 10 ? 'warning' : ''}>
                    Change: {(braceletData.heart_rate - braceletData.previous_heart_rate).toFixed(1)} BPM
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className={`card seizure-status ${braceletData.seizure_detected ? 'emergency' : ''}`}>
            <div className="card-header">
              <h3>Seizure Detection</h3>
            </div>
            <div className="card-content">
              <div className="status-text">
                {braceletData.seizure_detected ? '🚨 SEIZURE DETECTED!' : 'No Seizure Detected'}
              </div>
              <div className="conditions">
                {braceletData.fall_detected && <div>⚠️ Fall Detected</div>}
                {braceletData.heart_rate - braceletData.previous_heart_rate > 10 && 
                  <div>⚠️ Heart Rate Spike</div>
                }
              </div>
            </div>
          </div>

          <div className="card battery">
            <div className="card-header">
              <h3>Battery Level</h3>
            </div>
            <div className="card-content">
              <div className="battery-indicator">
                <div 
                  className="battery-level" 
                  style={{width: `${braceletData.battery}%`}}
                ></div>
              </div>
              <div className="battery-text">{braceletData.battery}%</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
