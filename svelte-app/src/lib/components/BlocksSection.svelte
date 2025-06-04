<script>
    import { blockData } from '$lib/stores.js';
    import { transactions } from '$lib/stores.js';
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { slide, fly } from 'svelte/transition';
    import { quintOut } from 'svelte/easing';
    
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
        let debugInfo = { calculatedFees: 0, precalculatedFees: 0, fallbackFees: 0 };
        
        for (const tx of $transactions) {
            if (tx.fee !== undefined && tx.fee > 0) {
                totalMempoolFees += tx.fee;
                debugInfo.precalculatedFees++;
            } else {
                const totalInputs = tx.inputs?.reduce((sum, input) => sum + (input.value || 0), 0) || 0;
                const totalOutputs = tx.outputs?.reduce((sum, output) => sum + (output.value || 0), 0) || 0;
                const txFee = totalInputs - totalOutputs;
                
                if (txFee > 0 && txFee < 1) {
                    totalMempoolFees += txFee;
                    debugInfo.calculatedFees++;
                } else {
                    totalMempoolFees += 0.001;
                    debugInfo.fallbackFees++;
                }
            }
        }
        
        console.log(`💰 Estimated next block fees: ${totalMempoolFees.toFixed(6)} ERG from ${$transactions.length} transactions`);
        console.log(`📊 Fee calculation breakdown:`, debugInfo);
        return totalMempoolFees;
    })();
    
    // Get base miner reward from most recent block or use default
    $: baseMinerReward = $blockData.length > 0 ? ($blockData[0].baseMinerReward || 15.0) : 15.0;
    
    // Estimated total reward for next block
    $: estimatedTotalReward = baseMinerReward + estimatedFees;
    
    onMount(() => {
        mounted = true;
    });

    // Production line animation settings
    const ANIMATION_DURATION = 800;
    const SLIDE_DISTANCE = 200; // pixels to slide
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

    <!-- Last 4 Blocks Section - PRODUCTION LINE ANIMATION -->
    <div class="last-blocks-section">
        <h3 class="section-title">Last 4 Blocks</h3>
        <div class="blocks-grid">
            {#if $blockData.length > 0}
                {#each $blockData.slice(0, 4) as block, i (block.id)}
                    {@const minerInfo = getMinerInfo(block.miner)}
                    <div 
                        class="block-container"
                        in:fly="{{ 
                            x: -SLIDE_DISTANCE, 
                            duration: ANIMATION_DURATION, 
                            easing: quintOut 
                        }}"
                        out:fly="{{ 
                            x: SLIDE_DISTANCE, 
                            duration: ANIMATION_DURATION, 
                            easing: quintOut 
                        }}"
                    >
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
                    <div class="block-container loading-block">
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
        overflow: hidden; /* Hide blocks sliding off screen */
    }
    
    .loading-block {
        opacity: 0.7;
        pointer-events: none;
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
    
    /* Use :global() for nested selectors that Svelte might not detect */
    :global(.dummy-block:hover .miner-logo) {
        transform: scale(1.1);
    }
    
    /* Reduce motion for users who prefer it */
    @media (prefers-reduced-motion: reduce) {
        .block-container {
            transition: none !important;
        }
    }
</style>