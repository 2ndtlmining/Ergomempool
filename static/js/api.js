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
 * Load block information from the server - FIXED VERSION
 * Updates block displays and handles animations
 */
function loadBlockLabels() {
    console.log('🔄 Loading block labels...');
    
    fetch('/get_block_labels')
        .then(response => response.json())
        .then(blockLabels => {
            console.log('✅ Block data received:', blockLabels);
            
            if (!blockLabels || blockLabels.length === 0) {
                console.warn('⚠️ No block data received');
                return;
            }
            
            // Update next block reward estimate with the base miner reward from the most recent block
            if (blockLabels[0] && blockLabels[0].baseMinerReward) {
                updateNextBlockReward(blockLabels[0].baseMinerReward);
            }
            
            // DIRECT UPDATE - bypass animation check for now
            console.log('🔄 Updating blocks directly...');
            updateBlocksNormal(blockLabels);
            
            // Alternative: Try animation check
            // const shouldAnimate = typeof animateBlockTransition === 'function' ? 
            //     animateBlockTransition(blockLabels) : false;
            
            // if (!shouldAnimate) {
            //     updateBlocksNormal(blockLabels);
            // }
        })
        .catch(error => {
            console.error('❌ Error fetching block labels:', error);
            // Show error in block containers
            for (let i = 0; i < 4; i++) {
                const blockElement = document.getElementById(`block-${i}`);
                if (blockElement) {
                    blockElement.innerHTML = '<div style="color: #e74c3c;">Error loading</div>';
                }
            }
        });
}

/**
 * Update next block reward estimate
 * @param {number} baseMinerReward - Base miner reward from most recent block
 */
function updateNextBlockReward(baseMinerReward) {
    const rewardElement = document.getElementById('next-block-reward');
    if (rewardElement && baseMinerReward) {
        rewardElement.textContent = `~${baseMinerReward.toFixed(2)} ERG`;
        console.log('✅ Updated next block reward:', baseMinerReward);
    }
}

/**
 * FALLBACK: Update blocks directly if blocks.js functions aren't available
 * @param {Array} blockLabels - Array of block data
 */
function updateBlocksNormal(blockLabels) {
    console.log('🔄 updateBlocksNormal called with', blockLabels.length, 'blocks');
    
    // Check if the function exists in blocks.js
    if (typeof window.updateBlocksNormal === 'function') {
        console.log('✅ Using blocks.js updateBlocksNormal');
        window.updateBlocksNormal(blockLabels);
        return;
    }
    
    // Fallback: Update blocks manually
    console.log('⚠️ blocks.js updateBlocksNormal not found, using fallback');
    
    blockLabels.forEach((block, i) => {
        if (i < 4) {
            console.log(`🔄 Updating block ${i}:`, block);
            
            // Update block height
            const heightElement = document.getElementById(`block-height-${i}`);
            if (heightElement) {
                heightElement.textContent = block.height;
                console.log(`✅ Updated height ${i}:`, block.height);
            }

            // Update block height link
            const heightLinkElement = document.getElementById(`block-height-link-${i}`);
            if (heightLinkElement && block.id) {
                heightLinkElement.href = `https://sigmaspace.io/en/block/${block.id}`;
            }

            // Update block content
            const blockElement = document.getElementById(`block-${i}`);
            if (blockElement) {
                // Calculate time ago
                let timeAgoText = '';
                if (block.timestamp) {
                    timeAgoText = calculateTimeAgo(block.timestamp);
                }
                
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
                
                // Apply the correct block styling (blue gradient like the original design)
                blockElement.style.background = 'linear-gradient(135deg, #2c4a6b, #3d5a7a)';
                blockElement.style.border = '2px solid #4a6b8a';
                blockElement.style.color = 'white';
                blockElement.style.animation = 'none';
                
                console.log(`✅ Updated block content ${i}`);
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
                console.log(`✅ Updated miner ${i}:`, minerName);
            }
        }
    });
    
    console.log('✅ All blocks updated successfully');
}

/**
 * Calculate how long ago a block was mined
 * @param {number} timestamp - Block timestamp in milliseconds
 * @returns {string} - Human readable time ago string
 */
function calculateTimeAgo(timestamp) {
    const now = Date.now();
    const blockTime = timestamp; // Timestamp is already in milliseconds
    const diffInMinutes = Math.floor((now - blockTime) / (1000 * 60));
    
    if (diffInMinutes < 1) {
        return "< 1 min ago";
    } else if (diffInMinutes === 1) {
        return "1 min ago";
    } else if (diffInMinutes < 60) {
        return `${diffInMinutes} mins ago`;
    } else {
        const hours = Math.floor(diffInMinutes / 60);
        const remainingMins = diffInMinutes % 60;
        if (hours === 1) {
            return remainingMins > 0 ? `1h ${remainingMins}m ago` : "1h ago";
        } else {
            return remainingMins > 0 ? `${hours}h ${remainingMins}m ago` : `${hours}h ago`;
        }
    }
}