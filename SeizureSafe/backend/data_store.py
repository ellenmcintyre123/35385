import sqlite3
import json
from datetime import datetime

class DataStore:
    def __init__(self, db_path='seizure_data.db'):
        self.db_path = db_path
        self.init_db()

    def init_db(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS seizure_data (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME,
                heart_rate REAL,
                previous_heart_rate REAL,
                fall_detected INTEGER,
                seizure_detected INTEGER
            )
        ''')
        conn.commit()
        conn.close()

    def save_data(self, data):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO seizure_data 
            (timestamp, heart_rate, previous_heart_rate, fall_detected, seizure_detected)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            datetime.now(),
            data['heart_rate'],
            data['previous_heart_rate'],
            int(data['fall_detected']),
            int(data['seizure_detected'])
        ))
        conn.commit()
        conn.close()

    def get_historical_data(self, hours=24):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT timestamp, heart_rate, fall_detected, seizure_detected
            FROM seizure_data
            WHERE timestamp >= datetime('now', ?)
            ORDER BY timestamp ASC
        ''', (f'-{hours} hours',))
        
        data = cursor.fetchall()
        conn.close()
        
        return [{
            'timestamp': row[0],
            'heart_rate': row[1],
            'fall_detected': bool(row[2]),
            'seizure_detected': bool(row[3])
        } for row in data]

    def clear_data(self):
        """Clear all data from the database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('DELETE FROM seizure_data')
        conn.commit()
        conn.close()

    def get_latest_data(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            SELECT timestamp, heart_rate, previous_heart_rate, fall_detected, seizure_detected
            FROM seizure_data
            ORDER BY timestamp DESC
            LIMIT 1
        ''')
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                'timestamp': row[0],
                'heart_rate': row[1],
                'previous_heart_rate': row[2],
                'fall_detected': bool(row[3]),
                'seizure_detected': bool(row[4])
            }
        else:
            return {} 