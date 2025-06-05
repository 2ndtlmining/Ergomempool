<script>
    import { walletConnector } from '$lib/stores.js';
    import { walletConnection } from '$lib/wallet.js';
    import { onMount } from 'svelte';
    import DonationModal from './DonationModal.svelte';
    import TestTransactionModal from './TestTransactionModal.svelte';
    
    let isConnecting = false;
    let walletBalance = '';
    let showDonationModal = false;
    let showTestModal = false;
    
    // Load wallet balance when connected
    $: if ($walletConnector.isConnected) {
        loadWalletBalance();
    }
    
    async function loadWalletBalance() {
        try {
            walletBalance = await walletConnection.getBalance();
        } catch (error) {
            console.error('Error loading balance:', error);
            walletBalance = 'Error';
        }
    }
    
    async function handleWalletConnect() {
        if ($walletConnector.isConnected) {
            walletConnection.disconnect();
            showStatus('Wallet disconnected successfully', 'info');
            return;
        }
        
        isConnecting = true;
        
        try {
            showStatus('Connecting to wallet...', 'info');
            const wallet = await walletConnection.connectWallet();
            showStatus(`Successfully connected to ${wallet.name}! 🎉`, 'success');
        } catch (error) {
            console.error('Wallet connection error:', error);
            let errorMsg = 'Failed to connect wallet';
            
            if (error.message.includes('No Ergo wallets detected')) {
                errorMsg = 'No Ergo wallet found. Please install Nautilus, Eternl, or Minotaur wallet.';
            } else if (error.message.includes('User rejected') || error.message.includes('cancelled')) {
                errorMsg = 'Connection cancelled by user';
            } else {
                errorMsg = `Connection failed: ${error.message}`;
            }
            
            showStatus(errorMsg, 'error');
        } finally {
            isConnecting = false;
        }
    }
        
    function handleTestTransaction() {
        if (!$walletConnector.isConnected) {
            showStatus('⚠️ Please connect your wallet first to send test transactions', 'warning');
            return;
        }
        
        console.log('🧪 Opening test transaction modal');
        showStatus('Opening test transaction panel...', 'info');
        showTestModal = true;
    }
        
    function handleDonation() {
        if (!$walletConnector.isConnected) {
            showStatus('⚠️ Please connect your wallet first to make donations', 'warning');
            return;
        }
        
        console.log('💖 Opening donation modal');
        showStatus('Opening donation panel...', 'info');
        showDonationModal = true;
    }
        
    // Export donation handler for other components
    export function triggerDonation() {
        handleDonation();
    }
    
    // Make donation handler available globally
    onMount(() => {
        if (typeof window !== 'undefined') {
            window.triggerDonation = triggerDonation;
        }
    });
    
    function showStatus(message, type = 'info') {
        console.log(`📢 Status Message: [${type.toUpperCase()}] ${message}`);
        
        // Remove any existing status messages first
        const existingMessages = document.querySelectorAll('.wallet-status');
        existingMessages.forEach(msg => {
            msg.classList.remove('show');
            setTimeout(() => {
                if (msg.parentNode) {
                    msg.parentNode.removeChild(msg);
                }
            }, 300);
        });
        
        // Create new status notification
        const statusDiv = document.createElement('div');
        statusDiv.className = `wallet-status ${type}`;
        statusDiv.textContent = message;
        
        // Ensure it starts hidden
        statusDiv.style.transform = 'translateX(120%)';
        statusDiv.style.opacity = '0';
        
        // Add to body
        document.body.appendChild(statusDiv);
        
        // Force reflow to ensure initial state is applied
        statusDiv.offsetHeight;
        
        // Show with animation
        setTimeout(() => {
            statusDiv.classList.add('show');
        }, 50);
        
        // Auto-hide after delay
        const hideDelay = type === 'error' ? 6000 : 4000; // Errors stay longer
        
        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.classList.remove('show');
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 400);
            }
        }, hideDelay);
        
        // Make it clickable to dismiss
        statusDiv.addEventListener('click', () => {
            if (statusDiv.parentNode) {
                statusDiv.classList.remove('show');
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.parentNode.removeChild(statusDiv);
                    }
                }, 400);
            }
        });
    }
</script>

<header class="header">
    <div class="logo">
        <img src="/Ergomempool_logo_f.svg" alt="Ergo Mempool Visualizer" class="logo-image">
    </div>

    <div class="wallet-section">
        <button 
            class="test-transaction-button" 
            class:wallet-required={!$walletConnector.isConnected}
            style="margin-right: 10px;"
            on:click={handleTestTransaction}
            disabled={!$walletConnector.isConnected}
            title={$walletConnector.isConnected ? "Send test transaction" : "Connect wallet to send test transactions"}
        >
            <img src="/icons/flask2-white.png" alt="Test" class="test-icon">
            Test Transaction
        </button>
        
        {#if !$walletConnector.isConnected}
            <button 
                class="connect-button"
                on:click={handleWalletConnect}
                disabled={isConnecting}
            >
                <img src="/wallet/ergo-wallet-white.png" alt="Ergo Wallet" class="wallet-icon">
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
        {:else}
            <div class="wallet-info-display">
                <div class="wallet-content">
                    <strong>{$walletConnector.connectedWallet?.name} Connected</strong>
                    <div class="balance">Balance: {walletBalance} ERG</div>
                    <div class="address">{$walletConnector.connectedAddress?.substring(0, 20)}...</div>
                </div>
                
                <!-- New disconnect button with PNG icon -->
                <button 
                    class="disconnect-icon-btn"
                    on:click|stopPropagation={handleWalletConnect}
                    title="Disconnect wallet"
                    aria-label="Disconnect wallet"
                >
                    <img src="/icons/disconnect-white.png" alt="Disconnect" class="disconnect-icon">
                </button>
            </div>
        {/if}
    </div>
</header>

<!-- Modals -->
<DonationModal bind:showModal={showDonationModal} />
<TestTransactionModal bind:showModal={showTestModal} />

<style>
    /* MOBILE-ONLY CSS - Desktop styles remain unchanged in app.css */
    
    /* Ensure consistent button scaling across ALL screen sizes */
    .test-transaction-button,
    .connect-button {
        min-width: 120px !important;
        max-width: 180px !important;
        padding: 10px 16px !important;
        font-size: 14px !important;
        flex-shrink: 0 !important;
        white-space: nowrap !important;
    }
    
    @media (max-width: 768px) {
        /* Force header to be horizontal flexbox */
        .header {
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 8px 12px !important;
            gap: 0 !important;
            min-height: auto !important;
        }
        
        /* Logo - fixed width, stays on left */
        .logo {
            flex-shrink: 0 !important;
            display: flex !important;
            align-items: center !important;
        }
        
        .logo-image {
            height: 32px !important;
        }
        
        /* Wallet section - force horizontal layout for its children */
        .wallet-section {
            flex: 1 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: flex-end !important;
            gap: 6px !important;
            flex-direction: row !important;
            flex-wrap: nowrap !important;
        }
        
        /* Medium tablet sizing */
        .test-transaction-button,
        .connect-button {
            min-width: 100px !important;
            max-width: 140px !important;
            padding: 8px 12px !important;
            font-size: 13px !important;
        }
        
        /* Test Transaction Button - fixed size */
        .test-transaction-button {
            flex-shrink: 0 !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
            margin-right: 0 !important;
            white-space: nowrap !important;
            min-width: fit-content !important;
            max-width: 140px !important;
        }
        
        /* Connect Button - fixed size, don't let it grow */
        .connect-button {
            flex-shrink: 0 !important;
            padding: 8px 12px !important;
            font-size: 12px !important;
            white-space: nowrap !important;
            min-width: fit-content !important;
            max-width: 140px !important;
        }
        
        /* Wallet Info - compact but not too small */
        .wallet-info-display {
            flex-shrink: 0 !important;
            padding: 6px 8px !important;
            font-size: 10px !important;
            min-width: 120px !important;
            max-width: 160px !important;
        }
        
        .wallet-info-display .address {
            display: none !important;
        }
    }

    @media (max-width: 480px) {
        .header {
            padding: 6px 8px !important;
            gap: 6px !important;
        }
        
        .logo-image {
            height: 32px !important;
        }
        
        /* More compact buttons */
        .test-transaction-button {
            padding: 6px 8px !important;
            font-size: 11px !important;
            max-width: 120px !important;
        }
        
        .connect-button {
            padding: 6px 8px !important;
            font-size: 11px !important;
            max-width: 120px !important;
        }
        
        /* Even more compact wallet display */
        .wallet-info-display {
            padding: 4px 6px !important;
            font-size: 9px !important;
            min-width: 100px !important;
            max-width: 130px !important;
        }
        
        .disconnect-icon-btn {
            width: 20px !important;
            height: 20px !important;
        }
        
        .disconnect-icon {
            width: 10px !important;
            height: 10px !important;
        }
    }

    @media (max-width: 380px) {
        .header {
            padding: 4px 6px !important;
            gap: 4px !important;
        }
        
        .logo-image {
            height: 28px !important;
        }
        
        /* Very compact for tiny screens */
        .test-transaction-button {
            padding: 4px 6px !important;
            font-size: 10px !important;
            max-width: 100px !important;
        }
        
        .connect-button {
            padding: 4px 6px !important;
            font-size: 10px !important;
            max-width: 100px !important;
        }
        
        .wallet-info-display {
            padding: 3px 4px !important;
            font-size: 8px !important;
            min-width: 80px !important;
            max-width: 110px !important;
        }
    }
</style>