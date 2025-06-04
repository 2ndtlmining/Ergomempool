<script>
    import { colorMode } from '$lib/stores.js';
    
    export let onRefresh;
    export let onPack;
    
    let packingMode = false;
    
    function setColorMode(mode) {
        colorMode.set(mode);
    }
    
    function handleRefresh() {
        console.log('🔄 Refresh clicked');
        onRefresh();
    }
    
    function handlePack() {
        packingMode = !packingMode;
        console.log('📦 Pack clicked! New mode:', packingMode);
        console.log('📦 Calling onPack with:', packingMode);
        onPack(packingMode);
    }
</script>

<div class="controls">
    <button 
        class="control-button"
        class:active={$colorMode === 'size'}
        on:click={() => setColorMode('size')}
    >
        Color by Size
    </button>
    <button 
        class="control-button"
        class:active={$colorMode === 'value'}
        on:click={() => setColorMode('value')}
    >
        Color by Value
    </button>
    <button 
        class="control-button" 
        class:packing-active={packingMode}
        id="pack-button"
        on:click={handlePack}
    >
        {packingMode ? '📊 Grid View' : '📦 Pack'}
    </button>
    <button 
        class="control-button" 
        on:click={handleRefresh}
    >
        Refresh Data
    </button>
</div>