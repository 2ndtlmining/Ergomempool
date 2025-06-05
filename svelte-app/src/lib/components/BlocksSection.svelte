<script>
    import { blockData } from '$lib/stores.js';
    import { transactions } from '$lib/stores.js';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    
    const minerNames = {
        "2TH22DBY": "2Miners",
        "jndPhqGm": "DX Pool", 
        "yi5CLS9V": "Herominers",
        "hBMbdspA": "K1 Pool",
        "DnPQovBb": "Kryptex",
        "NXXe6NnN": "Nanopool",
        "utiXtQYP": "Sigmanauts",
        "ofdQbHbY": "Woolypooly",
        "NhuNP8Je": "JJpool"
    };
    
    const minerLogos = {
        "2TH22DBY": "logos/2miners.png",
        "jndPhqGm": "logos/dxpool.png",
        "yi5CLS9V": "logos/herominers.png",
        "hBMbdspA": "logos/k1.png",
        "DnPQovBb": "logos/kryptex.png",
        "NXXe6NnN": "logos/nanopool.png",
        "utiXtQYP": "logos/sigmanauts.png",
        "ofdQbHbY": "logos/woolypooly.jpg",
        "Unknown": "logos/unknown.svg",
        "NhuNP8Je": "logos/jjpool.png"
    };
    
    let mounted = false;
    let previousBlockHeight = null;
    let animating = false;
    
    function getMinerInfo(minerName) {
        if (!minerName) {
            return { name: "Unknown", logo: minerLogos["Unknown"] };
        }
        
        if (minerName in minerNames) {
            return { 
                name: minerNames[minerName], 
                logo: minerLogos[minerName] || minerLogos["Unknown"]
            };
        }
        
        return { name: "Unknown", logo: minerLogos["Unknown"] };
    }
    
    function calculateTimeAgo(timestamp) {
        const now = Date.now();
        const diffInMinutes = Math.floor((now - timestamp) / (1000 * 60));
        
        if (diffInMinutes < 1) {
            return "< 1 min ago";
        } else if (diffInMinutes === 1) {
            return "1 min ago";
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes} mins ago`;
        } else {
            const hours = Math.floor(diffInMinutes / 60);
            const remainingMins = diffInMinutes % 60;
            if (hours === 1) {
                return remainingMins > 0 ? `1h ${remainingMins}m ago` : "1h ago";
            } else {
                return remainingMins > 0 ? `${hours}h ${remainingMins}m ago` : `${hours}h ago`;
            }
        }
    }

    // Calculate mempool size in bytes
    $: mempoolSizeBytes = $transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    
    // Format bytes to MB
    function formatBytes(bytes) {
        return (bytes / 1000000).toFixed(2);
    }

    // Calculate actual fees from mempool transactions
    $: estimatedFees = (() => {
        if (!$transactions.length) return 0;
        
        let totalMempoolFees = 0;
        
        for (const tx of $transactions) {
            if (tx.fee !== undefined && tx.fee > 0) {
                totalMempoolFees += tx.fee;
            } else {
                const totalInputs = tx.inputs?.reduce((sum, input) => sum + (input.value || 0), 0) || 0;
                const totalOutputs = tx.outputs?.reduce((sum, output) => sum + (output.value || 0), 0) || 0;
                const txFee = totalInputs - totalOutputs;
                
                if (txFee > 0 && txFee < 1) {
                    totalMempoolFees += txFee;
                } else {
                    totalMempoolFees += 0.001;
                }
            }
        }
        
        return totalMempoolFees;
    })();
    
    // Get base miner reward from most recent block or use default
    $: baseMinerReward = $blockData.length > 0 ? ($blockData[0].baseMinerReward || 15.0) : 15.0;
    
    // Estimated total reward for next block
    $: estimatedTotalReward = baseMinerReward + estimatedFees;
    
    // Block animation function with simultaneous movement (train/production line effect)
    async function animateNewBlock() {
        if (animating) {
            console.log('⚠️ Animation already in progress, skipping...');
            return;
        }
        
        animating = true;
        console.log('🚀 Starting synchronized block animation (train effect)...');
        
        try {
            // Get all block containers
            const nextBlockContainer = document.querySelector('.next-block-section .block-container');
            const lastBlocksContainers = Array.from(document.querySelectorAll('.last-blocks-section .block-container'));
            
            if (!nextBlockContainer || lastBlocksContainers.length === 0) {
                console.warn('⚠️ Block containers not found');
                return;
            }
            
            // PHASE 1: Calculate all movements first
            console.log('🧮 Calculating movement paths for all blocks...');
            
            // Calculate where the next block needs to move
            const firstBlockContainer = lastBlocksContainers[0];
            const nextBlockRect = nextBlockContainer.getBoundingClientRect();
            const firstBlockRect = firstBlockContainer.getBoundingClientRect();
            
            const nextBlockDeltaX = firstBlockRect.left - nextBlockRect.left;
            const nextBlockDeltaY = firstBlockRect.top - nextBlockRect.top;
            
            // Calculate movements for existing blocks
            const blockMovements = lastBlocksContainers.map((container, index) => {
                if (index === lastBlocksContainers.length - 1) {
                    // Last block exits to the right
                    return {
                        container,
                        transform: 'translateX(150px) scale(0.8)',
                        opacity: '0',
                        isExiting: true
                    };
                } else {
                    // Other blocks shift to next position
                    const nextContainer = lastBlocksContainers[index + 1];
                    if (nextContainer) {
                        const currentRect = container.getBoundingClientRect();
                        const nextRect = nextContainer.getBoundingClientRect();
                        const shiftDistance = nextRect.left - currentRect.left;
                        return {
                            container,
                            transform: `translateX(${shiftDistance}px)`,
                            opacity: '1',
                            isExiting: false
                        };
                    }
                }
                return null;
            }).filter(Boolean);
            
            // PHASE 2: Setup all blocks for simultaneous animation
            console.log('🎬 Setting up simultaneous animation for all blocks...');
            
            const animationDuration = '1.0s';
            const animationEasing = 'cubic-bezier(0.4, 0, 0.2, 1)';
            
            // Prepare next block
            nextBlockContainer.style.position = 'relative';
            nextBlockContainer.style.zIndex = '100';
            nextBlockContainer.style.transition = `transform ${animationDuration} ${animationEasing}`;
            
            // Prepare existing blocks
            blockMovements.forEach(({ container }, index) => {
                container.style.position = 'relative';
                container.style.zIndex = '50';
                container.style.transition = `transform ${animationDuration} ${animationEasing}, opacity ${animationDuration} ease`;
            });
            
            // PHASE 3: Start ALL movements simultaneously (TRAIN EFFECT!)
            console.log('🚂 Starting synchronized train movement...');
            
            // Start next block movement
            requestAnimationFrame(() => {
                nextBlockContainer.style.transform = `translate(${nextBlockDeltaX}px, ${nextBlockDeltaY}px) scale(0.98)`;
            });
            
            // Start all existing block movements at the same time
            requestAnimationFrame(() => {
                blockMovements.forEach(({ container, transform, opacity }) => {
                    container.style.transform = transform;
                    container.style.opacity = opacity;
                });
            });
            
            // Wait for animation to complete
            await new Promise(resolve => {
                setTimeout(resolve, 1000); // Match animation duration
            });
            
            // PHASE 4: Clean reset
            console.log('🧹 Cleaning up animation styles...');
            
            // Reset next block
            nextBlockContainer.style.position = '';
            nextBlockContainer.style.zIndex = '';
            nextBlockContainer.style.transition = '';
            nextBlockContainer.style.transform = '';
            
            // Reset all existing blocks
            lastBlocksContainers.forEach(container => {
                container.style.position = '';
                container.style.transition = '';
                container.style.transform = '';
                container.style.opacity = '';
                container.style.zIndex = '';
            });
            
            console.log('✅ Synchronized block animation completed!');
            
        } catch (error) {
            console.error('❌ Block animation error:', error);
        } finally {
            animating = false;
        }
    }
    
    // Watch for new blocks and trigger animation
    $: if (browser && mounted && $blockData.length > 0) {
        const latestBlock = $blockData[0];
        const currentHeight = latestBlock.height;
        
        if (previousBlockHeight === null) {
            // First load, no animation
            previousBlockHeight = currentHeight;
            console.log(`📊 Initial block height: ${currentHeight}`);
        } else if (currentHeight > previousBlockHeight) {
            // New block detected - trigger animation
            console.log(`🎉 New block detected! Height: ${currentHeight} (prev: ${previousBlockHeight})`);
            
            // Small delay to ensure DOM is updated
            setTimeout(() => {
                animateNewBlock();
            }, 100);
            
            previousBlockHeight = currentHeight;
        }
    }
    
    // Reset function for stuck animations
    function resetAnimations() {
        console.log('🔄 Resetting block animations...');
        animating = false;
        
        const allContainers = [
            document.querySelector('.next-block-section .block-container'),
            ...Array.from(document.querySelectorAll('.last-blocks-section .block-container'))
        ].filter(el => el);
        
        allContainers.forEach((container, i) => {
            if (container) {
                container.style.position = '';
                container.style.transition = '';
                container.style.transform = '';
                container.style.opacity = '';
                container.style.zIndex = '';
                console.log(`✅ Reset container ${i}`);
            }
        });
        
        console.log(`🔄 Reset ${allContainers.length} containers`);
    }
    
    // Export the animation function globally for testing
    function makeAnimationGloballyAvailable() {
        if (typeof window !== 'undefined') {
            window.testBlockAnimation = animateNewBlock;
            window.resetBlockAnimations = resetAnimations;
            console.log('🌍 Block animation functions available globally');
        }
    }
    
    onMount(() => {
        mounted = true;
        
        if (browser) {
            console.log('🔧 BlocksSection mounted with animation support');
            
            // Make animation functions available globally
            makeAnimationGloballyAvailable();
            
            // Handle tab visibility changes
            const handleVisibilityChange = () => {
                if (!document.hidden) {
                    console.log('👁️ Tab became visible - checking for stuck animations...');
                    setTimeout(resetAnimations, 100);
                }
            };
            
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // Cleanup
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
                if (typeof window !== 'undefined') {
                    delete window.testBlockAnimation;
                    delete window.resetBlockAnimations;
                }
            };
        }
    });
</script>

<div class="blocks-section">
    <!-- Next Block Section -->
    <div class="next-block-section">
        <h3 class="section-title">Next Block</h3>
        <div class="block-container">
            <div class="block-height">Mining...</div>
            <div class="dummy-block next-block">
                <div class="block-size">{formatBytes(mempoolSizeBytes)} MB</div>
                <div class="block-reward">
                    <span class="reward-label">Est. Total Reward</span>
                    <span class="reward-value">{estimatedTotalReward.toFixed(3)} ERG</span>
                    {#if estimatedFees > 0}
                        <span class="fees-breakdown">{estimatedFees.toFixed(3)} fees</span>
                    {/if}
                </div>
                <div class="block-tx-count">{$transactions.length} transactions</div>
            </div>
        </div>
    </div>

    <!-- Separator -->
    <div class="separator-container">
        <div class="separator"></div>
    </div>

    <!-- Last 4 Blocks Section -->
    <div class="last-blocks-section">
        <h3 class="section-title">Last 4 Blocks</h3>
        <div class="blocks-grid">
            {#if $blockData.length > 0}
                {#each $blockData.slice(0, 4) as block, i (block.id)}
                    {@const minerInfo = getMinerInfo(block.miner)}
                    <div class="block-container" data-block-index={i}>
                        <a 
                            href="https://sigmaspace.io/en/block/{block.id}" 
                            class="block-height-link" 
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="View block {block.height} details"
                        >
                            <div class="block-height">{block.height}</div>
                        </a>
                        <div class="dummy-block">
                            <div class="block-size">{(block.size / 1000000).toFixed(2)} MB</div>
                            <div class="block-reward">
                                <span class="reward-label">Total Reward</span>
                                <span class="reward-value">{block.minerReward.toFixed(3)} ERG</span>
                                {#if block.totalFees && block.totalFees > 0}
                                    <span class="fees-breakdown">{block.totalFees.toFixed(3)} fees</span>
                                {:else if block.baseMinerReward}
                                    <span class="fees-breakdown">{(block.minerReward - block.baseMinerReward).toFixed(3)} fees</span>
                                {/if}
                            </div>
                            <div class="block-tx-count">{block.transactionsCount.toLocaleString()} transactions</div>
                            {#if block.timestamp}
                                <div class="block-time">{calculateTimeAgo(block.timestamp)}</div>
                            {/if}
                        </div>
                        <div class="block-miner">
                            {#if minerInfo.logo}
                                <img 
                                    src={minerInfo.logo} 
                                    alt="{minerInfo.name} logo" 
                                    class="miner-logo" 
                                    on:error={(e) => e.target.style.display = 'none'}
                                >
                            {/if}
                            <span>{minerInfo.name}</span>
                        </div>
                    </div>
                {/each}
            {:else}
                {#each Array(4) as _, i}
                    <div class="block-container" data-block-index={i}>
                        <div class="block-height">Loading...</div>
                        <div class="dummy-block">
                            <div class="block-size">Loading...</div>
                            <div class="block-reward">
                                <span class="reward-label">Total Reward</span>
                                <span class="reward-value">Loading...</span>
                            </div>
                            <div class="block-tx-count">Loading...</div>
                        </div>
                        <div class="block-miner">Loading...</div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</div>

<style>
    /* SIMPLE HORIZONTAL SCROLL FIX */
    
    /* 1. Keep original desktop height on all screens */
    .blocks-section {
        min-height: 180px !important;
        max-height: 180px !important;
        overflow: hidden !important;
    }
    
    /* 2. Horizontal scroll for blocks grid */
    .blocks-grid {
        overflow-x: auto;
        overflow-y: hidden;
        scrollbar-width: none; /* Firefox */
        -ms-overflow-style: none; /* IE/Edge */
    }
    
    /* 3. Hide scrollbar for Chrome/Safari */
    .blocks-grid::-webkit-scrollbar {
        display: none;
    }
    
    /* 4. Prevent blocks from shrinking */
    .block-container {
        flex-shrink: 0;
    }
    
    /* 5. Force horizontal layout on all screen sizes */
    @media (max-width: 768px) {
        .blocks-section {
            flex-direction: row !important; /* Keep horizontal */
            min-height: 180px !important;
            max-height: 180px !important;
            padding: 8px 20px 12px 20px !important; /* Keep original padding */
        }
        
        .separator-container {
            flex-direction: column !important; /* Keep vertical separator */
            min-height: 180px !important;
        }
        
        .separator {
            width: 2px !important; /* Keep vertical */
            height: 120px !important; /* Adjust for smaller height */
            background: linear-gradient(
                to bottom,
                var(--primary-orange) 0px,
                var(--primary-orange) 8px,
                transparent 8px,
                transparent 16px
            ) !important;
            background-size: 2px 16px !important;
        }
    }
    
    @media (max-width: 480px) {
        .blocks-section {
            flex-direction: row !important; /* Keep horizontal */
            min-height: 180px !important;
            max-height: 180px !important;
            padding: 8px 15px 12px 15px !important;
        }
        
        .separator-container {
            flex-direction: column !important; /* Keep vertical separator */
            min-height: 180px !important;
        }
        
        .separator {
            width: 2px !important; /* Keep vertical */
            height: 100px !important; /* Smaller for mobile */
            background: linear-gradient(
                to bottom,
                var(--primary-orange) 0px,
                var(--primary-orange) 8px,
                transparent 8px,
                transparent 16px
            ) !important;
            background-size: 2px 16px !important;
        }
    }
</style>