<script>
    import { colorMode } from '$lib/stores.js';
    
    export let onRefresh;
    export let onPack;
    
    let packingMode = false;
    let ballPhysicsRef; // Reference to ball physics component
    let ballInteractionMode = 'bounce';
    let ballPhysicsRunning = true;
    
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
    
    // Ball Physics Controls
    function toggleBallInteraction() {
        if (ballPhysicsRef) {
            ballInteractionMode = ballPhysicsRef.toggleInteractionMode();
        }
    }
    
    function toggleBallPhysics() {
        if (ballPhysicsRef) {
            ballPhysicsRunning = ballPhysicsRef.togglePhysics();
        }
    }
    
    function addBallDummies() {
        if (ballPhysicsRef) {
            ballPhysicsRef.addDummyTransactions();
        }
    }
    
    function clearBalls() {
        if (ballPhysicsRef) {
            ballPhysicsRef.clearBalls();
        }
    }
    
    // Export function to set ball physics reference
    export function setBallPhysicsRef(ref) {
        ballPhysicsRef = ref;
        console.log('🏀 Ball physics reference set:', ref);
    }
</script>

<div class="controls">
    <!-- Visualization Mode Controls -->
    <div class="control-group">
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
            class:active={$colorMode === 'balls'}
            on:click={() => setColorMode('balls')}
        >
            🏀 Ball Physics
        </button>
    </div>
    
    <!-- General Controls -->
    <div class="control-group">
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
            🔄 Refresh Data
        </button>
    </div>
    
    <!-- Ball Physics Specific Controls -->
    {#if $colorMode === 'balls'}
        <div class="control-group ball-controls">
            <button 
                class="control-button ball-control"
                class:active={ballInteractionMode === 'navigate'}
                on:click={toggleBallInteraction}
            >
                {ballInteractionMode === 'bounce' ? '🔗 Navigate Mode' : '🏀 Bounce Mode'}
            </button>
            <button 
                class="control-button ball-control"
                on:click={toggleBallPhysics}
            >
                {ballPhysicsRunning ? '⏸️ Pause' : '▶️ Play'}
            </button>
            <button 
                class="control-button ball-control"
                on:click={addBallDummies}
            >
                🎭 Add Dummies
            </button>
            <button 
                class="control-button ball-control"
                on:click={clearBalls}
            >
                🗑️ Clear
            </button>
        </div>
    {/if}
</div>

<style>
    .controls {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-bottom: 25px;
        align-items: center;
    }
    
    .control-group {
        display: flex;
        gap: 12px;
        align-items: center;
        flex-wrap: wrap;
        justify-content: center;
    }
    
    .ball-controls {
        padding: 15px;
        background: rgba(212, 101, 27, 0.1);
        border-radius: 12px;
        border: 2px solid rgba(212, 101, 27, 0.3);
        animation: ballControlsGlow 3s ease-in-out infinite alternate;
    }
    
    @keyframes ballControlsGlow {
        from { border-color: rgba(212, 101, 27, 0.3); }
        to { border-color: rgba(212, 101, 27, 0.6); }
    }
    
    .ball-control {
        background: linear-gradient(135deg, #d4651b 0%, #e8730f 100%);
        border-color: #f2892a;
        color: white;
    }
    
    .ball-control:hover {
        background: linear-gradient(135deg, #e8730f 0%, #f2892a 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(212, 101, 27, 0.4);
    }
    
    .ball-control.active {
        background: linear-gradient(135deg, #f2892a 0%, #ffb347 100%);
        border-color: #ffb347;
    }
    
    @media (max-width: 768px) {
        .controls {
            gap: 10px;
        }
        
        .control-group {
            gap: 8px;
        }
        
        .ball-controls {
            padding: 10px;
        }
    }
</style>