<!-- Optimized +page.svelte with faster loading for TransactionPackingGrid -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { transactions, currentPrice, blockData } from '$lib/stores.js';
    import { fetchTransactions, fetchBlocks, fetchPrice, addUsdValues } from '$lib/api.js';
    
    // Import components with lazy loading approach
    import Header from '$lib/components/Header.svelte';
    import BlocksSection from '$lib/components/BlocksSection.svelte';
    import StatsDisplay from '$lib/components/StatsDisplay.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import Footer from '$lib/components/Footer.svelte';
    
    // Lazy import for non-default components
    let MempoolGrid, ErgoPackingGrid, BallPhysicsGrid, TransactionTable;
    
    // Always import TransactionPackingGrid since it's default
    import TransactionPackingGrid from '$lib/components/TransactionPackingGrid.svelte';
    
    // Import global styles
    import '../app.css';
    
    let intervalIds = [];
    let currentMode = 'pack'; // Default to TransactionPackingGrid
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
    
    // Optimized loading states
    let coreDataLoaded = false;
    let componentsReady = false;
    let initialLoadComplete = false;
    
    // Performance optimization: Load data in stages
    let loadingStage = 'price'; // 'price' -> 'basic' -> 'transactions' -> 'complete'
    
    // Connect controls to components when ready
    $: if (controlsRef && transactionPackingRef) {
        controlsRef.setTransactionPackingRef(transactionPackingRef);
        componentsReady = true;
    }
    
    // Lazy load other components only when needed
    $: if (currentMode !== 'pack' && !MempoolGrid) {
        loadOtherComponents();
    }
    
    async function loadOtherComponents() {
        if (!MempoolGrid) {
            const { default: MempoolGridComponent } = await import('$lib/components/MempoolGrid.svelte');
            MempoolGrid = MempoolGridComponent;
        }
        if (!ErgoPackingGrid) {
            const { default: ErgoPackingGridComponent } = await import('$lib/components/ErgoPackingGrid.svelte');
            ErgoPackingGrid = ErgoPackingGridComponent;
        }
        if (!BallPhysicsGrid) {
            const { default: BallPhysicsGridComponent } = await import('$lib/components/BallPhysicsGrid.svelte');
            BallPhysicsGrid = BallPhysicsGridComponent;
        }
        if (!TransactionTable) {
            const { default: TransactionTableComponent } = await import('$lib/components/TransactionTable.svelte');
            TransactionTable = TransactionTableComponent;
        }
    }
    
    // Enhanced debug logging
    $: {
        console.log('🎯 Main page state:', {
            currentMode,
            loadingStage,
            coreDataLoaded,
            componentsReady,
            initialLoadComplete
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
        console.log('🚀 Ergomempool SvelteKit app initialized - OPTIMIZED LOADING');
        
        // Stage 1: Load price first (fastest)
        loadingStage = 'price';
        await loadPrice();
        
        // Stage 2: Load basic data in parallel
        loadingStage = 'basic';
        const basicDataPromise = loadBlocks();
        
        // Stage 3: Start loading minimal transactions for faster initial render
        loadingStage = 'transactions';
        const transactionsPromise = loadTransactionsOptimized();
        
        // Wait for core data
        await Promise.all([basicDataPromise, transactionsPromise]);
        coreDataLoaded = true;
        
        // Stage 4: Complete initialization
        loadingStage = 'complete';
        initialLoadComplete = true;
        
        // Set up auto-refresh intervals (with longer intervals to reduce load)
        const transactionInterval = setInterval(loadTransactionsOptimized, 45000); // 45s instead of 30s
        const priceInterval = setInterval(loadPrice, 300000); // 5 minutes
        const blockInterval = setInterval(loadBlocks, 60000); // 1 minute instead of 30s
        
        intervalIds = [transactionInterval, priceInterval, blockInterval];
        
        console.log('⏰ Optimized auto-refresh intervals set up');
        
        // Initialize Controls component with default mode
        setTimeout(() => {
            if (controlsRef && controlsRef.setMode) {
                controlsRef.setMode('pack');
                console.log('🎯 Set initial mode to pack in Controls component');
            }
        }, 100);
        
        // Load transaction table component lazily after initial render
        setTimeout(() => {
            loadOtherComponents();
        }, 1000);
    });
    
    onDestroy(() => {
        intervalIds.forEach(id => clearInterval(id));
        console.log('🧹 Cleaned up intervals');
    });
    
    // Optimized transaction loading - load smaller batches initially
    async function loadTransactionsOptimized() {
        try {
            console.log('📊 Loading transactions (optimized)...');
            const txData = await fetchTransactions();
            const priceData = await fetchPrice();
            
            // For initial load, only process first 100 transactions for faster rendering
            const maxTransactions = initialLoadComplete ? txData.length : Math.min(txData.length, 100);
            const limitedTxData = txData.slice(0, maxTransactions);
            
            const txWithUsd = addUsdValues(limitedTxData, priceData.price);
            
            transactions.set(txWithUsd);
            console.log(`📊 Loaded ${txWithUsd.length}/${txData.length} transactions (optimized)`);
            
            // Load remaining transactions in background if initial load
            if (!initialLoadComplete && txData.length > 100) {
                setTimeout(() => {
                    const remainingTxData = txData.slice(100);
                    const remainingTxWithUsd = addUsdValues(remainingTxData, priceData.price);
                    transactions.update(current => [...current, ...remainingTxWithUsd]);
                    console.log(`📊 Loaded remaining ${remainingTxData.length} transactions in background`);
                }, 2000);
            }
        } catch (error) {
            console.error('❌ Error loading transactions:', error);
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
            blockData.set([]);
        }
    }
    
    // Full data reload for manual refresh
    async function loadAllData() {
        console.log('📡 Loading all data...');
        try {
            await loadPrice();
            await loadBlocks();
            
            // Load full transaction set
            const txData = await fetchTransactions();
            const priceData = await fetchPrice();
            const txWithUsd = addUsdValues(txData, priceData.price);
            transactions.set(txWithUsd);
            
            console.log('✅ All data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
            // Set fallback data to prevent crashes
            transactions.set([]);
            currentPrice.set(1.0);
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
            currentMode = 'hex';
            console.log('📦 Switching to Hexagon packing mode');
            
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
                        }
                    }, 1000);
                }
            }, 500);
        } else {
            if (controlsRef && controlsRef.getCurrentMode) {
                currentMode = controlsRef.getCurrentMode();
                console.log('🎯 Updated mode from Controls:', currentMode);
            } else {
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
    
    // Poll for mode changes
    let modeCheckInterval;
    onMount(() => {
        modeCheckInterval = setInterval(handleModeChange, 1000); // Reduced frequency
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
    <!-- Preload critical resources -->
    <link rel="preload" href="/Ergomempool_logo_f.svg" as="image">
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
        
        <!-- Optimized loading with better performance -->
        {#if coreDataLoaded}
            <!-- Priority-based conditional rendering with lazy loading -->
            {#if currentMode === 'pack'}
                <!-- Transaction Packing Mode (DEFAULT - Always loaded) -->
                <TransactionPackingGrid 
                    bind:this={transactionPackingRef}
                    bind:packingStats={currentPackingStats}
                />
            {:else if currentMode === 'hex' && ErgoPackingGrid}
                <!-- Hexagon Packing Mode (Lazy loaded) -->
                <svelte:component 
                    this={ErgoPackingGrid}
                    bind:this={ergoPackingRef}
                    packingStats={currentPackingStats} 
                />
            {:else if currentMode === 'ball' && BallPhysicsGrid}
                <!-- Ball Physics Mode (Lazy loaded) -->
                <svelte:component 
                    this={BallPhysicsGrid}
                    bind:this={ballPhysicsRef}
                    packingStats={currentPackingStats} 
                />
            {:else if currentMode === 'grid' && MempoolGrid}
                <!-- Grid Mode (Lazy loaded) -->
                <svelte:component this={MempoolGrid} />
            {:else}
                <!-- Loading placeholder for lazy-loaded components -->
                <div class="lazy-loading-container">
                    <div class="lazy-loading-spinner"></div>
                    <div class="lazy-loading-text">Loading {getDisplayModeName(currentMode)}...</div>
                </div>
            {/if}
        {:else}
            <!-- Initial loading state -->
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <div class="loading-text">
                    {#if loadingStage === 'price'}
                        Loading price data...
                    {:else if loadingStage === 'basic'}
                        Loading blockchain data...
                    {:else if loadingStage === 'transactions'}
                        Loading transactions...
                    {:else}
                        Initializing packing algorithm...
                    {/if}
                </div>
                <div class="loading-progress">
                    <div class="progress-bar" class:stage-price={loadingStage === 'price'} class:stage-basic={loadingStage === 'basic'} class:stage-transactions={loadingStage === 'transactions'} class:stage-complete={loadingStage === 'complete'}></div>
                </div>
            </div>
        {/if}
    </main>
    
    <!-- Lazy load TransactionTable -->
    {#if TransactionTable && initialLoadComplete}
        <svelte:component this={TransactionTable} />
    {/if}
    
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
    
    .visualizer.grid-mode {
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    }
    
    .visualizer.grid-mode h2 {
        color: var(--primary-orange);
    }
    
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
    
    /* Enhanced loading state styling */
    .loading-container, .lazy-loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        gap: 20px;
    }
    
    .loading-spinner, .lazy-loading-spinner {
        width: 50px;
        height: 50px;
        border: 4px solid rgba(52, 152, 219, 0.2);
        border-left: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
    
    .lazy-loading-spinner {
        width: 30px;
        height: 30px;
        border-width: 3px;
    }
    
    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }
    
    .loading-text, .lazy-loading-text {
        color: var(--text-light);
        font-size: 16px;
        font-weight: 500;
        text-align: center;
        opacity: 0.8;
    }
    
    .lazy-loading-text {
        font-size: 14px;
    }
    
    /* Progress bar for initial loading */
    .loading-progress {
        width: 200px;
        height: 4px;
        background: rgba(52, 152, 219, 0.2);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #3498db, #2980b9);
        border-radius: 2px;
        transition: width 0.5s ease;
        width: 0%;
    }
    
    .progress-bar.stage-price { width: 25%; }
    .progress-bar.stage-basic { width: 50%; }
    .progress-bar.stage-transactions { width: 75%; }
    .progress-bar.stage-complete { width: 100%; }
    
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
        
        .loading-container, .lazy-loading-container {
            min-height: 200px;
        }
        
        .loading-spinner, .lazy-loading-spinner {
            width: 40px;
            height: 40px;
        }
        
        .loading-text, .lazy-loading-text {
            font-size: 14px;
        }
        
        .loading-progress {
            width: 150px;
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