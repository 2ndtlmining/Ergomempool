// Transaction.js - Enhanced with value-based colors and proportional sizing
import { isWalletTransaction } from './wallet.js';
import { identifyTransactionType } from './transactionTypes.js';

// Color palettes from stores.js for consistency
const valueColors = [
    '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#e74c3c', '#c0392b'
];

export class Transaction {
    constructor(transactionData, walletAddress = null, maxValue = 100) {
        // Core transaction data
        this.id = transactionData.id;
        this.sizeBytes = transactionData.size || 1000;
        this.sizeKB = this.sizeBytes / 1024;
        this.value = transactionData.value || 0;
        this.usd_value = transactionData.usd_value || 0;
        this.inputs = transactionData.inputs || [];
        this.outputs = transactionData.outputs || [];
        
        // Store maxValue for color calculation
        this.maxValue = maxValue;
        
        // Visual properties - PROPORTIONAL to actual bytes for 2MB block
        this.calculateProportionalDimensions();
        this.color = this.getColorByValue(); // Changed to value-based
        this.sizeCategory = this.getSizeCategory();
        
        // Position (will be set by packing algorithm)
        this.x = 0;
        this.y = 0;
        this.placed = false;
        
        // Wallet and type detection
        this.isWallet = walletAddress ? isWalletTransaction(transactionData, walletAddress) : false;
        this.transactionType = identifyTransactionType(transactionData);
        
        // DOM element reference
        this.element = null;
    }
    
    calculateProportionalDimensions() {
        // PROPORTIONAL SIZING FOR 2MB BLOCK
        // Container: 800×600 = 480,000 pixels
        // Block capacity: 2MB = 2,097,152 bytes
        // Ratio: ~4.37 bytes per pixel
        
        const CONTAINER_AREA = 800 * 600; // Total container pixels
        const BLOCK_CAPACITY_BYTES = 2 * 1024 * 1024; // 2MB in bytes
        const USABLE_AREA = CONTAINER_AREA * 0.85; // Account for margins and UI elements
        
        // Calculate pixels per byte
        const pixelsPerByte = USABLE_AREA / BLOCK_CAPACITY_BYTES;
        
        // Calculate area this transaction should occupy
        const transactionPixelArea = this.sizeBytes * pixelsPerByte;
        
        // Convert area to square dimensions (with some aspect ratio variation)
        const aspectRatio = 0.8 + (Math.random() * 0.4); // 0.8 to 1.2 aspect ratio
        this.width = Math.sqrt(transactionPixelArea / aspectRatio);
        this.height = Math.sqrt(transactionPixelArea * aspectRatio);
        
        // Apply minimum and maximum constraints for visibility
        this.width = Math.max(6, Math.min(120, this.width));
        this.height = Math.max(4, Math.min(90, this.height));
        
        // Round to avoid subpixel rendering
        this.width = Math.round(this.width);
        this.height = Math.round(this.height);
        
        console.log(`📏 TX ${this.id.substring(0,8)}: ${this.sizeBytes}B → ${this.width}×${this.height}px (${(this.width * this.height).toFixed(0)} pixels)`);
    }
    
    getColorByValue() {
        // VALUE-BASED COLOR CODING (consistent with grid view)
        if (this.maxValue <= 0) {
            return valueColors[0]; // Default to first color if no max value
        }
        
        const normalized = Math.min(this.value / this.maxValue, 1);
        const index = Math.floor(normalized * (valueColors.length - 1));
        return valueColors[index];
    }
    
    getSizeCategory() {
        if (this.sizeKB < 1) return 'tiny';
        if (this.sizeKB < 3) return 'small';
        if (this.sizeKB < 15) return 'medium';
        return 'large';
    }
    
    createElement(container) {
        const element = document.createElement('div');
        element.className = `transaction-square ${this.sizeCategory}`;
        
        // Apply wallet transaction styling
        if (this.isWallet) {
            element.classList.add('wallet-transaction');
        }
        
        // Apply transaction type styling
        if (this.transactionType.color) {
            if (this.transactionType.icon === '💖') {
                element.setAttribute('data-type', 'donation');
            } else if (this.transactionType.icon === '🧪') {
                element.setAttribute('data-type', 'test');
            }
        }
        
        element.style.cssText = `
            position: absolute;
            width: ${this.width}px;
            height: ${this.height}px;
            background-color: ${this.color};
            left: ${this.x}px;
            top: ${this.y}px;
            border: 2px solid rgba(255, 255, 255, 0.4);
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 
                inset -2px -2px 4px rgba(0,0,0,0.4),
                inset 2px 2px 4px rgba(255,255,255,0.1),
                0 3px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: ${this.getFontSize()}px;
            font-weight: ${this.getFontWeight()};
            color: rgba(255,255,255,0.9);
            text-shadow: 0 1px 2px rgba(0,0,0,0.8);
            overflow: hidden;
            opacity: 0;
            transform: scale(0.3) translateY(-30px);
        `;
        
        // No size labels - clean visual appearance
        
        // Add transaction type icon for special transactions
        if (this.transactionType.icon && this.width > 15) {
            const icon = document.createElement('span');
            icon.style.cssText = `
                position: absolute;
                top: 2px;
                right: 2px;
                font-size: ${Math.min(this.width * 0.3, 12)}px;
                z-index: 10;
            `;
            icon.textContent = this.transactionType.icon;
            element.appendChild(icon);
        }
        
        // Event handlers
        element.addEventListener('click', () => this.handleClick());
        element.addEventListener('mouseenter', (e) => this.handleMouseEnter(e));
        element.addEventListener('mouseleave', () => this.handleMouseLeave());
        
        container.appendChild(element);
        this.element = element;
        
        // Trigger entrance animation
        setTimeout(() => {
            element.style.opacity = '1';
            element.style.transform = 'scale(1) translateY(0)';
        }, 50);
        
        return element;
    }
    
    getFontSize() {
        if (this.width > 50) return 12;
        if (this.width > 30) return 10;
        if (this.width > 20) return 9;
        return 8;
    }
    
    getFontWeight() {
        if (this.width > 40) return '900';
        if (this.width > 25) return '700';
        return '500';
    }
    
    animateToPosition(x, y, delay = 0) {
        this.x = x;
        this.y = y;
        
        setTimeout(() => {
            if (this.element) {
                this.element.style.left = x + 'px';
                this.element.style.top = y + 'px';
                this.element.style.transform = 'scale(1) translateY(0)';
                
                // Add temporary moving class for visual feedback
                this.element.classList.add('moving');
                setTimeout(() => {
                    if (this.element) {
                        this.element.classList.remove('moving');
                    }
                }, 500);
            }
        }, delay);
    }
    
    handleClick() {
        // Navigate to transaction explorer
        if (this.id) {
            window.open(`https://sigmaspace.io/en/transaction/${this.id}`, '_blank');
        }
        
        // Visual feedback
        if (this.element) {
            this.element.style.transform = 'scale(0.95)';
            setTimeout(() => {
                if (this.element) {
                    this.element.style.transform = 'scale(1)';
                }
            }, 150);
        }
        
        // Log transaction details
        console.log(`Transaction ${this.id}:`, {
            size: `${this.sizeBytes} bytes (${this.sizeKB.toFixed(2)}KB)`,
            value: `${this.value.toFixed(4)} ERG`,
            usd_value: `${this.usd_value.toFixed(2)}`,
            isWallet: this.isWallet,
            type: this.transactionType.icon || 'regular'
        });
    }
    
    handleMouseEnter(e) {
        if (this.element) {
            this.element.style.transform = 'scale(1.05)';
            this.element.style.zIndex = '100';
            this.element.style.borderColor = '#f39c12';
            this.element.style.boxShadow = '0 6px 20px rgba(243, 156, 18, 0.5)';
        }
        
        // Trigger tooltip
        this.showTooltip(e);
    }
    
    handleMouseLeave() {
        if (this.element) {
            this.element.style.transform = 'scale(1)';
            this.element.style.zIndex = '5';
            this.element.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            this.element.style.boxShadow = `
                inset -2px -2px 4px rgba(0,0,0,0.4),
                inset 2px 2px 4px rgba(255,255,255,0.1),
                0 3px 6px rgba(0,0,0,0.3)
            `;
        }
        
        this.hideTooltip();
    }
    
    showTooltip(e) {
        // Create tooltip element if it doesn't exist
        if (!document.getElementById('transaction-tooltip')) {
            const tooltip = document.createElement('div');
            tooltip.id = 'transaction-tooltip';
            tooltip.style.cssText = `
                position: absolute;
                background: linear-gradient(135deg, var(--darker-bg, #0f1419) 0%, var(--dark-bg, #1a2332) 100%);
                border: 2px solid var(--primary-orange, #e67e22);
                padding: 12px;
                border-radius: 8px;
                font-size: 12px;
                color: var(--text-light, #ecf0f1);
                pointer-events: none;
                z-index: 1000;
                white-space: nowrap;
                display: none;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
                backdrop-filter: blur(10px);
                max-width: 300px;
                white-space: normal;
                line-height: 1.4;
            `;
            document.body.appendChild(tooltip);
        }
        
        const tooltip = document.getElementById('transaction-tooltip');
        
        tooltip.innerHTML = `
            ${this.isWallet ? '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🌟 Your Wallet Transaction</div>' : ''}
            ${this.transactionType.icon === '💖' ? '<div style="color: #e74c3c; font-weight: bold; margin-bottom: 4px;">💖 Donation Transaction</div>' : ''}
            ${this.transactionType.icon === '🧪' ? '<div style="color: #f39c12; font-weight: bold; margin-bottom: 4px;">🧪 Test Transaction</div>' : ''}
            <strong>Transaction</strong><br>
            ID: ${this.id.substring(0, 8)}...${this.id.substring(this.id.length - 8)}<br>
            Size: ${this.sizeBytes} bytes (${this.sizeKB.toFixed(2)} KB)<br>
            Value: ${this.value.toFixed(4)} ERG<br>
            Value: ${this.usd_value.toFixed(2)} USD
        `;
        
        tooltip.style.left = (e.pageX + 10) + 'px';
        tooltip.style.top = (e.pageY - 10) + 'px';
        tooltip.style.display = 'block';
    }
    
    hideTooltip() {
        const tooltip = document.getElementById('transaction-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }
    
    destroy() {
        if (this.element && this.element.parentNode) {
            // Animate out
            this.element.style.opacity = '0';
            this.element.style.transform = 'scale(0.3) translateY(-20px)';
            
            setTimeout(() => {
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
            }, 500);
        }
    }
    
    // Utility method to get area for sorting
    getArea() {
        return this.width * this.height;
    }
    
    // Method to check if transaction fits in given space
    fitsIn(width, height) {
        return this.width <= width && this.height <= height;
    }
    
    // Static method to update max value for color calculation
    static updateMaxValue(transactions) {
        return Math.max(...transactions.map(tx => tx.value || 0), 1);
    }
}