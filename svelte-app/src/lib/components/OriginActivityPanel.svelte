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
    <h3 class="panel-title">Platform Activity</h3>
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
      <span class="debug-text">No platform activity detected yet...</span>
      <small class="debug-help">Transaction origins will appear here once data is loaded</small>
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
    padding: 20px;
    margin-bottom: 25px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    width: 100%;
    max-width: 900px;
    transition: all 0.3s ease;
  }
  
  .origin-activity-panel:hover {
    border-color: rgba(230, 126, 34, 0.4);
    box-shadow: 0 6px 25px rgba(230, 126, 34, 0.15);
  }
  
  .panel-title {
    color: var(--primary-orange);
    font-size: 16px;
    font-weight: 600;
    margin: 0 0 15px 0;
    text-align: center;
    text-shadow: 0 1px 2px rgba(230, 126, 34, 0.3);
    position: relative;
  }
  
  .panel-title::after {
    content: '';
    position: absolute;
    bottom: -5px;
    left: 50%;
    transform: translateX(-50%);
    width: 40px;
    height: 2px;
    background: linear-gradient(90deg, var(--primary-orange), var(--secondary-orange));
    border-radius: 1px;
  }
  
  .platforms-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    justify-content: center;
    align-items: center;
  }
  
  .platform-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    transition: all 0.3s ease;
    cursor: pointer;
    min-width: 80px;
    position: relative;
    overflow: hidden;
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
    font-size: 8px;
    font-weight: bold;
    text-shadow: 0 1px 1px rgba(0, 0, 0, 0.3);
    position: relative;
    z-index: 2;
  }
  
  .transaction-count {
    color: var(--text-light);
    font-size: 14px;
    font-weight: 600;
    min-width: 20px;
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
  
  /* Responsive design */
  @media (max-width: 768px) {
    .origin-activity-panel {
      padding: 15px;
      margin-bottom: 20px;
    }
    
    .platforms-grid {
      gap: 10px;
    }
    
    .platform-item {
      padding: 6px 10px;
      gap: 6px;
      min-width: 70px;
    }
    
    .platform-logo, .fallback-logo {
      width: 20px;
      height: 20px;
    }
    
    .transaction-count {
      font-size: 13px;
    }
    
    .panel-title {
      font-size: 14px;
      margin-bottom: 12px;
    }
    
    .debug-text {
      font-size: 12px;
    }
    
    .debug-help {
      font-size: 10px;
    }
  }
  
  @media (max-width: 480px) {
    .origin-activity-panel {
      padding: 12px;
      margin-bottom: 15px;
    }
    
    .platforms-grid {
      gap: 8px;
    }
    
    .platform-item {
      padding: 5px 8px;
      gap: 5px;
      min-width: 60px;
    }
    
    .platform-logo, .fallback-logo {
      width: 18px;
      height: 18px;
    }
    
    .fallback-logo {
      font-size: 7px;
    }
    
    .transaction-count {
      font-size: 12px;
    }
    
    .panel-title {
      font-size: 13px;
      margin-bottom: 10px;
    }
    
    .platform-tooltip {
      font-size: 11px;
      padding: 6px 10px;
    }
  }
</style>