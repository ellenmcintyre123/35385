from flask import Flask, jsonify
from flask_cors import CORS
from data_store import DataStore

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
data_store = DataStore()

@app.route('/api/history/<int:hours>', methods=['GET'])
def get_history(hours):
    try:
        data = data_store.get_historical_data(hours)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000) 