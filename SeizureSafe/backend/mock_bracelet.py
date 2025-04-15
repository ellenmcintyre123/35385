import paho.mqtt.client as mqtt
import time
import random
import json
import pyttsx3 #this for for the text to speech for the alert

MQTT_BROKER = "broker.hivemq.com"  # Public MQTT Broker
MQTT_TOPIC = "seizuresafe/data"

client = mqtt.Client(client_id="SeizureSafeBracelet", protocol=mqtt.MQTTv311)
client.connect(MQTT_BROKER, 1883, 60)

def generate_mock_data():
    return {
        "heart_rate": random.randint(60, 120),
        "fall_detected": random.choice([True, False, False, False]) 
    }

def alert_fall():
    """ Simulate a speaker alert if fall is detected """
    engine = pyttsx3.init()
    engine.say("Seizure alert, please make sure i have not hit my head")
    engine.runAndWait()
    engine.stop() 

try:
    while True:
        data = generate_mock_data()
        client.publish(MQTT_TOPIC, json.dumps(data))
        print(f"Sent data: {data}")

        if data["fall_detected"]:
            alert_fall()

        time.sleep(5)  # Send data every 5 seconds

except KeyboardInterrupt:
    print("\nProgram stopped by user. Exiting gracefully...")
    client.disconnect()  # Disconnect from MQTT broker
