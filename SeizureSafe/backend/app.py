from flask import Flask, jsonify
from flask_cors import CORS
import paho.mqtt.client as mqtt
import ssl
import time
import logging
import json
from data_store import DataStore

# Set up logging
logging.basicConfig(level=logging.INFO,
                   format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Initialize data store
store = DataStore()

# MQTT settings
BROKER = "ed733e7d.ala.eu-central-1.emqxsl.com"
PORT = 8084
TOPIC = "seizureSafe/test"
USERNAME = "ellenmcintyre123"
PASSWORD = "Happy1234a!*"

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
    
    # Set up TLS
    client.tls_set(cert_reqs=ssl.CERT_NONE)
    client.tls_insecure_set(True)
    
    try:
        logger.info(f"Connecting to {BROKER}:{PORT}")
        client.connect(BROKER, PORT, 60)
        client.loop_start()
        return client
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