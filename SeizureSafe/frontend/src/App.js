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

// MQTT config using env vars if available
const MQTT_BROKER = process.env.REACT_APP_MQTT_BROKER || 'ed733e7d.ala.eu-central-1.emqxsl.com';
const MQTT_PORT = process.env.REACT_APP_MQTT_PORT || '8084';
const MQTT_USERNAME = process.env.REACT_APP_MQTT_USERNAME || 'ellenmcintyre123';
const MQTT_PASSWORD = process.env.REACT_APP_MQTT_PASSWORD || 'Happy1234a!*';
const MQTT_TOPIC = process.env.REACT_APP_MQTT_TOPIC || 'seizureSafe/test';

export function Dashboard({ connectionStatus, braceletData, historicalData, onSaveGraph }) {
  // Prepare chart data (dots only, no line)
  const chartData = {
    labels: historicalData.map(data => data.timestamp).reverse(),
    datasets: [
      {
        label: 'Heart Rate (BPM)',
        data: historicalData.map(data => parseFloat(data.heart_rate)).reverse(),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgb(75, 192, 192)',
        showLine: false, // Only dots
        pointRadius: 5,
        pointHoverRadius: 7,
        fill: false,
        type: 'scatter',
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
        text: 'Heart Rate (Last 24 Hours)'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'Heart Rate (BPM)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Time'
        }
      }
    },
    animation: {
      duration: 0
    }
  };

  // Ref for saving the chart
  const chartRef = useRef();

  const handleSaveGraph = () => {
    if (chartRef.current) {
      const chartInstance = chartRef.current;
      const url = chartInstance.toBase64Image();
      const link = document.createElement('a');
      link.href = url;
      link.download = 'heart_rate_graph.png';
      link.click();
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
        <Line ref={chartRef} data={chartData} options={chartOptions} />
        <button onClick={handleSaveGraph} style={{marginTop: '10px'}}>Save Graph as Image</button>
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

  // Initialize audio with better error handling
  useEffect(() => {
    try {
      const audio = new Audio('/sounds/seizure_alert.mp3');
      audio.preload = 'auto';

      // Add event listeners for better error handling
      audio.addEventListener('canplaythrough', () => {
        console.log('Audio file loaded successfully');
        setAudioReady(true);
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio loading error:', e);
        console.error('Audio error details:', audio.error);
      });

      audioRef.current = audio;
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }, []);

  // MQTT connection
  useEffect(() => {
    console.log('Connecting to MQTT broker:', MQTT_BROKER, MQTT_PORT);
    const client = mqtt.connect(`wss://${MQTT_BROKER}:${MQTT_PORT}/mqtt`, {
      clientId: 'frontend_' + Math.random().toString(16).substr(2, 8),
      username: MQTT_USERNAME,
      password: MQTT_PASSWORD,
      clean: true,
      rejectUnauthorized: false,
      reconnectPeriod: 2000,
    });

    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      setConnectionStatus('Connected');
      client.subscribe(MQTT_TOPIC, (err) => {
        if (err) {
          console.error('Subscribe error:', err);
        } else {
          console.log('Successfully subscribed to topic:', MQTT_TOPIC);
        }
      });
    });

    client.on('message', (topic, message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received data:', data);
        setBraceletData(data);
        setHistoricalData(prev => {
          const now = new Date();
          const newData = [...prev, data].filter(d => {
            // Parse timestamp as today if not present
            const t = d.timestamp ? new Date(now.toDateString() + ' ' + d.timestamp) : now;
            return now - t <= 24 * 60 * 60 * 1000;
          });
          return newData;
        });
        // Update seizure count
        if (data.seizure_detected) {
          setSeizureCount(prev => prev + 1);
        }
        // Play audio alert if seizure is detected
        if (data.seizure_detected) {
          const currentTime = Date.now();
          if (currentTime - lastSeizureTime >= 15000) {
            if (audioRef.current && audioReady) {
              try {
                audioRef.current.currentTime = 0;
                audioRef.current.play()
                  .then(() => {
                    setLastSeizureTime(currentTime);
                  })
                  .catch(error => {
                    console.error('Error playing audio:', error);
                  });
              } catch (error) {
                console.error('Error with audio playback:', error);
              }
            } else {
              console.error('Audio not ready:', {
                audioRef: !!audioRef.current,
                audioReady: audioReady
              });
            }
          }
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });

    client.on('error', (err) => {
      console.error('MQTT Error:', err);
      setConnectionStatus('Error');
    });

    client.on('close', () => {
      console.log('MQTT Connection closed');
      setConnectionStatus('Disconnected');
    });

    return () => {
      console.log('Cleaning up MQTT connection...');
      client.end();
    };
  }, [lastSeizureTime, audioReady]);

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
