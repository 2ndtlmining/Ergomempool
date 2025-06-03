// transactions.js - Transaction table and utility functions

/**
 * Shorten transaction IDs for display
 * @param {string} id - Full transaction ID
 * @param {number} startChars - Number of characters to show at start
 * @param {number} endChars - Number of characters to show at end
 * @returns {string} - Shortened transaction ID
 */
function shortenTransactionId(id, startChars = 5, endChars = 5) {
    if (!id || id.length <= startChars + endChars + 3) {
        return id; // Return original if too short
    }
    return `${id.substring(0, startChars)}...${id.substring(id.length - endChars)}`;
}

/**
 * Populate the transaction table with recent transactions
 * Uses global variables: transactions, walletConnector
 */
function populateTransactionTable() {
    const tbody = document.querySelector('#transaction-table tbody');
    tbody.innerHTML = '';

    // Show first 20 transactions in table
    const displayTransactions = transactions.slice(0, 20);

    displayTransactions.forEach(tx => {
        const usdValue = tx.usd_value || 0;
        const shortId = shortenTransactionId(tx.id); // Default 5+5 chars for table
        
        // Check if this is a wallet transaction
        const isWalletTx = walletConnector.isConnected && walletConnector.connectedAddress && 
                          isWalletTransaction(tx, walletConnector.connectedAddress);
        
        const row = document.createElement('tr');
        if (isWalletTx) {
            row.classList.add('wallet-transaction-row');
            row.style.backgroundColor = 'rgba(243, 156, 18, 0.1)';
            row.style.borderLeft = '3px solid #f39c12';
        }
        
        row.innerHTML = `
            <td>
                ${isWalletTx ? '<span style="color: #f39c12; margin-right: 4px;">🌟</span>' : ''}
                <a href="https://sigmaspace.io/en/transaction/${tx.id}" target="_blank">${shortId}</a>
            </td>
            <td>${tx.size || 'N/A'}</td>
            <td>${(tx.value || 0).toFixed(4)}</td>
            <td>${usdValue.toFixed(2)}</td>
        `;
        tbody.appendChild(row);
    });

    if (displayTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="loading">No transactions available</td></tr>';
    }
}

/**
 * Update the stats display with current transaction data
 * Uses global variables: transactions
 */
/**
 * Update the stats display with current transaction data - FIXED VERSION
 * Uses global variables: transactions
 */
function updateStats() {
    console.log('📊 === STARTING STATS UPDATE ===');
    console.log('📊 Transactions array length:', transactions ? transactions.length : 'undefined');
    console.log('📊 Transactions array type:', typeof transactions);
    
    if (!transactions || !Array.isArray(transactions)) {
        console.error('❌ Invalid transactions data in updateStats');
        return;
    }
    
    // Calculate basic mempool stats
    const totalTx = transactions.length;
    const totalValue = transactions.reduce((sum, tx) => sum + (tx.value || 0), 0);
    const totalUsdValue = transactions.reduce((sum, tx) => sum + (tx.usd_value || 0), 0);
    const avgSize = totalTx > 0 ? Math.round(transactions.reduce((sum, tx) => sum + (tx.size || 0), 0) / totalTx) : 0;

    console.log('📊 Basic stats calculated:', {
        totalTx,
        totalValue: totalValue.toFixed(2),
        totalUsdValue: totalUsdValue.toFixed(2),
        avgSize
    });

    // Update basic stats display
    document.getElementById('total-transactions').textContent = totalTx;
    document.getElementById('total-value').textContent = totalValue.toFixed(2);
    document.getElementById('total-usd-value').textContent = '$' + totalUsdValue.toFixed(2);
    document.getElementById('avg-size').textContent = avgSize;
    
    // Calculate and update ERGO packing stats using THE SAME transactions array
    console.log('🔍 Checking for ERGO packing functions...');
    
    if (typeof refreshERGOPackingStats === 'function') {
        console.log('✅ refreshERGOPackingStats found, calling it with', totalTx, 'transactions...');
        try {
            const result = refreshERGOPackingStats();
            console.log('📊 ERGO stats refresh result:', result);
            
            // Verify the counts match
            if (result && result.totalTransactions !== totalTx) {
                console.warn('⚠️ MISMATCH DETECTED!');
                console.warn('Main stats:', totalTx, 'transactions');
                console.warn('ERGO stats:', result.totalTransactions, 'transactions');
                
                // Force recalculation with explicit data
                console.log('🔄 Forcing ERGO stats recalculation...');
                if (typeof calculateERGOPackingStats === 'function' && typeof updateERGOPackingStatsDisplay === 'function') {
                    const forcedStats = calculateERGOPackingStats(transactions);
                    updateERGOPackingStatsDisplay(forcedStats);
                    console.log('✅ Forced ERGO stats update completed');
                }
            }
        } catch (error) {
            console.error('❌ Error refreshing ERGO stats:', error);
        }
    } else {
        console.warn('⚠️ refreshERGOPackingStats function not available');
        
        // Fallback: try the individual functions directly with the same transactions array
        if (typeof calculateERGOPackingStats === 'function' && typeof updateERGOPackingStatsDisplay === 'function') {
            console.log('✅ Using fallback ERGO stats calculation...');
            try {
                const stats = calculateERGOPackingStats(transactions); // Use the SAME transactions array
                updateERGOPackingStatsDisplay(stats);
                console.log('📊 ERGO stats updated via fallback');
                
                // Verify the counts match
                if (stats.totalTransactions !== totalTx) {
                    console.error('❌ FALLBACK MISMATCH!');
                    console.error('Main stats:', totalTx, 'transactions');
                    console.error('ERGO stats:', stats.totalTransactions, 'transactions');
                }
            } catch (error) {
                console.error('❌ Error in fallback ERGO stats:', error);
            }
        } else {
            console.warn('⚠️ ERGO packing functions not available - stats will not update');
        }
    }
    
    console.log('📊 === STATS UPDATE COMPLETE ===');
}