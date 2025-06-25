<script>
    import { walletConnector } from '$lib/stores.js';
    import { walletConnection } from '$lib/wallet.js';
    import { trackSpecialTransaction } from '$lib/transactionTypes.js';
    import { processErgoTransaction, validateTransactionAmount } from '$lib/ergoTransactions.js';
    
    export let showModal = false;
    
    const TEST_CONFIG = {
        defaultAmount: "0.001",
        defaultAddress: "9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx",
        minAmount: "0.001",
        maxAmount: "100.0"
    };
    
    let testAmount = TEST_CONFIG.defaultAmount;
    let recipientAddress = TEST_CONFIG.defaultAddress;
    let isProcessing = false;
    let statusMessage = '';
    let statusType = 'info';
    
    function closeModal() {
        showModal = false;
        testAmount = TEST_CONFIG.defaultAmount;
        recipientAddress = TEST_CONFIG.defaultAddress;
        statusMessage = '';
        isProcessing = false;
    }
    
    function validateAddress(address) {
        return address && address.length > 10 && address.match(/^9[A-Za-z0-9]+$/);
    }
    
    async function processTestTransaction() {
        if (!$walletConnector.isConnected) {
            showStatus('Please connect your wallet first', 'error');
            return;
        }
        
        if (!validateTransactionAmount(testAmount)) {
            showStatus('Invalid amount. Please enter between 0.001 and 100.0 ERG', 'error');
            return;
        }
        
        if (!validateAddress(recipientAddress)) {
            showStatus('Invalid address format. Ergo addresses start with "9"', 'error');
            return;
        }
        
        isProcessing = true;
        
        try {
            showStatus('Preparing test transaction...', 'info');
            
            console.log('🧪 Processing REAL test transaction:', {
                amount: testAmount,
                recipient: recipientAddress,
                wallet: $walletConnector.connectedWallet?.name
            });
            
            showStatus('Building transaction...', 'info');
            
            showStatus('Please approve the transaction in your wallet...', 'info');
            
            // Use REAL transaction building (ported from your Flask code)
            const txId = await processErgoTransaction(testAmount, recipientAddress, 'test');
            
            // Track as test transaction for visualization
            trackSpecialTransaction(txId, 'test');
            
            console.log('🧪 Real test transaction submitted:', txId);
            
            showStatus(`Test transaction successful! TX: ${txId.substring(0, 16)}...`, 'success');
            
            setTimeout(() => {
                closeModal();
            }, 3000);
            
        } catch (error) {
            console.error('Test transaction error:', error);
            
            let errorMessage = 'Test transaction failed: ';
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
        class="test-modal-overlay" 
        on:click={handleOutsideClick}
        on:keydown={handleOverlayKeydown}
        role="dialog"
        aria-modal="true"
        aria-labelledby="test-title"
        tabindex="-1"
    >
        <div class="test-modal">
            <div class="test-modal-header">
                <h3 id="test-title">🧪 Test Transaction</h3>
                <button 
                    class="modal-close" 
                    on:click={closeModal}
                    aria-label="Close test transaction modal"
                >
                    &times;
                </button>
            </div>
            
            <div class="test-modal-content">
                <p>Send a real test transaction to any Ergo address.</p>
                
                <div class="test-amount-section">
                    <label for="test-amount">Amount (ERG):</label>
                    <input 
                        id="test-amount"
                        type="number" 
                        bind:value={testAmount}
                        placeholder={TEST_CONFIG.defaultAmount}
                        min={TEST_CONFIG.minAmount}
                        max={TEST_CONFIG.maxAmount}
                        step="0.001"
                        disabled={isProcessing}
                    >
                </div>
                
                <div class="test-address-section">
                    <label for="test-address">Recipient Address:</label>
                    <input 
                        id="test-address"
                        type="text" 
                        bind:value={recipientAddress}
                        placeholder="9f..."
                        disabled={isProcessing}
                    >
                    <small>Enter any valid Ergo address</small>
                </div>
                
                <div class="test-warning">
                    <p>⚠️ This will send REAL ERG to the blockchain! Use small amounts for testing.</p>
                </div>
                
                {#if statusMessage}
                    <div class="status-message {statusType}">
                        {statusMessage}
                    </div>
                {/if}
                
                <div class="test-modal-actions">
                    <button 
                        class="test-btn" 
                        on:click={processTestTransaction}
                        disabled={isProcessing || !$walletConnector.isConnected}
                    >
                        {isProcessing ? '⏳ Processing...' : '🚀 Send Real Test'}
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
    .test-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        animation: fadeIn 0.3s ease;
    }
    
    .test-modal-overlay:focus {
        outline: none;
    }
    
    .test-modal {
        background: #1a1a1a;
        border-radius: 12px;
        padding: 0;
        max-width: 500px;
        width: 90%;
        border: 1px solid #333;
        animation: slideUp 0.3s ease;
    }
    
    .test-modal-header {
        background: linear-gradient(135deg, #f39c12, #e67e22);
        padding: 20px;
        border-radius: 12px 12px 0 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    
    .test-modal-header h3 {
        color: white;
        margin: 0;
        font-size: 1.3rem;
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
    
    .test-modal-content {
        padding: 24px;
        color: #ccc;
    }
    
    .test-modal-content p {
        color: #ccc;
        margin-bottom: 20px;
        line-height: 1.5;
    }
    
    .test-amount-section, .test-address-section {
        margin-bottom: 20px;
    }
    
    .test-amount-section label, .test-address-section label {
        display: block;
        margin-bottom: 8px;
        color: #fff;
        font-weight: 500;
    }
    
    .test-amount-section input, .test-address-section input {
        width: 100%;
        padding: 10px;
        border: 1px solid #333;
        border-radius: 6px;
        background: #2a2a2a;
        color: #fff;
        box-sizing: border-box;
        transition: border-color 0.3s ease;
        font-size: 1rem;
    }
    
    .test-amount-section input:focus, .test-address-section input:focus {
        outline: none;
        border-color: #f39c12;
    }
    
    .test-amount-section input:disabled, .test-address-section input:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
    
    .test-address-section small {
        color: #888;
        display: block;
        margin-top: 4px;
        font-size: 0.85rem;
    }
    
    .test-warning {
        background: rgba(243, 156, 18, 0.1);
        border: 1px solid rgba(243, 156, 18, 0.3);
        border-radius: 6px;
        padding: 12px;
        margin-bottom: 20px;
    }
    
    .test-warning p {
        margin: 0;
        color: #f39c12;
        font-size: 0.9rem;
        font-weight: 500;
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
    
    .test-modal-actions {
        display: flex;
        gap: 10px;
    }
    
    .test-btn, .cancel-btn {
        flex: 1;
        padding: 12px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s ease;
        font-size: 1rem;
    }
    
    .test-btn {
        background: linear-gradient(135deg, #f39c12, #e67e22);
        color: white;
    }
    
    .test-btn:hover:not(:disabled) {
        background: linear-gradient(135deg, #e67e22, #d35400);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
    }
    
    .test-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none;
    }
    
    .cancel-btn {
        background: #666;
        color: white;
    }
    
    .cancel-btn:hover:not(:disabled) {
        background: #777;
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
        .test-modal {
            width: 95%;
            margin: 20px;
        }
        
        .test-modal-content {
            padding: 20px;
        }
        
        .test-modal-actions {
            flex-direction: column;
        }
        
        .test-btn, .cancel-btn {
            width: 100%;
        }
    }
</style>