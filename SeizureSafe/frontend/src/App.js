import React, { useEffect, useState, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export function Dashboard({ connectionStatus, braceletData, historicalData }) {
  // Prepare chart data
  const chartData = {
    labels: historicalData.map(data => data.timestamp).reverse(),
    datasets: [
      {
        label: 'Heart Rate',
        data: historicalData.map(data => data.heart_rate).reverse(),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.4,
        pointRadius: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Heart Rate History'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        min: 50,
        max: 100,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    animation: {
      duration: 0 // Disable animations for smoother updates
    }
  };

  return (
    <div className="dashboard">
      <h1>SeizureSafe Dashboard</h1>
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
              {braceletData.seizure_detected ? 'SEIZURE DETECTED!' : 'No Seizure Detected'}
            </div>
            <div className="conditions">
              {braceletData.fall_detected && <div>Fall Detected</div>}
              {braceletData.heart_rate - braceletData.previous_heart_rate > 10 && 
                <div>Heart Rate Spike</div>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container" style={{ height: '400px', marginTop: '20px' }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}

function About() {
  return (
    <div className="about-page">
      <h1>About SeizureSafe</h1>
      <div className="about-content">
        <section className="research-section">
          <h2>Research on Seizures</h2>
          <p>
            Seizures are sudden, uncontrolled electrical disturbances in the brain that can cause changes in behavior, movements, feelings, and levels of consciousness. They are a common symptom of epilepsy, affecting approximately 50 million people worldwide.
          </p>
          <h3>Key Research Findings:</h3>
          <ul>
            <li>Heart rate typically increases by 10-20 BPM during a seizure</li>
            <li>Falls are a common occurrence during seizures, leading to potential injuries</li>
            <li>Early detection can significantly reduce the risk of injury</li>
            <li>Most seizures last between 30 seconds to 2 minutes</li>
          </ul>
        </section>

        <section className="technology-section">
          <h2>Our Technology</h2>
          <p>
            SeizureSafe uses advanced sensor technology to monitor vital signs and detect potential seizure events. Our system combines:
          </p>
          <ul>
            <li>Real-time heart rate monitoring</li>
            <li>Fall detection using accelerometer data</li>
            <li>Immediate alert system for caregivers</li>
          </ul>
        </section>

        <section className="safety-section">
          <h2>Safety Features</h2>
          <ul>
            <li>24/7 monitoring and alert system</li>
            <li>Historical data tracking for medical professionals</li>
            <li>Customizable alert thresholds</li>
            <li>Emergency contact notification system</li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function App() {
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
  const [lastSeizureTime, setLastSeizureTime] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [showAudioPrompt, setShowAudioPrompt] = useState(true);
  const audioRef = useRef(null);

  // Initialize historical data
  useEffect(() => {
    // Start with empty array, will be filled by MQTT data
    setHistoricalData([]);
  }, []);

  // MQTT message handling
  const handleMQTTMessage = useCallback((topic, message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('Received MQTT data:', data);
      
      // Update current data
      setBraceletData(data);
      
      // Update historical data
      setHistoricalData(prevData => {
        // Create new data point
        const newPoint = {
          timestamp: data.timestamp,
          heart_rate: Number(data.heart_rate), // Ensure it's a number
          fall_detected: data.fall_detected,
          seizure_detected: data.seizure_detected
        };

        // Add new point to the beginning of the array
        const updatedData = [newPoint, ...prevData];
        
        // Keep only the last 20 points
        const trimmedData = updatedData.slice(0, 20);
        
        console.log('New heart rate point:', newPoint.heart_rate);
        console.log('Updated historical data:', trimmedData);
        
        return trimmedData;
      });

      // Handle seizure detection
      if (data.seizure_detected) {
        console.log('Seizure detected!');
        setSeizureCount(prev => prev + 1);
        
        const currentTime = Date.now();
        if (currentTime - lastSeizureTime >= 30000) {
          console.log('Playing audio alert...');
          if (audioRef.current && audioReady) {
            audioRef.current.currentTime = 0;
            audioRef.current.play()
              .then(() => console.log('Audio played successfully'))
              .catch(error => {
                console.error('Audio play error:', error);
                if (error.name === 'NotAllowedError') {
                  setShowAudioPrompt(true);
                  setAudioReady(false);
                }
              });
          }
          setLastSeizureTime(currentTime);
        }
      }
    } catch (error) {
      console.error('Error handling MQTT message:', error);
    }
  }, [lastSeizureTime, audioReady]);

  // MQTT connection
  useEffect(() => {
    console.log('Setting up MQTT connection...');
    const client = mqtt.connect('wss://ed733e7d.ala.eu-central-1.emqxsl.com:8084/mqtt', {
      username: 'ellenmcintyre123',
      password: 'Happy1234a!*',
      clientId: 'frontend_' + Math.random().toString(16).substr(2, 8),
      clean: true
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('Connected');
      client.subscribe('seizureSafe/test', (err) => {
        if (err) {
          console.error('Subscribe error:', err);
        } else {
          console.log('Subscribed to seizureSafe/test');
        }
      });
    });

    client.on('message', handleMQTTMessage);

    client.on('error', (error) => {
      console.error('MQTT error:', error);
      setConnectionStatus('Error');
    });

    return () => {
      client.end();
    };
  }, [handleMQTTMessage]);

  // Initialize audio
  useEffect(() => {
    const audio = new Audio(process.env.PUBLIC_URL + '/sounds/seizure_alert.mp3');
    audio.preload = 'auto';
    audioRef.current = audio;
  }, []);

  // Handle user interaction to enable audio
  const handleEnableAudio = useCallback(async () => {
    try {
      if (audioRef.current) {
        // Try to play a short silent sound
        await audioRef.current.play();
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        setAudioReady(true);
        setShowAudioPrompt(false);
        console.log('Audio enabled successfully');
      }
    } catch (error) {
      console.error('Error enabling audio:', error);
      setShowAudioPrompt(true);
    }
  }, []);

  // Reset seizure count every 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      setSeizureCount(0);
    }, 24 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="App" data-testid="app-container">
        {showAudioPrompt && (
          <div className="audio-prompt" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div className="audio-prompt-content" style={{
              backgroundColor: 'white',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <h3>Enable Audio Alerts</h3>
              <p>Click the button below to enable audio alerts for seizure detection.</p>
              <button onClick={handleEnableAudio} style={{
                padding: '10px 20px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}>Enable Audio</button>
            </div>
          </div>
        )}
        <nav className="navbar">
          <div className="nav-brand">SeizureSafe</div>
          <div className="nav-links">
            <Link to="/">Dashboard</Link>
            <Link to="/about">About</Link>
          </div>
          <div className="seizure-counter">
            24h Seizures: {seizureCount}
          </div>
        </nav>

        <Routes>
          <Route path="/" element={
            <Dashboard 
              connectionStatus={connectionStatus}
              braceletData={braceletData}
              historicalData={historicalData}
            />
          } />
          <Route path="/about" element={<About />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
