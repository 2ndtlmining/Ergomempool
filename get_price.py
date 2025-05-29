import requests
import json

def get_erg_price():
    """
    Retrieve ERG-USD price from the Spire Pools API
    
    Returns:
        dict: Contains price data and metadata, or None if request fails
    """
    api_url = "https://erg-oracle-ergusd.spirepools.com/frontendData"
    
    try:
        # Make the API request
        response = requests.get(api_url, timeout=10)
        response.raise_for_status()  # Raises an HTTPError for bad responses
        
        # Get the response text and parse it as JSON
        # The API returns a JSON string that needs to be parsed
        response_text = response.text.strip()
        if response_text.startswith('"') and response_text.endswith('"'):
            # Remove outer quotes if present
            response_text = response_text[1:-1]
        
        # Unescape the JSON string
        response_text = response_text.replace('\\"', '"')
        
        # Parse the JSON
        data = json.loads(response_text)
        
        # Extract key information
        price_data = {
            'price': data.get('latest_price'),
            'title': data.get('title'),
            'block_height': data.get('current_block_height'),
            'raw_data': data
        }
        
        return price_data
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching data: {e}")
        return None
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
        return None

def main():
    """
    Main function to demonstrate the API client
    """
    print("Fetching ERG-USD price data...")
    
    price_data = get_erg_price()
    
    if price_data:
        print("Success!")
        print(f"Title: {price_data['title']}")
        print(f"Current Price: ${price_data['price']:.6f}")
        print(f"Block Height: {price_data['block_height']}")
        print(f"Full data: {price_data['raw_data']}")
    else:
        print("Failed to retrieve price data")

if __name__ == "__main__":
    main()