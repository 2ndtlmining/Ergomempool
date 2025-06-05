// Transaction.js - Enhanced with responsive sizing for mobile
export class Transaction {
    constructor(transactionData, walletAddress = null) {
        this.id = transactionData.id;
        this.sizeBytes = transactionData.size || 1000;
        this.value = transactionData.value || 0;
        this.usdValue = transactionData.usd_value || 0;
        this.inputs = transactionData.inputs || [];
        this.outputs = transactionData.outputs || [];
        this.isDummy = transactionData.isDummy || false;
        
        // Visual properties
        this.element = null;
        this.placed = false;
        this.moving = false;
        
        // Wallet detection
        this.isWallet = this.checkWalletTransaction(walletAddress);
        
        console.log(`📦 Created transaction: ${this.id} (${this.formatSize(this.sizeBytes)})`);
    }
    
    checkWalletTransaction(walletAddress) {
        if (!walletAddress) return false;
        
        const inputMatch = this.inputs.some(input => input.address === walletAddress);
        const outputMatch = this.outputs.some(output => output.address === walletAddress);
        
        return inputMatch || outputMatch;
    }
    
    createElement(container, maxValue = 100, containerWidth = 800) {
        if (this.element) {
            console.warn(`⚠️ Element already exists for transaction ${this.id}`);
            return this.element;
        }
        
        // Responsive size calculation based on container width
        const visualSize = this.calculateResponsiveSize(containerWidth);
        
        // Create DOM element
        this.element = document.createElement('div');
        this.element.className = 'transaction-square';
        
        // Get consistent color (same as MempoolGrid)
        const color = this.getColorByValue(this.value, maxValue);
        
        // Set basic styling - NO TEXT CONTENT, CONSISTENT COLORS
        this.element.style.cssText = `
            position: absolute;
            width: ${visualSize}px;
            height: ${visualSize}px;
            background-color: ${color};
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 5;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        `;
        
        // Add transaction type indicator (visual only, no text)
        this.addTypeIndicator();
        
        // Add wallet highlighting
        if (this.isWallet) {
            this.element.classList.add('wallet-transaction');
            this.element.style.border = '3px solid #f39c12';
            this.element.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.9)';
            this.element.style.zIndex = '10';
        }
        
        // Add event listeners
        this.addEventListeners();
        
        // Add to container
        if (container) {
            container.appendChild(this.element);
        }
        
        console.log(`✨ Created DOM element for transaction ${this.id} (${visualSize}px)`);
        return this.element;
    }
    
    // Responsive size calculation based on container width
    calculateResponsiveSize(containerWidth) {
        let minSize, maxSize;
        
        if (containerWidth <= 480) {
            // Mobile phones - smaller sizes
            minSize = 6;
            maxSize = 25;
        } else if (containerWidth <= 768) {
            // Tablets - medium sizes
            minSize = 7;
            maxSize = 35;
        } else {
            // Desktop - original sizes
            minSize = 8;
            maxSize = 50;
        }
        
        const normalizedSize = Math.min(this.sizeBytes / 20000, 1);
        return Math.round(minSize + (maxSize - minSize) * Math.sqrt(normalizedSize));
    }
    
    // Consistent color function matching MempoolGrid
    getColorByValue(value, maxValue) {
        // Use the same valueColors as MempoolGrid
        const valueColors = [
            '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b'
        ];
        
        const normalized = Math.min(value / maxValue, 1);
        const index = Math.floor(normalized * (valueColors.length - 1));
        return valueColors[index];
    }
    
    addTypeIndicator() {
        // NO TEXT CONTENT - just visual styling based on type
        
        // Add data attributes for special transaction types
        if (this.isDummy) {
            this.element.setAttribute('data-type', 'dummy');
            this.element.style.border = '2px solid #e91e63';
            this.element.style.background = 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)';
        }
        
        // Check for special transaction patterns (you can extend this)
        if (this.id && this.id.includes('test')) {
            this.element.setAttribute('data-type', 'test');
            this.element.style.border = '2px solid #f39c12';
        }
    }
    
    addEventListeners() {
        if (!this.element) return;
        
        // Click to view transaction
        this.element.addEventListener('click', () => {
            if (this.id && !this.id.startsWith('dummy_')) {
                window.open(`https://sigmaspace.io/en/transaction/${this.id}`, '_blank');
            }
        });
        
        // Hover effects - CONSISTENT with MempoolGrid
        this.element.addEventListener('mouseenter', (e) => {
            if (!this.moving) {
                this.element.style.transform = 'scale(1.15)';
                this.element.style.zIndex = '100';
                this.element.style.border = '2px solid var(--primary-orange)';
                this.element.style.boxShadow = '0 4px 15px var(--glow-orange)';
                
                // Show tooltip on hover (CONSISTENT with MempoolGrid)
                this.showTooltip(e);
            }
        });
        
        this.element.addEventListener('mouseleave', () => {
            if (!this.moving) {
                this.element.style.transform = 'scale(1)';
                this.element.style.zIndex = this.isWallet ? '10' : '5';
                
                // Restore original border
                if (this.isWallet) {
                    this.element.style.border = '3px solid #f39c12';
                    this.element.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.9)';
                } else if (this.isDummy) {
                    this.element.style.border = '2px solid #e91e63';
                    this.element.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
                } else {
                    this.element.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                    this.element.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
                }
                
                // Hide tooltip
                this.hideTooltip();
            }
        });
        
        // Touch events for mobile
        this.element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.showTooltip(e.touches[0]);
        }, { passive: false });
        
        this.element.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.hideTooltip();
            // Trigger click after a short delay
            setTimeout(() => {
                if (this.id && !this.id.startsWith('dummy_')) {
                    window.open(`https://sigmaspace.io/en/transaction/${this.id}`, '_blank');
                }
            }, 100);
        }, { passive: false });
    }
    
    // CONSISTENT tooltip matching MempoolGrid exactly
    showTooltip(event) {
        // Remove any existing tooltip
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'transaction-tooltip';  // Same class as MempoolGrid
        
        // Check for wallet transaction
        const isWallet = this.isWallet;
        
        // Check for transaction type (matching MempoolGrid logic)
        const isDonation = this.checkIfDonation();
        const isTest = this.checkIfTest();
        
        // Build tooltip content exactly like MempoolGrid
        let tooltipContent = '';
        
        if (isWallet) {
            tooltipContent += '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>';
        }
        
        if (isDonation) {
            tooltipContent += '<div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>';
        } else if (isTest) {
            tooltipContent += '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>';
        }
        
        tooltipContent += `<strong>Transaction</strong><br>`;
        tooltipContent += `ID: ${this.shortenTransactionId(this.id)}<br>`;
        tooltipContent += `Size: ${this.sizeBytes || 'N/A'} bytes<br>`;
        tooltipContent += `Value: ${(this.value || 0).toFixed(4)} ERG<br>`;
        tooltipContent += `Value: $${(this.usdValue || 0).toFixed(2)} USD`;
        
        tooltip.innerHTML = tooltipContent;
        
        // Style the tooltip exactly like MempoolGrid
        tooltip.style.cssText = `
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
        `;
        
        // Position the tooltip
        const x = event.clientX || event.pageX;
        const y = event.clientY || event.pageY;
        
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y - 10) + 'px';
        
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }
    
    hideTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    checkIfDonation() {
        // Check if any output goes to donation address
        const donationAddresses = ['9hF8coEmr6Mnfh3gexuwnnU816kbW8qrVBoUraJC5Zb79T9DRnx'];
        
        if (this.outputs && this.outputs.length > 0) {
            return this.outputs.some(output => 
                output.address && donationAddresses.includes(output.address)
            );
        }
        
        return false;
    }
    
    checkIfTest() {
        return this.id && (this.id.includes('test') || this.id.startsWith('test_'));
    }
    
    shortenTransactionId(id, startChars = 8, endChars = 8) {
        if (!id || id.length <= startChars + endChars + 3) {
            return id;
        }
        return `${id.substring(0, startChars)}...${id.substring(id.length - endChars)}`;
    }
    
    animateToPosition(x, y, delay = 0) {
        if (!this.element) {
            console.warn(`⚠️ Cannot animate transaction ${this.id} - no element`);
            return;
        }
        
        this.moving = true;
        
        setTimeout(() => {
            // Set initial position if not set (animate from top for bottom-up packing)
            if (this.element.style.left === '' && this.element.style.top === '') {
                this.element.style.left = x + 'px';
                this.element.style.top = '-50px'; // Start above container
                this.element.style.opacity = '0';
                this.element.style.transform = 'scale(0.5) translateY(-20px)';
            }
            
            // Add moving class for visual feedback
            this.element.classList.add('moving');
            
            // Animate to position with smooth easing
            this.element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.element.style.left = x + 'px';
            this.element.style.top = y + 'px';
            this.element.style.opacity = '1';
            this.element.style.transform = 'scale(1) translateY(0)';
            
            // Remove moving class after animation
            setTimeout(() => {
                if (this.element) {
                    this.element.classList.remove('moving');
                    this.element.style.transition = 'all 0.3s ease';
                    this.moving = false;
                }
            }, 800);
            
        }, delay);
        
        console.log(`🎬 Animating transaction ${this.id} to (${x}, ${y}) with ${delay}ms delay`);
    }
    
    formatSize(bytes) {
        if (bytes < 1024) return bytes + 'B';
        if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + 'KB';
        return Math.round(bytes / (1024 * 1024)) + 'MB';
    }
    
    formatId(id) {
        if (!id) return 'N/A';
        if (id.length <= 16) return id;
        return id.substring(0, 8) + '...' + id.substring(id.length - 8);
    }
    
    // ENHANCED DESTROY METHOD
    destroy() {
        console.log(`🗑️ Destroying transaction: ${this.id}`);
        
        // Hide tooltip first
        this.hideTooltip();
        
        // Remove DOM element with proper cleanup
        if (this.element) {
            // Remove event listeners to prevent memory leaks
            this.element.replaceWith(this.element.cloneNode(false));
            
            // Remove from DOM if still attached
            if (this.element.parentNode) {
                this.element.parentNode.removeChild(this.element);
                console.log(`📤 Removed DOM element for transaction ${this.id}`);
            }
            
            // Clear element reference
            this.element = null;
        }
        
        // Reset state
        this.placed = false;
        this.moving = false;
        
        console.log(`✅ Transaction ${this.id} destroyed successfully`);
    }
    
    // Utility method to check if element is still in DOM
    isInDOM() {
        return this.element && document.contains(this.element);
    }
    
    // Update wallet status (useful when wallet connects/disconnects)
    updateWalletStatus(walletAddress) {
        const wasWallet = this.isWallet;
        this.isWallet = this.checkWalletTransaction(walletAddress);
        
        if (this.element && wasWallet !== this.isWallet) {
            if (this.isWallet) {
                this.element.classList.add('wallet-transaction');
                this.element.style.border = '3px solid #f39c12';
                this.element.style.boxShadow = '0 0 15px rgba(243, 156, 18, 0.9)';
                this.element.style.zIndex = '10';
            } else {
                this.element.classList.remove('wallet-transaction');
                this.element.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                this.element.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
                this.element.style.zIndex = '5';
            }
        }
    }
}