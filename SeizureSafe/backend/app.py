import paho.mqtt.client as mqtt
import ssl
import time
import logging
import json
import random

# Set up logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MQTT settings
BROKER = "ed733e7d.ala.eu-central-1.emqxsl.com"
PORT = 8084  # Changed to WebSocket SSL port
TOPIC = "seizureSafe/test"
USERNAME = "ellenmcintyre123"
PASSWORD = "Happy1234a!*"

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected successfully to MQTT broker")
        client.publish(TOPIC, "Backend connected!")
    else:
        rc_codes = {
            1: "Incorrect protocol version",
            2: "Invalid client identifier",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorized"
        }
        logger.error(f"Connection failed: {rc_codes.get(rc, 'Unknown error')} (code {rc})")

def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning(f"Unexpected disconnection (code {rc})")

def main():
    client = mqtt.Client(client_id=f"backend_{int(time.time())}", 
                        transport="websockets")
    
    # Set credentials
    client.username_pw_set(USERNAME, PASSWORD)
    
    # Set up TLS
    client.tls_set(cert_reqs=ssl.CERT_NONE)
    client.tls_insecure_set(True)
    
    # Add disconnect callback
    client.on_disconnect = on_disconnect
    client.on_connect = on_connect
    
    try:
        logger.info(f"Attempting to connect to {BROKER}:{PORT}")
        client.connect(BROKER, PORT, keepalive=60)
        client.loop_start()
        
        # Wait for connection
        time.sleep(2)
        
        # Initialize heart rate
        heart_rate = 75
        seizure_counter = 0
        
        while True:
            # Simulate heart rate changes
            heart_rate += random.randint(-2, 2)
            heart_rate = max(60, min(100, heart_rate))  # Keep between 60-100
            
            # Every 10 seconds, simulate a seizure
            seizure_detected = (seizure_counter % 10) == 0
            fall_detected = seizure_detected and random.random() < 0.3  # 30% chance of fall during seizure
            
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
                logger.info(f"Published: {message}")
            else:
                logger.error(f"Failed to publish message (code {result.rc})")
            
            seizure_counter += 1
            time.sleep(1)  # Send update every second
            
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