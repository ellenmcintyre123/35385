import unittest
import json
from app import app
from data_store import DataStore
import os

class TestBackend(unittest.TestCase):
    """Test suite for the backend functionality."""
    
    def setUp(self):
        """Set up test environment before each test."""
        # Use a separate test database to avoid affecting production data
        self.test_db = 'test_seizure_data.db'
        self.store = DataStore(self.test_db)
        
        # Configure Flask app for testing
        app.config['TESTING'] = True
        self.client = app.test_client()

    def tearDown(self):
        """Clean up after each test."""
        # Close the database connection
        if hasattr(self.store, 'conn'):
            self.store.conn.close()
        
        # Remove test database file
        if os.path.exists(self.test_db):
            try:
                os.remove(self.test_db)
            except PermissionError:
                # If we can't remove it now, it will be cleaned up in the next test run
                pass

    def test_save_and_retrieve_data(self):
        """Test that we can save data and retrieve it correctly."""
        # Create sample seizure data
        test_data = {
            "heart_rate": 85.0,
            "previous_heart_rate": 75.0,
            "fall_detected": True,
            "seizure_detected": True
        }
        
        # Save the data
        self.store.save_data(test_data)
        
        # Retrieve the last hour of data
        data = self.store.get_historical_data(1)
        
        # Verify the data was saved and retrieved correctly
        self.assertEqual(len(data), 1, "Should have one data point")
        self.assertEqual(data[0]['heart_rate'], 85.0, "Heart rate should match")
        self.assertTrue(data[0]['fall_detected'], "Fall should be detected")
        self.assertTrue(data[0]['seizure_detected'], "Seizure should be detected")

    def test_api_endpoint(self):
        """Test that the history API endpoint works correctly."""
        # Make a request to the history endpoint
        response = self.client.get('/api/history/1')
        
        # Check response status
        self.assertEqual(response.status_code, 200, "API should return 200 OK")
        
        # Parse and verify response data
        data = json.loads(response.data)
        self.assertIsInstance(data, list, "Response should be a list")

    def test_invalid_data_handling(self):
        """Test that invalid data is handled gracefully."""
        # Create invalid test data
        invalid_data = {
            "heart_rate": "invalid",  # Should be a number
            "fall_detected": "yes"    # Should be boolean
        }
        
        # Verify that saving invalid data raises an exception
        with self.assertRaises(Exception):
            self.store.save_data(invalid_data)

if __name__ == '__main__':
    unittest.main() 