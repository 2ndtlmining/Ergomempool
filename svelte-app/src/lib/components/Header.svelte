<script>
    import { walletConnector } from '$lib/stores.js';
    import { walletConnection } from '$lib/wallet.js';
    import { onMount } from 'svelte';
    import DonationModal from './DonationModal.svelte';
    import TestTransactionModal from './TestTransactionModal.svelte';
    
    // Navigation state
    export let currentMode = 'pack';
    export let onModeChange = () => {};
    export let onRefresh = () => {};
    export let onAddTestTransactions = () => {}; // New function export
    export let onRepack = () => {}; // New function export
    
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
    
    // Navigation functions
    function setMode(mode) {
        console.log(`🎯 Header navigation: Setting mode to ${mode}`);
        currentMode = mode;
        onModeChange(mode);
    }
    
    function handleRefresh() {
        console.log('🔄 Header refresh clicked');
        onRefresh();
        showStatus('🔄 Refreshing data...', 'info');
        
        // Visual feedback
        const refreshBtn = document.querySelector('.nav-refresh');
        if (refreshBtn) {
            refreshBtn.style.transform = 'rotate(360deg)';
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 600);
        }
    }
    
    // Function buttons - Add Dummy and Repack
    function handleAddDummy() {
        console.log('🎭 Header: Add Dummy clicked for mode:', currentMode);
        
        // Call appropriate function based on current mode
        if (currentMode === 'pack') {
            // For transaction packing mode
            onAddTestTransactions();
            showStatus('✅ Added test transactions to packing grid', 'success');
        } else if (currentMode === 'ball') {
            // For ball physics mode - we'll need to expose this through onModeChange
            onAddTestTransactions();
            showStatus('✅ Added test transactions to ball physics', 'success');
        } else if (currentMode === 'hex') {
            // For hex mode, trigger animation
            onAddTestTransactions();
            showStatus('🎬 Started hexagon packing animation', 'success');
        } else {
            showStatus('ℹ️ Add dummy not available for current mode', 'info');
        }
    }
    
    function handleRepack() {
        console.log('🔄 Header: Repack clicked for mode:', currentMode);
        
        if (currentMode === 'pack') {
            // Trigger repack for transaction packing
            onRepack();
            showStatus('🔄 Repacking transactions with gravity algorithm', 'info');
        } else if (currentMode === 'ball') {
            // For ball physics, we could clear and reload
            onRepack();
            showStatus('🔄 Reorganizing ball physics', 'info');
        } else if (currentMode === 'hex') {
            // For hex mode, restart animation
            onRepack();
            showStatus('🔄 Restarting hexagon packing', 'info');
        } else {
            showStatus('ℹ️ Repack not available for current mode', 'info');
        }
    }
    
    // Wallet functions
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
        const hideDelay = type === 'error' ? 6000 : 4000;
        
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
    <!-- Single Line Layout -->
    <div class="header-container">
        <!-- Left side: Logo + Navigation -->
        <div class="header-left">
            <div class="logo">
                <img src="/Ergomempool_logo_f.svg" alt="Ergo Mempool Visualizer" class="logo-image">
            </div>
            
            <!-- Main navigation with icons -->
            <nav class="main-navigation">
                <button 
                    class="nav-icon"
                    class:active={currentMode === 'pack'}
                    on:click={() => setMode('pack')}
                    title="Transaction Packing"
                >
                    <img src="/icons/dashboard.png" alt="Pack" class="nav-icon-img" />
                </button>
                
                <button 
                    class="nav-icon"
                    class:active={currentMode === 'hex'}
                    on:click={() => setMode('hex')}
                    title="Hexagon Packing"
                >
                    <img src="/icons/hexagon_white.png" alt="Hex" class="nav-icon-img" />
                </button>
                
                <button 
                    class="nav-icon"
                    class:active={currentMode === 'ball'}
                    on:click={() => setMode('ball')}
                    title="Ball Physics"
                >
                    <img src="/icons/basketball.png" alt="Ball" class="nav-icon-img" />
                </button>
                
                <button 
                    class="nav-icon nav-refresh"
                    on:click={handleRefresh}
                    title="Refresh Data"
                >
                    <img src="/icons/refresh_white.png" alt="Refresh" class="nav-icon-img" />
                </button>
                
                <button 
                    class="nav-icon nav-function"
                    on:click={handleAddDummy}
                    title="Add Test Transactions"
                >
                    <img src="/icons/dummy.png" alt="Add Dummy" class="nav-icon-img" />
                </button>
                
                <button 
                    class="nav-icon nav-function"
                    on:click={handleRepack}
                    title="Repack Transactions"
                >
                    <img src="/icons/brain.png" alt="Repack" class="nav-icon-img" />
                </button>
            </nav>
        </div>

        <!-- Right side: Wallet section -->
        <div class="header-right">
            <button 
                class="test-transaction-button" 
                class:disabled={!$walletConnector.isConnected}
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
    </div>
</header>

<!-- Modals -->
<DonationModal bind:showModal={showDonationModal} />
<TestTransactionModal bind:showModal={showTestModal} />

<style>
    .header {
        background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
        border-bottom: 3px solid var(--primary-orange);
        box-shadow: 
            0 4px 20px rgba(44, 74, 107, 0.4),
            0 2px 10px rgba(230, 126, 34, 0.3);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        position: relative;
        z-index: 1000;
    }
    
    .header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, 
            transparent 0%, 
            rgba(230, 126, 34, 0.05) 25%,
            rgba(230, 126, 34, 0.1) 50%,
            rgba(230, 126, 34, 0.05) 75%,
            transparent 100%
        );
        pointer-events: none;
        animation: headerShimmer 3s ease-in-out infinite;
    }
    
    @keyframes headerShimmer {
        0%, 100% { opacity: 0.3; }
        50% { opacity: 0.7; }
    }
    
    .header-container {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px;
        position: relative;
        z-index: 2;
        min-height: 60px;
        width: 100%;
        box-sizing: border-box;
    }
    
    .header-left {
        display: flex;
        align-items: center;
        gap: 24px;
        flex: 1;
    }
    
    .header-right {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-shrink: 0;
        margin-left: auto;
    }
    
    /* Logo styles */
    .logo {
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    
    .logo-image {
        height: 48px;
        width: auto;
        transition: all 0.3s ease;
        filter: drop-shadow(0 2px 8px rgba(230, 126, 34, 0.3));
    }
    
    .logo-image:hover {
        transform: scale(1.05) rotate(2deg);
        filter: drop-shadow(0 4px 12px rgba(230, 126, 34, 0.5));
    }
    
    /* Main navigation with icons */
    .main-navigation {
        display: flex;
        align-items: center;
        gap: 4px;
        background: rgba(255, 255, 255, 0.05);
        padding: 4px;
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
    }
    
    .nav-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border: none;
        background: transparent;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        overflow: hidden;
    }
    
    .nav-icon::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.1);
        opacity: 0;
        transition: opacity 0.2s ease;
        border-radius: 10px;
    }
    
    .nav-icon:hover::before {
        opacity: 1;
    }
    
    .nav-icon.active {
        background: var(--primary-orange);
        box-shadow: 0 2px 8px rgba(212, 101, 27, 0.4);
    }
    
    .nav-icon.active::before {
        opacity: 0;
    }
    
    .nav-icon-img {
        width: 20px;
        height: 20px;
        transition: all 0.2s ease;
        filter: brightness(0) invert(1);
    }
    
    .nav-icon.active .nav-icon-img {
        filter: brightness(0) invert(1);
        transform: scale(1.1);
    }
    
    .nav-refresh, .nav-function {
        margin-left: 8px;
        border-left: 1px solid rgba(255, 255, 255, 0.1);
        padding-left: 12px;
    }
    
    .nav-function {
        margin-left: 4px;
        border-left: none;
        padding-left: 4px;
    }
    
    .nav-refresh .nav-icon-img,
    .nav-function .nav-icon-img {
        transition: all 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    .nav-function:hover .nav-icon-img {
        transform: scale(1.1) rotate(10deg);
    }
    
    /* Wallet section styles - restored original styling */
    .test-transaction-button,
    .connect-button {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px 18px;
        cursor: pointer;
        background: linear-gradient(135deg, var(--primary-orange) 0%, var(--secondary-orange) 100%);
        color: white;
        border: 2px solid rgba(255, 255, 255, 0.2);
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        white-space: nowrap;
    }
    
    .test-transaction-button::before,
    .connect-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
        transition: left 0.5s ease;
    }
    
    .test-transaction-button:hover::before,
    .connect-button:hover::before {
        left: 100%;
    }
    
    .test-transaction-button:hover,
    .connect-button:hover {
        background: linear-gradient(135deg, var(--secondary-orange) 0%, var(--light-orange) 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px var(--glow-orange);
        border-color: rgba(255, 255, 255, 0.4);
    }
    
    .test-icon,
    .wallet-icon {
        width: 16px;
        height: 16px;
        transition: transform 0.2s ease;
        flex-shrink: 0;
        filter: brightness(0) invert(1);
    }
    
    .test-transaction-button:hover .test-icon,
    .connect-button:hover .wallet-icon {
        transform: scale(1.1) rotate(5deg);
    }
    
    .test-transaction-button.disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
    }
    
    .test-transaction-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
        transform: none !important;
        box-shadow: none !important;
    }
    
    .wallet-info-display {
        background: linear-gradient(135deg, rgba(44, 74, 107, 0.9) 0%, rgba(61, 90, 122, 0.9) 100%);
        border: 2px solid var(--primary-orange);
        padding: 6px 12px;
        border-radius: 8px;
        font-size: 11px;
        min-width: 160px;
        max-width: 220px;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        box-shadow: 
            0 4px 15px rgba(44, 74, 107, 0.3),
            0 2px 8px rgba(230, 126, 34, 0.2);
    }
    
    .wallet-info-display:hover {
        background: linear-gradient(135deg, rgba(61, 90, 122, 0.9) 0%, rgba(74, 107, 138, 0.9) 100%);
        transform: translateY(-2px);
        box-shadow: 
            0 6px 20px rgba(44, 74, 107, 0.4),
            0 3px 12px rgba(230, 126, 34, 0.3);
        border-color: var(--secondary-orange);
    }
    
    .wallet-content {
        position: relative;
        z-index: 2;
    }
    
    .wallet-info-display strong {
        color: var(--primary-orange);
        display: block;
        margin-bottom: 3px;
        font-size: 12px;
        font-weight: 700;
        text-shadow: 0 1px 2px rgba(230, 126, 34, 0.3);
        letter-spacing: 0.3px;
    }
    
    .wallet-info-display .balance {
        opacity: 0.95;
        color: var(--secondary-orange);
        font-weight: 600;
        font-size: 11px;
        margin-bottom: 2px;
        text-shadow: 0 1px 1px rgba(243, 156, 18, 0.2);
    }
    
    .wallet-info-display .address {
        opacity: 0.8;
        font-family: 'Courier New', monospace;
        font-size: 9px;
        color: #bdc3c7;
        line-height: 1.2;
        word-break: break-all;
    }
    
    .disconnect-icon-btn {
        background: rgba(231, 76, 60, 0.9);
        border: 1px solid #e74c3c;
        border-radius: 4px;
        padding: 4px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 24px;
        height: 24px;
        flex-shrink: 0;
        position: absolute;
        top: 4px;
        right: 4px;
        z-index: 10;
    }
    
    .disconnect-icon-btn:hover {
        background: #e74c3c;
        transform: scale(1.1);
        box-shadow: 0 2px 8px rgba(231, 76, 60, 0.5);
        border-color: #c0392b;
    }
    
    .disconnect-icon {
        width: 14px;
        height: 14px;
        filter: brightness(0) invert(1);
    }
    
    /* Responsive design */
    @media (max-width: 1024px) {
        .header-container {
            padding: 10px 20px;
        }
        
        .header-left {
            gap: 20px;
        }
        
        .header-right {
            gap: 12px;
        }
        
        .main-navigation {
            gap: 2px;
            padding: 3px;
        }
        
        .nav-icon {
            width: 36px;
            height: 36px;
        }
        
        .nav-icon-img {
            width: 16px;
            height: 16px;
        }
    }
    
    @media (max-width: 768px) {
        .header-container {
            padding: 8px 16px;
            flex-wrap: wrap;
            gap: 12px;
        }
        
        .header-left {
            gap: 16px;
            flex: none;
        }
        
        .header-right {
            gap: 10px;
            flex: none;
        }
        
        .logo-image {
            height: 40px;
        }
        
        .main-navigation {
            gap: 4px;
            padding: 4px;
        }
        
        .nav-icon {
            width: 36px;
            height: 36px;
        }
        
        .nav-icon-img {
            width: 16px;
            height: 16px;
        }
        
        .test-transaction-button,
        .connect-button {
            padding: 8px 12px;
            font-size: 12px;
        }
        
        .test-icon,
        .wallet-icon {
            width: 14px;
            height: 14px;
        }
        
        .wallet-info-display {
            min-width: 120px;
            max-width: 160px;
            font-size: 10px;
        }
        
        .wallet-info-display .address {
            display: none;
        }
    }
    
    @media (max-width: 640px) {
        .header-container {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
            padding: 12px;
        }
        
        .header-left {
            justify-content: center;
        }
        
        .header-right {
            justify-content: center;
            flex-wrap: wrap;
        }
        
        .main-navigation {
            justify-content: center;
        }
        
        .nav-icon {
            width: 32px;
            height: 32px;
        }
        
        .nav-icon-img {
            width: 14px;
            height: 14px;
        }
        
        .test-transaction-button,
        .connect-button {
            flex: 1;
            min-width: 120px;
            justify-content: center;
        }
        
        .wallet-info-display {
            width: 100%;
            max-width: none;
        }
    }
</style>