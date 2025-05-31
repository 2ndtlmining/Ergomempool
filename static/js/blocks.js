// blocks.js - Block display, animation, and update functions

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
    // Animate next block moving right (simplified to one direction)
    animateNextBlockToRight(newBlocks);
}

/**
 * Animate the next block transitioning to the last 4 blocks section
 * @param {Array} newBlocks - Array of new block data
 */
function animateNextBlockToRight(newBlocks) {
    const nextBlock = document.getElementById('next-block');
    const nextBlockContainer = nextBlock.parentElement;
    
    // Get all Last 4 Block containers
    const block0Container = document.getElementById('block-0').parentElement;
    const block1Container = document.getElementById('block-1').parentElement;
    const block2Container = document.getElementById('block-2').parentElement;
    const block3Container = document.getElementById('block-3').parentElement;
    
    // Step 1: Animate next block moving right
    nextBlockContainer.style.transform = 'translateX(400px)';
    nextBlockContainer.style.transition = 'all 0.8s ease';
    
    // Step 2: Shift all Last 4 Blocks to the right
    block0Container.style.transform = 'translateX(220px)'; // Move right to make room
    block0Container.style.transition = 'all 0.8s ease';
    
    block1Container.style.transform = 'translateX(220px)';
    block1Container.style.transition = 'all 0.8s ease';
    
    block2Container.style.transform = 'translateX(220px)';
    block2Container.style.transition = 'all 0.8s ease';
    
    // Step 3: Last block (position 3) moves off screen
    block3Container.style.transform = 'translateX(440px)';
    block3Container.style.opacity = '0';
    block3Container.style.transition = 'all 0.8s ease';
    
    // Step 4: After animation, update data
    setTimeout(() => {
        updateBlocksWithAnimation(newBlocks);
        resetAllBlocks([nextBlockContainer, block0Container, block1Container, block2Container, block3Container]);
    }, 800);
}

/**
 * Reset all block container transforms and update displays
 * @param {Array} containers - Array of DOM containers to reset
 */
function resetAllBlocks(containers) {
    // Reset transforms for all containers
    containers.forEach(container => {
        container.style.transform = '';
        container.style.transition = '';
        container.style.opacity = '';
    });
    
    // Update next block with new mempool data
    updateNextBlockInfo();
    
    // Add fade-in animation to new next block
    const nextBlockContainer = document.getElementById('next-block').parentElement;
    nextBlockContainer.classList.add('block-fade-in');
    setTimeout(() => {
        nextBlockContainer.classList.remove('block-fade-in');
    }, 600);
}

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
                // Change color from orange to purple when next block becomes mined
                blockElement.style.background = 'linear-gradient(135deg, #8e44ad, #9b59b6)';
                blockElement.style.border = '2px solid #7d3c98';
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