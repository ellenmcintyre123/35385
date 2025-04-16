from data_store import DataStore

def test_database():
    try:
        store = DataStore()
        print("Database connection successful!")
        
        # Test saving data
        test_data = {
            "heart_rate": 75.0,
            "previous_heart_rate": 74.0,
            "fall_detected": False,
            "seizure_detected": False,
            "battery": 100
        }
        store.save_data(test_data)
        print("Data saved successfully!")
        
        # Test retrieving data
        data = store.get_historical_data(1)
        print(f"Retrieved {len(data)} records")
        if data:
            print("Sample record:", data[0])
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_database() 