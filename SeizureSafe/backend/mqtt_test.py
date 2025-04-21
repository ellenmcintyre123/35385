import paho.mqtt.client as mqtt
import ssl
import time
import json
import random
import logging

# Set up logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MQTT settings
BROKER = "ed733e7d.ala.eu-central-1.emqxsl.com"
PORT = 8084
TOPIC = "seizureSafe/test"
USERNAME = "ellenmcintyre123"
PASSWORD = ""

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
        client.connect(BROKER, PORT, 60)
        client.loop_start()
        
        heart_rate = 65
        last_seizure_time = 0
        
        while True:
            current_time = time.time()
            if current_time - last_seizure_time >= 20:
                heart_rate = random.randint(85, 95)
                seizure_detected = True
                fall_detected = random.random() < 0.3
                last_seizure_time = current_time
                logger.warning(f"SEIZURE DETECTED! Heart Rate: {heart_rate}")
            else:
                heart_rate += random.randint(-2, 2)
                heart_rate = max(60, min(70, heart_rate))
                seizure_detected = False
                fall_detected = False
            
            data = {
                "heart_rate": heart_rate,
                "previous_heart_rate": heart_rate - random.randint(-2, 2),
                "seizure_detected": seizure_detected,
                "fall_detected": fall_detected,
                "timestamp": time.strftime("%H:%M:%S")
            }
            
            message = json.dumps(data)
            client.publish(TOPIC, message, qos=1)
            time.sleep(3)
            
    except KeyboardInterrupt:
        logger.info("Shutting down...")
    except Exception as e:
        logger.error(f"Error: {str(e)}")
    finally:
        client.loop_stop()
        client.disconnect()

if __name__ == "__main__":
    main() 
