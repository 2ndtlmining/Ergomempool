<script>
    import { transactions, walletConnector } from '$lib/stores.js';
    import { valueColors } from '$lib/stores.js'; // Only need valueColors now
    import { isWalletTransaction } from '$lib/wallet.js';
    import { identifyTransactionType } from '$lib/transactionTypes.js';
    
    let tooltipElement;
    let showTooltip = false;
    let tooltipX = 0;
    let tooltipY = 0;
    let tooltipTransaction = null;
    
    // Simplified color function - always use value-based coloring
    function getColorByValue(value, maxValue) {
        const normalized = Math.min(value / maxValue, 1);
        const index = Math.floor(normalized * (valueColors.length - 1));
        return valueColors[index];
    }
    
    // Size calculation based on transaction size in bytes
    function getSquareSizeByBytes(sizeBytes, maxSizeBytes, minSize = 8, maxSizePixels = 24) {
        const normalized = Math.min(sizeBytes / maxSizeBytes, 1);
        return Math.max(minSize, Math.floor(minSize + (maxSizePixels - minSize) * normalized));
    }
    
    function shortenTransactionId(id, startChars = 8, endChars = 8) {
        if (!id || id.length <= startChars + endChars + 3) {
            return id;
        }
        return `${id.substring(0, startChars)}...${id.substring(id.length - endChars)}`;
    }
    
    function handleMouseEnter(event, tx) {
        tooltipTransaction = tx;
        tooltipX = event.pageX + 10;
        tooltipY = event.pageY - 10;
        showTooltip = true;
    }
    
    function handleMouseLeave() {
        showTooltip = false;
        tooltipTransaction = null;
    }
    
    function handleClick(tx) {
        window.open(`https://sigmaspace.io/en/transaction/${tx.id}`, '_blank');
    }
    
    function handleKeyDown(event, tx) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            handleClick(tx);
        }
    }
    
    // Check if transaction involves connected wallet
    function isWalletTx(tx) {
        return $walletConnector.isConnected && 
               $walletConnector.connectedAddress && 
               isWalletTransaction(tx, $walletConnector.connectedAddress);
    }
    
    // Reactive calculations
    $: displayTransactions = $transactions.slice(0, 500);
    $: maxValue = Math.max(...$transactions.map(tx => tx.value || 0));
    $: maxSizeBytes = Math.max(...$transactions.map(tx => tx.size || 0));
</script>

<div class="mempool-grid">
    {#if displayTransactions.length === 0}
        <div class="loading">Loading transactions...</div>
    {:else}
        {#each displayTransactions as tx}
            {@const size = getSquareSizeByBytes(tx.size || 0, maxSizeBytes)}
            {@const color = getColorByValue(tx.value || 0, maxValue)}
            {@const isWallet = isWalletTx(tx)}
            {@const transactionType = identifyTransactionType(tx)}
            
            <div 
                class="transaction-square"
                class:wallet-transaction={isWallet}
                data-type={transactionType.color ? (transactionType === identifyTransactionType(tx) && transactionType.icon === '💖' ? 'donation' : 'test') : 'regular'}
                style="
                    width: {size}px; 
                    height: {size}px; 
                    background-color: {color};
                    grid-column: span {Math.max(1, Math.floor(size / 8))};
                    grid-row: span {Math.max(1, Math.floor(size / 8))};
                    {isWallet ? 'border: 3px solid #f39c12; box-shadow: 0 0 15px rgba(243, 156, 18, 0.9); z-index: 10;' : ''}
                    {transactionType.color ? `border: 2px solid ${transactionType.color}; box-shadow: 0 0 8px ${transactionType.color}40;` : ''}
                "
                on:mouseenter={(e) => handleMouseEnter(e, tx)}
                on:mouseleave={handleMouseLeave}
                on:click={() => handleClick(tx)}
                on:keydown={(e) => handleKeyDown(e, tx)}
                role="button"
                tabindex="0"
            >
                {#if transactionType.icon}
                    <div 
                        class="transaction-type-icon"
                        style="
                            position: absolute;
                            top: 1px;
                            right: 1px;
                            font-size: {Math.min(size * 0.4, 12)}px;
                            z-index: 25;
                            pointer-events: none;
                            text-shadow: 0 0 3px rgba(0,0,0,0.8);
                            line-height: 1;
                        "
                    >
                        {transactionType.icon}
                    </div>
                {/if}
            </div>
        {/each}
    {/if}
</div>

<!-- Enhanced Tooltip -->
{#if showTooltip && tooltipTransaction}
    {@const isWallet = isWalletTx(tooltipTransaction)}
    {@const transactionType = identifyTransactionType(tooltipTransaction)}
    <div 
        class="transaction-tooltip" 
        style="left: {tooltipX}px; top: {tooltipY}px; display: block;"
        bind:this={tooltipElement}
    >
        {#if isWallet}
            <div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>
        {/if}
        {#if transactionType.icon === '💖'}
            <div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>
        {:else if transactionType.icon === '🧪'}
            <div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>
        {/if}
        <strong>Transaction</strong><br>
        ID: {shortenTransactionId(tooltipTransaction.id)}<br>
        Size: {tooltipTransaction.size || 'N/A'} bytes<br>
        Value: {(tooltipTransaction.value || 0).toFixed(4)} ERG<br>
        Value: ${(tooltipTransaction.usd_value || 0).toFixed(2)} USD<br>
    </div>
{/if}

<style>
    .transaction-square {
        border-radius: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        margin: 1px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
    }
    
    .transaction-square:hover {
        transform: scale(1.15);
        z-index: 100;
        border: 2px solid var(--primary-orange) !important;
        box-shadow: 0 4px 15px var(--glow-orange);
    }
    
    .wallet-transaction {
        animation: walletGlow 2s ease-in-out infinite alternate;
        position: relative;
    }
    
    .transaction-square[data-type="donation"] {
        animation: donationGlow 3s infinite ease-in-out;
    }
    
    .transaction-square[data-type="test"] {
        animation: testGlow 2s infinite ease-in-out;
    }
    
    .transaction-type-icon {
        animation: iconPulse 2s infinite ease-in-out;
    }
    
    @keyframes walletGlow {
        from { 
            box-shadow: 0 0 15px rgba(243, 156, 18, 0.9), 0 0 30px rgba(243, 156, 18, 0.6);
            transform: scale(1);
        }
        to { 
            box-shadow: 0 0 20px rgba(243, 156, 18, 1), 0 0 40px rgba(243, 156, 18, 0.8);
            transform: scale(1.05);
        }
    }
    
    @keyframes donationGlow {
        0%, 100% { box-shadow: 0 0 8px #e74c3c40; }
        50% { box-shadow: 0 0 12px #e74c3c80; }
    }
    
    @keyframes testGlow {
        0%, 100% { box-shadow: 0 0 8px #f39c1240; }
        50% { box-shadow: 0 0 12px #f39c1280; }
    }
    
    @keyframes iconPulse {
        0%, 100% { transform: scale(1); opacity: 0.9; }
        50% { transform: scale(1.1); opacity: 1; }
    }
    
    .transaction-tooltip {
        position: absolute;
        background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
        border: 2px solid var(--primary-orange);
        padding: 12px;
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-light);
        pointer-events: none;
        z-index: 1000;
        white-space: nowrap;
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(10px);
    }
</style>