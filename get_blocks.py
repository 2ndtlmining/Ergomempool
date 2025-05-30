import requests

def get_block_details():
    url = "https://api.ergoplatform.com/api/v1/blocks"
    response = requests.get(url, params={"limit": 4})
                
    if response.status_code == 200:
        data = response.json()
        blocks_info = []

        for block in data['items']:
            # Convert base minerReward from nanoERG to ERG
            base_miner_reward = block["minerReward"] / 1_000_000_000
            
            # Get the fees from block outputs
            miner_address = block["miner"]["address"]
            fees = get_miner_fees(block["id"], miner_address)
            
            # Total block value = actual miner reward + fees
            total_block_value = base_miner_reward + fees
            
            block_info = {
                "height": block["height"],
                "minerAddress": miner_address,
                "transactionsCount": block["transactionsCount"],
                "size": block["size"],
                "minerReward": base_miner_reward,  # Actual reward from API
                "totalFees": fees,  # Fees from outputs
                "totalBlockValue": total_block_value,  # API reward + fees
                "timestamp": block["timestamp"],
                "miner": block["miner"]["name"],
                "id": block["id"],
            }
            blocks_info.append(block_info)

        return blocks_info
    else:
        print(f"Failed to retrieve data: {response.status_code}")
        return None

def get_miner_fees(block_id, miner_address):
    """
    Get the miner's fees by finding the miner's address output that has no assets.
    The fee output can be in ANY transaction within the block, not just the coinbase.
    We look for the miner address output with no assets (empty array).
    """
    try:
        url = f"https://api.ergoplatform.com/api/v1/blocks/{block_id}"
        response = requests.get(url)
        
        if response.status_code != 200:
            print(f"Failed to get block details for {block_id}: {response.status_code}")
            return 0.0
            
        block_data = response.json()
        
        if 'block' not in block_data:
            print(f"No 'block' key found in response for {block_id}")
            return 0.0
            
        block_info = block_data['block']
        
        if 'blockTransactions' not in block_info or len(block_info['blockTransactions']) == 0:
            print(f"No blockTransactions found for {block_id}")
            return 0.0
        
        # Search through ALL transactions in the block, not just the coinbase
        for tx_index, transaction in enumerate(block_info['blockTransactions']):
            if 'outputs' not in transaction:
                continue
                
            # Look for the miner's output that has NO assets (this contains the fees)
            for output_index, output in enumerate(transaction['outputs']):
                if output.get("address") == miner_address:
                    assets = output.get("assets", [])
                    
                    # We want the output with NO assets (empty array)
                    if len(assets) == 0:
                        fees_nano_erg = output.get("value", 0)
                        fees_erg = fees_nano_erg / 1_000_000_000
                        print(f"Found miner fees for {block_id} in transaction {tx_index}, output {output_index}: {fees_erg:.6f} ERG")
                        return fees_erg
                    else:
                        print(f"Skipping miner output with assets in transaction {tx_index} for {block_id}")
        
        # If no asset-free miner output found, return 0 fees
        print(f"No asset-free miner output found for {miner_address} in block {block_id}")
        return 0.0
        
    except Exception as e:
        print(f"Error getting miner fees for block {block_id}: {e}")
        return 0.0

def get_block_labels():
    return ["height", "length", "width", "depth"]

if __name__ == "__main__":
    print("Fetching block details with fees...")
    block_details = get_block_details()
    if block_details:
        for detail in block_details:
            print(f"Block {detail['height']}:")
            print(f"  Miner Reward: {detail['minerReward']:.4f} ERG")
            print(f"  Total Fees: {detail['totalFees']:.4f} ERG") 
            print(f"  Total Value: {detail['totalBlockValue']:.4f} ERG")
            print(f"  Transactions: {detail['transactionsCount']}")
            print("---")