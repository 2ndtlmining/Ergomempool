<script>
    // Remove colorMode import since we're handling modes directly
    export let onRefresh;
    export let onPack;
    
    // Current view mode - CHANGED TO PACK AS DEFAULT
    let currentMode = 'pack'; // 'grid', 'hex', 'pack', 'ball'
    
    // References to different visualization components
    let ballPhysicsRef;
    let ergoPackingRef; // ErgoPackingGrid.svelte reference
    let transactionPackingRef; // TransactionPackingGrid.svelte reference
    
    // Ball physics state
    let ballInteractionMode = 'bounce';
    let ballPhysicsRunning = true;
    let blockFlowActive = false;
    
    // Combined internal and external setMode function
    function setMode(mode) {
        console.log(`🎯 Setting mode to: ${mode}`);
        currentMode = mode;
        
        // Notify parent component about mode change
        if (mode === 'hex') {
            onPack(true); // Enable hexagon packing mode
        } else {
            onPack(false); // Disable hexagon packing mode
        }
    }
    
    // Export setMode function for external access
    export { setMode };
    
    function handleRefresh() {
        console.log('🔄 Refresh clicked');
        onRefresh();
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
        console.log('🎭 Add Ball Dummies button clicked');
        if (ballPhysicsRef) {
            console.log('✅ BallPhysicsRef found, calling addDummyTransactions');
            ballPhysicsRef.addDummyTransactions();
        } else {
            console.error('❌ ballPhysicsRef is null/undefined');
        }
    }
    
    function clearBalls() {
        console.log('🗑️ Clear Balls button clicked');
        if (ballPhysicsRef) {
            console.log('✅ BallPhysicsRef found, calling clearBalls');
            ballPhysicsRef.clearBalls();
        } else {
            console.error('❌ ballPhysicsRef is null/undefined');
        }
    }
    
    function toggleBallBlockFlow() {
        if (ballPhysicsRef) {
            blockFlowActive = ballPhysicsRef.toggleBlockFlow();
        }
    }
    
    function triggerBallTestBlockMining() {
        if (ballPhysicsRef) {
            ballPhysicsRef.triggerTestBlockMining();
            showFlowStatus('🎬 Ball physics: Test block mining triggered!', 'success');
        }
    }
    
    function triggerBallTestTransactionEntry() {
        if (ballPhysicsRef) {
            ballPhysicsRef.triggerTestTransactionEntry();
            showFlowStatus('📥 Ball physics: Test transaction entry triggered!', 'info');
        }
    }
    
    // Ergo Packing (Hex) Controls
    function startErgoPacking() {
        console.log('📦 Start Ergo Packing (Hex) clicked');
        if (ergoPackingRef) {
            ergoPackingRef.startPackingAnimation();
            showFlowStatus('📦 Hexagon packing animation started!', 'success');
        } else {
            console.error('❌ ergoPackingRef is null/undefined');
        }
    }
    
    // Transaction Packing Controls
    function addPackingDummies() {
        console.log('🎭 Add Packing Dummies button clicked');
        if (transactionPackingRef) {
            transactionPackingRef.addDummyTransactions();
            showFlowStatus('✅ Added dummy transactions to packing grid', 'success');
        } else {
            console.error('❌ transactionPackingRef is null/undefined');
        }
    }
    
    function clearPackingTransactions() {
        console.log('🗑️ Clear Packing Transactions button clicked');
        if (transactionPackingRef) {
            transactionPackingRef.clearAllTransactions();
            showFlowStatus('🗑️ Cleared all transactions from packing grid', 'info');
        } else {
            console.error('❌ transactionPackingRef is null/undefined');
        }
    }
    
    function repackTransactions() {
        console.log('🔄 Repack Transactions button clicked');
        if (transactionPackingRef) {
            transactionPackingRef.repackTransactions();
            showFlowStatus('🔄 Repacking transactions with gravity algorithm', 'info');
        } else {
            console.error('❌ transactionPackingRef is null/undefined');
        }
    }
    
    function togglePackingBlockFlow() {
        if (transactionPackingRef) {
            const isActive = transactionPackingRef.toggleBlockFlow();
            showFlowStatus(`🎬 Packing block flow: ${isActive ? 'Active' : 'Paused'}`, isActive ? 'success' : 'warning');
        }
    }
    
    function triggerPackingTestBlockMining() {
        if (transactionPackingRef) {
            transactionPackingRef.triggerTestBlockMining();
            showFlowStatus('⛏️ Packing: Test block mining triggered!', 'success');
        }
    }
    
    function triggerPackingTestTransactionEntry() {
        if (transactionPackingRef) {
            transactionPackingRef.triggerTestTransactionEntry();
            showFlowStatus('📥 Packing: Test transaction entry triggered!', 'info');
        }
    }
    
    // Enhanced showFlowStatus function
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
            ${type === 'error' ? 'background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);' : ''}
        `;
        
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
    
    // Export functions to set component references
    export function setBallPhysicsRef(ref) {
        ballPhysicsRef = ref;
        console.log('🏀 Ball physics reference set:', !!ref);
    }
    
    export function setErgoPackingRef(ref) {
        ergoPackingRef = ref;
        console.log('📦 Ergo packing (hex) reference set:', !!ref);
    }
    
    export function setTransactionPackingRef(ref) {
        transactionPackingRef = ref;
        console.log('📊 Transaction packing reference set:', !!ref);
    }
    
    // Export current mode for parent component
    export function getCurrentMode() {
        return currentMode;
    }
</script>

<div class="controls">
    <!-- Main 5 Buttons -->
    <div class="control-group main-buttons">
        <button 
            class="control-button"
            class:active={currentMode === 'grid'}
            on:click={() => setMode('grid')}
        >
            📊 Grid
        </button>
        
        <button 
            class="control-button"
            class:active={currentMode === 'hex'}
            on:click={() => setMode('hex')}
        >
            📦 Hex
        </button>
        
        <button 
            class="control-button"
            class:active={currentMode === 'pack'}
            on:click={() => setMode('pack')}
        >
            🧠 Pack
        </button>
        
        <button 
            class="control-button"
            class:active={currentMode === 'ball'}
            on:click={() => setMode('ball')}
        >
            🏀 Ballzy
        </button>
        
        <button 
            class="control-button refresh-button" 
            on:click={handleRefresh}
        >
            🔄 Refresh Data
        </button>
    </div>
    
    <!-- Hex Mode Specific Controls -->
    {#if currentMode === 'hex'}
        <div class="control-group hex-controls">
            <div class="control-label">📦 Hexagon Packing Controls</div>
            <button 
                class="control-button hex-control"
                on:click={startErgoPacking}
            >
                🚀 Start Packing Animation
            </button>
        </div>
    {/if}
    
    <!-- Pack Mode Specific Controls (SHOWN BY DEFAULT NOW) -->
    {#if currentMode === 'pack'}
        <div class="control-group packing-controls">
            <div class="control-label">🧠 Transaction Packing Controls</div>
            
            <!-- Basic Packing Controls -->
            <button 
                class="control-button packing-control"
                on:click={addPackingDummies}
            >
                🎭 Add Test Transactions
            </button>
            <button 
                class="control-button packing-control"
                on:click={clearPackingTransactions}
            >
                🗑️ Clear All
            </button>
            <button 
                class="control-button packing-control"
                on:click={repackTransactions}
            >
                🔄 Re-pack
            </button>
        </div>
        
        <!-- Packing Block Flow Controls -->
        <div class="control-group packing-flow-controls">
            <div class="flow-label">🎬 Packing Block Flow</div>
            <button 
                class="control-button flow-control"
                on:click={togglePackingBlockFlow}
            >
                🎬 Toggle Flow
            </button>
            <button 
                class="control-button flow-control test-control"
                on:click={triggerPackingTestBlockMining}
                title="Simulate block mining - remove transactions!"
            >
                ⛏️ Test Block Mining
            </button>
            <button 
                class="control-button flow-control test-control"
                on:click={triggerPackingTestTransactionEntry}
                title="Simulate new transactions arriving!"
            >
                📥 Test New Transactions
            </button>
        </div>
    {/if}
    
    <!-- Ball Mode Specific Controls -->
    {#if currentMode === 'ball'}
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
        
        <!-- Ball Physics Block Flow Controls -->
        <div class="control-group flow-controls">
            <div class="flow-label">🎬 Ball Physics Block Flow</div>
            <button 
                class="control-button flow-control"
                class:active={blockFlowActive}
                on:click={toggleBallBlockFlow}
            >
                {blockFlowActive ? '🎬 Flow Active' : '⏸️ Flow Paused'}
            </button>
            <button 
                class="control-button flow-control test-control"
                on:click={triggerBallTestBlockMining}
                title="Simulate a block being mined - balls will fly away!"
            >
                ⛏️ Test Block Mining
            </button>
            <button 
                class="control-button flow-control test-control"
                on:click={triggerBallTestTransactionEntry}
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
    
    .main-buttons {
        background: rgba(255, 255, 255, 0.02);
        padding: 15px 25px;
        border-radius: 15px;
        border: 2px solid rgba(52, 152, 219, 0.3);
        box-shadow: 0 4px 20px rgba(52, 152, 219, 0.1);
    }
    
    .control-label, .flow-label {
        font-size: 14px;
        font-weight: 600;
        margin-right: 10px;
        padding: 6px 12px;
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(255, 255, 255, 0.1);
        color: var(--text-light);
    }
    
    .control-button {
        padding: 10px 18px;
        background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
        color: white;
        border: 2px solid var(--accent-blue);
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    
    .control-button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s ease;
    }
    
    .control-button:hover::before {
        left: 100%;
    }
    
    .control-button:hover {
        background: linear-gradient(135deg, var(--secondary-blue) 0%, var(--accent-blue) 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px var(--glow-blue);
    }
    
    .control-button.active {
        background: linear-gradient(135deg, var(--primary-orange) 0%, var(--secondary-orange) 100%);
        border-color: var(--light-orange);
    }
    
    .control-button.active:hover {
        background: linear-gradient(135deg, var(--secondary-orange) 0%, var(--light-orange) 100%);
        box-shadow: 0 6px 20px var(--glow-orange);
    }
    
    .refresh-button {
        background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%);
        border-color: #2ecc71;
    }
    
    .refresh-button:hover {
        background: linear-gradient(135deg, #2ecc71 0%, #58d68d 100%);
        box-shadow: 0 6px 20px rgba(39, 174, 96, 0.4);
    }
    
    .hex-controls {
        padding: 15px;
        background: rgba(230, 126, 34, 0.1);
        border-radius: 12px;
        border: 2px solid rgba(230, 126, 34, 0.3);
        animation: hexControlsGlow 3s ease-in-out infinite alternate;
    }
    
    @keyframes hexControlsGlow {
        from { 
            border-color: rgba(230, 126, 34, 0.3);
            box-shadow: 0 0 0 rgba(230, 126, 34, 0);
        }
        to { 
            border-color: rgba(230, 126, 34, 0.6);
            box-shadow: 0 0 20px rgba(230, 126, 34, 0.2);
        }
    }
    
    .hex-control {
        background: linear-gradient(135deg, var(--primary-orange) 0%, var(--secondary-orange) 100%);
        border-color: var(--light-orange);
        color: white;
    }
    
    .hex-control:hover {
        background: linear-gradient(135deg, var(--secondary-orange) 0%, var(--light-orange) 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px var(--glow-orange);
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
    
    .packing-controls {
        padding: 15px;
        background: rgba(52, 152, 219, 0.15);
        border-radius: 12px;
        border: 2px solid rgba(52, 152, 219, 0.4);
        animation: packingControlsGlow 3s ease-in-out infinite alternate;
        box-shadow: 0 4px 20px rgba(52, 152, 219, 0.1);
    }
    
    @keyframes packingControlsGlow {
        from { 
            border-color: rgba(52, 152, 219, 0.4);
            box-shadow: 0 4px 20px rgba(52, 152, 219, 0.1);
        }
        to { 
            border-color: rgba(52, 152, 219, 0.7);
            box-shadow: 0 6px 25px rgba(52, 152, 219, 0.2);
        }
    }
    
    .packing-control {
        background: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
        border-color: #5dade2;
        color: white;
    }
    
    .packing-control:hover {
        background: linear-gradient(135deg, #5dade2 0%, #85c1e9 100%);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(52, 152, 219, 0.4);
    }
    
    .flow-controls, .packing-flow-controls {
        padding: 15px;
        background: rgba(39, 174, 96, 0.1);
        border-radius: 12px;
        border: 2px solid rgba(39, 174, 96, 0.3);
        animation: flowControlsGlow 4s ease-in-out infinite alternate;
        position: relative;
        margin-top: 10px;
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
        animation: buttonPress 0.15s ease;
    }
    
    @keyframes buttonPress {
        0% { transform: translateY(-2px) scale(1); }
        50% { transform: translateY(1px) scale(0.98); }
        100% { transform: translateY(-2px) scale(1); }
    }
    
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
        
        .main-buttons {
            padding: 12px 20px;
        }
        
        .ball-controls, .packing-controls, .hex-controls, .flow-controls, .packing-flow-controls {
            padding: 10px;
        }
        
        .control-label, .flow-label {
            font-size: 12px;
            padding: 4px 8px;
            margin-right: 6px;
        }
        
        .test-control {
            font-size: 12px;
        }
    }
    
    @media (max-width: 600px) {
        .main-buttons {
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        
        .main-buttons .control-button {
            width: 200px;
        }
        
        .flow-controls, .packing-flow-controls {
            flex-direction: column;
            align-items: center;
            gap: 8px;
        }
        
        .control-label, .flow-label {
            margin-right: 0;
            margin-bottom: 5px;
        }
    }
</style>