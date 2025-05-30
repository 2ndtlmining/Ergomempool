import requests

def get_block_details():
    url = "https://api.ergoplatform.com/api/v1/blocks"
    response = requests.get(url, params={"limit": 4})
                
    if response.status_code == 200:
        data = response.json()
        blocks_info = []

        for block in data['items']:
            block_info = {
                "height": block["height"],
                "minerAddress": block["miner"]["address"],
                "transactionsCount": block["transactionsCount"],
                "size": block["size"],
                "minerReward": block["minerReward"] / 1_000_000_000,
                "timestamp": block["timestamp"],
                "miner": block ["miner"]["name"],
                "id": block["id"],
            }
            blocks_info.append(block_info)

        return blocks_info
    else:
        print(f"Failed to retrieve data: {response.status_code}")
        return None

def get_block_labels():
    return ["height", "length", "width", "depth"]

if __name__ == "__main__":
    block_details = get_block_details()
    if block_details:
        for detail in block_details:
            print(detail)