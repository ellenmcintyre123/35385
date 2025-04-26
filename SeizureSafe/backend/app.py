from flask import Flask, jsonify
from flask_cors import CORS
import paho.mqtt.client as mqtt
import ssl
import time
import logging
import json
from data_store import DataStore
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Set up logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize data store
store = DataStore()

# MQTT settings from environment variables
BROKER = os.getenv('MQTT_BROKER')
PORT = int(os.getenv('MQTT_PORT', 8084))
TOPIC = os.getenv('MQTT_TOPIC')
USERNAME = os.getenv('MQTT_USERNAME')
PASSWORD = os.getenv('MQTT_PASSWORD')

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info("Connected successfully to MQTT broker")
        client.subscribe(TOPIC)
    else:
        logger.error(f"Connection failed with code {rc}")

def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        logger.info(f"Received data: {data}")
        store.save_data(data)
    except Exception as e:
        logger.error(f"Error processing message: {e}")

def setup_mqtt():
    client = mqtt.Client(transport="websockets")
    client.on_connect = on_connect
    client.on_message = on_message
    
    # Set credentials
    client.username_pw_set(USERNAME, PASSWORD)
    
    # Set up secure TLS configuration
    try:
        logger.info("Configuring TLS security...")
        client.tls_set(
            cert_reqs=ssl.CERT_REQUIRED,  # Require certificate verification
            tls_version=ssl.PROTOCOL_TLS,  # Use latest TLS protocol
            ciphers='ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384'  # Specify secure cipher suite
        )
        client.tls_insecure_set(False)  # Enforce secure connections
        
        logger.info("TLS security configured successfully")
        logger.info(f"Attempting to connect to broker {BROKER}:{PORT}")
        
        
        client.enable_logger(logger)
        
        # Connect with 30 second keepalive
        client.connect(BROKER, PORT, keepalive=30)
        client.loop_start()
        
        # Wait connection
        time.sleep(2)
        if not client.is_connected():
            logger.error("Failed to establish connection within timeout")
            return None
            
        logger.info("Successfully connected and started MQTT loop")
        return client
        
    except ssl.SSLError as ssl_err:
        logger.error(f"SSL/TLS configuration error: {ssl_err}")
        return None
    except Exception as e:
        logger.error(f"Failed to connect to MQTT broker: {e}")
        return None

# API endpoints
@app.route('/api/history/<int:hours>', methods=['GET'])
def get_history(hours):
    try:
        data = store.get_historical_data(hours)
        return jsonify(data)
    except Exception as e:
        logger.error(f"Error getting historical data: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    mqtt_client = setup_mqtt()
    if mqtt_client:
        app.run(host='0.0.0.0', port=5000, debug=True)
    else:
        logger.error("Failed to start application due to MQTT connection failure") 