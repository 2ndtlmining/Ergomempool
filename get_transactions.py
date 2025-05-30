import requests
#put the limit as a start to 99999 and see how we go. Doubt it will be more than that for a while 
def get_unconfirmed_transactions(limit=99999, offset=0, sort_by="size", sort_direction="desc"):
    url = "https://api.ergoplatform.com/transactions/unconfirmed"
        # Add parameters to the API call
    params = {
        'limit': limit,
        'offset': offset,
        'sortBy': sort_by,
        'sortDirection': sort_direction
    }
    response = requests.get(url, params=params)

    if response.status_code == 200:
        transactions = response.json()

        # Ensure that `transactions` is a list and each item is a dictionary
        if isinstance(transactions, dict) and 'items' in transactions:
            transactions = transactions['items']

        if not isinstance(transactions, list):
            print("Error: The API response is not structured as expected. Expected a list of dictionaries.")
            return []

        # Process each transaction
        processed_transactions = []
        for tx in transactions:
            try:
                # Extract input addresses
                input_addresses = []
                for input_tx in tx.get("inputs", []):
                    if "address" in input_tx:
                        input_addresses.append({
                            "address": input_tx["address"],
                            "value": input_tx.get("value", 0) / 1_000_000_000  # Convert from nanoERG to ERG
                        })

                # Extract output addresses
                output_addresses = []
                for output_tx in tx.get("outputs", []):
                    if "address" in output_tx:
                        output_addresses.append({
                            "address": output_tx["address"],
                            "value": output_tx.get("value", 0) / 1_000_000_000  # Convert from nanoERG to ERG
                        })

                processed_tx = {
                    "id": tx["id"],
                    "size": tx.get("size"),
                    "value": (sum(output["value"] for output in tx.get("outputs", []))) / 1_000_000_000,
                    "inputs": input_addresses,
                    "outputs": output_addresses
                }
                processed_transactions.append(processed_tx)
            except KeyError as e:
                print(f"Skipping transaction due to missing key: {e} - Transaction: {tx}")
        
        return processed_transactions
    else:
        print(f"Failed to fetch transactions. Status code: {response.status_code}")
        return []



if __name__ == "__main__":
    transactions = get_unconfirmed_transactions()
    for tx in transactions:
        print(f"TX ID: {tx['id']}")
        print(f"Size: {tx['size']} bytes")
        print(f"Value: {tx['value']} ERG")
        print(f"Inputs: {len(tx['inputs'])} addresses")
        for inp in tx['inputs']:
            print(f"  Input: {inp['address'][:20]}... ({inp['value']} ERG)")
        print(f"Outputs: {len(tx['outputs'])} addresses")
        for out in tx['outputs']:
            print(f"  Output: {out['address'][:20]}... ({out['value']} ERG)")
        print("---")