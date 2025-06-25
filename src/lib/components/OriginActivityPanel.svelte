<script>
  import { transactionOrigins } from '$lib/stores.js';
  import { PLATFORM_CONFIGS } from '$lib/transactionOrigins.js';
  
  // Tooltip state
  let showTooltip = false;
  let tooltipContent = '';
  let tooltipPosition = { x: 0, y: 0 };
  
  // Filter out platforms with 0 transactions and sort by count
  $: activePlatforms = Object.entries($transactionOrigins.active || {})
    .filter(([_, data]) => data.count > 0)
    .sort(([_, a], [__, b]) => b.count - a.count); // Sort by count descending
  
  // Debug logging
  $: if ($transactionOrigins) {
    console.log('🎯 OriginActivityPanel: transactionOrigins updated:', $transactionOrigins);
    console.log('🎯 Active platforms:', activePlatforms.length);
  }
  
  function showPlatformTooltip(event, platform, data) {
    const config = PLATFORM_CONFIGS[platform];
    tooltipContent = `${config.name}: ${data.count} transactions (${data.percentage.toFixed(1)}%)`;
    tooltipPosition = { x: event.clientX + 15, y: event.clientY - 10 };
    showTooltip = true;
  }
  
  function hideTooltip() {
    showTooltip = false;
  }
  
  function handlePlatformClick(platform, data) {
    const config = PLATFORM_CONFIGS[platform];
    console.log(`🖱️ Clicked on ${config.name}: ${data.count} transactions`);
    
    // Future: Could filter visualizations by platform or show detailed breakdown
    if (config.website) {
      // For now, just log. Could open website in future if desired
      console.log(`🌐 Platform website: ${config.website}`);
    }
  }
</script>

<!-- Only show panel if there are active platforms -->
{#if activePlatforms.length > 0}
  <div class="origin-activity-panel">
    <h3 class="panel-title">Ergo Activity</h3>
    <div class="platforms-grid">
      {#each activePlatforms as [platform, data]}
        {@const config = PLATFORM_CONFIGS[platform]}
        <div 
          class="platform-item"
          on:mouseenter={(e) => showPlatformTooltip(e, platform, data)}
          on:mouseleave={hideTooltip}
          on:click={() => handlePlatformClick(platform, data)}
          on:keydown={(e) => e.key === 'Enter' && handlePlatformClick(platform, data)}
          role="button"
          tabindex="0"
          aria-label={`${config.name}: ${data.count} transactions`}
        >
          <img 
            src={config.logo} 
            alt={config.name}
            class="platform-logo"
            on:error={(e) => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div 
            class="fallback-logo" 
            style="background-color: {config.color}; display: none;"
          >
            {config.name.slice(0, 2).toUpperCase()}
          </div>
          <span class="transaction-count">{data.count}</span>
        </div>
      {/each}
    </div>
  </div>
{:else}
  <!-- Debug: Show when no platforms are detected -->
  <div class="origin-activity-panel debug-panel">
    <h3 class="panel-title">Platform Activity</h3>
    <div class="no-platforms">
      <span class="debug-text">No Ergo activity detected yet...</span>
      <small class="debug-help">Transaction types will appear here....</small>
    </div>
  </div>
{/if}

<!-- Tooltip -->
{#if showTooltip}
  <div 
    class="platform-tooltip" 
    style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px;"
  >
    {tooltipContent}
  </div>
{/if}

<style>
  .origin-activity-panel {
    background: linear-gradient(135deg, rgba(44, 74, 107, 0.15) 0%, rgba(26, 35, 50, 0.15) 100%);
    border-radius: 12px;
    border: 2px solid var(--border-color);
    padding: 16px; /* Match StatsDisplay padding */
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 100%;
    transition: all 0.3s ease;
    box-sizing: border-box; /* Ensure consistent sizing */
    
    /* Remove any margin that could interfere with gap */
    margin: 0;
  }
  
  .origin-activity-panel:hover {
    border-color: rgba(230, 126, 34, 0.4);
    box-shadow: 0 6px 25px rgba(230, 126, 34, 0.15);
  }
  
  .panel-title {
    color: var(--primary-orange);
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 12px 0; /* Match StatsDisplay title margin */
    text-align: center;
    text-shadow: 0 1px 2px rgba(230, 126, 34, 0.3);
    position: relative;
  }
  
  .panel-title::after {
    content: '';
    position: absolute;
    bottom: -4px; /* Match StatsDisplay title underline */
    left: 50%;
    transform: translateX(-50%);
    width: 30px; /* Match StatsDisplay underline width */
    height: 2px;
    background: linear-gradient(90deg, var(--primary-orange), var(--secondary-orange));
    border-radius: 1px;
  }
  
  .platforms-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
    align-items: center;
  }
  
  .platform-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    min-width: 55px;
    position: relative;
    overflow: hidden;
    min-height: 40px; /* Match StatsDisplay stat item height */
    justify-content: center;
  }
  
  .platform-item::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(230, 126, 34, 0.1), transparent);
    transition: left 0.5s ease;
  }
  
  .platform-item:hover::before {
    left: 100%;
  }
  
  .platform-item:hover {
    background: rgba(230, 126, 34, 0.1);
    border-color: rgba(230, 126, 34, 0.4);
    transform: translateY(-2px);
    box-shadow: 0 4px 15px rgba(230, 126, 34, 0.2);
  }
  
  .platform-item:focus {
    outline: none;
    border-color: var(--primary-orange);
    box-shadow: 0 0 0 2px rgba(230, 126, 34, 0.3);
  }
  
  .platform-logo {
    width: 24px;
    height: 24px;
    object-fit: contain;
    filter: brightness(1.1);
    transition: all 0.3s ease;
    position: relative;
    z-index: 2;
  }
  
  .platform-item:hover .platform-logo {
    filter: brightness(1.3) contrast(1.1);
    transform: scale(1.05);
  }
  
  .fallback-logo {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 7px;
    font-weight: bold;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 2;
  }
  
  .transaction-count {
    color: var(--text-light);
    font-size: 12px;
    font-weight: 600;
    min-width: 18px;
    text-align: center;
    position: relative;
    z-index: 2;
    transition: all 0.3s ease;
  }
  
  .platform-item:hover .transaction-count {
    color: var(--primary-orange);
    transform: scale(1.05);
  }
  
  /* Debug panel styles */
  .debug-panel {
    border-color: rgba(255, 255, 255, 0.1);
    opacity: 0.7;
  }
  
  .no-platforms {
    text-align: center;
    padding: 10px;
  }
  
  .debug-text {
    color: var(--text-muted);
    font-size: 14px;
    font-style: italic;
  }
  
  .debug-help {
    color: var(--text-muted);
    font-size: 11px;
    display: block;
    margin-top: 5px;
    opacity: 0.7;
  }
  
  .platform-tooltip {
    position: fixed;
    background: linear-gradient(135deg, var(--darker-bg) 0%, var(--dark-bg) 100%);
    border: 2px solid var(--primary-orange);
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    color: var(--text-light);
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(10px);
    animation: tooltipFadeIn 0.2s ease;
    font-weight: 500;
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
  
  /* RESPONSIVE DESIGN - MATCH STATSDISPLAY BREAKPOINTS */
  
  /* For very narrow sidebars */
  @media (max-width: 320px) {
    .platforms-grid {
      gap: 10px;
    }
    
    .platform-item {
      padding: 6px 8px;
      gap: 6px;
      min-width: 60px;
    }
    
    .platform-logo, .fallback-logo {
      width: 20px;
      height: 20px;
    }
    
    .transaction-count {
      font-size: 12px;
    }
    
    .panel-title {
      font-size: 14px;
      margin-bottom: 10px;
    }
  }
  
  /* For medium sidebars (280-320px) */
  @media (min-width: 280px) and (max-width: 320px) {
    .platforms-grid {
      gap: 8px;
    }
    
    .platform-item {
      padding: 6px 10px;
      gap: 6px;
      min-width: 70px;
    }
    
    .platform-logo, .fallback-logo {
      width: 22px;
      height: 22px;
    }
    
    .transaction-count {
      font-size: 13px;
    }
  }
  
  /* For wider sidebars (320px+) */
  @media (min-width: 320px) {
    .platforms-grid {
      gap: 15px;
    }
    
    .platform-item {
      padding: 8px 12px;
    }
  }
  
  /* For mobile stacked layout */
  @media (max-width: 949px) {
    .origin-activity-panel {
      padding: 20px; /* Larger padding on mobile like StatsDisplay */
    }
    
    .platforms-grid {
      gap: 12px;
    }
    
    .platform-item {
      padding: 10px 14px;
      min-height: 55px; /* Match mobile StatsDisplay height */
    }
    
    .platform-logo, .fallback-logo {
      width: 26px;
      height: 26px;
    }
    
    .transaction-count {
      font-size: 15px;
    }
    
    .panel-title {
      font-size: 16px;
      margin-bottom: 15px;
    }
  }
  
  /* For small mobile screens */
  @media (max-width: 600px) {
    .platforms-grid {
      gap: 10px;
    }
    
    .platform-item {
      padding: 8px 12px;
      min-height: 50px;
    }
    
    .platform-logo, .fallback-logo {
      width: 24px;
      height: 24px;
    }
    
    .transaction-count {
      font-size: 14px;
    }
  }
  
  @media (max-width: 480px) {
    .origin-activity-panel {
      padding: 15px; /* Match StatsDisplay mobile padding */
    }
    
    .platforms-grid {
      gap: 8px;
    }
    
    .platform-item {
      padding: 6px 10px;
      gap: 5px;
      min-width: 60px;
      min-height: 45px;
    }
    
    .platform-logo, .fallback-logo {
      width: 20px;
      height: 20px;
    }
    
    .fallback-logo {
      font-size: 7px;
    }
    
    .transaction-count {
      font-size: 12px;
    }
    
    .panel-title {
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .platform-tooltip {
      font-size: 11px;
      padding: 6px 10px;
    }
  }
</style>