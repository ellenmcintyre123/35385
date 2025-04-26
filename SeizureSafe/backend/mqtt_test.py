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
        logger.info("Connected successfully to MQTT broker")
    else:
        logger.error(f"Connection failed with code {rc}")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.error(f"Unexpected disconnection: {rc}")

def on_log(client, userdata, level, buf):
    logger.debug(f"MQTT Log: {buf}")

def main():
    client = mqtt.Client(transport="websockets")
    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.on_log = on_log
    
    # Set credentials
    client.username_pw_set(USERNAME, PASSWORD)
    
    # Set up TLS
    client.tls_set(
        cert_reqs=ssl.CERT_REQUIRED,  # Require certificate verification
        tls_version=ssl.PROTOCOL_TLS,  # Use latest TLS protocol
        ciphers='ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384'  # Specify secure cipher suite
    )
    client.tls_insecure_set(False)  # Enforce secure connections
    
    try:
        logger.info(f"Connecting to {BROKER}:{PORT}")
        client.connect(BROKER, PORT, 60)
        client.loop_start()
        
        # Initialize heart rate
        heart_rate = 65  # Start at normal range
        last_seizure_time = 0
        seizure_in_progress = False
        
        while True:
            current_time = time.time()
            
            # Trigger seizure exactly every 20 seconds
            if current_time - last_seizure_time >= 20 and not seizure_in_progress:
                heart_rate = random.randint(85, 95)  # Spike above 85
                seizure_detected = True
                fall_detected = random.random() < 0.3  # 30% chance of fall during seizure
                last_seizure_time = current_time
                seizure_in_progress = True
                logger.warning(f"SEIZURE DETECTED! Heart Rate: {heart_rate}")
            else:
                # Normal heart rate simulation between 60-70
                heart_rate += random.randint(-2, 2)
                heart_rate = max(60, min(70, heart_rate))  # Keep between 60-70
                seizure_detected = False
                fall_detected = False
                seizure_in_progress = False
            
            # Create data packet
            data = {
                "heart_rate": heart_rate,
                "previous_heart_rate": heart_rate - random.randint(-2, 2),
                "seizure_detected": seizure_detected,
                "fall_detected": fall_detected,
                "timestamp": time.strftime("%H:%M:%S")
            }
            
            # Convert to JSON and publish
            message = json.dumps(data)
            result = client.publish(TOPIC, message, qos=1)
            
            if result.rc == 0:
                if not seizure_detected:
                    logger.info(f"Published: {message}")
            else:
                logger.error(f"Failed to publish message (code {result.rc})")
            
            # Sleep for 3 seconds
            time.sleep(3)
            
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Error occurred: {str(e)}")
        raise
    finally:
        client.loop_stop()
        client.disconnect()
        logger.info("Disconnected from broker")

if __name__ == "__main__":
    main() 