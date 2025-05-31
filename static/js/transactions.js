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
function updateStats() {
    const totalTx = transactions.length;
    const totalValue = transactions.reduce((sum, tx) => sum + (tx.value || 0), 0);
    const totalUsdValue = transactions.reduce((sum, tx) => sum + (tx.usd_value || 0), 0);
    const avgSize = totalTx > 0 ? Math.round(transactions.reduce((sum, tx) => sum + (tx.size || 0), 0) / totalTx) : 0;

    document.getElementById('total-transactions').textContent = totalTx;
    document.getElementById('total-value').textContent = totalValue.toFixed(2);
    document.getElementById('total-usd-value').textContent = '$' + totalUsdValue.toFixed(2);
    document.getElementById('avg-size').textContent = avgSize;
}