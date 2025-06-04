<!-- FIXED: The key changes are in the handlePack function and conditional rendering -->

<script>
    import { onMount, onDestroy } from 'svelte';
    import { transactions, currentPrice, blockData, colorMode } from '$lib/stores.js';
    import { fetchTransactions, fetchBlocks, fetchPrice, addUsdValues } from '$lib/api.js';
    
    // Import components
    import Header from '$lib/components/Header.svelte';
    import BlocksSection from '$lib/components/BlocksSection.svelte';
    import StatsDisplay from '$lib/components/StatsDisplay.svelte';
    import Controls from '$lib/components/Controls.svelte';
    import MempoolGrid from '$lib/components/MempoolGrid.svelte';
    import ErgoPackingGrid from '$lib/components/ErgoPackingGrid.svelte';
    import BallPhysicsGrid from '$lib/components/BallPhysicsGrid.svelte';
    import TransactionTable from '$lib/components/TransactionTable.svelte';
    import Footer from '$lib/components/Footer.svelte';
    
    // Import global styles
    import '../app.css';
    
    let intervalIds = [];
    let packingMode = false;
    let ergoPackingRef;
    let ballPhysicsRef;
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
    
    // Connect controls to ball physics when both are ready
    $: if (controlsRef && ballPhysicsRef) {
        controlsRef.setBallPhysicsRef(ballPhysicsRef);
    }
    
    // Enhanced debug logging
    $: {
        console.log('🎯 Main page state changed:', {
            packingMode,
            colorMode: $colorMode,
            willShow: packingMode ? 'Packing' : $colorMode === 'balls' ? 'BallPhysics' : 'Grid'
        });
    }
    
    onMount(() => {
        console.log('🚀 Ergomempool SvelteKit app initialized');
        loadAllData();
        
        const transactionInterval = setInterval(loadTransactions, 30000);
        const priceInterval = setInterval(loadPrice, 300000);
        const blockInterval = setInterval(loadBlocks, 30000);
        
        intervalIds = [transactionInterval, priceInterval, blockInterval];
        
        console.log('⏰ Auto-refresh intervals set up');
    });
    
    onDestroy(() => {
        intervalIds.forEach(id => clearInterval(id));
        console.log('🧹 Cleaned up intervals');
    });
    
    async function loadAllData() {
        console.log('📡 Loading all data...');
        try {
            await Promise.all([
                loadTransactions(),
                loadPrice(),
                loadBlocks()
            ]);
            console.log('✅ All data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
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
        }
    }
    
    async function loadPrice() {
        try {
            const priceData = await fetchPrice();
            currentPrice.set(priceData.price);
            console.log(`💰 Current ERG price: $${priceData.price}`);
        } catch (error) {
            console.error('❌ Error loading price:', error);
        }
    }
    
    async function loadBlocks() {
        try {
            const blocks = await fetchBlocks();
            blockData.set(blocks);
            console.log(`🧱 Loaded ${blocks.length} blocks`);
        } catch (error) {
            console.error('❌ Error loading blocks:', error);
        }
    }
    
    function handleRefresh() {
        console.log('🔄 Manual refresh triggered');
        loadAllData();
        
        const refreshButton = document.querySelector('.control-button:last-child');
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
    
    // FIXED: Handle pack toggle with proper mode switching
    function handlePack(isPacking) {
        console.log('📦 Pack mode toggle:', isPacking, 'Current color mode:', $colorMode);
        packingMode = isPacking;
        
        if (isPacking) {
            console.log('📦 Switching to ERGO packing visualization');
            
            // FIXED: If we're coming from ball physics mode, switch away from it
            if ($colorMode === 'balls') {
                console.log('🔄 Switching from Ball Physics to Packing mode - changing color mode to size');
                colorMode.set('size');
            }
            
            // Start packing animation after component loads
            setTimeout(() => {
                if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                    console.log('🎬 Starting packing animation');
                    ergoPackingRef.startPackingAnimation();
                } else {
                    console.log('⚠️ Packing component not ready yet, retrying...');
                    
                    setTimeout(() => {
                        if (ergoPackingRef && ergoPackingRef.startPackingAnimation) {
                            console.log('🎬 Starting packing animation (retry)');
                            ergoPackingRef.startPackingAnimation();
                        } else {
                            console.log('❌ Failed to start packing animation');
                        }
                    }, 1000);
                }
            }, 500);
            
        } else {
            console.log('📊 Switching away from packing mode');
            // When turning off packing mode, we don't automatically switch to ball physics
            // The user can manually click the Ball Physics button if they want
        }
    }
</script>

<svelte:head>
    <title>Ergomempool</title>
    <meta name="description" content="Real-time Ergo blockchain mempool visualizer with transaction packing simulation">
    <meta name="keywords" content="Ergo, blockchain, mempool, visualization, cryptocurrency">
</svelte:head>

<div class="container">
    <Header />
    <BlocksSection />
    
    <main class="visualizer" class:packing-mode={packingMode}>
        <h2>Mempool Visualizer</h2>
        
        <StatsDisplay packingStats={currentPackingStats} />
        
        <Controls 
            bind:this={controlsRef}
            onRefresh={handleRefresh} 
            onPack={handlePack} 
        />
        
        <!-- FIXED: Priority-based conditional rendering - Packing mode takes priority -->
        {#if packingMode}
            <ErgoPackingGrid 
                bind:this={ergoPackingRef}
                packingStats={currentPackingStats} 
            />
        {:else if $colorMode === 'balls'}
            <BallPhysicsGrid 
                bind:this={ballPhysicsRef}
                packingStats={currentPackingStats} 
            />
        {:else}
            <MempoolGrid />
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
    }
    
    .visualizer h2 {
        margin-top: 0;
        margin-bottom: 25px;
        color: var(--primary-orange);
        font-size: 28px;
        text-shadow: 0 2px 4px rgba(230, 126, 34, 0.3);
        text-align: center;
    }
    
    .visualizer.packing-mode {
        min-height: 600px;
        background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    }
    
    .visualizer.packing-mode h2 {
        color: var(--primary-orange);
        font-size: 28px;
        text-align: center;
        margin-bottom: 20px;
    }
    
    @media (max-width: 768px) {
        .visualizer {
            padding: 15px;
        }
        
        .visualizer h2 {
            font-size: 24px;
            margin-bottom: 20px;
        }
        
        .visualizer.packing-mode {
            min-height: 500px;
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
        
        .visualizer.packing-mode {
            min-height: 450px;
        }
    }
</style>