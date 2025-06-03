// blocks.js - Block display, animation, and update functions with debugging

// Global variable to track previous block data for animation detection
let previousBlockData = null;

/**
 * Update the next block info section with current mempool data
 */
function updateNextBlockInfo() {
    if (transactions.length === 0) {
        // Show default values when no transactions
        document.getElementById('next-block-height').textContent = 'Mining...';
        document.getElementById('next-block').innerHTML = `
            <div class="block-size">Pending</div>
            <div class="block-reward">
                <span class="reward-label">Est. Reward</span>
                <span class="reward-value" id="next-block-reward">~15.00 ERG</span>
            </div>
            <div class="block-tx-count">Processing...</div>
        `;
        return;
    }

    // Calculate mempool stats
    const totalTransactions = transactions.length;
    const totalSize = transactions.reduce((sum, tx) => sum + (tx.size || 0), 0);
    
    // Update next block display
    document.getElementById('next-block-height').textContent = 'Mining...';
    document.getElementById('next-block').innerHTML = `
        <div class="block-size">${(totalSize / 1000000).toFixed(2)} MB</div>
        <div class="block-reward">
            <span class="reward-label">Est. Reward</span>
            <span class="reward-value" id="next-block-reward">~15.00 ERG</span>
        </div>
        <div class="block-tx-count">${totalTransactions.toLocaleString()} transactions</div>
    `;
}

/**
 * Update the next block reward estimate when we get block data
 * @param {number} baseMinerReward - Base miner reward from most recent block
 */
function updateNextBlockReward(baseMinerReward) {
    const rewardElement = document.getElementById('next-block-reward');
    if (rewardElement && baseMinerReward) {
        rewardElement.textContent = `~${baseMinerReward.toFixed(2)} ERG`;
    }
}

/**
 * Check if we should animate block transitions based on new block data
 * @param {Array} newBlocks - Array of new block data
 * @returns {boolean} - Whether animation should occur
 */
/**
 * Check if we should animate block transitions (UPDATED)
 */
function animateBlockTransition(newBlocks) {
    // IMPORTANT: Block animations should work regardless of dummy state
    // Dummy transactions don't affect real blockchain data
    
    if (!previousBlockData || !newBlocks || newBlocks.length === 0) {
        previousBlockData = [...newBlocks];
        return false;
    }

    // Check if the first block (newest) has changed
    const hasNewBlock = newBlocks[0] && previousBlockData[0] && 
                      newBlocks[0].height !== previousBlockData[0].height;

    console.log('Checking for new block:', {
        newHeight: newBlocks[0]?.height,
        previousHeight: previousBlockData[0]?.height,
        hasNewBlock: hasNewBlock,
        dummyMode: typeof window.dummyModeActive !== 'undefined' ? window.dummyModeActive : false
    });

    if (hasNewBlock) {
        console.log('🎉 New block detected, starting animation');
        
        // Clear dummy transactions when new block arrives
        if (typeof window.checkForNewBlockAndClearDummies === 'function') {
            window.checkForNewBlockAndClearDummies(newBlocks[0].height);
        }
        
        performBlockAnimation(newBlocks);
        previousBlockData = [...newBlocks];
        return true;
    }

    previousBlockData = [...newBlocks];
    return false;
}

function animateBlockTransition(newBlocks) {
    // Check if we have new block data and it's different from previous
    if (!previousBlockData || !newBlocks || newBlocks.length === 0) {
        previousBlockData = [...newBlocks];
        return false;
    }

    // Check if the first block (newest) has changed
    const hasNewBlock = newBlocks[0] && previousBlockData[0] && 
                      newBlocks[0].height !== previousBlockData[0].height;

    console.log('Checking for new block:', {
        newHeight: newBlocks[0]?.height,
        previousHeight: previousBlockData[0]?.height,
        hasNewBlock: hasNewBlock
    });

    if (hasNewBlock) {
        console.log('New block detected, starting animation');
        performBlockAnimation(newBlocks);
        previousBlockData = [...newBlocks];
        return true;
    }

    previousBlockData = [...newBlocks];
    return false;
}

/**
 * Trigger block animation sequence
 * @param {Array} newBlocks - Array of new block data
 */
function performBlockAnimation(newBlocks) {
    console.log('performBlockAnimation called with:', newBlocks.length, 'blocks');
    
    // Choose animation method:
    // Method 1: Simple transform animation (recommended for debugging)
    animateNextBlockToRightSimple(newBlocks);
    
    // Method 2: CSS keyframes (alternative)
    // animateNextBlockToRightCSS(newBlocks);
    
    // Method 3: Original improved version 
    // animateNextBlockToRightAdvanced(newBlocks);
}

/**
 * Simple, debuggable animation that should definitely work
 * @param {Array} newBlocks - Array of new block data
 */
function animateNextBlockToRightSimple(newBlocks) {
    console.log('Starting simple block animation...');
    
    // Get ALL block containers using the exact structure from your HTML
    const containers = [];
    
    // Next block container
    const nextBlockContainer = document.querySelector('#next-block-section .block-container');
    if (nextBlockContainer) {
        containers.push({ element: nextBlockContainer, type: 'next' });
        console.log('Found next block container');
    } else {
        console.error('Could not find next block container');
    }
    
    // Existing block containers (0, 1, 2, 3)
    for (let i = 0; i < 4; i++) {
        const blockElement = document.getElementById(`block-${i}`);
        if (blockElement) {
            const container = blockElement.closest('.block-container');
            if (container) {
                containers.push({ element: container, type: 'existing', index: i });
                console.log(`Found block container ${i}`);
            }
        }
    }
    
    console.log(`Total containers found: ${containers.length}`);
    
    if (containers.length < 5) {
        console.error('Not enough containers found for animation');
        // Fallback: just update without animation
        updateBlocksWithAnimation(newBlocks);
        updateNextBlockInfo();
        return;
    }
    
    // Animation settings
    const DURATION = 1200; // 1.2 seconds for visibility
    const DISTANCE = 240; // Pixels to move
    
    // Prepare all containers for animation
    containers.forEach(({ element, type, index }, i) => {
        element.style.transition = `transform ${DURATION}ms ease-in-out, opacity ${DURATION}ms ease-in-out`;
        element.style.position = 'relative';
        element.style.zIndex = '100';
        
        // Debug: Add temporary colored border
        //element.style.outline = `3px solid ${type === 'next' ? 'red' : 'blue'}`;
        
        console.log(`Prepared container ${type} ${index !== undefined ? index : ''}`);
    });
    
    // Start animation after small delay
    setTimeout(() => {
        containers.forEach(({ element, type, index }) => {
            if (type === 'next') {
                // Next block moves right
                element.style.transform = `translateX(${DISTANCE}px)`;
                console.log('Moving next block right');
            } else if (type === 'existing') {
                if (index === 3) {
                    // Last block fades and moves
                    element.style.transform = `translateX(${DISTANCE}px)`;
                    element.style.opacity = '0';
                    console.log('Moving and fading last block');
                } else {
                    // Other blocks just move
                    element.style.transform = `translateX(${DISTANCE}px)`;
                    console.log(`Moving block ${index} right`);
                }
            }
        });
    }, 50);
    
    // Clean up after animation
    setTimeout(() => {
        console.log('Cleaning up animation...');
        
        containers.forEach(({ element }) => {
            element.style.transition = '';
            element.style.transform = '';
            element.style.opacity = '';
            element.style.position = '';
            element.style.zIndex = '';
            //element.style.outline = ''; // Remove debug border
        });
        
        // Update blocks with new data
        updateBlocksWithAnimation(newBlocks);
        updateNextBlockInfo();
        
        console.log('Animation cleanup complete');
    }, DURATION + 100);
}

/**
 * CSS Keyframes approach as alternative
 * @param {Array} newBlocks - Array of new block data
 */
function animateNextBlockToRightCSS(newBlocks) {
    console.log('Starting CSS keyframe animation...');
    
    // Create dynamic CSS keyframes
    const animationCSS = `
        <style id="block-animation-styles">
            @keyframes slideBlockRight {
                from { transform: translateX(0px); }
                to { transform: translateX(240px); }
            }
            
            @keyframes slideAndFadeRight {
                from { 
                    transform: translateX(0px); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(240px); 
                    opacity: 0; 
                }
            }
            
            .block-slide-right {
                animation: slideBlockRight 1s ease-in-out forwards !important;
                position: relative !important;
                z-index: 100 !important;
            }
            
            .block-slide-fade-right {
                animation: slideAndFadeRight 1s ease-in-out forwards !important;
                position: relative !important;
                z-index: 100 !important;
            }
        </style>
    `;
    
    // Add styles to head
    document.head.insertAdjacentHTML('beforeend', animationCSS);
    
    // Apply animations
    const nextContainer = document.querySelector('#next-block-section .block-container');
    if (nextContainer) {
        nextContainer.classList.add('block-slide-right');
    }
    
    for (let i = 0; i < 4; i++) {
        const blockElement = document.getElementById(`block-${i}`);
        if (blockElement) {
            const container = blockElement.closest('.block-container');
            if (container) {
                if (i === 3) {
                    container.classList.add('block-slide-fade-right');
                } else {
                    container.classList.add('block-slide-right');
                }
            }
        }
    }
    
    // Clean up after animation
    setTimeout(() => {
        // Remove animation classes
        document.querySelectorAll('.block-slide-right, .block-slide-fade-right').forEach(el => {
            el.classList.remove('block-slide-right', 'block-slide-fade-right');
        });
        
        // Remove styles
        const styleEl = document.getElementById('block-animation-styles');
        if (styleEl) styleEl.remove();
        
        // Update blocks
        updateBlocksWithAnimation(newBlocks);
        updateNextBlockInfo();
        
        console.log('CSS Animation complete');
    }, 1100);
}

/**
 * Test function for manual debugging
 */
function testBlockAnimation() {
    console.log('Testing block animation...');
    
    const testData = [
        { height: 999999, id: 'test', size: 1000000, minerReward: 15.5, transactionsCount: 150, timestamp: Date.now() },
        { height: 999998, id: 'test2', size: 900000, minerReward: 15.2, transactionsCount: 120, timestamp: Date.now() - 60000 }
    ];
    
    performBlockAnimation(testData);
}

// Make test function available globally for debugging
window.testBlockAnimation = testBlockAnimation;

/**
 * Calculate how long ago a block was mined
 * @param {number} timestamp - Block timestamp in milliseconds
 * @returns {string} - Human readable time ago string
 */
function calculateTimeAgo(timestamp) {
    const now = Date.now();
    const blockTime = timestamp; // Timestamp is already in milliseconds
    const diffInMinutes = Math.floor((now - blockTime) / (1000 * 60));
    
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

/**
 * Update block displays with animation data after block transition
 * @param {Array} blockLabels - Array of block data to display
 */
function updateBlocksWithAnimation(blockLabels) {
    blockLabels.forEach((block, i) => {
        if (i < 4) {
            // Update block height (just the number now)
            const heightElement = document.getElementById(`block-height-${i}`);
            if (heightElement) {
                heightElement.textContent = block.height;
            }

            // Update block height link
            const heightLinkElement = document.getElementById(`block-height-link-${i}`);
            if (heightLinkElement && block.id) {
                heightLinkElement.href = `https://sigmaspace.io/en/block/${block.id}`;
            }

            // Update block content with real data including timestamp
            const blockElement = document.getElementById(`block-${i}`);  
            if (blockElement) {
                // REMOVED: The problematic color override that was forcing purple
                // Let CSS handle the styling instead
                
                // Clear any animation styles to let CSS take over
                blockElement.style.animation = 'none';
                
                let timeAgoText = '';
                if (block.timestamp) {
                    timeAgoText = calculateTimeAgo(block.timestamp);
                }
                
                // Enhanced block display with better formatting
                blockElement.innerHTML = `
                    <div class="block-size">${(block.size / 1000000).toFixed(2)} MB</div>
                    <div class="block-reward">
                        <span class="reward-label">Total Reward</span>
                        <span class="reward-value">${block.minerReward.toFixed(3)} ERG</span>
                        ${block.totalFees && block.totalFees > 0 ? 
                            `<span class="fees-breakdown">${block.totalFees.toFixed(3)} fees</span>` : 
                            ''
                        }
                    </div>
                    <div class="block-tx-count">${block.transactionsCount.toLocaleString()} transactions</div>
                    ${timeAgoText ? `<div class="block-time">${timeAgoText}</div>` : ''}
                `;
            }

            // Update miner name and logo
            const minerElement = document.getElementById(`block-miner-${i}`);
            if (minerElement && block.minerInfo) {
                const minerName = block.minerInfo.name || 'Unknown';
                const minerLogo = block.minerInfo.logo;
                
                if (minerLogo) {
                    minerElement.innerHTML = `
                        <img src="${minerLogo}" alt="${minerName}" class="miner-logo" onerror="this.style.display='none'">
                        <span>${minerName}</span>
                    `;
                } else {
                    minerElement.innerHTML = `<span>${minerName}</span>`;
                }
            }
        }
    });
}

/**
 * Update block displays without animation (for normal updates)
 * @param {Array} blockLabels - Array of block data to display
 */
function updateBlocksNormal(blockLabels) {
    blockLabels.forEach((block, i) => {
        if (i < 4) {
            console.log(`Block ${i} timestamp:`, block.timestamp); // Debug log
            
            // Update block height (just the number now)
            const heightElement = document.getElementById(`block-height-${i}`);
            if (heightElement) {
                heightElement.textContent = block.height;
            }

            // Update block height link
            const heightLinkElement = document.getElementById(`block-height-link-${i}`);
            if (heightLinkElement && block.id) {
                heightLinkElement.href = `https://sigmaspace.io/en/block/${block.id}`;
            }

            // Update block content with real data including timestamp
            const blockElement = document.getElementById(`block-${i}`);
            if (blockElement) {
                // REMOVED: The problematic color override that was forcing purple
                // Let CSS handle the styling instead
                
                let timeAgoText = '';
                if (block.timestamp) {
                    timeAgoText = calculateTimeAgo(block.timestamp);
                } else {
                    console.log(`No timestamp for block ${i}`); // Debug log
                }

                // Enhanced block display with better formatting
                blockElement.innerHTML = `
                    <div class="block-size">${(block.size / 1000000).toFixed(2)} MB</div>
                    <div class="block-reward">
                        <span class="reward-label">Total Reward</span>
                        <span class="reward-value">${block.minerReward.toFixed(3)} ERG</span>
                        ${block.totalFees && block.totalFees > 0 ? 
                            `<span class="fees-breakdown">${block.totalFees.toFixed(3)} fees</span>` : 
                            ''
                        }
                    </div>
                    <div class="block-tx-count">${block.transactionsCount.toLocaleString()} transactions</div>
                    ${timeAgoText ? `<div class="block-time">${timeAgoText}</div>` : ''}
                `;
            }

            // Update miner name and logo
            const minerElement = document.getElementById(`block-miner-${i}`);
            if (minerElement && block.minerInfo) {
                const minerName = block.minerInfo.name || 'Unknown';
                const minerLogo = block.minerInfo.logo;
                
                if (minerLogo) {
                    minerElement.innerHTML = `
                        <img src="${minerLogo}" alt="${minerName}" class="miner-logo" onerror="this.style.display='none'">
                        <span>${minerName}</span>
                    `;
                } else {
                    minerElement.innerHTML = `<span>${minerName}</span>`;
                }
            }
        }
    });
}

// Add this to the updateBlocksNormal function in blocks.js
function updateBlocksNormal(blockLabels) {
    blockLabels.forEach((block, i) => {
        if (i < 4) {
            // ... existing code ...
            
            // NEW: Check for new block and clear dummies
            if (i === 0 && typeof checkForNewBlockAndClearDummies === 'function') {
                checkForNewBlockAndClearDummies(block.height);
            }
        }
    });
}

// Debug logging
console.log('Blocks.js loaded with debugging enabled');
console.log('Available debug functions:');
console.log('- window.testBlockAnimation() - Test the block animation manually');
console.log('- Check browser console for animation debugging info');