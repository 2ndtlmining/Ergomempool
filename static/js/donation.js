// donation.js - Fixed Donation functionality with single signing attempt

// Donation configuration
const DONATION_CONFIG = {
    recipientAddress: "9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx",
    defaultAmount: "1.0", // ERG
    minAmount: "0.001", // ERG  
    maxAmount: "100.0" // ERG
};

/**
 * Convert ERG to nanoERG (1 ERG = 1,000,000,000 nanoERG)
 * @param {string|number} ergAmount - Amount in ERG
 * @returns {string} - Amount in nanoERG as string
 */
function ergToNanoErg(ergAmount) {
    const erg = parseFloat(ergAmount);
    return (erg * 1000000000).toString();
}

/**
 * Validate donation amount
 * @param {string} amount - Amount in ERG
 * @returns {boolean} - Whether amount is valid
 */
function validateDonationAmount(amount) {
    const ergAmount = parseFloat(amount);
    return !isNaN(ergAmount) && 
           ergAmount >= parseFloat(DONATION_CONFIG.minAmount) && 
           ergAmount <= parseFloat(DONATION_CONFIG.maxAmount);
}

/**
 * Get current blockchain height
 * @returns {Promise<number>} - Current height
 */
async function getCurrentHeight() {
    try {
        // Try wallet method first (if available)
        if (window.ergo && typeof window.ergo.get_current_height === 'function') {
            try {
                const height = await window.ergo.get_current_height();
                console.log('Height from wallet:', height);
                return height;
            } catch (walletError) {
                console.log('Wallet height method failed, using API fallback');
            }
        }
        
        // Fallback to public API
        const response = await fetch('https://api.ergoplatform.com/api/v1/blocks?limit=1');
        const data = await response.json();
        console.log('Height from API:', data.items[0].height);
        return data.items[0].height;
    } catch (error) {
        console.error('Error fetching current height:', error);
        return 1200000; // Fallback height
    }
}

/**
 * Process donation using the simplest EIP-12 transaction format
 * @param {string} donationAmount - Amount in ERG to donate
 * @returns {Promise<string>} - Transaction ID
 */
async function processDonation(donationAmount) {
    try {
        console.log('Starting donation process for', donationAmount, 'ERG');
        showDonationStatus('Preparing donation...', 'info');

        // Validate inputs
        if (!walletConnector?.isConnected) {
            throw new Error('Wallet not connected');
        }

        if (!validateDonationAmount(donationAmount)) {
            throw new Error(`Invalid amount. Must be between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`);
        }

        // Convert to nanoERG
        const donationNanoErg = ergToNanoErg(donationAmount);
        console.log('Donation amount (nanoERG):', donationNanoErg);

        // Get wallet information
        showDonationStatus('Getting wallet information...', 'info');
        
        try {
            const [changeAddress, balance] = await Promise.all([
                window.ergo.get_change_address(),
                window.ergo.get_balance()
            ]);

            console.log('Wallet data gathered:');
            console.log('- Change address:', changeAddress);
            console.log('- Wallet balance (nanoERG):', balance);

            // Check balance (rough check - wallet will do the precise calculation)
            const estimatedFee = 1000000; // 0.001 ERG in nanoERG
            const totalNeeded = BigInt(donationNanoErg) + BigInt(estimatedFee);
            const availableBalance = BigInt(balance);

            if (availableBalance < totalNeeded) {
                const availableERG = Number(availableBalance) / 1e9;
                const neededERG = Number(totalNeeded) / 1e9;
                throw new Error(`Insufficient funds. Need approximately ${neededERG.toFixed(3)} ERG, have ${availableERG.toFixed(3)} ERG`);
            }

            // Build transaction using the simplest format that lets the wallet handle everything
            showDonationStatus('Building transaction...', 'info');

            // Use the simplest possible transaction format - let the wallet handle UTXO selection, fees, etc.
            const transactionRequest = {
                outputs: [
                    {
                        address: DONATION_CONFIG.recipientAddress,
                        value: donationNanoErg
                    }
                ],
                sendChangeTo: changeAddress
            };

            console.log('Transaction request (simple format):', JSON.stringify(transactionRequest, null, 2));

            // Sign transaction - SINGLE ATTEMPT ONLY
            showDonationStatus('Please approve the transaction in your wallet...', 'info');
            
            let signedTransaction;
            try {
                signedTransaction = await window.ergo.sign_tx(transactionRequest);
                console.log('Transaction signed successfully');
                
            } catch (signError) {
                console.error('Transaction signing failed:', signError);
                
                // Check for user rejection - be very specific about the error detection
                if (signError.info === "User rejected." || 
                    signError.message?.toLowerCase().includes('rejected') || 
                    signError.message?.toLowerCase().includes('denied') || 
                    signError.message?.toLowerCase().includes('cancelled') ||
                    signError.message?.toLowerCase().includes('user') ||
                    signError.code === 1 || 
                    signError.code === 2) {
                    throw new Error('Transaction was cancelled by user');
                }
                
                // For any other error, provide the actual error message
                let errorMessage = 'Transaction signing failed';
                if (signError.message) {
                    errorMessage += `: ${signError.message}`;
                } else if (signError.info) {
                    errorMessage += `: ${signError.info}`;
                } else if (signError.code) {
                    errorMessage += ` (Error code: ${signError.code})`;
                } else {
                    errorMessage += ': Unknown wallet error';
                }
                
                throw new Error(errorMessage);
            }

            // Submit transaction
            showDonationStatus('Submitting transaction to blockchain...', 'info');
            
            let txId;
            try {
                txId = await window.ergo.submit_tx(signedTransaction);
                console.log('Transaction submitted successfully:', txId);
            } catch (submitError) {
                console.error('Submit error:', submitError);
                throw new Error(`Transaction submission failed: ${submitError.message || 'Network error'}`);
            }

            // Success!
            showDonationStatus(`Donation successful! TX: ${txId.substring(0, 16)}...`, 'success');
            console.log('Full transaction ID:', txId);
            
            // Optional: Open transaction in explorer
            setTimeout(() => {
                if (confirm(`Donation sent successfully!\n\nTransaction ID: ${txId}\n\nWould you like to view it in the blockchain explorer?`)) {
                    window.open(`https://explorer.ergoplatform.com/en/transactions/${txId}`, '_blank');
                }
            }, 2000);
            
            return txId;

        } catch (walletError) {
            console.error('Wallet operation failed:', walletError);
            
            // Don't wrap user cancellation errors
            if (walletError.message?.includes('cancelled by user')) {
                throw walletError;
            }
            
            throw new Error(`Wallet error: ${walletError.message || 'Failed to communicate with wallet'}`);
        }

    } catch (error) {
        console.error('Donation error details:', error);
        
        let errorMessage = 'Donation failed: ';
        if (error.message.includes('cancelled') || error.message.includes('rejected') || error.message.includes('denied')) {
            errorMessage += 'Transaction was cancelled by user';
        } else if (error.message.includes('Insufficient funds') || error.message.includes('insufficient')) {
            errorMessage += error.message;
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage += 'Network error. Please try again.';
        } else {
            errorMessage += error.message || 'Unknown error occurred';
        }
        
        showDonationStatus(errorMessage, 'error');
        throw error;
    }
}

/**
 * Show donation status messages
 * @param {string} message - Status message
 * @param {string} type - Message type (info, success, error)
 */
function showDonationStatus(message, type = 'info') {
    // Remove existing status
    const existingStatus = document.querySelector('.donation-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `donation-status ${type}`;
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);
    
    // Show with animation
    setTimeout(() => statusDiv.classList.add('show'), 100);
    
    // Hide after delay
    const hideDelay = (type === 'info') ? 4000 : 6000;
    setTimeout(() => {
        statusDiv.classList.remove('show');
        setTimeout(() => statusDiv.remove(), 300);
    }, hideDelay);
}

/**
 * Show donation modal for amount input
 */
function showDonationModal() {
    // Check if wallet is connected
    if (!walletConnector?.isConnected) {
        showDonationStatus('Please connect your wallet first', 'error');
        return;
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'donation-modal-overlay';
    
    // Create modal content
    const modal = document.createElement('div');
    modal.className = 'donation-modal';
    modal.innerHTML = `
        <div class="donation-modal-header">
            <h3>💖 Support Ergomempool</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="donation-modal-content">
            <p>Help keep this project running by making a donation!</p>
            <div class="donation-amount-section">
                <label for="donation-amount">Donation Amount (ERG):</label>
                <input type="number" 
                       id="donation-amount" 
                       placeholder="${DONATION_CONFIG.defaultAmount}"
                       min="${DONATION_CONFIG.minAmount}"
                       max="${DONATION_CONFIG.maxAmount}"
                       step="0.1"
                       value="${DONATION_CONFIG.defaultAmount}">
                <div class="amount-buttons">
                    <button class="amount-btn" data-amount="0.5">0.5 ERG</button>
                    <button class="amount-btn" data-amount="1.0">1.0 ERG</button>
                    <button class="amount-btn" data-amount="5.0">5.0 ERG</button>
                    <button class="amount-btn" data-amount="10.0">10.0 ERG</button>
                </div>
            </div>
            <div class="donation-info">
                <p><strong>Recipient:</strong> ${DONATION_CONFIG.recipientAddress.substring(0, 20)}...</p>
                <p><small>Transaction fees will be automatically calculated and added.</small></p>
            </div>
            <div class="donation-modal-actions">
                <button class="donate-btn" id="confirm-donation">💝 Donate</button>
                <button class="cancel-btn" id="cancel-donation">Cancel</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Add event listeners
    const closeModal = () => {
        document.body.removeChild(overlay);
    };
    
    // Close button
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    
    // Click outside to close
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    // Amount buttons
    overlay.querySelectorAll('.amount-btn').forEach(button => {
        button.addEventListener('click', () => {
            const amount = button.getAttribute('data-amount');
            document.getElementById('donation-amount').value = amount;
        });
    });
    
    // Cancel button
    document.getElementById('cancel-donation').addEventListener('click', closeModal);
    
    // Confirm donation button
    document.getElementById('confirm-donation').addEventListener('click', async () => {
        const donateBtn = document.getElementById('confirm-donation');
        const originalText = donateBtn.textContent;
        
        try {
            // Disable button to prevent double-clicks
            donateBtn.disabled = true;
            donateBtn.textContent = 'Processing...';
            
            const amount = document.getElementById('donation-amount').value;
            
            if (!validateDonationAmount(amount)) {
                showDonationStatus(`Invalid amount. Please enter between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`, 'error');
                return;
            }
            
            // Close modal first
            closeModal();
            
            // Process donation
            await processDonation(amount);
            
        } catch (error) {
            console.error('Modal donation error:', error);
            // Error already handled in processDonation
        } finally {
            // Re-enable button if modal still exists
            if (donateBtn && !donateBtn.closest('.donation-modal-overlay').parentNode) {
                donateBtn.disabled = false;
                donateBtn.textContent = originalText;
            }
        }
    });
    
    // Show modal with animation
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
    
    // Focus on amount input
    setTimeout(() => {
        document.getElementById('donation-amount').focus();
        document.getElementById('donation-amount').select();
    }, 100);
}

/**
 * Initialize donation functionality
 */
function initializeDonation() {
    console.log('Initializing donation functionality (simplified single-attempt signing)...');
    
    // Add click handler to donation button
    const donationButton = document.getElementById('donation-button');
    if (donationButton) {
        donationButton.addEventListener('click', (e) => {
            e.preventDefault();
            showDonationModal();
        });
        console.log('Donation button event listener added');
    } else {
        console.warn('Donation button not found');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDonation);
} else {
    initializeDonation();
}