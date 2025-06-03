// main.js - Main application coordination and initialization

// Global application state
let transactions = [];
let colorMode = 'size';
let currentPrice = 0;

// Color palettes for different visualization modes
const sizeColors = [
    '#27ae60', '#2ecc71', '#f1c40f', '#e67e22', '#e74c3c', '#8e44ad'
];

const valueColors = [
    '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b'
];

/**
 * Initialize refresh button event listener
 */
function initializeRefreshButton() {
    const refreshButton = document.getElementById('refresh-data');
    if (refreshButton) {
        refreshButton.addEventListener('click', function() {
            this.textContent = 'Refreshing...';
            console.log('🔄 Manual refresh triggered');
            
            // Call all load functions
            loadTransactions();
            loadBlockLabels(); // ✅ ENSURE THIS IS CALLED
            loadPrice();
            
            setTimeout(() => {
                this.textContent = 'Refresh Data';
            }, 1000);
        });
    }
}

/**
 * Enhanced data loading with packing visualization support
 */
function loadTransactions() {
    console.log('🔄 Loading transactions...');
    
    fetch('/get_transactions')
        .then(response => response.json())
        .then(data => {
            transactions = data;
            console.log('✅ Transactions loaded:', transactions.length);
            
            // Use the simplified ERGO packing visualization
            if (typeof refreshERGOPacking === 'function') {
                console.log('🔄 Using simplified ERGO packing refresh');
                refreshERGOPacking();
            } else if (typeof createERGOPackingVisualization === 'function') {
                console.log('🔄 Creating ERGO packing visualization');
                createERGOPackingVisualization();
            } else if (typeof createVisualization === 'function') {
                console.log('🔄 Using fallback createVisualization');
                createVisualization();
            } else {
                console.warn('⚠️ No visualization function available');
                document.getElementById('mempool-grid').innerHTML = 
                    '<div class="loading">Visualization not available</div>';
            }
            
            updateStats();
            updateNextBlockInfo();
            
            // Add safety check for populateTransactionTable
            if (typeof populateTransactionTable === 'function') {
                populateTransactionTable();
            } else {
                console.warn('⚠️ populateTransactionTable function not available yet');
                // Retry after a short delay
                setTimeout(() => {
                    if (typeof populateTransactionTable === 'function') {
                        console.log('✅ Retrying populateTransactionTable - now available');
                        populateTransactionTable();
                    }
                }, 500);
            }
        })
        .catch(error => {
            console.error('❌ Error fetching transactions:', error);
            document.getElementById('mempool-grid').innerHTML = 
                '<div class="loading">Error loading transactions</div>';
        });
}

/**
 * Load block information from the server - MOVED TO MAIN.JS
 * Updates block displays directly
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
            
            // Update next block reward estimate
            if (blockLabels[0] && blockLabels[0].baseMinerReward) {
                updateNextBlockReward(blockLabels[0].baseMinerReward);
            }
            
            // DIRECT UPDATE - bypass all animation systems
            console.log('🔄 Updating blocks directly...');
            updateBlocksDirectly(blockLabels);
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
 * Update blocks directly without animation dependencies
 */
function updateBlocksDirectly(blockLabels) {
    console.log('🔄 updateBlocksDirectly called with', blockLabels.length, 'blocks');
    
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
                
                // Apply the correct blue styling
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
 */
function calculateTimeAgo(timestamp) {
    const now = Date.now();
    const blockTime = timestamp;
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

/**
 * Update next block reward estimate
 */
function updateNextBlockReward(baseMinerReward) {
    const rewardElement = document.getElementById('next-block-reward');
    if (rewardElement && baseMinerReward) {
        rewardElement.textContent = `~${baseMinerReward.toFixed(2)} ERG`;
        console.log('✅ Updated next block reward:', baseMinerReward);
    }
}

/**
 * Initialize all application data loading and intervals
 */
function initializeDataLoading() {
    console.log('🚀 Starting initial data load...');
    
    // Initial data load with delays to ensure proper loading order
    loadPrice();
    
    // Load transactions first
    setTimeout(() => {
        loadTransactions();
    }, 100);
    
    // Load blocks after transactions
    setTimeout(() => {
        console.log('🔄 Loading blocks with delay...');
        loadBlockLabels();
    }, 500);
    
    // Set up auto-refresh intervals
    setInterval(() => {
        console.log('⏰ 30-second auto-refresh triggered');
        loadTransactions();
        loadBlockLabels(); // ✅ ENSURE BLOCKS ARE REFRESHED
    }, 30000);

    // Refresh price every 5 minutes
    setInterval(() => {
        loadPrice();
    }, 300000);
    
    console.log('✅ Data loading intervals initialized');
}

/**
 * Enhanced visualization initialization
 */
function initializeVisualization() {
    // Check if ERGO packing module is loaded
    if (typeof createERGOPackingVisualization === 'function') {
        console.log('✅ ERGO packing module detected');
        
        // Add visual indicator that packing mode is active
        const visualizer = document.querySelector('.visualizer');
        if (visualizer) {
            visualizer.classList.add('packing-mode');
        }
        
        // Update control buttons to indicate packing mode
        const controls = document.querySelector('.controls');
        if (controls) {
            controls.classList.add('packing-mode');
        }
        
    } else {
        console.warn('⚠️ ERGO packing module not loaded, using fallback visualization');
    }
}

/**
 * Initialize visualization control event listeners
 */
function initializeVisualizationControls() {
    const colorBySizeBtn = document.getElementById('color-by-size');
    const colorByValueBtn = document.getElementById('color-by-value');
    
    if (colorBySizeBtn) {
        colorBySizeBtn.addEventListener('click', function() {
            colorMode = 'size';
            document.querySelectorAll('.control-button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Refresh visualization with new color mode
            if (typeof refreshERGOPacking === 'function') {
                refreshERGOPacking();
            } else if (typeof createVisualization === 'function') {
                createVisualization();
            }
        });
    }

    if (colorByValueBtn) {
        colorByValueBtn.addEventListener('click', function() {
            colorMode = 'value';
            document.querySelectorAll('.control-button').forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // Refresh visualization with new color mode
            if (typeof refreshERGOPacking === 'function') {
                refreshERGOPacking();
            } else if (typeof createVisualization === 'function') {
                createVisualization();
            }
        });
    }
}

/**
 * Main application initialization
 */
function initializeApplication() {
    console.log('🚀 Initializing Ergomempool application...');
    
    // Initialize all modules
    if (typeof initializeWalletConnection === 'function') {
        initializeWalletConnection();
    } else {
        console.warn('⚠️ Wallet connection not available');
    }
    
    initializeVisualizationControls();
    initializeRefreshButton();
    initializeVisualization();
    
    // Start data loading
    initializeDataLoading();
    
    console.log('✅ Ergomempool application initialized successfully');
}

/**
 * Enhanced stats update function
 */
function updateStats() {
    const totalTx = transactions.length;
    const totalValue = transactions.reduce((sum, tx) => sum + (tx.value || 0), 0);
    const totalUsdValue = transactions.reduce((sum, tx) => sum + (tx.usd_value || 0), 0);
    const avgSize = totalTx > 0 ? Math.round(transactions.reduce((sum, tx) => sum + (tx.size || 0), 0) / totalTx) : 0;

    // Update basic mempool stats
    const totalTxElement = document.getElementById('total-transactions');
    const totalValueElement = document.getElementById('total-value');
    const totalUsdValueElement = document.getElementById('total-usd-value');
    const avgSizeElement = document.getElementById('avg-size');

    if (totalTxElement) totalTxElement.textContent = totalTx;
    if (totalValueElement) totalValueElement.textContent = totalValue.toFixed(2);
    if (totalUsdValueElement) totalUsdValueElement.textContent = '$' + totalUsdValue.toFixed(2);
    if (avgSizeElement) avgSizeElement.textContent = avgSize;
    
    // ADD THIS LINE: Update ERGO packing stats
    if (typeof refreshERGOPackingStats === 'function') {
        refreshERGOPackingStats();
    }
}

/**
 * Enhanced next block info update
 */
function updateNextBlockInfo() {
    const nextBlockHeightElement = document.getElementById('next-block-height');
    const nextBlockElement = document.getElementById('next-block');
    
    if (!nextBlockHeightElement || !nextBlockElement) {
        console.warn('⚠️ Next block elements not found in DOM');
        return;
    }

    if (transactions.length === 0) {
        // Show default values when no transactions
        nextBlockHeightElement.textContent = 'Mining...';
        nextBlockElement.innerHTML = `
            <div class="block-size">Pending</div>
            <div class="block-reward">
                <span class="reward-label">Est. Reward</span>
                <span class="reward-value" id="next-block-reward">~15.00 ERG</span>
            </div>
            <div class="block-tx-count">Processing...</div>
        `;
        return;
    }

    // Calculate mempool stats
    const totalTransactions = transactions.length;
    const totalSize = transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    
    // Update next block display
    nextBlockHeightElement.textContent = 'Mining...';
    nextBlockElement.innerHTML = `
        <div class="block-size">${(totalSize / 1000000).toFixed(2)} MB</div>
        <div class="block-reward">
            <span class="reward-label">Est. Reward</span>
            <span class="reward-value" id="next-block-reward">~15.00 ERG</span>
        </div>
        <div class="block-tx-count">${totalTransactions.toLocaleString()} transactions</div>
    `;
}

/**
 * Debug functions
 */
function checkModuleStatus() {
    console.log('📋 Module Status Check:');
    console.log('- ERGO Packing:', typeof createERGOPackingVisualization !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- Wallet Connector:', typeof walletConnector !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- Visualization:', typeof createVisualization !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- Block Animation:', typeof animateBlockTransition !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- Transaction Table:', typeof populateTransactionTable !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- LoadBlockLabels:', typeof loadBlockLabels !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- UpdateBlocksNormal:', typeof updateBlocksNormal !== 'undefined' ? '✅ Loaded' : '❌ Missing');
    console.log('- Transactions loaded:', transactions.length);
    console.log('- Current color mode:', colorMode);
    console.log('- Current price:', currentPrice);
}

function manualRefresh() {
    console.log('🔄 Manual refresh triggered');
    loadTransactions();
    loadBlockLabels();
    loadPrice();
}

function forceLoadBlocks() {
    console.log('🔨 FORCE LOADING BLOCKS...');
    if (typeof loadBlockLabels === 'function') {
        loadBlockLabels();
    } else {
        console.error('❌ loadBlockLabels function not available');
    }
}

// Make debug functions available globally
if (typeof window !== 'undefined') {
    window.checkModuleStatus = checkModuleStatus;
    window.manualRefresh = manualRefresh;
    window.forceLoadBlocks = forceLoadBlocks;
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApplication);

console.log('✅ Main application module loaded successfully');