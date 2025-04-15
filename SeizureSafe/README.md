# SeizureSafe

SeizureSafe is a smart bracelet system designed to detect seizures and provide immediate alerts. The system consists of a wearable device and a web dashboard for monitoring.

## Features

- Real-time heart rate monitoring
- Fall detection
- Immediate audio alerts
- Web dashboard with live data visualization
- Historical data tracking

## Project Structure

```
SeizureSafe/
├── backend/           # Python backend with MQTT integration
├── frontend/          # React frontend dashboard
└── README.md
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install required Python packages:
   ```bash
   pip install paho-mqtt pyttsx3
   ```

3. Run the mock bracelet:
   ```bash
   python mock_bracelet.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## Technologies Used

- **Backend**: Python, MQTT
- **Frontend**: React, TypeScript, Material-UI, Recharts
- **Communication**: MQTT Protocol

## Contributing

Feel free to submit issues and enhancement requests.

## License

This project is licensed under the MIT License. 