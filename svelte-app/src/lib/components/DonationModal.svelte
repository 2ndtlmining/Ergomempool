<script>
    import { walletConnector } from '$lib/stores.js';
    import { walletConnection } from '$lib/wallet.js';
    import { trackSpecialTransaction } from '$lib/transactionTypes.js';
    import { processErgoTransaction, validateTransactionAmount } from '$lib/ergoTransactions.js';
    
    export let showModal = false;
    
    const DONATION_CONFIG = {
        recipientAddress: "9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx",
        defaultAmount: "1.0",
        minAmount: "0.001",
        maxAmount: "100.0"
    };
    
    let donationAmount = DONATION_CONFIG.defaultAmount;
    let isProcessing = false;
    let statusMessage = '';
    let statusType = 'info';
    
    function closeModal() {
        showModal = false;
        donationAmount = DONATION_CONFIG.defaultAmount;
        statusMessage = '';
        isProcessing = false;
    }
    
    function setAmount(amount) {
        donationAmount = amount;
    }
    
    async function processDonation() {
        if (!$walletConnector.isConnected) {
            showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        if (!validateTransactionAmount(donationAmount, DONATION_CONFIG.minAmount, DONATION_CONFIG.maxAmount)) {
            showStatus(`Invalid amount. Must be between ${DONATION_CONFIG.minAmount} and ${DONATION_CONFIG.maxAmount} ERG`, 'error');
            return;
        }
        
        isProcessing = true;
        
        try {
            showStatus('Preparing donation transaction...', 'info');
            
            console.log('💖 Processing REAL donation:', {
                amount: donationAmount,
                recipient: DONATION_CONFIG.recipientAddress,
                wallet: $walletConnector.connectedWallet?.name
            });
            
            showStatus('Building transaction...', 'info');
            
            showStatus('Please approve the transaction in your wallet...', 'info');
            
            // Use REAL transaction building (always goes to donation address)
            const txId = await processErgoTransaction(
                donationAmount, 
                DONATION_CONFIG.recipientAddress, 
                'donation'
            );
            
            // Track as donation transaction
            trackSpecialTransaction(txId, 'donation');
            
            console.log('💖 Real donation transaction submitted:', txId);
            
            showStatus(`Donation successful! TX: ${txId.substring(0, 16)}...`, 'success');
            
            setTimeout(() => {
                closeModal();
            }, 3000);
            
        } catch (error) {
            console.error('Donation error:', error);
            
            let errorMessage = 'Donation failed: ';
            if (error.message.includes('cancelled') || error.message.includes('rejected')) {
                errorMessage += 'Transaction was cancelled by user';
            } else {
                errorMessage += error.message || 'Unknown error occurred';
            }
            
            showStatus(errorMessage, 'error');
        } finally {
            isProcessing = false;
        }
    }
    
    function showStatus(message, type) {
        statusMessage = message;
        statusType = type;
    }
    
    function handleKeydown(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    }
    
    function handleOutsideClick(event) {
        if (event.target === event.currentTarget) {
            closeModal();
        }
    }

    // Handle keyboard events for the overlay
    function handleOverlayKeydown(event) {
        if (event.key === 'Escape') {
            closeModal();
        } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            // Only close if clicking on the overlay itself, not the modal content
            if (event.target === event.currentTarget) {
                closeModal();
            }
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if showModal}
    <div 
        class="donation-modal-overlay" 
        on:click={handleOutsideClick}
        on:keydown={handleOverlayKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="donation-title"
        tabindex="-1"
    >
        <div class="donation-modal">
            <div class="donation-modal-header">
                <h3 id="donation-title">💖 Support Ergomempool</h3>
                <button 
                    class="modal-close" 
                    on:click={closeModal}
                    aria-label="Close donation modal"
                >
                    &times;
                </button>
            </div>
            
            <div class="donation-modal-content">
                <p>Help keep this project running by making a real donation!</p>
                
                <div class="donation-amount-section">
                    <label for="donation-amount">Donation Amount (ERG):</label>
                    <input 
                        id="donation-amount"
                        type="number" 
                        bind:value={donationAmount}
                        placeholder={DONATION_CONFIG.defaultAmount}
                        min={DONATION_CONFIG.minAmount}
                        max={DONATION_CONFIG.maxAmount}
                        step="0.1"
                        disabled={isProcessing}
                    >
                    
                    <div class="amount-buttons">
                        <button 
                            class="amount-btn" 
                            on:click={() => setAmount("0.5")}
                            disabled={isProcessing}
                        >
                            0.5 ERG
                        </button>
                        <button 
                            class="amount-btn" 
                            on:click={() => setAmount("1.0")}
                            disabled={isProcessing}
                        >
                            1.0 ERG
                        </button>
                        <button 
                            class="amount-btn" 
                            on:click={() => setAmount("5.0")}
                            disabled={isProcessing}
                        >
                            5.0 ERG
                        </button>
                        <button 
                            class="amount-btn" 
                            on:click={() => setAmount("10.0")}
                            disabled={isProcessing}
                        >
                            10.0 ERG
                        </button>
                    </div>
                </div>
                
                <div class="donation-info">
                    <p><strong>Recipient:</strong> {DONATION_CONFIG.recipientAddress.substring(0, 20)}...</p>
                    <p><small>This will send REAL ERG to support the project development.</small></p>
                    <p><small>Wallet will automatically handle fees and asset preservation.</small></p>
                </div>
                
                {#if statusMessage}
                    <div class="status-message {statusType}">
                        {statusMessage}
                    </div>
                {/if}
                
                <div class="donation-modal-actions">
                    <button 
                        class="donate-btn" 
                        on:click={processDonation}
                        disabled={isProcessing || !$walletConnector.isConnected}
                    >
                        {isProcessing ? '⏳ Processing...' : '💝 Send Real Donation'}
                    </button>
                    <button 
                        class="cancel-btn" 
                        on:click={closeModal}
                        disabled={isProcessing}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .donation-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }
    
    .donation-modal-overlay:focus {
        outline: none;
    }
    
    .donation-modal {
        background: linear-gradient(135deg, #1a1a2e, #16213e);
        border-radius: 16px;
        padding: 0;
        max-width: 480px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: slideUp 0.3s ease;
    }
    
    .donation-modal-header {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        padding: 20px;
        border-radius: 16px 16px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .donation-modal-header h3 {
        margin: 0;
        color: white;
        font-size: 1.4rem;
        font-weight: 600;
    }
    
    .modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.8rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: background-color 0.2s ease;
    }
    
    .modal-close:hover {
        background-color: rgba(255, 255, 255, 0.2);
    }
    
    .donation-modal-content {
        padding: 24px;
        color: #e0e0e0;
    }
    
    .donation-modal-content p {
        margin: 0 0 20px 0;
        line-height: 1.5;
    }
    
    .donation-amount-section {
        margin-bottom: 20px;
    }
    
    .donation-amount-section label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: #f39c12;
    }
    
    .donation-amount-section input {
        width: 100%;
        padding: 12px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
        color: white;
        font-size: 1.1rem;
        box-sizing: border-box;
        transition: border-color 0.3s ease;
    }
    
    .donation-amount-section input:focus {
        outline: none;
        border-color: #f39c12;
    }
    
    .donation-amount-section input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .donation-amount-section input::placeholder {
        color: rgba(255, 255, 255, 0.5);
    }
    
    .amount-buttons {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-top: 12px;
    }
    
    .amount-btn {
        padding: 8px 12px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        background: rgba(255, 255, 255, 0.05);
        color: #e0e0e0;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 0.9rem;
    }
    
    .amount-btn:hover:not(:disabled) {
        background: rgba(243, 156, 18, 0.2);
        border-color: #f39c12;
        color: #f39c12;
    }
    
    .amount-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
    
    .donation-info {
        background: rgba(255, 255, 255, 0.03);
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #f39c12;
    }
    
    .donation-info p {
        margin: 0 0 8px 0;
        font-size: 0.9rem;
    }
    
    .donation-info p:last-child {
        margin-bottom: 0;
    }
    
    .donation-info small {
        color: rgba(255, 255, 255, 0.6);
    }
    
    .status-message {
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-weight: 500;
    }
    
    .status-message.info {
        background: rgba(52, 152, 219, 0.2);
        color: #3498db;
        border: 1px solid rgba(52, 152, 219, 0.3);
    }
    
    .status-message.success {
        background: rgba(39, 174, 96, 0.2);
        color: #27ae60;
        border: 1px solid rgba(39, 174, 96, 0.3);
    }
    
    .status-message.error {
        background: rgba(231, 76, 60, 0.2);
        color: #e74c3c;
        border: 1px solid rgba(231, 76, 60, 0.3);
    }
    
    .donation-modal-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
    }
    
    .donate-btn, .cancel-btn {
        padding: 12px 24px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        min-width: 120px;
        font-size: 1rem;
    }
    
    .donate-btn {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
    }
    
    .donate-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #c0392b, #a93226);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(231, 76, 60, 0.3);
    }
    
    .donate-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
    
    .cancel-btn {
        background: rgba(255, 255, 255, 0.1);
        color: #e0e0e0;
        border: 1px solid rgba(255, 255, 255, 0.2);
    }
    
    .cancel-btn:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.2);
    }
    
    .cancel-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    @keyframes slideUp {
        from { 
            opacity: 0; 
            transform: translateY(20px) scale(0.95); 
        }
        to { 
            opacity: 1; 
            transform: translateY(0) scale(1); 
        }
    }
    
    @media (max-width: 600px) {
        .donation-modal {
            width: 95%;
            margin: 20px;
        }
        
        .donation-modal-content {
            padding: 20px;
        }
        
        .amount-buttons {
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
        }
        
        .donation-modal-actions {
            flex-direction: column;
        }
        
        .donate-btn, .cancel-btn {
            width: 100%;
        }
    }
</style>