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
                blockLabels.forEach((block, i) => {
                    if (i < 4) {
                        console.log(`Block ${i} timestamp:`, block.timestamp); // Debug log
                        
                        // Update block height (just the number now)
                        const heightElement = document.getElementById(`block-height-${i}`);
                        if (heightElement) {
                            heightElement.textContent = block.height;
                        }

                        // Update block height link
                        const heightLinkElement = document.getElementById(`block-height-link-${i}`);
                        if (heightLinkElement && block.id) {
                            heightLinkElement.href = `https://sigmaspace.io/en/block/${block.id}`;
                        }

                        // Update block content with real data including timestamp
                        const blockElement = document.getElementById(`block-${i}`);
                        if (blockElement) {
                            let timeAgoText = '';
                            if (block.timestamp) {
                                timeAgoText = calculateTimeAgo(block.timestamp);
                            } else {
                                console.log(`No timestamp for block ${i}`); // Debug log
                            }

                            // Enhanced block display with better formatting
                            blockElement.innerHTML = `
                                <div class="block-size">${(block.size / 1000000).toFixed(2)} MB</div>
                                <div class="block-reward">
                                    <span class="reward-label">Total Reward</span>
                                    <span class="reward-value">${block.minerReward.toFixed(3)} ERG</span>
                                    ${block.totalFees && block.totalFees > 0 ? 
                                        `<span class="fees-breakdown">${block.totalFees.toFixed(3)} fees</span>` : 
                                        ''
                                    }
                                </div>
                                <div class="block-tx-count">${block.transactionsCount.toLocaleString()} transactions</div>
                                ${timeAgoText ? `<div class="block-time">${timeAgoText}</div>` : ''}
                            `;
                        }

                        // Update miner name and logo
                        const minerElement = document.getElementById(`block-miner-${i}`);
                        if (minerElement && block.minerInfo) {
                            const minerName = block.minerInfo.name || 'Unknown';
                            const minerLogo = block.minerInfo.logo;
                            
                            if (minerLogo) {
                                minerElement.innerHTML = `
                                    <img src="${minerLogo}" alt="${minerName}" class="miner-logo" onerror="this.style.display='none'">
                                    <span>${minerName}</span>
                                `;
                            } else {
                                minerElement.innerHTML = `<span>${minerName}</span>`;
                            }
                        }
                    }
                });
            }
        })
        .catch(error => console.error('Error fetching block labels:', error));
}