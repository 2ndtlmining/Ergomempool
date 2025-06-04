<script>
    import { colorMode } from '$lib/stores.js';
    
    export let onRefresh;
    export let onPack;
    
    let packingMode = false;
    let ballPhysicsRef; // Reference to ball physics component
    let ballInteractionMode = 'bounce';
    let ballPhysicsRunning = true;
    let blockFlowActive = false; // Phase 2: Block flow status
    
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
        console.log('🎭 Add Dummies button clicked');
        if (ballPhysicsRef) {
            console.log('✅ BallPhysicsRef found, calling addDummyTransactions');
            ballPhysicsRef.addDummyTransactions();
        } else {
            console.error('❌ ballPhysicsRef is null/undefined');
        }
    }
    
    function clearBalls() {
        console.log('🗑️ Clear button clicked');
        if (ballPhysicsRef) {
            console.log('✅ BallPhysicsRef found, calling clearBalls');
            ballPhysicsRef.clearBalls();
        } else {
            console.error('❌ ballPhysicsRef is null/undefined');
        }
    }
    
    // PHASE 2: Block Flow Controls
    function toggleBlockFlow() {
        if (ballPhysicsRef) {
            blockFlowActive = ballPhysicsRef.toggleBlockFlow();
        }
    }
    
    function triggerTestBlockMining() {
        if (ballPhysicsRef) {
            ballPhysicsRef.triggerTestBlockMining();
            showFlowStatus('🎬 Test block mining triggered!', 'success');
        }
    }
    
    function triggerTestTransactionEntry() {
        if (ballPhysicsRef) {
            ballPhysicsRef.triggerTestTransactionEntry();
            showFlowStatus('📥 Test transaction entry triggered!', 'info');
        }
    }
    
    function showFlowStatus(message, type = 'info') {
        const existingStatus = document.querySelector('.flow-status');
        if (existingStatus) existingStatus.remove();

        const statusDiv = document.createElement('div');
        statusDiv.className = `flow-status ${type}`;
        statusDiv.textContent = message;
        statusDiv.style.cssText = `
            position: fixed;
            top: 160px;
            right: 20px;
            padding: 10px 16px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            max-width: 300px;
            font-size: 13px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3);
            transition: transform 0.3s ease;
            ${type === 'success' ? 'background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);' : ''}
            ${type === 'info' ? 'background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);' : ''}
            ${type === 'warning' ? 'background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);' : ''}
        `;
        
        // FIXED: Use CSS classes instead of direct transform assignment
        statusDiv.classList.add('flow-status-hidden');
        document.body.appendChild(statusDiv);
        
        setTimeout(() => {
            if (statusDiv.classList) {
                statusDiv.classList.remove('flow-status-hidden');
                statusDiv.classList.add('flow-status-visible');
            }
        }, 100);
        
        setTimeout(() => {
            if (statusDiv.classList) {
                statusDiv.classList.remove('flow-status-visible');
                statusDiv.classList.add('flow-status-hidden');
                setTimeout(() => {
                    if (statusDiv.parentNode) {
                        statusDiv.remove();
                    }
                }, 300);
            }
        }, 3000);
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
    
    <!-- FIXED: General Controls - Always show Pack button and Refresh -->
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
    
    <!-- Ball Physics Specific Controls - Only show when in ball mode -->
    {#if $colorMode === 'balls'}
        <div class="control-group ball-controls">
            <!-- Basic Ball Controls -->
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
        
        <!-- PHASE 2: Block Flow Controls -->
        <div class="control-group flow-controls">
            <div class="flow-label">🎬 Block Flow Animation</div>
            <button 
                class="control-button flow-control"
                class:active={blockFlowActive}
                on:click={toggleBlockFlow}
            >
                {blockFlowActive ? '🎬 Flow Active' : '⏸️ Flow Paused'}
            </button>
            <button 
                class="control-button flow-control test-control"
                on:click={triggerTestBlockMining}
                title="Simulate a block being mined - balls will fly away!"
            >
                ⛏️ Test Block Mining
            </button>
            <button 
                class="control-button flow-control test-control"
                on:click={triggerTestTransactionEntry}
                title="Simulate a new transaction arriving - ball drops from top!"
            >
                📥 Test New Transaction
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
    
    /* PHASE 2: Flow Controls Styling */
    .flow-controls {
        padding: 15px;
        background: rgba(39, 174, 96, 0.1);
        border-radius: 12px;
        border: 2px solid rgba(39, 174, 96, 0.3);
        animation: flowControlsGlow 4s ease-in-out infinite alternate;
        position: relative;
        margin-top: 10px;
    }
    
    .flow-label {
        font-size: 14px;
        font-weight: 600;
        color: #27ae60;
        margin-right: 10px;
        padding: 6px 12px;
        background: rgba(39, 174, 96, 0.2);
        border-radius: 15px;
        border: 1px solid rgba(39, 174, 96, 0.4);
    }
    
    @keyframes ballControlsGlow {
        from { border-color: rgba(212, 101, 27, 0.3); }
        to { border-color: rgba(212, 101, 27, 0.6); }
    }
    
    @keyframes flowControlsGlow {
        from { 
            border-color: rgba(39, 174, 96, 0.3);
            box-shadow: 0 0 0 rgba(39, 174, 96, 0);
        }
        to { 
            border-color: rgba(39, 174, 96, 0.6);
            box-shadow: 0 0 20px rgba(39, 174, 96, 0.2);
        }
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
    
    /* Flow Control Button Styling */
    .flow-control {
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        border-color: #2ecc71;
        color: white;
        font-weight: 500;
    }
    
    .flow-control:hover {
        background: linear-gradient(135deg, #2ecc71 0%, #58d68d 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
    }
    
    .flow-control.active {
        background: linear-gradient(135deg, #58d68d 0%, #7dcea0 100%);
        border-color: #7dcea0;
        animation: activeFlowPulse 2s ease-in-out infinite alternate;
    }
    
    @keyframes activeFlowPulse {
        from { 
            box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
        }
        to { 
            box-shadow: 0 8px 25px rgba(39, 174, 96, 0.6);
        }
    }
    
    /* Test Control Specific Styling */
    .test-control {
        background: linear-gradient(135deg, #3498db 0%, #5dade2 100%);
        border-color: #5dade2;
        font-size: 13px;
    }
    
    .test-control:hover {
        background: linear-gradient(135deg, #5dade2 0%, #85c1e9 100%);
        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }
    
    .test-control:active {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
    }
    
    /* Button press animation for test controls */
    .test-control:active {
        animation: buttonPress 0.15s ease;
    }
    
    @keyframes buttonPress {
        0% { transform: translateY(-2px) scale(1); }
        50% { transform: translateY(1px) scale(0.98); }
        100% { transform: translateY(-2px) scale(1); }
    }
    
    /* FIXED: Add CSS classes for flow status animations */
    :global(.flow-status-hidden) {
        transform: translateX(100%) !important;
    }
    
    :global(.flow-status-visible) {
        transform: translateX(0) !important;
    }
    
    @media (max-width: 768px) {
        .controls {
            gap: 10px;
        }
        
        .control-group {
            gap: 8px;
        }
        
        .ball-controls, .flow-controls {
            padding: 10px;
        }
        
        .flow-label {
            font-size: 12px;
            padding: 4px 8px;
            margin-right: 6px;
        }
        
        .test-control {
            font-size: 12px;
        }
    }
    
    @media (max-width: 600px) {
        .flow-controls {
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        
        .flow-label {
            margin-right: 0;
            margin-bottom: 5px;
        }
    }
</style>