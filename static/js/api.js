// api.js - All API calls and data fetching functions

/**
 * Load current ERG price from the server
 * Updates the global currentPrice variable
 */
function loadPrice() {
    fetch('/get_price')
        .then(response => response.json())
        .then(data => {
            currentPrice = data.price;
            // Price loaded but not displayed in header
        })
        .catch(error => {
            console.error('Error fetching price:', error);
        });
}

/**
 * Load mempool transactions from the server
 * Updates the global transactions array and refreshes UI
 */
function loadTransactions() {
    fetch('/get_transactions')
        .then(response => response.json())
        .then(data => {
            transactions = data;
            createVisualization();
            updateStats();
            updateNextBlockInfo();
            populateTransactionTable();
        })
        .catch(error => {
            console.error('Error fetching transactions:', error);
            document.getElementById('mempool-grid').innerHTML = 
                '<div class="loading">Error loading transactions</div>';
        });
}

/**
 * Load block information from the server
 * Updates block displays and handles animations
 */
function loadBlockLabels() {
    fetch('/get_block_labels')
        .then(response => response.json())
        .then(blockLabels => {
            console.log('Block data received:', blockLabels); // Debug log
            
            // Update next block reward estimate with the base miner reward from the most recent block
            if (blockLabels && blockLabels.length > 0 && blockLabels[0].baseMinerReward) {
                updateNextBlockReward(blockLabels[0].baseMinerReward);
            }
            
            // Check if we should animate
            const shouldAnimate = animateBlockTransition(blockLabels);
            
            if (!shouldAnimate) {
                // No animation needed, just update normally
                updateBlocksNormal(blockLabels);
            }
        })
        .catch(error => console.error('Error fetching block labels:', error));
}