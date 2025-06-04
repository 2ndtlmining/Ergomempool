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
        "2TH22DBY": "/logos/2miners.png",
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
    
    // SIMPLE: Just detect new blocks and use the proven testBlockAnimation function
    $: if (browser && mounted && $blockData.length > 0) {
        const latestBlock = $blockData[0];
        const currentHeight = latestBlock.height;
        
        if (previousBlockHeight === null) {
            // First load, no animation
            previousBlockHeight = currentHeight;
            console.log(`📊 Initial block height: ${currentHeight}`);
        } else if (currentHeight > previousBlockHeight) {
            // New block detected - use the proven animation function
            console.log(`🎉 New block detected! Height: ${currentHeight} (prev: ${previousBlockHeight})`);
            
            if (typeof window.testBlockAnimation === 'function') {
                console.log('🚀 Triggering proven testBlockAnimation...');
                window.testBlockAnimation();
            } else {
                console.log('⚠️ testBlockAnimation not available yet');
            }
            
            previousBlockHeight = currentHeight;
        }
    }
    
    // SIMPLE: Reset function for tab visibility
    function simpleResetStuckAnimations() {
        console.log('🔄 Simple reset - clearing all animation styles...');
        
        // Find all containers using simple DOM queries
        const containers = [
            document.querySelector('.next-block-section .block-container'),
            ...Array.from({length: 4}, (_, i) => {
                const blockEl = document.querySelector(`[data-block-index="${i}"]`);
                return blockEl ? blockEl.closest('.block-container') : null;
            })
        ].filter(el => el);
        
        containers.forEach((container, i) => {
            if (container) {
                // Reset all animation styles
                container.style.transition = '';
                container.style.transform = '';
                container.style.opacity = '';
                container.style.position = '';
                container.style.zIndex = '';
                console.log(`✅ Reset container ${i}`);
            }
        });
        
        console.log(`🔄 Reset ${containers.length} containers`);
    }
    
    onMount(() => {
        mounted = true;
        
        if (browser) {
            console.log('🔧 Simple BlocksSection approach loaded');
            
            // Make reset function available globally
            window.resetBlockAnimations = simpleResetStuckAnimations;
            
            // Handle tab visibility - ONLY reset when tab becomes active
            const handleVisibilityChange = () => {
                if (!document.hidden) {
                    console.log('👁️ Tab became visible - running simple reset...');
                    setTimeout(simpleResetStuckAnimations, 100);
                }
            };
            
            document.addEventListener('visibilitychange', handleVisibilityChange);
            
            // Cleanup
            return () => {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    .blocks-section {
        overflow: hidden;
    }
    
    .block-container {
        position: relative;
    }
    
    .blocks-grid {
        display: flex;
        gap: 20px;
        justify-content: center;
        align-items: flex-start;
        flex-wrap: nowrap;
        position: relative;
    }
    
    .block-height-link {
        transition: all 0.2s ease;
        text-decoration: none;
        color: inherit;
    }
    
    .block-height-link:hover {
        transform: scale(1.05);
    }
    
    .block-height-link:focus {
        outline: 2px solid var(--primary-orange);
        outline-offset: 2px;
        border-radius: 4px;
    }
    
    .miner-logo {
        transition: transform 0.2s ease;
    }
    
    :global(.dummy-block:hover .miner-logo) {
        transform: scale(1.1);
    }
    
    @media (prefers-reduced-motion: reduce) {
        .block-container {
            transition: none !important;
        }
    }
</style>