import requests

def get_unconfirmed_transactions(limit=500, offset=0, sort_by="size", sort_direction="desc"):
    url = "https://api.ergoplatform.com/transactions/unconfirmed"

    response = requests.get(url)

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
                processed_tx = {
                    "id": tx["id"],
                    "size": tx.get("size"),
                    "value": (sum(output["value"] for output in tx.get("outputs", []))) / 1_000_000_000
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
        print(tx)
