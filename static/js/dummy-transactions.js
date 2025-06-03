// dummy-transactions.js - Generate dummy transactions for testing packing visualization

// Configuration for dummy transaction generation
const DUMMY_CONFIG = {
    // Number of dummy transactions to generate
    transactionCount: 100,
    
    // Size range for dummy transactions (in bytes)
    minSize: 200,
    maxSize: 8000,
    
    // Value range for dummy transactions (in ERG)
    minValue: 0.001,
    maxValue: 100.0,
    
    // Dummy transaction ID prefix
    idPrefix: "dummy_",
    
    // Common transaction sizes (weighted distribution)
    commonSizes: [
        { size: 300, weight: 30 },   // Small transactions (30%)
        { size: 600, weight: 25 },   // Medium transactions (25%)
        { size: 1200, weight: 20 },  // Large transactions (20%)
        { size: 2400, weight: 15 },  // Very large transactions (15%)
        { size: 5000, weight: 10 }   // Huge transactions (10%)
    ]
};

// Global state for dummy transactions
let dummyTransactions = [];
let dummyModeActive = false;
let originalTransactions = [];

/**
 * Generate a single dummy transaction with realistic properties
 * @param {number} index - Transaction index for unique ID
 * @returns {Object} - Dummy transaction object
 */
function generateDummyTransaction(index) {
    // Generate size using weighted distribution
    const size = generateWeightedTransactionSize();
    
    // Generate value (roughly correlated with size but with randomness)
    const baseValue = (size / 1000) * (0.5 + Math.random() * 2); // 0.5x to 2.5x size correlation
    const value = Math.max(
        DUMMY_CONFIG.minValue,
        Math.min(DUMMY_CONFIG.maxValue, baseValue + (Math.random() - 0.5) * 10)
    );
    
    // Generate dummy addresses (realistic Ergo address format)
    const dummyInputAddress = generateDummyErgoAddress();
    const dummyOutputAddress = generateDummyErgoAddress();
    
    return {
        id: `${DUMMY_CONFIG.idPrefix}${Date.now()}_${index}`,
        size: Math.round(size),
        value: parseFloat(value.toFixed(4)),
        usd_value: value * (currentPrice || 1.5), // Use current ERG price or fallback
        inputs: [
            {
                address: dummyInputAddress,
                value: value + 0.001 // Slightly more for fees
            }
        ],
        outputs: [
            {
                address: dummyOutputAddress,
                value: value
            }
        ],
        isDummy: true, // Flag to identify dummy transactions
        dummyColor: '#e91e63', // Pink color for dummy transactions
        timestamp: Date.now()
    };
}

/**
 * Generate transaction size using weighted distribution
 * @returns {number} - Transaction size in bytes
 */
function generateWeightedTransactionSize() {
    const random = Math.random() * 100;
    let currentWeight = 0;
    
    for (const sizeOption of DUMMY_CONFIG.commonSizes) {
        currentWeight += sizeOption.weight;
        if (random <= currentWeight) {
            // Add some variation around the base size
            const variation = sizeOption.size * 0.3; // ±30% variation
            const finalSize = sizeOption.size + (Math.random() - 0.5) * variation;
            return Math.max(DUMMY_CONFIG.minSize, Math.min(DUMMY_CONFIG.maxSize, finalSize));
        }
    }
    
    // Fallback to random size if something goes wrong
    return DUMMY_CONFIG.minSize + Math.random() * (DUMMY_CONFIG.maxSize - DUMMY_CONFIG.minSize);
}

/**
 * Generate a realistic-looking dummy Ergo address
 * @returns {string} - Dummy Ergo address
 */
function generateDummyErgoAddress() {
    const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let address = '9'; // Ergo addresses start with '9'
    
    // Generate remaining 50 characters
    for (let i = 0; i < 50; i++) {
        address += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return address;
}

/**
 * Generate the specified number of dummy transactions
 * @param {number} count - Number of dummy transactions to generate
 * @returns {Array} - Array of dummy transaction objects
 */
function generateDummyTransactions(count = DUMMY_CONFIG.transactionCount) {
    console.log(`🎭 Generating ${count} dummy transactions for testing...`);
    
    const dummies = [];
    
    for (let i = 0; i < count; i++) {
        const dummyTx = generateDummyTransaction(i);
        dummies.push(dummyTx);
    }
    
    console.log(`✅ Generated ${dummies.length} dummy transactions`);
    console.log(`📊 Total size: ${formatERGOBytes(dummies.reduce((sum, tx) => sum + tx.size, 0))}`);
    console.log(`💰 Total value: ${dummies.reduce((sum, tx) => sum + tx.value, 0).toFixed(2)} ERG`);
    
    return dummies;
}


/**
 * Activate dummy mode - combine real transactions with dummy ones (FIXED)
 */
function activateDummyMode() {
    if (dummyModeActive) {
        console.log('⚠️ Dummy mode already active');
        return;
    }
    
    console.log('🎭 Activating dummy transaction mode...');
    
    // Store original transactions GLOBALLY so loadTransactions can access them
    originalTransactions = [...transactions];
    window.originalTransactions = [...transactions]; // Make it globally accessible
    
    // IMPORTANT: Clear packing state before adding dummies
    if (typeof window.clearPackingState === 'function') {
        console.log('🔄 Clearing packing state before adding dummies...');
        window.clearPackingState();
    }
    
    // Generate dummy transactions
    dummyTransactions = generateDummyTransactions();
    
    // Combine real and dummy transactions
    transactions = [...originalTransactions, ...dummyTransactions];
    
    // Update UI state
    dummyModeActive = true;
    window.dummyModeActive = true; // Make it globally accessible
    updateDummyButtonState();
    
    // Refresh all visualizations and stats
    refreshAllVisualizationsWithDummies();
    
    console.log(`✅ Dummy mode activated! Total transactions: ${transactions.length}`);
    console.log(`   - Real: ${originalTransactions.length}`);
    console.log(`   - Dummy: ${dummyTransactions.length}`);
}

function checkForNewBlockAndClearDummies(newBlockHeight) {
    // ... existing code ...
    
    if (newBlockHeight > window.lastKnownBlockHeight) {
        console.log(`🎭 New block detected (${newBlockHeight}), clearing state...`);
        deactivateDummyMode();
        
        // ADDED: Clear packing state for fresh start
        if (typeof window.clearPackingState === 'function') {
            window.clearPackingState();
        }
        
        window.lastKnownBlockHeight = newBlockHeight;
    }
}


/**
 * Deactivate dummy mode - remove dummy transactions (FIXED)
 */
function deactivateDummyMode() {
    if (!dummyModeActive) {
        console.log('⚠️ Dummy mode not active');
        return;
    }
    
    console.log('🎭 Deactivating dummy transaction mode...');
    
    // IMPORTANT: Clear packing state before removing dummies
    if (typeof window.clearPackingState === 'function') {
        console.log('🔄 Clearing packing state before removing dummies...');
        window.clearPackingState();
    }
    
    // Restore original transactions
    transactions = [...originalTransactions];
    
    // Clear dummy data
    dummyTransactions = [];
    originalTransactions = [];
    
    // Update UI state
    dummyModeActive = false;
    window.dummyModeActive = false; // Clear global flag
    updateDummyButtonState();
    
    // Refresh all visualizations and stats
    refreshAllVisualizationsWithDummies();
    
    console.log(`✅ Dummy mode deactivated! Restored to ${transactions.length} real transactions`);
}

/**
 * Toggle dummy mode on/off
 */
function toggleDummyMode() {
    if (dummyModeActive) {
        deactivateDummyMode();
    } else {
        activateDummyMode();
    }
}

/**
 * Update the dummy button appearance and text
 */
function updateDummyButtonState() {
    const button = document.getElementById('pack-button');
    if (!button) return;
    
    if (dummyModeActive) {
        button.textContent = `Remove Dummies (${dummyTransactions.length})`;
        button.classList.add('packing-active');
        button.title = 'Click to remove dummy transactions and return to real mempool data';
    } else {
        button.textContent = `Add Dummies (+${DUMMY_CONFIG.transactionCount})`;
        button.classList.remove('packing-active');
        button.title = `Click to add ${DUMMY_CONFIG.transactionCount} dummy transactions for testing`;
    }
}

/**
 * Refresh all visualizations and statistics with current transaction data
 */
/**
 * Refresh visualizations WITHOUT affecting block loading (MOST EFFICIENT)
 */
function refreshAllVisualizationsWithDummies() {
    console.log('🎭 Refreshing dummy visualizations (non-blocking)...');
    
    // Use requestAnimationFrame for smooth, non-blocking updates
    requestAnimationFrame(() => {
        const isPackingMode = checkIfPackingModeActive();
        
        // Update visualization based on current mode
        if (isPackingMode) {
            if (typeof createERGOPackingVisualization === 'function') {
                createERGOPackingVisualization();
            }
        } else {
            if (typeof createVisualization === 'function') {
                createVisualization();
            }
        }
        
        // Batch update stats in next frame
        requestAnimationFrame(() => {
            batchUpdateStats();
        });
    });
}

/**
 * Batch update statistics efficiently
 */
function batchUpdateStats() {
    // Group all stat updates together for efficiency
    const updates = [];
    
    if (typeof updateStats === 'function') {
        updates.push(() => updateStats());
    }
    
    if (typeof refreshERGOPackingStats === 'function') {
        updates.push(() => refreshERGOPackingStats());
    }
    
    if (typeof populateTransactionTable === 'function') {
        updates.push(() => populateTransactionTable());
    }
    
    if (typeof updateNextBlockInfo === 'function') {
        updates.push(() => updateNextBlockInfo());
    }
    
    // Execute all updates in a single batch
    updates.forEach(update => {
        try {
            update();
        } catch (error) {
            console.warn('Non-critical update failed:', error);
        }
    });
    
    console.log('✅ Dummy visualization updates complete');
}

/**
 * Check if we should automatically remove dummy transactions
 * Call this when new block data is received
 */
function checkForNewBlockAndClearDummies(newBlockHeight) {
    if (!dummyModeActive) return;
    
    // Store the last known block height
    if (!window.lastKnownBlockHeight) {
        window.lastKnownBlockHeight = newBlockHeight;
        return;
    }
    
    // If block height increased, a new block was mined
    if (newBlockHeight > window.lastKnownBlockHeight) {
        console.log(`🎭 New block detected (${newBlockHeight}), clearing dummy transactions...`);
        deactivateDummyMode();
        window.lastKnownBlockHeight = newBlockHeight;
        
        // Show notification
        if (typeof showDummyStatus === 'function') {
            showDummyStatus('New block mined! Dummy transactions cleared.', 'success');
        }
    }
}

/**
 * Show dummy transaction status messages
 * @param {string} message - Status message
 * @param {string} type - Message type ('info', 'success', 'error')
 */
function showDummyStatus(message, type = 'info') {
    // Remove existing status
    const existingStatus = document.querySelector('.dummy-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `dummy-status ${type}`;
    statusDiv.textContent = message;
    statusDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 20px;
        padding: 12px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(-100%);
        transition: transform 0.3s ease;
        ${type === 'success' ? 'background: #27ae60;' : ''}
        ${type === 'error' ? 'background: #e74c3c;' : ''}
        ${type === 'info' ? 'background: #3498db;' : ''}
    `;
    document.body.appendChild(statusDiv);
    
    setTimeout(() => statusDiv.style.transform = 'translateX(0)', 100);
    
    const hideDelay = (type === 'info') ? 4000 : 6000;
    setTimeout(() => {
        statusDiv.style.transform = 'translateX(-100%)';
        setTimeout(() => statusDiv.remove(), 300);
    }, hideDelay);
}

/**
 * Initialize dummy transaction system
 */
function initializeDummyTransactions() {
    console.log('🎭 Initializing dummy transaction system...');
    
    // Update button text initially
    updateDummyButtonState();
    
    // Add event listener to pack button
    const packButton = document.getElementById('pack-button');
    if (packButton) {
        // Store original pack button functionality
        const originalClick = packButton.onclick;
        
        // Remove existing event listeners and replace with dummy functionality
        packButton.replaceWith(packButton.cloneNode(true));
        const newPackButton = document.getElementById('pack-button');
        
        newPackButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('🎭 Dummy button clicked');
            
            // Store the current visualization state before toggling
            const wasPackingMode = checkIfPackingModeActive();
            console.log(`🔍 Was in packing mode: ${wasPackingMode}`);
            
            toggleDummyMode();
            
            // After toggling dummy mode, restore the correct visualization
            setTimeout(() => {
                if (wasPackingMode) {
                    console.log('🔄 Restoring packing mode visualization...');
                    if (typeof createERGOPackingVisualization === 'function') {
                        createERGOPackingVisualization();
                    }
                } else {
                    console.log('🔄 Restoring grid mode visualization...');
                    if (typeof createVisualization === 'function') {
                        createVisualization();
                    }
                }
            }, 100);
        });
        
        console.log('✅ Dummy transaction button initialized');
    } else {
        console.warn('⚠️ Pack button not found for dummy transaction functionality');
    }
}

/**
 * Check if ERGO packing mode is currently active
 * @returns {boolean} - True if packing mode is active
 */
function checkIfPackingModeActive() {
    // Method 1: Check if the visualizer has packing mode class
    const visualizer = document.querySelector('.visualizer');
    if (visualizer && visualizer.classList.contains('packing-mode')) {
        return true;
    }
    
    // Method 2: Check if hexagon container exists in the mempool grid
    const hexagonContainer = document.querySelector('.ergo-packing-hexagon-container-centered');
    if (hexagonContainer) {
        return true;
    }
    
    // Method 3: Check if the pack button is in "active" state (but not dummy active)
    const packButton = document.getElementById('pack-button');
    if (packButton && packButton.classList.contains('packing-active') && !dummyModeActive) {
        return true;
    }
    
    // Method 4: Check if ERGO packing elements exist in the grid
    const mempoolGrid = document.getElementById('mempool-grid');
    if (mempoolGrid) {
        const packingContainer = mempoolGrid.querySelector('.ergo-packing-simplified-container');
        if (packingContainer) {
            return true;
        }
    }
    
    // Default to false if no packing indicators found
    return false;
}

/**
 * Get dummy transaction statistics
 * @returns {Object} - Statistics about dummy transactions
 */
function getDummyStats() {
    if (!dummyModeActive) {
        return {
            active: false,
            count: 0,
            totalSize: 0,
            totalValue: 0
        };
    }
    
    return {
        active: true,
        count: dummyTransactions.length,
        totalSize: dummyTransactions.reduce((sum, tx) => sum + tx.size, 0),
        totalValue: dummyTransactions.reduce((sum, tx) => sum + tx.value, 0),
        realTransactions: originalTransactions.length,
        totalTransactions: transactions.length
    };
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDummyTransactions);
} else {
    initializeDummyTransactions();
}

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.toggleDummyMode = toggleDummyMode;
    window.activateDummyMode = activateDummyMode;
    window.deactivateDummyMode = deactivateDummyMode;
    window.getDummyStats = getDummyStats;
    window.checkForNewBlockAndClearDummies = checkForNewBlockAndClearDummies;
}

console.log('✅ Dummy transaction system loaded successfully');