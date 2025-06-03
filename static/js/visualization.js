// visualization.js - Enhanced mempool visualization with ERGO packing integration

// Add a new visualization mode
let visualizationMode = 'grid'; // 'grid' or 'packing'

// Configuration for transaction type detection (keeping existing)
const TRANSACTION_TYPES = {
    DONATION: {
        icon: '💖',
        color: '#e74c3c',
        addresses: ['9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx']
    },
    TEST: {
        icon: '🧪',
        color: '#f39c12',
    },
    REGULAR: {
        icon: '',
        color: null
    }
};

// Track test transactions by storing their IDs when they're created
let testTransactionIds = new Set();

/**
 * Registers a transaction as a test transaction
 */
function trackSpecialTransaction(txId, type = 'test') {
    if (type === 'test') {
        testTransactionIds.add(txId);
        console.log(`🧪 Registered test transaction: ${txId}`);
        console.log(`🧪 Total test transactions tracked: ${testTransactionIds.size}`);
        console.log(`🧪 All tracked test IDs:`, Array.from(testTransactionIds));
        
        setTimeout(() => {
            console.log(`🔍 Checking if ${txId} is in tracked set:`, testTransactionIds.has(txId));
        }, 100);
    }
    
    // Optional: Force refresh mempool visualization to show the new transaction
    setTimeout(() => {
        if (typeof loadTransactions === 'function') {
            console.log('🔄 Refreshing transactions to show new test transaction');
            loadTransactions();
        }
    }, 1000);
}

/**
 * Identifies the type of transaction based on outputs
 */
function identifyTransactionType(transaction) {
    // Check test transactions first
    if (testTransactionIds.has(transaction.id)) {
        console.log('✅ Identified as TEST transaction:', transaction.id);
        return TRANSACTION_TYPES.TEST;
    }
    
    // Then check if any output goes to donation address
    if (transaction.outputs && transaction.outputs.length > 0) {
        for (const output of transaction.outputs) {
            if (output.address && TRANSACTION_TYPES.DONATION.addresses.includes(output.address)) {
                console.log('✅ Identified as DONATION transaction:', transaction.id);
                return TRANSACTION_TYPES.DONATION;
            }
        }
    }
    
    // Debug logging to understand transaction structure (only when we have test transactions)
    if (testTransactionIds.size > 0) {
        console.log('📄 Regular transaction:', transaction.id);
    }
    
    return TRANSACTION_TYPES.REGULAR;
}

/**
 * Get color based on transaction size
 */
function getColorBySize(size, maxSize) {
    const normalized = Math.min(size / maxSize, 1);
    const index = Math.floor(normalized * (sizeColors.length - 1));
    return sizeColors[index];
}

/**
 * Get color based on transaction value
 */
function getColorByValue(value, maxValue) {
    const normalized = Math.min(value / maxValue, 1);
    const index = Math.floor(normalized * (valueColors.length - 1));
    return valueColors[index];
}

/**
 * Calculate square size based on value
 */
function getSquareSize(value, maxValue, minSize = 8, maxSizePixels = 24) {
    const normalized = Math.min(value / maxValue, 1);
    return Math.max(minSize, Math.floor(minSize + (maxSizePixels - minSize) * normalized));
}

/**
 * Main visualization function - handles both grid and packing modes
 */
function createVisualization() {
    console.log(`🎨 Creating visualization in ${visualizationMode} mode`);
    
    // Update UI classes based on mode
    updateVisualizationModeClasses();
    
    if (visualizationMode === 'packing') {
        // Use ERGO packing visualization
        if (typeof createERGOPackingVisualization === 'function') {
            createERGOPackingVisualization();
        } else {
            console.error('ERGO packing visualization not available');
            // Fallback to grid mode
            visualizationMode = 'grid';
            createGridVisualization();
        }
    } else {
        // Use traditional grid visualization
        createGridVisualization();
    }
}

/**
 * Update CSS classes based on visualization mode
 */
function updateVisualizationModeClasses() {
    const visualizer = document.querySelector('.visualizer');
    const controls = document.querySelector('.controls');
    const stats = document.querySelector('.stats');
    
    if (visualizationMode === 'packing') {
        visualizer?.classList.add('packing-mode');
        controls?.classList.add('packing-mode');
        stats?.classList.add('packing-mode');
    } else {
        visualizer?.classList.remove('packing-mode');
        controls?.classList.remove('packing-mode');
        stats?.classList.remove('packing-mode');
    }
}

/**
 * Traditional grid visualization (existing functionality)
 */
/**
 * Create the main mempool visualization grid with enhanced transaction type detection
 * Uses global variables: transactions, colorMode, walletConnector
 */
function createVisualization() {
    const grid = document.getElementById('mempool-grid');
    grid.innerHTML = '';

    if (transactions.length === 0) {
        grid.innerHTML = '<div class="loading">No transactions available</div>';
        return;
    }

    const maxSize = Math.max(...transactions.map(tx => tx.size || 0));
    const maxValue = Math.max(...transactions.map(tx => tx.value || 0));

    // Limit to first 500 transactions for performance
    const displayTransactions = transactions.slice(0, 500);

    displayTransactions.forEach((tx, index) => {
        const square = document.createElement('div');
        square.className = 'transaction-square';
        square.style.position = 'relative'; // Important for icon positioning
        
        // Identify transaction type
        const transactionType = identifyTransactionType(tx);
        
        const size = getSquareSize(colorMode === 'size' ? tx.size : tx.value, 
                                 colorMode === 'size' ? maxSize : maxValue);
        
        // UPDATED: Check for dummy transactions FIRST, then determine color
        let color;
        if (tx.isDummy) {
            // Use pink color for dummy transactions
            color = tx.dummyColor || '#e91e63';
            square.dataset.type = 'dummy';
            square.classList.add('dummy-transaction');
        } else {
            // Regular color logic for real transactions
            color = colorMode === 'size' 
                ? getColorBySize(tx.size || 0, maxSize)
                : getColorByValue(tx.value || 0, maxValue);
        }

        square.style.width = `${size}px`;
        square.style.height = `${size}px`;
        square.style.backgroundColor = color;
        square.style.gridColumn = `span ${Math.max(1, Math.floor(size / 8))}`;
        square.style.gridRow = `span ${Math.max(1, Math.floor(size / 8))}`;

        // Add transaction type styling (but don't override dummy styling)
        if (!tx.isDummy && transactionType.color) {
            square.dataset.type = transactionType === TRANSACTION_TYPES.DONATION ? 'donation' : 'test';
            square.style.border = `2px solid ${transactionType.color}`;
        }

        // Check if this transaction involves the connected wallet
        if (walletConnector.isConnected && walletConnector.connectedAddress) {
            if (isWalletTransaction(tx, walletConnector.connectedAddress)) {
                square.classList.add('wallet-transaction');
                // Enhanced gold glow effect - much larger and more prominent
                square.style.border = '3px solid #f39c12';
                square.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.9), 0 0 30px rgba(243, 156, 18, 0.6), 0 0 45px rgba(243, 156, 18, 0.3)';
                square.style.zIndex = '10';
                square.style.position = 'relative';
                
                // Add subtle pulsing animation
                square.style.animation = 'walletGlow 2s ease-in-out infinite alternate';
            }
        }

        // Add transaction type icon if it has one (but not for dummy transactions - they have CSS icon)
        if (!tx.isDummy && transactionType.icon) {
            const iconOverlay = document.createElement('div');
            iconOverlay.className = 'transaction-type-icon';
            iconOverlay.textContent = transactionType.icon;
            iconOverlay.style.cssText = `
                position: absolute;
                top: 1px;
                right: 1px;
                font-size: ${Math.min(size * 0.4, 12)}px;
                z-index: 20;
                pointer-events: none;
                text-shadow: 0 0 3px rgba(0,0,0,0.8);
                filter: drop-shadow(0 0 2px rgba(255,255,255,0.3));
                line-height: 1;
            `;
            square.appendChild(iconOverlay);
        }

        // Add hover events for tooltip
        square.addEventListener('mouseenter', (e) => {
            showTooltipEnhanced(e, tx, transactionType);
        });

        square.addEventListener('mouseleave', () => {
            hideTooltip();
        });

        // Add click event to open transaction in new tab
        square.addEventListener('click', () => {
            window.open(`https://sigmaspace.io/en/transaction/${tx.id}`, '_blank');
        });

        grid.appendChild(square);
    });
}


/**
 * Enhanced tooltip function that shows transaction type
 * @param {MouseEvent} event - Mouse event for positioning
 * @param {Object} tx - Transaction object
 * @param {Object} transactionType - Transaction type object
 */
function showTooltipEnhanced(event, tx, transactionType) {
    const tooltip = document.getElementById('tooltip');
    const usdValue = tx.usd_value || 0;
    const shortId = shortenTransactionId(tx.id, 8, 8); // Use 8 chars for tooltip
    
    // Check if this is a wallet transaction
    const isWalletTx = walletConnector.isConnected && walletConnector.connectedAddress && 
                      isWalletTransaction(tx, walletConnector.connectedAddress);
    
    let walletInfo = '';
    if (isWalletTx) {
        walletInfo = '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>';
    }
    
    // UPDATED: Add transaction type info with dummy transaction support
    let typeInfo = '';
    if (tx.isDummy) {
        typeInfo = '<div style="color: #e91e63; font-weight: bold; margin-bottom: 4px;">🎭 Dummy Transaction (Test Data)</div>';
    } else if (transactionType === TRANSACTION_TYPES.DONATION) {
        typeInfo = '<div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>';
    } else if (transactionType === TRANSACTION_TYPES.TEST) {
        typeInfo = '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>';
    }
    
    tooltip.innerHTML = `
        ${walletInfo}
        ${typeInfo}
        <strong>Transaction</strong><br>
        ID: ${shortId}<br>
        Size: ${tx.size || 'N/A'} bytes<br>
        Value: ${(tx.value || 0).toFixed(4)} ERG<br>
        Value: ${usdValue.toFixed(2)} USD
    `;
    tooltip.style.display = 'block';
    tooltip.style.left = event.pageX + 10 + 'px';
    tooltip.style.top = event.pageY - 10 + 'px';
}

/**
 * Show tooltip on transaction hover (legacy function for compatibility)
 */
function showTooltip(event, tx) {
    const transactionType = identifyTransactionType(tx);
    showTooltipEnhanced(event, tx, transactionType);
}

/**
 * Hide the transaction tooltip
 */
function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

/**
 * Switch visualization mode between grid and packing
 */
function switchVisualizationMode(mode) {
    console.log(`🔄 Switching visualization mode from ${visualizationMode} to ${mode}`);
    
    if (visualizationMode === mode) {
        console.log('Already in requested mode, skipping switch');
        return;
    }
    
    visualizationMode = mode;
    
    // Update button states
    updateVisualizationButtons();
    
    // Recreate visualization in new mode
    createVisualization();
    
    console.log(`✅ Successfully switched to ${mode} mode`);
}

/**
 * Update visualization control button states
 */
function updateVisualizationButtons() {
    // Remove active states from all buttons
    document.querySelectorAll('.control-button').forEach(btn => {
        btn.classList.remove('active', 'packing-active');
    });
    
    // Set active state based on current modes
    if (visualizationMode === 'packing') {
        const packButton = document.getElementById('pack-button');
        if (packButton) {
            packButton.classList.add('active', 'packing-active');
        }
    } else {
        // Set active state for color mode buttons in grid mode
        if (colorMode === 'size') {
            document.getElementById('color-by-size')?.classList.add('active');
        } else {
            document.getElementById('color-by-value')?.classList.add('active');
        }
    }
}

/**
 * Initialize visualization control event listeners including the new Pack button
 */
function initializeVisualizationControls() {
    // Existing color mode buttons
    document.getElementById('color-by-size').addEventListener('click', function() {
        colorMode = 'size';
        visualizationMode = 'grid'; // Ensure we're in grid mode for color controls
        updateVisualizationButtons();
        createVisualization();
    });

    document.getElementById('color-by-value').addEventListener('click', function() {
        colorMode = 'value';
        visualizationMode = 'grid'; // Ensure we're in grid mode for color controls
        updateVisualizationButtons();
        createVisualization();
    });
    
    // New Pack button
    const packButton = document.getElementById('pack-button');
    if (packButton) {
        packButton.addEventListener('click', function() {
            switchVisualizationMode('packing');
        });
        console.log('✅ Pack button event listener registered');
    } else {
        console.warn('⚠️ Pack button not found in DOM');
    }
    
    // Refresh button (existing)
    document.getElementById('refresh-data')?.addEventListener('click', function() {
        this.textContent = 'Refreshing...';
        loadTransactions();
        loadBlockLabels();
        loadPrice();
        setTimeout(() => {
            this.textContent = 'Refresh Data';
        }, 1000);
    });
    
    // Set initial button states
    updateVisualizationButtons();
}

/**
 * Refresh current visualization mode
 */
function refreshCurrentVisualization() {
    console.log(`🔄 Refreshing ${visualizationMode} visualization`);
    
    if (visualizationMode === 'packing') {
        // Refresh packing visualization
        if (typeof refreshERGOPacking === 'function') {
            refreshERGOPacking();
        } else {
            console.warn('ERGO packing refresh function not available, falling back to recreation');
            createVisualization();
        }
    } else {
        // Refresh grid visualization
        createVisualization();
    }
}

/**
 * Public function to handle transaction updates
 */
function updateVisualizationWithNewTransactions() {
    console.log('📦 Updating visualization with new transaction data');
    
    // Update stats regardless of mode
    updateStats();
    
    // Refresh current visualization
    refreshCurrentVisualization();
    
    // Update transaction table
    populateTransactionTable();
}

// Add CSS styles for transaction type icons and enhancements
function addTransactionIconStyles() {
    if (document.querySelector('#transaction-icon-styles')) {
        return; // Styles already added
    }
    
    const styleElement = document.createElement('style');
    styleElement.id = 'transaction-icon-styles';
    styleElement.textContent = `
        .transaction-square {
            transition: all 0.3s ease;
        }
        
        .transaction-type-icon {
            animation: iconPulse 2s infinite ease-in-out;
        }
        
        @keyframes iconPulse {
            0%, 100% { 
                transform: scale(1); 
                opacity: 0.9;
            }
            50% { 
                transform: scale(1.1); 
                opacity: 1;
            }
        }
        
        .transaction-square[data-type="donation"] {
            animation: donationGlow 3s infinite ease-in-out;
        }
        
        .transaction-square[data-type="test"] {
            animation: testGlow 2s infinite ease-in-out;
        }
        
        @keyframes donationGlow {
            0%, 100% { 
                box-shadow: 0 0 8px #e74c3c40;
            }
            50% { 
                box-shadow: 0 0 12px #e74c3c80;
            }
        }
        
        @keyframes testGlow {
            0%, 100% { 
                box-shadow: 0 0 8px #f39c1240;
            }
            50% { 
                box-shadow: 0 0 12px #f39c1280;
            }
        }
        
        /* Enhanced hover effects for special transactions */
        .transaction-square[data-type="donation"]:hover,
        .transaction-square[data-type="test"]:hover {
            transform: scale(1.05);
            z-index: 100;
        }
        
        /* Pack button specific styling */
        .control-button#pack-button {
            background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
            border: 2px solid #27ae60;
            font-weight: 600;
            position: relative;
            overflow: hidden;
        }
        
        .control-button#pack-button::before {
            content: '📦';
            margin-right: 8px;
        }
        
        .control-button#pack-button::after {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
            transition: left 0.5s ease;
        }
        
        .control-button#pack-button:hover::after {
            left: 100%;
        }
        
        .control-button#pack-button:hover {
            background: linear-gradient(135deg, #2ecc71 0%, #58d68d 100%);
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
        }
        
        .control-button#pack-button.packing-active {
            background: linear-gradient(135deg, #e8731f 0%, #f39c12 100%);
            border-color: #e8731f;
            box-shadow: 0 4px 15px rgba(232, 115, 31, 0.4);
        }
        
        .control-button#pack-button.packing-active:hover {
            background: linear-gradient(135deg, #f39c12 0%, #f5b041 100%);
            box-shadow: 0 6px 20px rgba(232, 115, 31, 0.5);
        }
    `;
    document.head.appendChild(styleElement);
}

/**
 * Enhanced wallet transaction detection and highlighting
 */
function applyWalletHighlighting(transaction, square, size = 16) {
    // Check if wallet is connected and we have an address
    if (!walletConnector?.isConnected || !walletConnector.connectedAddress) {
        return false;
    }
    
    // Check if this transaction involves the wallet
    const isWallet = isWalletTransaction(transaction, walletConnector.connectedAddress);
    
    if (isWallet) {
        console.log(`🌟 Applying wallet highlighting to transaction: ${transaction.id.substring(0, 8)}...`);
        
        // Add wallet transaction class
        square.classList.add('wallet-transaction');
        
        // Add large-square class for enhanced glow on bigger squares
        if (size > 16) {
            square.classList.add('large-square');
        }
        
        // Enhanced styling for wallet transactions
        square.style.border = `${Math.max(2, Math.min(4, Math.floor(size / 6)))}px solid #f39c12`;
        square.style.boxShadow = `
            0 0 ${Math.max(6, size * 0.4)}px rgba(243, 156, 18, 0.8), 
            0 0 ${Math.max(12, size * 0.8)}px rgba(243, 156, 18, 0.6), 
            0 0 ${Math.max(18, size * 1.2)}px rgba(243, 156, 18, 0.4)
        `;
        square.style.zIndex = '50';
        square.style.position = 'relative';
        
        // Apply animation
        square.style.animation = 'walletGlow 2s ease-in-out infinite alternate';
        
        return true;
    }
    
    return false;
}

/**
 * Debug function to test wallet detection
 */
function debugWalletDetection() {
    console.log('🐛 === WALLET DETECTION DEBUG ===');
    
    console.log('Wallet Connection Status:');
    console.log('  - Connected:', walletConnector?.isConnected);
    console.log('  - Address:', walletConnector?.connectedAddress?.substring(0, 20) + '...');
    
    if (transactions && transactions.length > 0) {
        console.log(`\nChecking ${transactions.length} transactions for wallet involvement...`);
        
        let walletTransactionCount = 0;
        transactions.slice(0, 5).forEach((tx, index) => {
            const isWallet = isWalletTransaction(tx, walletConnector?.connectedAddress);
            if (isWallet) {
                walletTransactionCount++;
                console.log(`✅ Transaction ${index + 1}: ${tx.id.substring(0, 8)}... IS wallet transaction`);
            } else {
                console.log(`❌ Transaction ${index + 1}: ${tx.id.substring(0, 8)}... NOT wallet transaction`);
            }
        });
        
        console.log(`\nSummary: Found ${walletTransactionCount} wallet transactions in first 5`);
        
        // Check if any squares have wallet highlighting
        const walletSquares = document.querySelectorAll('.wallet-transaction');
        console.log(`\nUI Elements: Found ${walletSquares.length} elements with wallet-transaction class`);
    } else {
        console.log('No transactions available to check');
    }
    
    console.log('🐛 === DEBUG COMPLETE ===');
}

// Export debug functions
if (typeof window !== 'undefined') {
    window.debugWalletDetection = debugWalletDetection;
    window.applyWalletHighlighting = applyWalletHighlighting;
}

/**
 * Initialize the visualization system
 */
function initializeVisualizationSystem() {
    console.log('🎨 Initializing enhanced visualization system');
    
    // Add CSS styles
    addTransactionIconStyles();
    
    // Initialize controls
    initializeVisualizationControls();
    
    // Set initial mode
    visualizationMode = 'grid';
    colorMode = colorMode || 'size';
    
    console.log('✅ Visualization system initialized');
}

/**
 * Handle mode switching from external calls (like button clicks)
 */
function handleVisualizationModeSwitch(newMode) {
    console.log(`🎯 External request to switch to ${newMode} mode`);
    
    if (newMode === 'packing') {
        switchVisualizationMode('packing');
    } else {
        // For grid mode, maintain current color mode
        switchVisualizationMode('grid');
    }
}

/**
 * Get current visualization state
 */
function getVisualizationState() {
    return {
        mode: visualizationMode,
        colorMode: colorMode,
        transactionCount: transactions ? transactions.length : 0,
        testTransactionCount: testTransactionIds.size
    };
}

// Initialize styles when the script loads
addTransactionIconStyles();

// Export functions for use in other modules
if (typeof window !== 'undefined') {
    window.trackSpecialTransaction = trackSpecialTransaction;
    window.switchVisualizationMode = switchVisualizationMode;
    window.handleVisualizationModeSwitch = handleVisualizationModeSwitch;
    window.refreshCurrentVisualization = refreshCurrentVisualization;
    window.updateVisualizationWithNewTransactions = updateVisualizationWithNewTransactions;
    window.getVisualizationState = getVisualizationState;
    window.initializeVisualizationSystem = initializeVisualizationSystem;
}