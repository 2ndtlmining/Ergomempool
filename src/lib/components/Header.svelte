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
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/dashboard.png" alt="" class="nav-icon-img" draggable="false" />
                </button>
                
                <button 
                    class="nav-icon"
                    class:active={currentMode === 'hex'}
                    on:click={() => setMode('hex')}
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/hexagon_white.png" alt="" class="nav-icon-img" draggable="false" />
                </button>
                
                <button 
                    class="nav-icon"
                    class:active={currentMode === 'ball'}
                    on:click={() => setMode('ball')}
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/basketball.png" alt="" class="nav-icon-img" draggable="false" />
                </button>
                
                <button 
                    class="nav-icon nav-refresh"
                    on:click={handleRefresh}
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/refresh_white.png" alt="" class="nav-icon-img" draggable="false" />
                </button>
                
                <button 
                    class="nav-icon nav-function"
                    on:click={handleAddDummy}
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/dummy.png" alt="" class="nav-icon-img" draggable="false" />
                </button>
                
                <button 
                    class="nav-icon nav-function"
                    on:click={handleRepack}
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/brain.png" alt="" class="nav-icon-img" draggable="false" />
                </button>
            </nav>
        </div>

        <!-- Right side: Wallet section with matching navigation style -->
        <div class="header-right">
            <nav class="wallet-navigation">
                <button 
                    class="nav-icon wallet-test-btn"
                    class:disabled={!$walletConnector.isConnected}
                    on:click={handleTestTransaction}
                    disabled={!$walletConnector.isConnected}
                    title={$walletConnector.isConnected ? "Send test transaction" : "Connect wallet to send test transactions"}
                    aria-label=""
                    role="button"
                >
                    <img src="/icons/flask2-white.png" alt="" class="nav-icon-img" draggable="false">
                    {#if !$walletConnector.isConnected}
                        <div class="lock-overlay">🔒</div>
                    {/if}
                </button>
                
                {#if !$walletConnector.isConnected}
                    <button 
                        class="nav-icon wallet-connect-btn"
                        class:connecting={isConnecting}
                        on:click={handleWalletConnect}
                        disabled={isConnecting}
                        title="Click to connect wallet"
                        aria-label=""
                        role="button"
                    >
                        <img src="/wallet/ergo-wallet-white.png" alt="" class="nav-icon-img" draggable="false">
                        {#if isConnecting}
                            <div class="connecting-spinner"></div>
                        {/if}
                    </button>
                {:else}
                    <button 
                        class="nav-icon wallet-connected-btn"
                        on:click={handleWalletConnect}
                        title="Click to disconnect wallet"
                        data-wallet-name={$walletConnector.connectedWallet?.name || ''}
                        data-wallet-balance={walletBalance || ''}
                        data-wallet-address={$walletConnector.connectedAddress?.substring(0, 20) || ''}
                        aria-label=""
                        role="button"
                    >
                        <img src="/wallet/ergo-wallet-white.png" alt="" class="nav-icon-img" draggable="false">
                        <div class="connection-indicator"></div>
                    </button>
                {/if}
            </nav>
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
    
    /* Wallet navigation - matches main navigation styling exactly */
    .wallet-navigation {
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
        /* Completely disable browser tooltips */
        pointer-events: auto;
    }
    
    .nav-icon * {
        pointer-events: none;
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
    
    /* Wallet-specific button states */
    .wallet-test-btn {
        position: relative;
    }
    
    .wallet-test-btn.disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
    
    .wallet-test-btn.disabled:hover::before {
        opacity: 0;
    }
    
    /* Lock overlay for disabled test button */
    .lock-overlay {
        position: absolute;
        top: 2px;
        right: 2px;
        font-size: 10px;
        z-index: 10;
        text-shadow: 0 0 3px rgba(0,0,0,0.8);
    }
    
    .wallet-connect-btn {
        position: relative;
    }
    
    .wallet-connect-btn.connecting {
        background: rgba(52, 152, 219, 0.2);
    }
    
    .wallet-connected-btn {
        background: var(--primary-orange);
        box-shadow: 0 2px 8px rgba(212, 101, 27, 0.4);
        position: relative;
    }
    
    .wallet-connected-btn::before {
        opacity: 0;
    }
    
    /* Connection indicator */
    .connection-indicator {
        position: absolute;
        top: 3px;
        right: 3px;
        width: 8px;
        height: 8px;
        background: #27ae60;
        border-radius: 50%;
        border: 1px solid white;
        animation: connectionPulse 2s ease-in-out infinite;
        z-index: 10;
    }
    
    @keyframes connectionPulse {
        0%, 100% { 
            background: #27ae60;
            box-shadow: 0 0 0 0 rgba(39, 174, 96, 0.7);
        }
        50% { 
            background: #2ecc71;
            box-shadow: 0 0 0 4px rgba(39, 174, 96, 0);
        }
    }
    
    /* Connecting spinner */
    .connecting-spinner {
        position: absolute;
        top: 3px;
        right: 3px;
        width: 8px;
        height: 8px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-top: 1px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        z-index: 10;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
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
        
        .main-navigation,
        .wallet-navigation {
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
            /* Keep horizontal layout - don't wrap */
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
            min-height: 50px;
        }
        
        .header-left {
            gap: 12px;
            flex: 1;
            min-width: 0; /* Allow shrinking */
        }
        
        .header-right {
            gap: 8px;
            flex-shrink: 0;
            margin-left: 8px;
        }
        
        .logo-image {
            height: 36px; /* Slightly smaller logo */
        }
        
        .main-navigation,
        .wallet-navigation {
            gap: 2px;
            padding: 3px;
        }
        
        .nav-icon {
            width: 32px; /* Smaller buttons */
            height: 32px;
            border-radius: 8px;
        }
        
        .nav-icon-img {
            width: 14px;
            height: 14px;
        }
        
        /* Reduce spacing for function buttons */
        .nav-refresh, .nav-function {
            margin-left: 4px;
            padding-left: 6px;
        }
        
        .nav-function {
            margin-left: 2px;
            padding-left: 2px;
        }
    }
    
    @media (max-width: 640px) {
        .header-container {
            padding: 6px 12px;
            /* Keep horizontal layout, don't go vertical */
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }
        
        .header-left {
            gap: 8px;
            flex: 1;
            min-width: 0;
        }
        
        .header-right {
            gap: 6px;
            flex-shrink: 0;
            margin-left: 6px;
        }
        
        .logo-image {
            height: 32px; /* Even smaller logo */
        }
        
        .main-navigation,
        .wallet-navigation {
            gap: 1px;
            padding: 2px;
        }
        
        .nav-icon {
            width: 28px; /* Smaller buttons for tight fit */
            height: 28px;
            border-radius: 6px;
        }
        
        .nav-icon-img {
            width: 12px;
            height: 12px;
        }
        
        /* Minimal spacing for function buttons */
        .nav-refresh, .nav-function {
            margin-left: 2px;
            padding-left: 4px;
            border-left-width: 0.5px;
        }
        
        .nav-function {
            margin-left: 1px;
            padding-left: 1px;
            border-left: none;
        }
    }
    
    /* Extra small screens - if needed */
    @media (max-width: 480px) {
        .header-container {
            padding: 4px 8px;
        }
        
        .header-left {
            gap: 6px;
        }
        
        .header-right {
            gap: 4px;
            margin-left: 4px;
        }
        
        .logo-image {
            height: 28px;
        }
        
        .nav-icon {
            width: 26px;
            height: 26px;
            border-radius: 5px;
        }
        
        .nav-icon-img {
            width: 11px;
            height: 11px;
        }
        
        .main-navigation,
        .wallet-navigation {
            gap: 0px;
            padding: 1px;
        }
    }
</style>