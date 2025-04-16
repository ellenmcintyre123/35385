import paho.mqtt.client as mqtt
import ssl
import time
import logging
import random
import json
from data_store import DataStore

# Set up logging
logging.basicConfig(level=logging.DEBUG,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MQTT Configuration
BROKER = "ed733e7d.ala.eu-central-1.emqxsl.com"
PORT = 8084
CLIENT_ID = "seizureSafe_backend_test"
USERNAME = "ellenmcintyre123"
PASSWORD = "Happy1234a!*"

# Initialize data store
data_store = DataStore()

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Successfully connected to MQTT broker")
    else:
        logger.error(f"Connection failed with code {rc}")

def main():
    client = mqtt.Client(CLIENT_ID, transport="websockets")
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set(cert_reqs=ssl.CERT_NONE)
    client.tls_insecure_set(True)
    client.on_connect = on_connect
    
    try:
        logger.info(f"Attempting to connect to {BROKER}:{PORT}")
        client.connect(BROKER, PORT, keepalive=60)
        client.loop_start()
        
        # Initialize simulated data
        heart_rate = 65  # Start at average heart rate
        previous_heart_rate = heart_rate
        fall_detected = False
        last_seizure_time = time.time()
        
        while True:
            current_time = time.time()
            
            # Force a seizure every 10 seconds
            if current_time - last_seizure_time >= 10:
                # Simulate seizure: sudden heart rate increase and fall
                heart_rate = 85  # 20 BPM above average
                fall_detected = True
                logger.warning("⚠️ TEST SEIZURE TRIGGERED!")
                last_seizure_time = current_time
            else:
                # Normal heart rate simulation around 65 BPM
                # Only allow very small variations
                heart_rate = 65 + random.uniform(-2, 2)
                # Strictly enforce the range
                heart_rate = max(60, min(70, heart_rate))
                fall_detected = False  # No falls except during seizures
            
            # Detect seizure conditions
            heart_rate_spike = heart_rate > 75  # More than 10 BPM above average
            seizure_detected = heart_rate_spike and fall_detected
            
            # Create data packet
            data = {
                "heart_rate": round(heart_rate, 1),
                "previous_heart_rate": round(previous_heart_rate, 1),
                "fall_detected": fall_detected,
                "seizure_detected": seizure_detected,
                "timestamp": time.strftime("%H:%M:%S")
            }
            
            # Store current heart rate for next comparison
            previous_heart_rate = heart_rate
            
            # Save data to database
            data_store.save_data(data)
            
            # Publish data
            client.publish("seizureSafe/data", json.dumps(data), qos=1)
            logger.info(f"Published: {data}")
            
            # Log seizure detection
            if seizure_detected:
                logger.warning("⚠️ SEIZURE DETECTED! Heart rate spike and fall detected!")
            
            time.sleep(2)
            
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    finally:
        client.loop_stop()
        client.disconnect()
        logger.info("Disconnected from broker")

if __name__ == "__main__":
    main() 