<!-- Enhanced TransactionOriginNetwork.svelte with Bezier Curve Paths -->
<script>
  import { onMount, onDestroy } from 'svelte';
  import { transactions, transactionOrigins } from '$lib/stores.js';
  import { PLATFORM_CONFIGS } from '$lib/transactionOrigins.js';
  
  // Component state
  let networkContainer;
  let nodes = {};
  let animationId = null;
  let orbitingTransactions = [];
  
  // Enhanced statistics from stores
  $: platformStats = $transactionOrigins.active || {};
  $: hasTransactions = $transactions.length > 0;
  
  // Animation settings
  let lastAnimationTime = 0;
  const ANIMATION_THROTTLE = 100;
  const ANIMATION_SPEED = 2000;
  let isVisible = true;
  let platformRotationAngle = 0;
  
  // Bezier curve configurations for each platform
  const PLATFORM_CURVES = {};
  
  // Orbital configuration (no max limit - should match transaction count exactly)
  const ORBITAL_CONFIG = {
    baseRadius: 100,
    radiusVariation: 30,
    orbitSpeed: 15000, // ms for full orbit
    maxOrbitingTransactions: 999 // Essentially unlimited - dots should persist
  };
  
  // Tooltip state
  let showTooltip = false;
  let tooltipContent = '';
  let tooltipPosition = { x: 0, y: 0 };
  
  onMount(() => {
    console.log('🌐 Enhanced TransactionOriginNetwork with Bezier curves mounted');
    
    if (hasTransactions) {
      initializeNetwork();
      startAnimation();
    }
    
    setupVisibilityHandler();
  });
  
  onDestroy(() => {
    if (animationId) {
      clearInterval(animationId);
    }
    cleanup();
  });
  
  // Watch for transaction changes - maintain perfect 1:1 sync
  $: if ($transactions.length >= 0 && networkContainer) {
    console.log(`🔄 Transactions updated: ${$transactions.length} total`);
    
    // Only reinitialize if nodes don't exist
    if (Object.keys(nodes).length === 0) {
      initializeNetwork();
    } else {
      syncTransactionsWithDots();
    }
  }
  
  function syncTransactionsWithDots() {
    const currentTransactionIds = new Set($transactions.map(tx => tx.id));
    const currentOrbitingIds = new Set(orbitingTransactions.map(ot => ot.id));
    
    console.log(`🔍 SYNC CHECK: ${$transactions.length} transactions vs ${orbitingTransactions.length} orbiting dots`);
    
    // Find transactions that need dots created
    const transactionsNeedingDots = $transactions.filter(tx => !currentOrbitingIds.has(tx.id));
    
    // Find dots that need to be removed (transaction no longer exists)
    const dotsToRemove = orbitingTransactions.filter(dot => !currentTransactionIds.has(dot.id));
    
    // Remove obsolete dots
    dotsToRemove.forEach(dot => {
      console.log(`🗑️ Removing dot for transaction ${dot.id}`);
      if (dot.element) dot.element.remove();
      const index = orbitingTransactions.indexOf(dot);
      if (index > -1) orbitingTransactions.splice(index, 1);
    });
    
    // Create dots for new transactions
    if (transactionsNeedingDots.length > 0) {
      console.log(`➕ Creating ${transactionsNeedingDots.length} new dots`);
      transactionsNeedingDots.forEach((tx, index) => {
        setTimeout(() => {
          animateTransactionFlow(tx);
        }, index * 200);
      });
    }
    
    console.log(`✅ SYNC COMPLETE: ${orbitingTransactions.length + transactionsNeedingDots.length} dots will match ${$transactions.length} transactions`);
  }
  
  function initializeNetwork() {
    if (!networkContainer) return;
    
    const containerRect = networkContainer.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    
    // Center mempool node
    nodes['mempool'] = {
      x: centerX,
      y: centerY,
      element: networkContainer.querySelector('[data-node="mempool"]'),
      transactions: [],
      isCenter: true
    };
    
    // Position mempool in DOM
    const mempoolElement = nodes['mempool'].element;
    if (mempoolElement) {
      mempoolElement.style.left = centerX + 'px';
      mempoolElement.style.top = centerY + 'px';
      mempoolElement.classList.add('center-locked');
    }
    
    // Position platform nodes in circle and create bezier curves (moved further out)
    const platformKeys = Object.keys(PLATFORM_CONFIGS);
    const radius = Math.min(containerRect.width, containerRect.height) * 0.42; // Increased from 0.35 to 0.42
    const angleStep = (2 * Math.PI) / platformKeys.length;
    
    platformKeys.forEach((platform, index) => {
      const angle = index * angleStep - Math.PI / 2 + platformRotationAngle;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const element = networkContainer.querySelector(`[data-node="${platform}"]`);
      if (element) {
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        element.style.transform = 'translate(-50%, -50%)';
        element.style.transition = 'all 1s ease-in-out';
        
        nodes[platform] = {
          x, y, element,
          count: platformStats[platform]?.count || 0,
          transactions: []
        };
        
        // Create bezier curve configuration for this platform
        const orbitRadius = ORBITAL_CONFIG.baseRadius + (Math.random() - 0.5) * ORBITAL_CONFIG.radiusVariation;
        const orbitAngle = Math.random() * 2 * Math.PI;
        const orbitX = centerX + Math.cos(orbitAngle) * orbitRadius;
        const orbitY = centerY + Math.sin(orbitAngle) * orbitRadius;
        
        // Create control points for smooth curve FROM PLATFORM TO ORBIT
        const controlX1 = x + (orbitX - x) * 0.3 + (Math.random() - 0.5) * 60;
        const controlY1 = y + (orbitY - y) * 0.3 + (Math.random() - 0.5) * 60;
        const controlX2 = orbitX + (x - orbitX) * 0.2 + (Math.random() - 0.5) * 40;
        const controlY2 = orbitY + (y - orbitY) * 0.2 + (Math.random() - 0.5) * 40;
        
        PLATFORM_CURVES[platform] = {
          start: { x, y },
          control1: { x: controlX1, y: controlY1 },
          control2: { x: controlX2, y: controlY2 },
          orbitPoint: { x: orbitX, y: orbitY },
          orbitRadius,
          orbitAngle,
          color: PLATFORM_CONFIGS[platform].color
        };
      }
    });
    
    drawEnhancedConnections();
    console.log('🌐 Network initialized with Bezier curves for', Object.keys(nodes).length, 'nodes');
  }
  
  function drawEnhancedConnections() {
    const svg = networkContainer?.querySelector('.network-svg');
    if (!svg) return;
    
    // Clear existing paths
    svg.querySelectorAll('.platform-path, .glow-path').forEach(path => path.remove());
    
    // Don't draw any static curved lines - only show them during animation
    console.log('🌐 Static curves hidden - only showing during transaction flow');
  }
  
  function startAnimation() {
    console.log('🎬 Starting animation system - dots will persist permanently');
    
    // Create initial dots for existing transactions ONLY ONCE
    if ($transactions.length > 0 && orbitingTransactions.length === 0) {
      createInitialTransactionFlows();
    }
    
    animationId = setInterval(() => {
      if (!isVisible) return;
      
      // Only update orbiting positions and platform rotation
      updateOrbitingTransactions();
      
      // Slowly rotate platforms around mempool
      platformRotationAngle += 0.003;
      if (platformRotationAngle > 2 * Math.PI) {
        platformRotationAngle = 0;
      }
      
      // Update platform positions
      updatePlatformPositions();
    }, 50);
  }
  
  function createInitialTransactionFlows() {
    console.log('🚀 Creating ONLY bezier-based transaction flows for', $transactions.length, 'transactions');
    
    // Clear any existing orbiting particles first
    const svg = networkContainer?.querySelector('.network-svg');
    if (svg) {
      svg.querySelectorAll('.orbiting-particle').forEach(el => el.remove());
    }
    orbitingTransactions = [];
    
    // Group transactions by origin platform for better visual organization
    const transactionsByPlatform = {};
    $transactions.forEach(tx => {
      const platform = tx.origin || 'P2P';
      if (!transactionsByPlatform[platform]) {
        transactionsByPlatform[platform] = [];
      }
      transactionsByPlatform[platform].push(tx);
    });
    
    console.log('📊 Transactions by platform:', Object.keys(transactionsByPlatform).map(p => 
      `${p}: ${transactionsByPlatform[p].length}`
    ).join(', '));
    
    // Create flows for each platform with staggered timing
    let delay = 0;
    Object.entries(transactionsByPlatform).forEach(([platform, transactions]) => {
      const platformConfig = PLATFORM_CONFIGS[platform];
      console.log(`🎨 Creating ${transactions.length} ${platformConfig.name} transactions in ${platformConfig.color}`);
      
      transactions.forEach((tx, index) => {
        setTimeout(() => {
          animateTransactionFlow(tx);
        }, delay + index * 300); // 300ms between each transaction
      });
      delay += transactions.length * 300 + 500; // Extra delay between platforms
    });
  }
  
  function getRandomTransaction() {
    const activeTransactions = $transactions.filter(tx => {
      const platform = tx.origin || 'P2P';
      return nodes[platform] && nodes[platform].count > 0;
    });
    
    if (activeTransactions.length === 0) {
      return $transactions[Math.floor(Math.random() * $transactions.length)];
    }
    
    return activeTransactions[Math.floor(Math.random() * activeTransactions.length)];
  }
  
  function animateTransactionFlow(transaction) {
    const platform = transaction.origin || 'P2P';
    const platformNode = nodes[platform];
    const curve = PLATFORM_CURVES[platform];
    const platformConfig = PLATFORM_CONFIGS[platform];
    
    if (!platformNode || !curve) {
      console.warn(`❌ Cannot animate transaction - missing platform node or curve for ${platform}`);
      return;
    }
    
    console.log(`🎯 SINGLE SOURCE: Animating ${platformConfig.name} transaction in ${platformConfig.color}`);
    
    // Platform glow effect when sending
    if (platformNode.element) {
      platformNode.element.classList.add('sending');
      setTimeout(() => platformNode.element?.classList.remove('sending'), 2500);
    }
    
    // Create animated transaction particle along bezier curve - ONLY SOURCE OF PARTICLES
    createBezierTransactionFlow(curve, transaction);
  }
  
  function createBezierTransactionFlow(curve, transaction) {
    const svg = networkContainer.querySelector('.network-svg');
    if (!svg) return;
    
    const config = PLATFORM_CONFIGS[transaction.origin] || PLATFORM_CONFIGS.P2P;
    
    // Create enhanced flowing path with glow
    const flowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = `M ${curve.start.x},${curve.start.y} C ${curve.control1.x},${curve.control1.y} ${curve.control2.x},${curve.control2.y} ${curve.orbitPoint.x},${curve.orbitPoint.y}`;
    
    flowPath.setAttribute('d', pathData);
    flowPath.setAttribute('stroke', config.color);
    flowPath.setAttribute('stroke-width', '4');
    flowPath.setAttribute('opacity', '0');
    flowPath.setAttribute('fill', 'none');
    flowPath.setAttribute('filter', 'url(#pathGlow)');
    flowPath.classList.add('flow-path');
    
    svg.appendChild(flowPath);
    
    // Create transaction particle
    const particle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    particle.setAttribute('r', transaction.isWallet ? '8' : '5');
    particle.setAttribute('fill', transaction.isWallet ? '#f39c12' : config.color);
    particle.setAttribute('cx', curve.start.x);
    particle.setAttribute('cy', curve.start.y);
    particle.setAttribute('opacity', '0');
    particle.classList.add('transaction-particle');
    
    // Enhanced glow effect
    particle.style.filter = `drop-shadow(0 0 12px ${transaction.isWallet ? '#f39c12' : config.color})`;
    
    svg.appendChild(particle);
    
    // Animate the flow
    setTimeout(() => {
      // Light up the path
      flowPath.style.transition = 'opacity 0.4s ease';
      flowPath.setAttribute('opacity', '0.8');
      
      // Animate particle along bezier curve
      animateParticleAlongBezier(particle, curve, transaction, 2000);
      
      // Cleanup path
      setTimeout(() => {
        flowPath.style.transition = 'opacity 1s ease';
        flowPath.setAttribute('opacity', '0');
        setTimeout(() => flowPath.remove(), 1000);
      }, 1800);
    }, 100);
  }
  
  function animateParticleAlongBezier(particle, curve, transaction, duration) {
    const startTime = Date.now();
    
    function updateParticle() {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Bezier curve interpolation - particles originate FROM PLATFORM
      const t = easeInOutCubic(progress);
      const pos = getBezierPoint(curve.start, curve.control1, curve.control2, curve.orbitPoint, t);
      
      particle.setAttribute('cx', pos.x);
      particle.setAttribute('cy', pos.y);
      
      // Smooth opacity transition
      if (progress < 0.1) {
        particle.setAttribute('opacity', progress * 10);
      } else if (progress > 0.9) {
        particle.setAttribute('opacity', (1 - progress) * 10);
      } else {
        particle.setAttribute('opacity', '1');
      }
      
      if (progress < 1) {
        requestAnimationFrame(updateParticle);
      } else {
        // Add to orbiting transactions instead of removing
        addToOrbit(transaction, curve);
        particle.remove();
      }
    }
    
    // Start particle AT PLATFORM POSITION (not from left side)
    particle.setAttribute('cx', curve.start.x);
    particle.setAttribute('cy', curve.start.y);
    particle.setAttribute('opacity', '0');
    
    // Start animation
    updateParticle();
    
    console.log(`🎯 Particle starting from platform at (${curve.start.x}, ${curve.start.y}) going to orbit at (${curve.orbitPoint.x}, ${curve.orbitPoint.y})`);
  }
  
  function getBezierPoint(p0, p1, p2, p3, t) {
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;
    const t2 = t * t;
    const t3 = t2 * t;
    
    return {
      x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
      y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y
    };
  }
  
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  
  function addToOrbit(transaction, curve) {
    // Check if this transaction already has a dot
    const existingDot = orbitingTransactions.find(dot => dot.id === transaction.id);
    if (existingDot) {
      console.log(`⚠️ Transaction ${transaction.id} already has a dot, skipping creation`);
      return;
    }
    
    const platform = transaction.origin || 'P2P';
    const platformConfig = PLATFORM_CONFIGS[platform];
    const transactionColor = transaction.isWallet ? '#f39c12' : platformConfig.color;
    
    // Add new orbiting transaction with proper platform color
    const orbitTx = {
      id: transaction.id,
      platform: platform,
      color: transactionColor,
      isWallet: transaction.isWallet,
      orbitRadius: curve.orbitRadius,
      orbitAngle: curve.orbitAngle + Math.random() * 0.5,
      orbitSpeed: ORBITAL_CONFIG.orbitSpeed + (Math.random() - 0.5) * 5000,
      startTime: Date.now(),
      persistent: true // Mark as persistent - should not auto-remove
    };
    
    orbitingTransactions.push(orbitTx);
    createOrbitingElement(orbitTx);
    
    console.log(`🌀 Added ${platform} transaction ${transaction.id} to orbit (${orbitingTransactions.length} total dots)`);
  }
  
  function createOrbitingElement(orbitTx) {
    const svg = networkContainer.querySelector('.network-svg');
    if (!svg) return;
    
    const orbitParticle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    orbitParticle.setAttribute('r', orbitTx.isWallet ? '6' : '4');
    orbitParticle.setAttribute('fill', orbitTx.color);
    orbitParticle.setAttribute('opacity', '0.9');
    orbitParticle.classList.add('orbiting-particle');
    orbitParticle.dataset.txId = orbitTx.id;
    
    // Enhanced glow for orbiting particles matching platform color
    orbitParticle.style.filter = `drop-shadow(0 0 8px ${orbitTx.color})`;
    
    svg.appendChild(orbitParticle);
    orbitTx.element = orbitParticle;
    
    console.log(`🎨 Created orbiting particle with color ${orbitTx.color} from platform ${orbitTx.platform || 'unknown'}`);
  }
  
  function updatePlatformPositions() {
    if (!networkContainer) return;
    
    const containerRect = networkContainer.getBoundingClientRect();
    const centerX = containerRect.width / 2;
    const centerY = containerRect.height / 2;
    const platformKeys = Object.keys(PLATFORM_CONFIGS);
    const radius = Math.min(containerRect.width, containerRect.height) * 0.42; // Increased radius
    const angleStep = (2 * Math.PI) / platformKeys.length;
    
    platformKeys.forEach((platform, index) => {
      const angle = index * angleStep - Math.PI / 2 + platformRotationAngle;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const element = networkContainer.querySelector(`[data-node="${platform}"]`);
      if (element && nodes[platform]) {
        element.style.left = x + 'px';
        element.style.top = y + 'px';
        
        // Update node position data
        nodes[platform].x = x;
        nodes[platform].y = y;
        
        // Update curve start point
        if (PLATFORM_CURVES[platform]) {
          PLATFORM_CURVES[platform].start = { x, y };
        }
      }
    });
  }
  
  function updateOrbitingTransactions() {
    const centerNode = nodes['mempool'];
    if (!centerNode) return;
    
    const now = Date.now();
    
    orbitingTransactions.forEach((orbitTx) => {
      if (!orbitTx.element) return;
      
      const elapsed = now - orbitTx.startTime;
      const orbitProgress = (elapsed % orbitTx.orbitSpeed) / orbitTx.orbitSpeed;
      const currentAngle = orbitTx.orbitAngle + orbitProgress * 2 * Math.PI;
      
      const x = centerNode.x + Math.cos(currentAngle) * orbitTx.orbitRadius;
      const y = centerNode.y + Math.sin(currentAngle) * orbitTx.orbitRadius;
      
      orbitTx.element.setAttribute('cx', x);
      orbitTx.element.setAttribute('cy', y);
      
      // Keep dots visible permanently - no fade out
      orbitTx.element.setAttribute('opacity', '0.9');
    });
    
    // Log count occasionally for debugging
    if (Math.random() < 0.01) { // 1% chance per frame
      console.log(`🔄 Orbiting: ${orbitingTransactions.length} dots for ${$transactions.length} transactions`);
    }
  }
  
  function setupVisibilityHandler() {
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
      if (!isVisible && animationId) {
        clearInterval(animationId);
        animationId = null;
      } else if (isVisible && !animationId) {
        startAnimation();
      }
    });
  }
  
  // Hover functions for platform names
  function showPlatformName(e, platform) {
    const config = PLATFORM_CONFIGS[platform];
    if (!config) return;
    
    tooltipContent = config.name;
    tooltipPosition = { x: e.clientX + 15, y: e.clientY - 15 };
    showTooltip = true;
  }
  
  function hidePlatformName() {
    showTooltip = false;
  }
  
  function addRandomTransaction() {
    const platformKeys = Object.keys(PLATFORM_CONFIGS);
    const randomPlatform = platformKeys[Math.floor(Math.random() * platformKeys.length)];
    
    const mockTransaction = {
      id: 'demo_' + Date.now(),
      origin: randomPlatform,
      value: Math.random() * 100,
      isWallet: Math.random() < 0.15
    };
    
    console.log(`🧪 Adding manual test transaction from ${randomPlatform}`);
    animateTransactionFlow(mockTransaction);
  }
  
  function clearTransactions() {
    const svg = networkContainer?.querySelector('.network-svg');
    if (svg) {
      svg.querySelectorAll('.flow-path, .orbiting-particle').forEach(el => el.remove());
    }
    
    orbitingTransactions = [];
    
    Object.values(nodes).forEach(node => {
      if (node.element) {
        node.element.classList.remove('sending', 'receiving', 'active');
      }
    });
    
    console.log('🧹 Cleared all transactions and reset tracking');
  }
  
  function cleanup() {
    clearTransactions();
    if (animationId) {
      clearInterval(animationId);
    }
  }
  
  function formatNumber(num) {
    return num?.toLocaleString() || 0;
  }
</script>

<!-- Main Network Container -->
<div class="network-wrapper">
  <div class="network-container" bind:this={networkContainer}>
    <!-- Enhanced SVG with filters -->
    <svg class="network-svg">
      <defs>
        <!-- Enhanced glow filter for paths -->
        <filter id="pathGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        
        <!-- Particle glow filter -->
        <filter id="particleGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge> 
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
    
    <!-- Enhanced Central Mempool Area -->
    <div class="mempool-node center-locked" data-node="mempool">
      <!-- Animated background rings -->
      <div class="mempool-rings">
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
      </div>
      
      <!-- Mempool boundary circle -->
      <div class="mempool-boundary"></div>
      
      <!-- Dynamic orbiting transaction particles -->
      <div class="mempool-orbit">
        {#each Array(Math.min($transactions.length, 8)) as _, i}
          <div 
            class="orbit-transaction" 
            style="
              --orbit-delay: {i * 0.4 + Math.random() * 2}s; 
              --orbit-radius: {80 + Math.random() * 60}px;
              --orbit-speed: {12 + Math.random() * 8}s;
              --orbit-angle: {i * (360 / Math.min($transactions.length, 8))}deg;
            "
          ></div>
        {/each}
      </div>
      
      <!-- Subtle center indicator with larger orange circle -->
      <div class="mempool-center">
        <div class="center-dot"></div>
        <div class="center-pulse"></div>
      </div>
    </div>
    
    <!-- Platform Nodes with Enhanced Glow -->
    {#each Object.entries(PLATFORM_CONFIGS) as [platform, config]}
      {@const platformData = platformStats[platform]}
      {@const transactionCount = platformData?.count || 0}
      <div 
        class="platform-node" 
        class:active={transactionCount > 0}
        class:sending={false}
        data-node={platform}
        style="--platform-color: {config.color};"
        on:mouseenter={(e) => showPlatformName(e, platform)}
        on:mouseleave={hidePlatformName}
      >
        <div class="platform-glow-ring" style="border-color: {config.color};"></div>
        
        <div class="platform-logo-container">
          <img 
            src={config.logo} 
            alt={config.name}
            class="platform-logo"
            on:error={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'block';
            }}
          />
          <div class="fallback-logo" style="display: none; background: {config.color};">
            {config.name.slice(0, 2).toUpperCase()}
          </div>
        </div>
        
        {#if transactionCount > 0}
          <div class="activity-badge" style="background: {config.color};">
            {transactionCount}
          </div>
        {/if}
      </div>
    {/each}
  </div>
  
  <!-- Enhanced Controls -->
  <div class="controls">
    <button class="control-button" on:click={addRandomTransaction}>
      ➕ Add Transaction
    </button>
    <button class="control-button" on:click={clearTransactions}>
      🗑️ Clear All
    </button>
    <div class="orbit-counter">
      Orbiting: {orbitingTransactions.length}
    </div>
  </div>
  
  <!-- Enhanced Tooltip -->
  {#if showTooltip}
    <div 
      class="platform-tooltip" 
      style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
    >
      {tooltipContent}
    </div>
  {/if}
</div>

<style>
  /* Base styles */
  .network-wrapper {
    position: relative;
    width: 100%;
    height: 600px;
    background: linear-gradient(135deg, var(--dark-bg) 0%, var(--darker-bg) 100%);
    color: var(--text-light);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    overflow: hidden;
    border-radius: 12px;
    border: 2px solid var(--border-color);
    box-shadow: 0 4px 20px rgba(44, 74, 107, 0.2);
  }
  
  .network-container {
    position: relative;
    width: 100%;
    height: 100%;
  }
  
  .network-svg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
  }
  
  /* Enhanced Mempool Area */
  .mempool-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    user-select: none;
    transform: translate(-50%, -50%);
    transition: all 0.3s ease;
    width: 250px;
    height: 250px;
  }
  
  .mempool-node.receiving {
    animation: mempoolReceiving 1.5s ease-out;
  }
  
  /* Animated background rings */
  .mempool-rings {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 1;
  }
  
  .ring {
    position: absolute;
    border: 1px solid var(--primary-orange);
    border-radius: 50%;
    opacity: 0.15;
    animation: ringPulse 4s ease-in-out infinite;
  }
  
  .ring-1 {
    width: 180px;
    height: 180px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 0s;
    opacity: 0.25;
  }
  
  .ring-2 {
    width: 220px;
    height: 220px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 1.5s;
    opacity: 0.15;
  }
  
  .ring-3 {
    width: 250px;
    height: 250px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 3s;
    opacity: 0.1;
  }
  
  @keyframes ringPulse {
    0% { 
      transform: translate(-50%, -50%) scale(0.7);
      opacity: 0.3;
    }
    50% { 
      transform: translate(-50%, -50%) scale(1);
      opacity: 0.1;
    }
    100% { 
      transform: translate(-50%, -50%) scale(1.1);
      opacity: 0;
    }
  }
  
  /* Mempool boundary */
  .mempool-boundary {
    position: absolute;
    width: 200px;
    height: 200px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border: 2px dashed var(--primary-orange);
    border-radius: 50%;
    opacity: 0.3;
    z-index: 2;
    animation: boundaryRotate 20s linear infinite;
  }
  
  @keyframes boundaryRotate {
    from { transform: translate(-50%, -50%) rotate(0deg); }
    to { transform: translate(-50%, -50%) rotate(360deg); }
  }
  
  /* Dynamic transaction particles */
  .mempool-orbit {
    position: absolute;
    width: 100%;
    height: 100%;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 3;
  }
  
  /* Removed all orbit-transaction styles since we're not using automatic orbit particles */
  
  /* Subtle center point (no large orange dot) */
  .mempool-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 5;
  }
  
  /* Removed center dot - only keeping subtle pulse */
  .center-pulse {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border: 1px solid var(--primary-orange);
    border-radius: 50%;
    opacity: 0;
    animation: centerRipple 3s ease-out infinite;
  }
  
  @keyframes centerRipple {
    0% {
      transform: translate(-50%, -50%) scale(0.5);
      opacity: 0.6;
    }
    100% {
      transform: translate(-50%, -50%) scale(3);
      opacity: 0;
    }
  }
  
  /* Enhanced receiving animation */
  @keyframes mempoolReceiving {
    0% { 
      transform: translate(-50%, -50%) scale(1); 
    }
    25% { 
      transform: translate(-50%, -50%) scale(1.02); 
    }
    50% { 
      transform: translate(-50%, -50%) scale(1.05); 
    }
    75% { 
      transform: translate(-50%, -50%) scale(1.02); 
    }
    100% { 
      transform: translate(-50%, -50%) scale(1); 
    }
  }
  
  .mempool-node.receiving .ring {
    animation-duration: 1s;
    border-color: var(--secondary-orange);
    opacity: 0.4;
  }
  
  .mempool-node.receiving .orbit-transaction {
    animation-duration: 3s;
    box-shadow: 
      0 0 15px currentColor,
      0 0 30px rgba(232, 115, 31, 0.5);
  }
  
  .mempool-node.receiving .center-pulse {
    animation-duration: 1s;
    border-color: var(--secondary-orange);
    opacity: 0.8;
  }
  
  /* Enhanced Platform Nodes */
  .platform-node {
    position: absolute;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
    user-select: none;
    transform: translate(-50%, -50%);
    transition: all 0.3s ease;
    width: auto;
    height: auto;
    cursor: pointer;
  }
  
  .platform-node:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }
  
  .platform-node.sending {
    animation: platformSending 2.5s ease-in-out;
  }
  
  .platform-node.sending .platform-glow-ring {
    animation: glowRingPulse 2.5s ease-in-out;
  }
  
  @keyframes platformSending {
    0% { transform: translate(-50%, -50%) scale(1); }
    20% { transform: translate(-50%, -50%) scale(1.05); }
    40% { transform: translate(-50%, -50%) scale(1.1); }
    60% { transform: translate(-50%, -50%) scale(1.05); }
    80% { transform: translate(-50%, -50%) scale(1.02); }
    100% { transform: translate(-50%, -50%) scale(1); }
  }
  
  @keyframes glowRingPulse {
    0% { 
      opacity: 0.2; 
      transform: scale(1); 
    }
    25% { 
      opacity: 0.8; 
      transform: scale(1.2); 
    }
    50% { 
      opacity: 1; 
      transform: scale(1.4); 
    }
    75% { 
      opacity: 0.6; 
      transform: scale(1.2); 
    }
    100% { 
      opacity: 0.2; 
      transform: scale(1); 
    }
  }
  
  /* Platform glow ring */
  .platform-glow-ring {
    position: absolute;
    width: 80px;
    height: 80px;
    border: 3px solid;
    border-radius: 50%;
    opacity: 0.2;
    z-index: 8;
    transition: all 0.3s ease;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
  
  .platform-node:hover .platform-glow-ring {
    opacity: 0.4;
    transform: translate(-50%, -50%) scale(1.1);
  }
  
  .platform-node.active .platform-glow-ring {
    opacity: 0.6;
    animation: activeGlowPulse 3s ease-in-out infinite;
  }
  
  @keyframes activeGlowPulse {
    0%, 100% { 
      opacity: 0.6; 
      transform: translate(-50%, -50%) scale(1); 
    }
    50% { 
      opacity: 0.8; 
      transform: translate(-50%, -50%) scale(1.05); 
    }
  }
  
  .platform-logo-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 60px;
    height: 60px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 3px 12px rgba(0, 0, 0, 0.2);
    border: 2px solid var(--platform-color, #95a5a6);
    transition: all 0.3s ease;
    z-index: 9;
  }
  
  .platform-node:hover .platform-logo-container {
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    border-width: 3px;
  }
  
  .platform-node.active .platform-logo-container {
    border-color: var(--primary-orange);
    box-shadow: 0 4px 15px rgba(212, 101, 27, 0.4);
  }
  
  .platform-logo {
    width: 40px;
    height: 40px;
    object-fit: contain;
    filter: none;
  }
  
  .fallback-logo {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: bold;
    font-size: 12px;
  }
  
  .activity-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--platform-color, #95a5a6);
    color: white;
    border-radius: 50%;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: bold;
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
    z-index: 15;
    animation: badgePulse 2s ease-in-out infinite alternate;
  }
  
  @keyframes badgePulse {
    from { opacity: 0.8; transform: scale(1); }
    to { opacity: 1; transform: scale(1.05); }
  }
  
  /* Enhanced SVG Path Styles */
  :global(.platform-path) {
    transition: all 0.3s ease;
  }
  
  :global(.glow-path) {
    transition: all 0.3s ease;
  }
  
  :global(.flow-path) {
    stroke-width: 4;
    opacity: 0;
    filter: url(#pathGlow);
    transition: opacity 0.4s ease;
  }
  
  :global(.orbiting-particle) {
    opacity: 0.8;
    filter: url(#particleGlow);
    transition: all 0.3s ease;
  }
  
  :global(.transaction-particle) {
    opacity: 0;
    filter: url(#particleGlow);
    transition: opacity 0.3s ease;
  }
  
  /* Enhanced Controls */
  .controls {
    position: absolute;
    bottom: 20px;
    left: 20px;
    display: flex;
    flex-direction: column;
    gap: 10px;
    z-index: 1000;
  }
  
  .control-button {
    padding: 8px 16px;
    background: linear-gradient(135deg, var(--primary-blue) 0%, var(--secondary-blue) 100%);
    color: white;
    border: 2px solid var(--accent-blue);
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 0.3s ease;
  }
  
  .control-button:hover {
    background: linear-gradient(135deg, var(--secondary-blue) 0%, var(--accent-blue) 100%);
    transform: translateY(-2px);
    box-shadow: 0 6px 20px var(--glow-blue);
  }
  
  .orbit-counter {
    background: linear-gradient(135deg, var(--primary-orange) 0%, var(--secondary-orange) 100%);
    color: white;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 600;
    text-align: center;
    border: 2px solid var(--light-orange);
    box-shadow: 0 2px 8px rgba(212, 101, 27, 0.3);
  }
  
  /* Enhanced Platform Tooltip */
  .platform-tooltip {
    position: fixed;
    background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
    border: 2px solid var(--primary-orange);
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-light);
    pointer-events: none;
    z-index: 1000;
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    white-space: nowrap;
    animation: tooltipFadeIn 0.2s ease;
  }
  
  @keyframes tooltipFadeIn {
    from { 
      opacity: 0; 
      transform: scale(0.95) translateY(-5px); 
    }
    to { 
      opacity: 1; 
      transform: scale(1) translateY(0); 
    }
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .network-wrapper {
      height: 500px;
    }
    
    .platform-logo-container {
      width: 50px;
      height: 50px;
    }
    
    .platform-logo {
      width: 35px;
      height: 35px;
    }
    
    .platform-glow-ring {
      width: 70px;
      height: 70px;
    }
    
    .controls {
      bottom: 10px;
      left: 10px;
      gap: 8px;
    }
    
    .control-button {
      font-size: 11px;
      padding: 6px 12px;
    }
  }
  
  @media (max-width: 480px) {
    .network-wrapper {
      height: 450px;
    }
    
    .platform-logo-container {
      width: 45px;
      height: 45px;
    }
    
    .platform-logo {
      width: 30px;
      height: 30px;
    }
    
    .platform-glow-ring {
      width: 60px;
      height: 60px;
    }
    
    .mempool-node {
      width: 200px;
      height: 200px;
    }
    
    .ring-1 { width: 140px; height: 140px; }
    .ring-2 { width: 170px; height: 170px; }
    .ring-3 { width: 200px; height: 200px; }
    
    .mempool-boundary {
      width: 160px;
      height: 160px;
    }
  }
</style>