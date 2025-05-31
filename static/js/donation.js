// donation.js - Simplified approach based on working react-ergo-payments implementation

const DONATION_CONFIG = {
    recipientAddress: "9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx",
    defaultAmount: "1.0",
    minAmount: "0.001",
    maxAmount: "100.0"
};

let donationInProgress = false;

function ergToNanoErg(ergAmount) {
    return (parseFloat(ergAmount) * 1000000000).toString();
}

function validateDonationAmount(amount) {
    const ergAmount = parseFloat(amount);
    return !isNaN(ergAmount) && 
           ergAmount >= parseFloat(DONATION_CONFIG.minAmount) && 
           ergAmount <= parseFloat(DONATION_CONFIG.maxAmount);
}

/**
 * Simplified donation using the proven working pattern from react-ergo-payments
 */
async function processDonation(donationAmount) {
    if (donationInProgress) {
        showDonationStatus('Donation already in progress...', 'info');
        return;
    }
    
    donationInProgress = true;
    
    try {
        console.log('=== STARTING SIMPLIFIED DONATION ===');
        console.log('Using proven react-ergo-payments pattern');
        showDonationStatus('Preparing donation...', 'info');

        if (!walletConnector?.isConnected) {
            throw new Error('Wallet not connected');
        }

        if (!validateDonationAmount(donationAmount)) {
            throw new Error(`Invalid amount. Must be between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`);
        }

        const donationNanoErg = ergToNanoErg(donationAmount);
        console.log('Donation amount (nanoERG):', donationNanoErg);

        // Get basic wallet info
        const balance = await window.ergo.get_balance();
        console.log('Wallet balance:', balance);

        // Check if we have enough funds (rough check)
        const totalNeeded = BigInt(donationNanoErg) + BigInt("2000000"); // 0.002 ERG buffer for fees
        if (BigInt(balance) < totalNeeded) {
            const availableERG = Number(balance) / 1e9;
            const neededERG = Number(totalNeeded) / 1e9;
            throw new Error(`Insufficient funds. Need approximately ${neededERG.toFixed(3)} ERG, have ${availableERG.toFixed(3)} ERG`);
        }

        showDonationStatus('Please approve the transaction in your wallet...', 'info');

        // Use the simplest possible format that works (based on react-ergo-payments success)
        const transactionRequest = {
            outputs: [{
                address: DONATION_CONFIG.recipientAddress,
                value: donationNanoErg
            }]
        };

        console.log('Simple transaction request:', JSON.stringify(transactionRequest, null, 2));

        // Sign transaction
        let signedTransaction;
        try {
            signedTransaction = await window.ergo.sign_tx(transactionRequest);
            console.log('Transaction signed successfully!');
            
        } catch (signError) {
            console.error('Signing error:', signError);
            
            if (signError.info === "User rejected." || signError.code === 2) {
                throw new Error('Transaction was cancelled by user');
            }
            
            // If simple format fails, the issue might be fundamental
            throw new Error(`Transaction signing failed: ${signError.info || signError.message || 'Unknown error'}`);
        }

        // Submit transaction
        showDonationStatus('Submitting transaction to blockchain...', 'info');
        
        const txId = await window.ergo.submit_tx(signedTransaction);
        console.log('Transaction submitted successfully:', txId);

        // Success!
        showDonationStatus(`Donation successful! TX: ${txId.substring(0, 16)}...`, 'success');
        
        setTimeout(() => {
            if (confirm(`Donation sent successfully!\n\nTransaction ID: ${txId}\n\nWould you like to view it in the blockchain explorer?`)) {
                window.open(`https://explorer.ergoplatform.com/en/transactions/${txId}`, '_blank');
            }
        }, 2000);
        
        return txId;

    } catch (error) {
        console.error('Donation error:', error);
        
        let errorMessage = 'Donation failed: ';
        if (error.message.includes('cancelled') || error.message.includes('rejected')) {
            errorMessage += 'Transaction was cancelled by user';
        } else {
            errorMessage += error.message || 'Unknown error occurred';
        }
        
        showDonationStatus(errorMessage, 'error');
        throw error;
    } finally {
        donationInProgress = false;
    }
}

function showDonationStatus(message, type = 'info') {
    const existingStatus = document.querySelector('.donation-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusDiv = document.createElement('div');
    statusDiv.className = `donation-status ${type}`;
    statusDiv.textContent = message;
    document.body.appendChild(statusDiv);
    
    setTimeout(() => statusDiv.classList.add('show'), 100);
    
    const hideDelay = (type === 'info') ? 4000 : 6000;
    setTimeout(() => {
        statusDiv.classList.remove('show');
        setTimeout(() => statusDiv.remove(), 300);
    }, hideDelay);
}

function showDonationModal() {
    if (!walletConnector?.isConnected) {
        showDonationStatus('Please connect your wallet first', 'error');
        return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'donation-modal-overlay';
    
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
                <p><small>Wallet will automatically handle fees and asset preservation.</small></p>
            </div>
            <div class="donation-modal-actions">
                <button class="donate-btn" id="confirm-donation">💝 Donate</button>
                <button class="cancel-btn" id="cancel-donation">Cancel</button>
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const closeModal = () => {
        document.body.removeChild(overlay);
    };
    
    overlay.querySelector('.modal-close').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
    
    overlay.querySelectorAll('.amount-btn').forEach(button => {
        button.addEventListener('click', () => {
            const amount = button.getAttribute('data-amount');
            document.getElementById('donation-amount').value = amount;
        });
    });
    
    document.getElementById('cancel-donation').addEventListener('click', closeModal);
    
    document.getElementById('confirm-donation').addEventListener('click', async () => {
        const donateBtn = document.getElementById('confirm-donation');
        const originalText = donateBtn.textContent;
        
        try {
            donateBtn.disabled = true;
            donateBtn.textContent = 'Processing...';
            
            const amount = document.getElementById('donation-amount').value;
            
            if (!validateDonationAmount(amount)) {
                showDonationStatus(`Invalid amount. Please enter between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`, 'error');
                return;
            }
            
            closeModal();
            await processDonation(amount);
            
        } catch (error) {
            console.error('Modal donation error:', error);
        } finally {
            if (donateBtn && !donateBtn.closest('.donation-modal-overlay').parentNode) {
                donateBtn.disabled = false;
                donateBtn.textContent = originalText;
            }
        }
    });
    
    setTimeout(() => {
        overlay.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        document.getElementById('donation-amount').focus();
        document.getElementById('donation-amount').select();
    }, 100);
}

function initializeDonation() {
    console.log('=== INITIALIZING SIMPLIFIED DONATION SYSTEM ===');
    console.log('Based on proven react-ergo-payments implementation');
    
    const donationButton = document.getElementById('donation-button');
    if (donationButton) {
        donationButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Donation button clicked!');
            showDonationModal();
        });
        console.log('✓ Donation button found and event listener added');
    } else {
        console.warn('⚠ Donation button not found');
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeDonation);
} else {
    initializeDonation();
}