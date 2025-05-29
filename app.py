from flask import Flask, jsonify, render_template, send_from_directory
import get_transactions
import get_blocks
import get_price
import json
import os

app = Flask(__name__)

# Load miner names and logos mapping
def load_miner_names():
    """Load miner names mapping from JSON file"""
    try:
        with open('miner_names.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: miner_names.json not found. Using empty mapping.")
        return {}
    except json.JSONDecodeError:
        print("Warning: Error reading miner_names.json. Using empty mapping.")
        return {}

def load_miner_logos():
    """Load miner logos mapping from JSON file"""
    try:
        with open('miner_logos.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: miner_logos.json not found. Using empty mapping.")
        return {}
    except json.JSONDecodeError:
        print("Warning: Error reading miner_logos.json. Using empty mapping.")
        return {}

# Load the mappings once at startup
miner_names = load_miner_names()
miner_logos = load_miner_logos()

# Cache the price to avoid hitting the API too frequently
price_cache = {"price": None, "timestamp": 0}
PRICE_CACHE_DURATION = 300  # 5 minutes in seconds

def get_cached_price():
    """Get ERG price with caching to reduce API calls"""
    import time
    
    current_time = time.time()
    
    # Check if we need to refresh the cache
    if (price_cache["price"] is None or 
        current_time - price_cache["timestamp"] > PRICE_CACHE_DURATION):
        
        price_data = get_price.get_erg_price()
        if price_data and price_data["price"]:
            price_cache["price"] = price_data["price"]
            price_cache["timestamp"] = current_time
            return price_data["price"]
        else:
            # Return cached price if available, otherwise default
            return price_cache["price"] if price_cache["price"] else 1.0
    
    return price_cache["price"]

def get_miner_info(miner_name):
    """Get both human readable name and logo for miner"""
    if not miner_name:
        return {"name": "Unknown", "logo": miner_logos.get("Unknown", None)}
    
    # Check if the miner name is in our mapping
    if miner_name in miner_names:
        readable_name = miner_names[miner_name]
        logo = miner_logos.get(miner_name, None)
        return {"name": readable_name, "logo": logo}
    
    # If not found in mapping, return "Unknown" with Unknown logo
    return {"name": "Unknown", "logo": miner_logos.get("Unknown", None)}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/get_transactions', methods=['GET'])
def transactions():
    txs = get_transactions.get_unconfirmed_transactions()
    
    # Get current ERG price
    erg_price = get_cached_price()
    
    # Add USD values to each transaction
    for tx in txs:
        if 'value' in tx and tx['value'] is not None:
            tx['usd_value'] = tx['value'] * erg_price
        else:
            tx['usd_value'] = 0
    
    return jsonify(txs)

@app.route('/get_block_labels', methods=['GET'])
def block_labels():
    blocks = get_blocks.get_block_details()
    if blocks:
        labels = [
            {
                "height": block['height'],
                "size": block['size'],
                "minerReward": block['minerReward'],
                "transactionsCount": block['transactionsCount'],
                "timestamp": block['timestamp'],
                "minerInfo": get_miner_info(block['miner'])
            }
            for block in blocks
        ]
        return jsonify(labels)
    else:
        return jsonify([])

@app.route('/get_price', methods=['GET'])
def get_current_price():
    """Endpoint to get current ERG price"""
    price = get_cached_price()
    return jsonify({"price": price, "currency": "USD"})

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)