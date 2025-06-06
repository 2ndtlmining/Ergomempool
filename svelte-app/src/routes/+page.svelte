<!-- Updated +page.svelte with TransactionPackingGrid as default -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { transactions, currentPrice, blockData } from '$lib/stores.js';
    import { fetchTransactions, fetchBlocks, fetchPrice, addUsdValues } from '$lib/api.js';
    
    // Import components
    import Header from '$lib/components/Header.svelte';
    import BlocksSection from '$lib/components/BlocksSection.svelte';
    import StatsDisplay from '$lib/components/StatsDisplay.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import MempoolGrid from '$lib/components/MempoolGrid.svelte';
    import ErgoPackingGrid from '$lib/components/ErgoPackingGrid.svelte';
    import BallPhysicsGrid from '$lib/components/BallPhysicsGrid.svelte';
    import TransactionPackingGrid from '$lib/components/TransactionPackingGrid.svelte';
    import TransactionTable from '$lib/components/TransactionTable.svelte';
    import Footer from '$lib/components/Footer.svelte';
    
    // Import global styles
    import '../app.css';
    
    let intervalIds = [];
    let currentMode = 'pack'; // CHANGED: Default to TransactionPackingGrid
    let ergoPackingRef;
    let ballPhysicsRef;
    let transactionPackingRef;
    let controlsRef;
    let currentPackingStats = {
        blockCapacity: 2000000,
        mempoolSize: 0,
        utilization: 0,
        totalTransactions: 0,
        packedTransactions: 0,
        efficiency: 0,
        status: 'Ready to pack',
        statusClass: 'info'
    };
    
    // State to track if initial data has been loaded
    let dataLoaded = false;
    let componentsReady = false;
    
    // Connect controls to components when ready
    $: if (controlsRef && ballPhysicsRef) {
        controlsRef.setBallPhysicsRef(ballPhysicsRef);
    }
    
    $: if (controlsRef && ergoPackingRef) {
        controlsRef.setErgoPackingRef(ergoPackingRef);
    }
    
    $: if (controlsRef && transactionPackingRef) {
        controlsRef.setTransactionPackingRef(transactionPackingRef);
        componentsReady = true;
    }
    
    // Enhanced debug logging
    $: {
        console.log('🎯 Main page state changed:', {
            currentMode,
            dataLoaded,
            componentsReady,
            willShow: getDisplayModeName(currentMode)
        });
    }
    
    function getDisplayModeName(mode) {
        switch(mode) {
            case 'grid': return 'Grid View';
            case 'hex': return 'Hexagon Packing';
            case 'pack': return 'Transaction Packing';
            case 'ball': return 'Ball Physics';
            default: return 'Unknown';
        }
    }
    
    onMount(async () => {
        console.log('🚀 Ergomempool SvelteKit app initialized with TransactionPackingGrid as default');
        
        // Load initial data first
        await loadAllData();
        dataLoaded = true;
        
        // Set up auto-refresh intervals
        const transactionInterval = setInterval(loadTransactions, 30000);
        const priceInterval = setInterval(loadPrice, 300000);
        const blockInterval = setInterval(loadBlocks, 30000);
        
        intervalIds = [transactionInterval, priceInterval, blockInterval];
        
        console.log('⏰ Auto-refresh intervals set up');
        
        // Initialize Controls component with default mode
        setTimeout(() => {
            if (controlsRef && controlsRef.setMode) {
                controlsRef.setMode('pack');
                console.log('🎯 Set initial mode to pack in Controls component');
            }
        }, 100);
    });
    
    onDestroy(() => {
        intervalIds.forEach(id => clearInterval(id));
        console.log('🧹 Cleaned up intervals');
    });
    
    async function loadAllData() {
        console.log('📡 Loading all data...');
        try {
            // Load data sequentially to ensure dependencies are met
            await loadPrice();
            await loadBlocks();
            await loadTransactions(); // Load transactions last since they depend on price
            
            console.log('✅ All data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
            // Set fallback data to prevent crashes
            transactions.set([]);
            currentPrice.set(1.0);
            blockData.set([]);
        }
    }
    
    async function loadTransactions() {
        try {
            const txData = await fetchTransactions();
            const priceData = await fetchPrice();
            const txWithUsd = addUsdValues(txData, priceData.price);
            
            transactions.set(txWithUsd);
            console.log(`📊 Loaded ${txWithUsd.length} transactions`);
        } catch (error) {
            console.error('❌ Error loading transactions:', error);
            // Set empty array as fallback
            transactions.set([]);
        }
    }
    
    async function loadPrice() {
        try {
            const priceData = await fetchPrice();
            currentPrice.set(priceData.price);
            console.log(`💰 Current ERG price: $${priceData.price}`);
        } catch (error) {
            console.error('❌ Error loading price:', error);
            // Set fallback price
            currentPrice.set(1.0);
        }
    }
    
    async function loadBlocks() {
        try {
            const blocks = await fetchBlocks();
            blockData.set(blocks);
            console.log(`🧱 Loaded ${blocks.length} blocks`);
        } catch (error) {
            console.error('❌ Error loading blocks:', error);
            // Set empty array as fallback
            blockData.set([]);
        }
    }
    
    function handleRefresh() {
        console.log('🔄 Manual refresh triggered');
        loadAllData();
        
        const refreshButton = document.querySelector('.control-button.refresh-button');
        if (refreshButton) {
            const originalText = refreshButton.textContent;
            refreshButton.textContent = 'Refreshing...';
            refreshButton.disabled = true;
            
            setTimeout(() => {
                refreshButton.textContent = originalText;
                refreshButton.disabled = false;
            }, 1000);
        }
    }
    
    // Handle mode changes from Controls component
    function handlePack(isHexPacking) {
        console.log('📦 Handle pack called with:', isHexPacking);
        
        if (isHexPacking) {
            // Switch to hex packing mode
            currentMode = 'hex';
            console.log('📦 Switching to Hexagon packing mode');
            
            // Start packing animation after component loads
            setTimeout(() => {
                if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                    console.log('🎬 Starting hexagon packing animation');
                    ergoPackingRef.startPackingAnimation();
                } else {
                    console.log('⚠️ Hexagon packing component not ready yet, retrying...');
                    
                    setTimeout(() => {
                        if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                            console.log('🎬 Starting hexagon packing animation (retry)');
                            ergoPackingRef.startPackingAnimation();
                        } else {
                            console.log('❌ Failed to start hexagon packing animation');
                        }
                    }, 1000);
                }
            }, 500);
        } else {
            // If not hex packing, get current mode from Controls
            if (controlsRef && controlsRef.getCurrentMode) {
                currentMode = controlsRef.getCurrentMode();
                console.log('🎯 Updated mode from Controls:', currentMode);
            } else {
                // Fallback to pack mode (our new default)
                currentMode = 'pack';
                console.log('📊 Fallback to pack mode');
            }
        }
    }
    
    // Watch for mode changes from Controls component
    function handleModeChange() {
        if (controlsRef && controlsRef.getCurrentMode) {
            const newMode = controlsRef.getCurrentMode();
            if (newMode !== currentMode) {
                console.log(`🔄 Mode change detected: ${currentMode} → ${newMode}`);
                currentMode = newMode;
            }
        }
    }
    
    // Poll for mode changes (since we don't have direct communication)
    let modeCheckInterval;
    onMount(() => {
        modeCheckInterval = setInterval(handleModeChange, 500);
    });
    
    onDestroy(() => {
        if (modeCheckInterval) {
            clearInterval(modeCheckInterval);
        }
    });
</script>

<svelte:head>
    <title>Ergomempool</title>
    <meta name="description" content="Real-time Ergo blockchain mempool visualizer with transaction packing simulation">
    <meta name="keywords" content="Ergo, blockchain, mempool, visualization, cryptocurrency">
</svelte:head>

<div class="container">
    <Header />
    <BlocksSection />
    
    <main class="visualizer" 
          class:hex-mode={currentMode === 'hex'} 
          class:pack-mode={currentMode === 'pack'} 
          class:ball-mode={currentMode === 'ball'}
          class:grid-mode={currentMode === 'grid'}>
        <h2>Mempool Visualizer</h2>
        
        <StatsDisplay packingStats={currentPackingStats} />
        
        <Controls 
            bind:this={controlsRef}
            onRefresh={handleRefresh} 
            onPack={handlePack} 
        />
        
        <!-- Only render visualization components after data is loaded -->
        {#if dataLoaded}
            <!-- Priority-based conditional rendering -->
            {#if currentMode === 'hex'}
                <!-- Hexagon Packing Mode -->
                <ErgoPackingGrid 
                    bind:this={ergoPackingRef}
                    packingStats={currentPackingStats} 
                />
            {:else if currentMode === 'ball'}
                <!-- Ball Physics Mode -->
                <BallPhysicsGrid 
                    bind:this={ballPhysicsRef}
                    packingStats={currentPackingStats} 
                />
            {:else if currentMode === 'pack'}
                <!-- Transaction Packing Mode (NEW DEFAULT) -->
                <TransactionPackingGrid 
                    bind:this={transactionPackingRef}
                    bind:packingStats={currentPackingStats}
                />
            {:else}
                <!-- Fallback Grid Mode -->
                <MempoolGrid />
            {/if}
        {:else}
            <!-- Loading state while data loads -->
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading transaction data...</div>
            </div>
        {/if}
    </main>
    
    <TransactionTable />
    <Footer />
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer {
        flex: 1;
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
        padding: 25px;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        align-items: center;
        min-height: 400px;
        border-top: 1px solid var(--border-color);
        transition: all 0.3s ease;
    }
    
    .visualizer h2 {
        margin-top: 0;
        margin-bottom: 25px;
        color: var(--primary-orange);
        font-size: 28px;
        text-shadow: 0 2px 4px rgba(230, 126, 34, 0.3);
        text-align: center;
        transition: all 0.3s ease;
    }
    
    /* Grid mode */
    .visualizer.grid-mode {
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    }
    
    .visualizer.grid-mode h2 {
        color: var(--primary-orange);
    }
    
    /* Hexagon Packing mode */
    .visualizer.hex-mode {
        min-height: 600px;
        background: linear-gradient(135deg, rgba(230, 126, 34, 0.05) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer.hex-mode h2 {
        color: var(--primary-orange);
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
    }
    
    /* Transaction Packing mode (NEW DEFAULT) */
    .visualizer.pack-mode {
        min-height: 700px;
        background: linear-gradient(135deg, rgba(52, 152, 219, 0.05) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer.pack-mode h2 {
        color: #3498db;
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
        text-shadow: 0 2px 4px rgba(52, 152, 219, 0.3);
    }
    
    /* Ball Physics mode */
    .visualizer.ball-mode {
        min-height: 700px;
        background: linear-gradient(135deg, rgba(212, 101, 27, 0.05) 0%, var(--dark-bg) 100%);
    }
    
    .visualizer.ball-mode h2 {
        color: #d4651b;
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
        text-shadow: 0 2px 4px rgba(212, 101, 27, 0.3);
    }
    
    /* Loading state styling */
    .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 20px;
    }
    
    .loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(52, 152, 219, 0.2);
        border-left: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-text {
        color: var(--text-light);
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        opacity: 0.8;
    }
    
    @media (max-width: 768px) {
        .visualizer {
            padding: 15px;
        }
        
        .visualizer h2 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .visualizer.hex-mode,
        .visualizer.pack-mode,
        .visualizer.ball-mode {
            min-height: 500px;
        }
        
        .loading-container {
            min-height: 200px;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
        }
        
        .loading-text {
            font-size: 14px;
        }
    }
    
    @media (max-width: 480px) {
        .visualizer {
            padding: 10px;
        }
        
        .visualizer h2 {
            font-size: 20px;
            margin-bottom: 15px;
        }
        
        .visualizer.hex-mode,
        .visualizer.pack-mode,
        .visualizer.ball-mode {
            min-height: 450px;
        }
    }
</style>