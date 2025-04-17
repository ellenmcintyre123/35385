import React, { useEffect, useState, useRef } from 'react';
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

function Dashboard({ connectionStatus, braceletData, historicalData }) {
  // Prepare chart data
  const chartData = {
    labels: historicalData.map(data => data.timestamp),
    datasets: [
      {
        label: 'Heart Rate',
        data: historicalData.map(data => data.heart_rate),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Heart Rate History (Last 24 Hours)'
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        title: {
          display: true,
          text: 'BPM'
        }
      }
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
              {braceletData.fall_detected && <div> Fall Detected</div>}
              {braceletData.heart_rate - braceletData.previous_heart_rate > 10 && 
                <div> Heart Rate Spike</div>
              }
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
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
            <li>Machine learning algorithms for pattern recognition</li>
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
    battery: 100,
    timestamp: '--:--:--'
  });
  const [historicalData, setHistoricalData] = useState([]);
  const [seizureCount, setSeizureCount] = useState(0);
  
  const [audioLoaded, setAudioLoaded] = useState(false);
  const audioRef = useRef(null);
  const [lastSeizureTime, setLastSeizureTime] = useState(0);

  // Fetch historical data
  useEffect(() => {
    const fetchHistoricalData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/history/24');
        const data = await response.json();
        setHistoricalData(data);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      }
    };

    fetchHistoricalData();
    const interval = setInterval(fetchHistoricalData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Initialize audio with better error handling
  useEffect(() => {
    try {
      const audio = new Audio();
      audio.src = process.env.PUBLIC_URL + '/sounds/seizure_alert.mp3';
      audio.preload = 'auto';
      
      // Add event listeners for better error handling
      audio.addEventListener('canplaythrough', () => {
        console.log('Audio file loaded successfully');
        setAudioLoaded(true);
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

  useEffect(() => {
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
        
        // Update seizure count
        if (data.seizure_detected) {
          setSeizureCount(prev => prev + 1);
        }
        
        // Play audio alert if seizure is detected
        if (data.seizure_detected) {
          const currentTime = Date.now();
          if (currentTime - lastSeizureTime >= 8000) { // Prevent multiple plays within 8 seconds
            console.log('Seizure detected! Attempting to play audio...');
            if (audioRef.current && audioLoaded) {
              try {
                // Reset audio to start
                audioRef.current.currentTime = 0;
                // Log the audio file status
                console.log('Audio file status:', {
                  src: audioRef.current.src,
                  readyState: audioRef.current.readyState,
                  paused: audioRef.current.paused,
                  error: audioRef.current.error
                });
                
                const playPromise = audioRef.current.play();
                if (playPromise !== undefined) {
                  playPromise
                    .then(() => {
                      console.log('Audio played successfully');
                      setLastSeizureTime(currentTime);
                    })
                    .catch(error => {
                      console.error('Detailed audio play error:', error);
                      // Try playing without resetting time as fallback
                      audioRef.current.play()
                        .then(() => {
                          console.log('Audio played successfully on fallback');
                          setLastSeizureTime(currentTime);
                        })
                        .catch(error => console.error('Audio fallback failed:', error));
                    });
                }
              } catch (error) {
                console.error('Error attempting to play audio:', error);
              }
            } else {
              console.error('Audio not ready:', {
                audioRef: !!audioRef.current,
                audioLoaded: audioLoaded
              });
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

    return () => {
      client.end();
    };
  }, [lastSeizureTime, audioLoaded]);

  // Reset seizure count every 24 hours
  useEffect(() => {
    const interval = setInterval(() => {
      setSeizureCount(0);
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    return () => clearInterval(interval);
  }, []);

  return (
    <Router>
      <div className="App">
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
