// visualization.js - Mempool visualization and tooltip functions

/**
 * Get color based on transaction size
 * @param {number} size - Transaction size in bytes
 * @param {number} maxSize - Maximum size in the dataset
 * @returns {string} - Hex color code
 */
function getColorBySize(size, maxSize) {
    const normalized = Math.min(size / maxSize, 1);
    const index = Math.floor(normalized * (sizeColors.length - 1));
    return sizeColors[index];
}

/**
 * Get color based on transaction value
 * @param {number} value - Transaction value in ERG
 * @param {number} maxValue - Maximum value in the dataset
 * @returns {string} - Hex color code
 */
function getColorByValue(value, maxValue) {
    const normalized = Math.min(value / maxValue, 1);
    const index = Math.floor(normalized * (valueColors.length - 1));
    return valueColors[index];
}

/**
 * Calculate square size based on value
 * @param {number} value - The value to base size on
 * @param {number} maxValue - Maximum value in the dataset
 * @param {number} minSize - Minimum square size in pixels
 * @param {number} maxSizePixels - Maximum square size in pixels
 * @returns {number} - Square size in pixels
 */
function getSquareSize(value, maxValue, minSize = 8, maxSizePixels = 24) {
    const normalized = Math.min(value / maxValue, 1);
    return Math.max(minSize, Math.floor(minSize + (maxSizePixels - minSize) * normalized));
}

/**
 * Create the main mempool visualization grid
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
        
        const size = getSquareSize(colorMode === 'size' ? tx.size : tx.value, 
                                 colorMode === 'size' ? maxSize : maxValue);
        
        const color = colorMode === 'size' 
            ? getColorBySize(tx.size || 0, maxSize)
            : getColorByValue(tx.value || 0, maxValue);

        square.style.width = `${size}px`;
        square.style.height = `${size}px`;
        square.style.backgroundColor = color;
        square.style.gridColumn = `span ${Math.max(1, Math.floor(size / 8))}`;
        square.style.gridRow = `span ${Math.max(1, Math.floor(size / 8))}`;

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

        // Add hover events for tooltip
        square.addEventListener('mouseenter', (e) => {
            showTooltip(e, tx);
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
 * Show tooltip on transaction hover
 * @param {MouseEvent} event - Mouse event for positioning
 * @param {Object} tx - Transaction object
 */
function showTooltip(event, tx) {
    const tooltip = document.getElementById('tooltip');
    const usdValue = tx.usd_value || 0;
    const shortId = shortenTransactionId(tx.id, 8, 8); // Use 8 chars for tooltip
    
    // Check if this is a wallet transaction
    const isWalletTx = walletConnector.isConnected && walletConnector.connectedAddress && 
                      isWalletTransaction(tx, walletConnector.connectedAddress);
    
    let walletInfo = '';
    if (isWalletTx) {
        // Options: 💰 🔥 ⭐ 💎 🎯 ⚡ 🌟 👑 🔸 🟡 🔶 🟠
        walletInfo = '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>';
    }
    
    tooltip.innerHTML = `
        ${walletInfo}
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
 * Hide the transaction tooltip
 */
function hideTooltip() {
    document.getElementById('tooltip').style.display = 'none';
}

/**
 * Initialize visualization control event listeners
 * Sets up color mode switching buttons
 */
function initializeVisualizationControls() {
    document.getElementById('color-by-size').addEventListener('click', function() {
        colorMode = 'size';
        document.querySelectorAll('.control-button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        createVisualization();
    });

    document.getElementById('color-by-value').addEventListener('click', function() {
        colorMode = 'value';
        document.querySelectorAll('.control-button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
        createVisualization();
    });
}