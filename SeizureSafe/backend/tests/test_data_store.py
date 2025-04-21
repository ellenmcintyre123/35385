import unittest
import os
from data_store import DataStore

class TestDataStore(unittest.TestCase):
    """Test suite for the data store functionality."""
    
    def setUp(self):
        """Set up test environment before each test."""
        # Use a separate test database to avoid affecting production data
        self.test_db = 'test_seizure_data.db'
        self.store = DataStore(self.test_db)

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

    def test_data_cleanup(self):
        """Test that old data is properly cleaned up."""
        # Create sample data
        test_data = {
            "heart_rate": 85.0,
            "previous_heart_rate": 75.0,
            "fall_detected": True,
            "seizure_detected": True
        }
        
        # Save the data
        self.store.save_data(test_data)
        
        # Clear all data
        self.store.clear_data()
        
        # Try to get data for last 0 hours (should be empty)
        data = self.store.get_historical_data(0)
        self.assertEqual(len(data), 0, "Should have no data points for 0 hours")

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