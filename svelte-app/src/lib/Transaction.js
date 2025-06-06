// Enhanced Transaction.js - SERVER-SAFE VERSION
// Fixed potential server-side rendering issues

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
        this.confirming = false;
        this.departing = false;
        
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
        // SERVER-SAFE: Check if we're in browser environment
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            console.warn('⚠️ Cannot create DOM element in server environment');
            return null;
        }
        
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
        
        // Set basic styling - PRESERVING EXISTING STYLES
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
        
        // Add transaction type indicator
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
        
        // Add to container if provided
        if (container && container.appendChild) {
            container.appendChild(this.element);
        }
        
        console.log(`✨ Created DOM element for transaction ${this.id} (${visualSize}px)`);
        return this.element;
    }
    
    // Responsive size calculation
    calculateResponsiveSize(containerWidth) {
        let minSize, maxSize;
        
        if (containerWidth <= 480) {
            minSize = 6;
            maxSize = 25;
        } else if (containerWidth <= 768) {
            minSize = 7;
            maxSize = 35;
        } else {
            minSize = 8;
            maxSize = 50;
        }
        
        const normalizedSize = Math.min(this.sizeBytes / 20000, 1);
        return Math.round(minSize + (maxSize - minSize) * Math.sqrt(normalizedSize));
    }
    
    // Color function
    getColorByValue(value, maxValue) {
        const valueColors = [
            '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b'
        ];
        
        const normalized = Math.min(value / maxValue, 1);
        const index = Math.floor(normalized * (valueColors.length - 1));
        return valueColors[index];
    }
    
    // Transaction type indicators
    addTypeIndicator() {
        if (!this.element) return;
        
        if (this.isDummy) {
            this.element.setAttribute('data-type', 'dummy');
            this.element.style.border = '2px solid #e91e63';
            this.element.style.background = 'linear-gradient(135deg, #e91e63 0%, #ad1457 100%)';
        }
        
        if (this.id && this.id.includes('test')) {
            this.element.setAttribute('data-type', 'test');
            this.element.style.border = '2px solid #f39c12';
        }
    }
    
    // Event listeners - SERVER-SAFE
    addEventListeners() {
        if (!this.element || typeof window === 'undefined') return;
        
        // Click to view transaction
        this.element.addEventListener('click', () => {
            if (this.id && !this.id.startsWith('dummy_')) {
                window.open(`https://sigmaspace.io/en/transaction/${this.id}`, '_blank');
            }
        });
        
        // Hover effects
        this.element.addEventListener('mouseenter', (e) => {
            if (!this.moving && !this.confirming && !this.departing) {
                this.element.style.zIndex = '100';
                this.element.style.border = '2px solid var(--primary-orange)';
                this.element.style.boxShadow = '0 4px 15px var(--glow-orange)';
                this.showTooltip(e);
            }
        });
        
        this.element.addEventListener('mouseleave', () => {
            if (!this.moving && !this.confirming && !this.departing) {
                this.element.style.transform = 'scale(1)';
                this.element.style.zIndex = this.isWallet ? '10' : '5';
                this.restoreOriginalStyling();
                this.hideTooltip();
            }
        });
        
        // Touch events - SERVER-SAFE
        this.element.addEventListener('touchstart', (e) => {
            if (e.preventDefault) e.preventDefault();
            if (e.touches && e.touches[0]) {
                this.showTooltip(e.touches[0]);
            }
        }, { passive: false });
        
        this.element.addEventListener('touchend', (e) => {
            if (e.preventDefault) e.preventDefault();
            this.hideTooltip();
            setTimeout(() => {
                if (this.id && !this.id.startsWith('dummy_')) {
                    window.open(`https://sigmaspace.io/en/transaction/${this.id}`, '_blank');
                }
            }, 100);
        }, { passive: false });
    }
    
    // Tooltip functionality - SERVER-SAFE
    showTooltip(event) {
        if (typeof document === 'undefined') return;
        
        this.hideTooltip();
        
        const tooltip = document.createElement('div');
        tooltip.className = 'transaction-tooltip';
        
        const isWallet = this.isWallet;
        const isDonation = this.checkIfDonation();
        const isTest = this.checkIfTest();
        
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
        
        const x = event.clientX || event.pageX || 0;
        const y = event.clientY || event.pageY || 0;
        
        tooltip.style.left = (x + 10) + 'px';
        tooltip.style.top = (y - 10) + 'px';
        
        document.body.appendChild(tooltip);
        this.currentTooltip = tooltip;
    }
    
    hideTooltip() {
        if (this.currentTooltip && this.currentTooltip.remove) {
            this.currentTooltip.remove();
            this.currentTooltip = null;
        }
    }
    
    // Helper methods
    checkIfDonation() {
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
    
    // Animation methods with SERVER-SAFE checks
    animateArrival(finalX, finalY, containerWidth, delay = 0) {
        if (!this.element || typeof window === 'undefined') {
            console.warn(`⚠️ Cannot animate arrival for ${this.id} - no element or not in browser`);
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            this.moving = true;
            
            setTimeout(() => {
                this.element.style.left = '-60px';
                this.element.style.top = Math.random() * (containerWidth * 0.4) + 'px';
                this.element.style.opacity = '0';
                this.element.style.transform = 'scale(0.5) rotate(10deg)';
                this.element.style.filter = 'brightness(1.5)';
                this.element.style.border = '2px solid #3498db';
                this.element.style.boxShadow = '0 0 15px rgba(52, 152, 219, 0.8)';
                
                setTimeout(() => {
                    this.element.style.transition = 'all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    this.element.style.left = finalX + 'px';
                    this.element.style.top = finalY + 'px';
                    this.element.style.opacity = '1';
                    this.element.style.transform = 'scale(1) rotate(0deg)';
                    this.element.style.filter = 'brightness(1)';
                    
                    setTimeout(() => {
                        if (this.element) {
                            this.restoreOriginalStyling();
                            this.element.style.transition = 'all 0.3s ease';
                            this.moving = false;
                            this.placed = true;
                            resolve();
                        }
                    }, 1200);
                }, 50);
                
                console.log(`🌐 Transaction ${this.id} arriving from left to (${finalX}, ${finalY})`);
            }, delay);
        });
    }
    
    animateToPosition(x, y, delay = 0) {
        if (!this.element || typeof window === 'undefined') {
            console.warn(`⚠️ Cannot animate transaction ${this.id} - no element or not in browser`);
            return Promise.resolve();
        }
        
        return new Promise(resolve => {
            this.moving = true;
            
            setTimeout(() => {
                if (this.element.style.left === '' || this.element.style.left === '-60px') {
                    if (!this.placed) {
                        this.element.style.left = Math.random() * 200 + 'px';
                        this.element.style.top = Math.random() * 200 + 'px';
                        this.element.style.opacity = '0.7';
                        this.element.style.transform = 'scale(0.9)';
                    }
                }
                
                this.element.classList.add('moving');
                this.element.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                this.element.style.left = x + 'px';
                this.element.style.top = y + 'px';
                this.element.style.opacity = '1';
                this.element.style.transform = 'scale(1)';
                
                setTimeout(() => {
                    if (this.element) {
                        this.element.classList.remove('moving');
                        this.element.style.transition = 'all 0.3s ease';
                        this.moving = false;
                        this.placed = true;
                        resolve();
                    }
                }, 800);
                
            }, delay);
        });
    }
    
    // Additional animation methods with SERVER-SAFE checks
    animateMiningConfirmation() {
        if (!this.element || this.confirming || typeof document === 'undefined') return Promise.resolve();
        
        return new Promise(resolve => {
            this.confirming = true;
            
            this.element.style.transition = 'all 0.5s ease-in-out';
            this.element.style.border = '3px solid #27ae60';
            this.element.style.boxShadow = '0 0 20px rgba(39, 174, 96, 0.9)';
            this.element.style.backgroundColor = '#2ecc71';
            this.element.style.transform = 'scale(1.15)';
            this.element.style.zIndex = '50';
            
            const icon = document.createElement('div');
            icon.innerHTML = '⛏️';
            icon.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                font-size: 16px;
                z-index: 60;
                animation: miningIconSpin 0.8s ease-in-out;
                text-shadow: 0 0 5px rgba(39, 174, 96, 0.8);
            `;
            this.element.appendChild(icon);
            
            setTimeout(() => {
                this.confirming = false;
                resolve();
            }, 800);
        });
    }
    
    animateMiningDeparture() {
        if (!this.element || this.departing) return Promise.resolve();
        
        return new Promise(resolve => {
            this.departing = true;
            
            this.element.style.transition = 'all 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
            this.element.style.left = '700px';
            this.element.style.top = (parseInt(this.element.style.top) - 100) + 'px';
            this.element.style.transform = 'scale(0.2) rotate(360deg)';
            this.element.style.opacity = '0';
            this.element.style.filter = 'brightness(2)';
            
            setTimeout(() => {
                resolve();
            }, 1500);
        });
    }
    
    animateInstantRemoval() {
        if (!this.element) return Promise.resolve();
        
        return new Promise(resolve => {
            this.element.style.transition = 'all 0.3s ease-out';
            this.element.style.transform = 'scale(0.1)';
            this.element.style.opacity = '0';
            this.element.style.filter = 'blur(2px)';
            
            setTimeout(() => {
                resolve();
            }, 300);
        });
    }
    
    animateSettling(delay = 0) {
        if (!this.element || this.moving) return Promise.resolve();
        
        return new Promise(resolve => {
            setTimeout(() => {
                const randomX = (Math.random() - 0.5) * 6;
                const randomY = (Math.random() - 0.5) * 6;
                
                this.element.style.transition = 'transform 0.4s ease-out';
                this.element.style.transform = `translate(${randomX}px, ${randomY}px) scale(0.95)`;
                
                setTimeout(() => {
                    this.element.style.transition = 'transform 1s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
                    this.element.style.transform = 'translate(0px, 0px) scale(1)';
                    
                    setTimeout(() => {
                        this.element.style.transition = 'all 0.3s ease';
                        resolve();
                    }, 1000);
                }, 400);
                
            }, delay);
        });
    }
    
    // Helper: Restore original styling
    restoreOriginalStyling() {
        if (!this.element) return;
        
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
        
        this.element.style.filter = 'brightness(1)';
    }
    
    // Utility methods
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
    
    // Enhanced destroy method with SERVER-SAFE cleanup
    destroy() {
        console.log(`🗑️ Destroying transaction: ${this.id}`);
        
        this.hideTooltip();
        
        if (this.element) {
            // SERVER-SAFE: Check if methods exist before calling
            if (this.element.replaceWith && typeof this.element.replaceWith === 'function') {
                try {
                    this.element.replaceWith(this.element.cloneNode(false));
                } catch (error) {
                    console.warn('⚠️ Could not replace element:', error);
                }
            }
            
            if (this.element.parentNode && this.element.parentNode.removeChild) {
                try {
                    this.element.parentNode.removeChild(this.element);
                    console.log(`📤 Removed DOM element for transaction ${this.id}`);
                } catch (error) {
                    console.warn('⚠️ Could not remove element from DOM:', error);
                }
            }
            
            this.element = null;
        }
        
        this.placed = false;
        this.moving = false;
        this.confirming = false;
        this.departing = false;
        
        console.log(`✅ Transaction ${this.id} destroyed successfully`);
    }
    
    // Utility methods
    isInDOM() {
        return this.element && typeof document !== 'undefined' && document.contains && document.contains(this.element);
    }
    
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

// SERVER-SAFE: Add required CSS animations only in browser environment
if (typeof document !== 'undefined' && !document.querySelector('#transaction-animations')) {
    const style = document.createElement('style');
    style.id = 'transaction-animations';
    style.textContent = `
        @keyframes miningIconSpin {
            0% { transform: scale(0) rotate(0deg); opacity: 0; }
            50% { transform: scale(1.3) rotate(180deg); opacity: 1; }
            100% { transform: scale(1) rotate(360deg); opacity: 1; }
        }
        
        .transaction-square.moving {
            z-index: 50 !important;
            border-color: #f39c12 !important;
            filter: brightness(1.1);
        }
        
        .ball-mining-fade {
            opacity: var(--mining-opacity, 1);
            transform: scale(var(--mining-scale, 1));
        }
        
        .ball-entry-start {
            opacity: 0;
            transform: scale(0.3) rotate(10deg);
            filter: brightness(1.5);
        }
        
        .ball-entry-end {
            opacity: 1;
            transform: scale(1) rotate(0deg);
            filter: brightness(1);
            transition: all 0.6s ease;
        }
        
        .ball-settling {
            filter: brightness(0.9);
            transition: filter 0.5s ease;
        }
        
        .transaction-removal {
            transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
            transform: scale(1.8);
            opacity: 0;
            filter: blur(4px);
        }
    `;
    document.head.appendChild(style);
}