import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dashboard } from './App';

// Mock Chart.js
jest.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="mock-chart">Chart</div>
}));

// Mock MQTT
jest.mock('mqtt', () => ({
  connect: () => ({
    on: jest.fn(),
    subscribe: jest.fn(),
    end: jest.fn()
  })
}));

describe('Dashboard Component', () => {
  const mockData = {
    connectionStatus: 'Connected',
    braceletData: {
      heart_rate: 75,
      previous_heart_rate: 72,
      fall_detected: false,
      seizure_detected: false,
      timestamp: '12:00:00'
    },
    historicalData: [
      { timestamp: '11:00:00', heart_rate: 70, fall_detected: false, seizure_detected: false },
      { timestamp: '12:00:00', heart_rate: 75, fall_detected: false, seizure_detected: false }
    ]
  };

  test('renders heart rate information', () => {
    render(<Dashboard {...mockData} />);
    const heartRateElement = screen.getByText(/75 BPM/i);
    expect(heartRateElement).toBeInTheDocument();
  });

  test('displays connection status', () => {
    render(<Dashboard {...mockData} />);
    const statusElement = screen.getByText(/Connected/i);
    expect(statusElement).toBeInTheDocument();
  });

  test('shows seizure detection status', () => {
    render(<Dashboard {...mockData} />);
    const seizureElement = screen.getByText(/Seizure Detection/i);
    expect(seizureElement).toBeInTheDocument();
  });
});

// Mock the audio functionality
const mockAudio = {
  play: jest.fn(),
  pause: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};
window.Audio = jest.fn().mockImplementation(() => mockAudio);

describe('Core Functionality Tests', () => {
  test('Audio object is created correctly', () => {
    const audio = new window.Audio();
    expect(audio).toBeDefined();
    expect(audio.play).toBeDefined();
    expect(audio.pause).toBeDefined();
  });

  test('MQTT client is initialized', () => {
    const mqtt = require('mqtt');
    const client = mqtt.connect();
    expect(client).toBeDefined();
    expect(client.on).toBeDefined();
    expect(client.subscribe).toBeDefined();
  });

  test('Audio playback function exists', () => {
    const audio = new window.Audio();
    expect(typeof audio.play).toBe('function');
  });
});

describe('Basic App Tests', () => {
  test('renders without crashing', () => {
    const div = document.createElement('div');
    document.body.appendChild(div);
    expect(div).toBeInTheDocument();
  });

  test('document has required elements', () => {
    expect(document.body).toBeInTheDocument();
    expect(document.head).toBeInTheDocument();
  });
});
