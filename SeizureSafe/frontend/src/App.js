import React, { useEffect, useState } from 'react';
import mqtt from 'mqtt';

function App() {
  const [heartRate, setHeartRate] = useState(null);
  const [fallDetected, setFallDetected] = useState(false);

  useEffect(() => {
    // Connect to the MQTT broker
    const client = mqtt.connect('ws://broker.emqx.io'); 
    // On connect, subscribe to the topics
    client.on('connect', () => {
      console.log('Connected to MQTT broker');
      client.subscribe('seizureSafe/heartRate');  
      client.subscribe('seizureSafe/fallDetected'); 
    });

    // Listen for heart rate data
    client.on('message', (topic, message) => {
      if (topic === 'seizureSafe/heartRate') {
        // Parse the heart rate message and update state
        setHeartRate(Number(message.toString()));
      } else if (topic === 'seizureSafe/fallDetected') {
        // Parse the fall detection message and update state
        setFallDetected(message.toString() === 'true');
      }
    });

    
    return () => {
      client.end();
    };
  }, []);

  return (
    <div className="App">
      <h1>SeizureSafe Bracelet Dashboard</h1>
      
      {/* Display heart rate */}
      <div>
        <h2>Heart Rate:</h2>
        <p>{heartRate ? `${heartRate} bpm` : 'Waiting for heart rate data...'}</p>
      </div>

      {/* Display fall detection status */}
      <div>
        <h2>Fall Detection:</h2>
        <p>{fallDetected ? 'Fall detected!' : 'No fall detected'}</p>
      </div>
    </div>
  );
}

export default App;
