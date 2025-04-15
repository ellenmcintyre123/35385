import paho.mqtt.client as mqtt
import time
import random
import json
import pyttsx3 #this for for the text to speech for the alert
import logging
import ssl

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MQTT Configuration
MQTT_BROKER = "ed733e7d.ala.eu-central-1.emqxsl.com"
MQTT_PORT = 8883  # TLS/SSL port
MQTT_TOPIC = "seizuresafe/data"
MQTT_USERNAME = "seizuresafe"
MQTT_PASSWORD = "seizuresafe123"

def on_connect(client, userdata, flags, reason_code, properties=None):
    if reason_code == 0:
        logger.info("Connected to MQTT Broker!")
        logger.info(f"Client ID: {client._client_id}")
        logger.info(f"Publishing to topic: {MQTT_TOPIC}")
    else:
        error_messages = {
            1: "Incorrect protocol version",
            2: "Invalid client identifier",
            3: "Server unavailable",
            4: "Bad username or password",
            5: "Not authorized"
        }
        logger.error(f"Failed to connect: {error_messages.get(reason_code, f'Unknown error code {reason_code}')}")

def on_publish(client, userdata, mid):
    logger.info(f"Message {mid} published successfully")

def on_disconnect(client, userdata, reason_code, properties=None):
    if reason_code != 0:
        logger.warning(f"Unexpected disconnection with code {reason_code}. Attempting to reconnect...")
    else:
        logger.info("Disconnected successfully")

# Generate a unique client ID
client_id = f"SeizureSafeBracelet-{random.randint(1000, 9999)}"
logger.info(f"Generated client ID: {client_id}")

# Set up MQTT client
client = mqtt.Client(client_id=client_id, protocol=mqtt.MQTTv5)
client.on_connect = on_connect
client.on_publish = on_publish
client.on_disconnect = on_disconnect

# Set username and password
client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

# Enable SSL/TLS
client.tls_set(certfile=None,
               keyfile=None,
               cert_reqs=ssl.CERT_NONE,
               tls_version=ssl.PROTOCOL_TLS,
               ciphers=None)

# Don't verify the server's hostname
client.tls_insecure_set(True)

try:
    logger.info(f"Connecting to MQTT broker at {MQTT_BROKER}...")
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start()
except Exception as e:
    logger.error(f"Failed to connect to MQTT broker: {e}")
    logger.exception("Detailed error:")
    exit(1)

def generate_mock_data():
    data = {
        "heart_rate": random.randint(60, 120),
        "fall_detected": random.choice([True, False, False, False]),
        "client_id": client_id,
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    logger.info(f"Generated mock data: {data}")
    return data

def alert_fall():
    """ Simulate a speaker alert if fall is detected """
    try:
        engine = pyttsx3.init()
        engine.say("Seizure alert, please make sure i have not hit my head")
        engine.runAndWait()
        engine.stop()
        logger.info("Fall alert played")
    except Exception as e:
        logger.error(f"Failed to play alert: {e}")

try:
    logger.info("Starting main loop...")
    message_count = 0
    while True:
        data = generate_mock_data()
        try:
            message = json.dumps(data)
            result = client.publish(MQTT_TOPIC, message, qos=1)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                message_count += 1
                logger.info(f"Successfully published message #{message_count}: {message}")
            else:
                logger.error(f"Failed to publish data: {result.rc}")
                # Try to reconnect
                try:
                    client.reconnect()
                except Exception as e:
                    logger.error(f"Failed to reconnect: {e}")
        except Exception as e:
            logger.error(f"Error publishing data: {e}")
            logger.exception("Detailed error:")
            # Try to reconnect
            try:
                client.reconnect()
            except Exception as e:
                logger.error(f"Failed to reconnect: {e}")

        if data["fall_detected"]:
            alert_fall()

        time.sleep(5)  # Send data every 5 seconds

except KeyboardInterrupt:
    logger.info("\nProgram stopped by user. Exiting gracefully...")
    client.loop_stop()
    client.disconnect()
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    logger.exception("Detailed error:")
    client.loop_stop()
    client.disconnect()
