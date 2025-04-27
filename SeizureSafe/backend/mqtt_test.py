import paho.mqtt.client as mqtt
import ssl
import time
import json
import random
import logging
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MQTT settings from environment variables
BROKER = os.getenv('MQTT_BROKER')
PORT = int(os.getenv('MQTT_PORT', 8084))
TOPIC = os.getenv('MQTT_TOPIC')
USERNAME = os.getenv('MQTT_USERNAME')
PASSWORD = os.getenv('MQTT_PASSWORD')

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected to MQTT broker")
    else:
        logger.error(f"Connection failed: {rc}")

def main():
    client = mqtt.Client(transport="websockets")
    client.on_connect = on_connect
    
    client.username_pw_set(USERNAME, PASSWORD)
    client.tls_set(cert_reqs=ssl.CERT_NONE)
    client.tls_insecure_set(True)

    try:
        logger.info(f"Attempting to connect to {BROKER}:{PORT}")
        client.connect(BROKER, PORT, 60)
        client.loop_start()

        # Initialize simulated data
        heart_rate = 65
        last_seizure_time = 0

        while True:
            current_time = time.time()
            
            # Force a seizure every 20 seconds
            if current_time - last_seizure_time >= 20:
                heart_rate = random.randint(85, 95)
                seizure_detected = True
                fall_detected = random.random() < 0.3
                last_seizure_time = current_time
                logger.warning(f"SEIZURE DETECTED! Heart Rate: {heart_rate}")
            else:
                # Normal heart rate simulation around 65 BPM
                heart_rate += random.randint(-2, 2)
                heart_rate = max(60, min(70, heart_rate))
                seizure_detected = False
                fall_detected = False

            # Create data packet
            data = {
                "heart_rate": heart_rate,
                "previous_heart_rate": heart_rate - random.randint(-2, 2),
                "seizure_detected": seizure_detected,
                "fall_detected": fall_detected,
                "timestamp": time.strftime("%H:%M:%S")
            }

            # Publish data
            client.publish(TOPIC, json.dumps(data), qos=1)
            logger.info(f"Published: {data}")
            
            time.sleep(3)

    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        client.loop_stop()
        client.disconnect()
        logger.info("Disconnected from broker")

if __name__ == "__main__":
    main() 