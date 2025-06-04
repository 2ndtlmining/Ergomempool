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
        showStatus('Please connect your wallet first to send test transactions', 'error');
        return;
    }
    
    console.log('🧪 Opening test transaction modal');
    showStatus('Opening test transaction panel...', 'info');
    showTestModal = true;
}
    
function handleDonation() {
    if (!$walletConnector.isConnected) {
        showStatus('Please connect your wallet first to make donations', 'error');
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
            <div 
                class="wallet-info-display" 
                on:click={handleWalletConnect}
                on:keydown={(e) => e.key === 'Enter' && handleWalletConnect()}
                role="button"
                tabindex="0"
                aria-label="Click to disconnect wallet"
                title="Click to disconnect wallet"
            >
                <div class="wallet-content">
                    <strong>{$walletConnector.connectedWallet?.name} Connected</strong>
                    <div class="balance">Balance: {walletBalance} ERG</div>
                    <div class="address">{$walletConnector.connectedAddress?.substring(0, 20)}...</div>
                </div>
            </div>
        {/if}
    </div>
</header>

<!-- Modals -->
<DonationModal bind:showModal={showDonationModal} />
<TestTransactionModal bind:showModal={showTestModal} />