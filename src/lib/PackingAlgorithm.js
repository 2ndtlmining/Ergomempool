// PackingAlgorithm.js - FIXED True Bottom-Up Gravity-Based Packing Algorithm with Responsive Spacing
export class GravityPackingAlgorithm {
    constructor(containerWidth, containerHeight, maxBlockSizeBytes) {
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        this.maxBlockSizeBytes = maxBlockSizeBytes;
        this.placedTransactions = [];
        this.totalBytesUsed = 0;
        
        // Calculate responsive spacing based on container density
        const responsiveSpacing = this.getDensityBasedSpacing(containerWidth, containerHeight);
        
        // Enhanced packing configuration with responsive spacing
        this.config = {
            minSpacing: responsiveSpacing,  // Dynamic spacing based on container size
            maxAttempts: 200,               // More attempts for better placement
            fallbackSpacing: responsiveSpacing * 2, // Fallback is 2x responsive spacing
            edgePadding: Math.max(4, Math.floor(responsiveSpacing * 4)), // Scale edge padding too
            bottomPadding: Math.max(4, Math.floor(responsiveSpacing * 4)), // Scale bottom padding
            scanStep: Math.max(2, Math.floor(responsiveSpacing * 2)) // Scale scan step
        };
        
        console.log(`🧠 TRUE Bottom-up packing algorithm initialized: ${containerWidth}x${containerHeight}, ${this.formatBytes(maxBlockSizeBytes)} capacity`);
        console.log(`📏 Responsive spacing: ${responsiveSpacing.toFixed(1)}px (density-based)`);
    }
    
    // DENSITY-BASED RESPONSIVE SPACING CALCULATION
    getDensityBasedSpacing(containerWidth, containerHeight) {
        // Higher density (less spacing) for smaller screens
        const area = containerWidth * containerHeight;
        const desktopArea = 800 * 600; // 480,000 (reference desktop size)
        
        const densityRatio = area / desktopArea;
        const baseSpacing = 2; // Desktop reference spacing
        
        // Smaller screens get proportionally less spacing using square root for smooth scaling
        const calculatedSpacing = baseSpacing * Math.sqrt(densityRatio);
        
        // Clamp between reasonable bounds
        const spacing = Math.max(0.5, Math.min(3, calculatedSpacing));
        
        console.log(`📐 Container: ${containerWidth}x${containerHeight} (${area.toLocaleString()}px²), Density ratio: ${densityRatio.toFixed(2)}, Spacing: ${spacing.toFixed(1)}px`);
        
        return spacing;
    }
    
    packTransactions(transactions) {
        console.log(`🔄 Starting TRUE bottom-up packing for ${transactions.length} transactions`);
        
        // Reset state
        this.placedTransactions = [];
        this.totalBytesUsed = 0;
        
        // Filter valid transactions and sort by size (largest first for better packing efficiency)
        const validTransactions = transactions.filter(tx => 
            tx && tx.sizeBytes && tx.sizeBytes > 0
        );
        
        const sortedTransactions = validTransactions.sort((a, b) => b.sizeBytes - a.sizeBytes);
        
        console.log(`📊 Processing ${sortedTransactions.length} valid transactions`);
        
        const positions = [];
        
        for (const transaction of sortedTransactions) {
            // Check capacity limit
            if (this.totalBytesUsed + transaction.sizeBytes > this.maxBlockSizeBytes) {
                console.log(`⚠️ Capacity limit reached. Skipping transaction ${transaction.id} (${this.formatBytes(transaction.sizeBytes)})`);
                continue;
            }
            
            // Calculate visual size
            const visualSize = this.calculateVisualSize(transaction.sizeBytes);
            
            // Find position using TRUE bottom-up gravity-based algorithm
            const position = this.findTrueBottomUpPosition(visualSize);
            
            if (position) {
                positions.push({
                    transaction,
                    x: position.x,
                    y: position.y,
                    size: visualSize
                });
                
                // Track placed transaction
                this.placedTransactions.push({
                    id: transaction.id,
                    x: position.x,
                    y: position.y,
                    width: visualSize,
                    height: visualSize,
                    sizeBytes: transaction.sizeBytes
                });
                
                this.totalBytesUsed += transaction.sizeBytes;
                
                console.log(`✅ Placed ${transaction.id} at (${position.x}, ${position.y}) - ${this.formatBytes(transaction.sizeBytes)}`);
            } else {
                console.warn(`❌ Could not place transaction ${transaction.id} - no space found`);
            }
        }
        
        console.log(`📦 TRUE Bottom-up packing complete: ${positions.length}/${transactions.length} transactions placed`);
        console.log(`💾 Total capacity used: ${this.formatBytes(this.totalBytesUsed)} / ${this.formatBytes(this.maxBlockSizeBytes)} (${((this.totalBytesUsed / this.maxBlockSizeBytes) * 100).toFixed(1)}%)`);
        
        return positions;
    }
    
    calculateVisualSize(sizeBytes) {
        const minSize = 8;   // Smaller minimum for mobile compatibility
        const maxSize = 50;  // Reasonable maximum for density
        const normalizedSize = Math.min(sizeBytes / 20000, 1); // Normalize to 20KB max
        return Math.round(minSize + (maxSize - minSize) * Math.sqrt(normalizedSize));
    }
    
    // COMPLETELY REWRITTEN for TRUE bottom-up packing
    findTrueBottomUpPosition(size) {
        const margin = this.config.edgePadding;
        const bottomPadding = this.config.bottomPadding;
        const step = this.config.scanStep;
        
        // Define the search area boundaries
        const minX = margin;
        const maxX = this.containerWidth - size - margin;
        const minY = margin;
        const maxY = this.containerHeight - size - bottomPadding;
        
        console.log(`🔍 Finding bottom-up position for size ${size}px in area: X(${minX}-${maxX}) Y(${minY}-${maxY})`);
        
        // Strategy 1: Start from bottom and scan upward, left to right within each row
        for (let y = maxY; y >= minY; y -= step) {
            for (let x = minX; x <= maxX; x += step) {
                if (!this.hasCollision(x, y, size, size)) {
                    console.log(`✅ Found bottom-up position at (${x}, ${y})`);
                    return { x, y };
                }
            }
        }
        
        // Strategy 2: More precise scanning with smaller steps if first attempt fails
        console.log(`🔍 First scan failed, trying precise bottom-up scan...`);
        for (let y = maxY; y >= minY; y -= 1) {
            for (let x = minX; x <= maxX; x += 1) {
                if (!this.hasCollision(x, y, size, size)) {
                    console.log(`✅ Found precise bottom-up position at (${x}, ${y})`);
                    return { x, y };
                }
            }
        }
        
        console.warn(`❌ No bottom-up position found for size ${size}px`);
        return null;
    }
    
    hasCollision(x, y, width, height) {
        const buffer = this.config.minSpacing;
        
        // Check boundaries first
        if (x < this.config.edgePadding || 
            y < this.config.edgePadding || 
            x + width > this.containerWidth - this.config.edgePadding || 
            y + height > this.containerHeight - this.config.bottomPadding) {
            return true;
        }
        
        // Check collisions with placed transactions
        for (const placed of this.placedTransactions) {
            if (x < placed.x + placed.width + buffer &&
                x + width + buffer > placed.x &&
                y < placed.y + placed.height + buffer &&
                y + height + buffer > placed.y) {
                return true;
            }
        }
        
        return false;
    }
    
    // ENHANCED VALIDATION METHOD
    validatePacking() {
        console.log(`🔍 Validating TRUE bottom-up packing of ${this.placedTransactions.length} transactions`);
        
        let hasOverlaps = false;
        let totalValidatedBytes = 0;
        const issues = [];
        
        // Check for overlaps and bounds
        for (let i = 0; i < this.placedTransactions.length; i++) {
            const txA = this.placedTransactions[i];
            totalValidatedBytes += txA.sizeBytes;
            
            // Check bounds
            if (txA.x < 0 || txA.y < 0 || 
                txA.x + txA.width > this.containerWidth || 
                txA.y + txA.height > this.containerHeight) {
                issues.push(`Transaction ${txA.id} is outside container bounds`);
            }
            
            // Check overlaps with other transactions
            for (let j = i + 1; j < this.placedTransactions.length; j++) {
                const txB = this.placedTransactions[j];
                
                if (txA.x < txB.x + txB.width &&
                    txA.x + txA.width > txB.x &&
                    txA.y < txB.y + txB.height &&
                    txA.y + txA.height > txB.y) {
                    hasOverlaps = true;
                    issues.push(`Overlap detected between ${txA.id} and ${txB.id}`);
                }
            }
        }
        
        // Check capacity
        if (totalValidatedBytes > this.maxBlockSizeBytes) {
            issues.push(`Total bytes (${this.formatBytes(totalValidatedBytes)}) exceeds capacity (${this.formatBytes(this.maxBlockSizeBytes)})`);
        }
        
        // Check if packing is truly bottom-heavy (only warn if we have transactions)
        if (this.placedTransactions.length > 0) {
            const distribution = this.getPackingDistribution();
            if (distribution.bottom < 50) {
                console.warn(`⚠️ Packing not sufficiently bottom-heavy: ${distribution.bottom}% at bottom`);
            }
        }
        
        // Log results
        if (issues.length === 0) {
            console.log(`✅ Validation passed: No overlaps, ${this.formatBytes(totalValidatedBytes)} used`);
            return true;
        } else {
            console.warn(`❌ Validation failed: ${issues.length} issues found`);
            issues.forEach(issue => console.warn(`  - ${issue}`));
            return false;
        }
    }
    
    getPackingStats() {
        const capacityUsed = (this.totalBytesUsed / this.maxBlockSizeBytes) * 100;
        const avgSizeBytes = this.placedTransactions.length > 0 
            ? this.totalBytesUsed / this.placedTransactions.length 
            : 0;
        
        // Calculate visual utilization (how much of the visible area is used)
        const totalVisualArea = this.placedTransactions.reduce((sum, tx) => 
            sum + (tx.width * tx.height), 0
        );
        const containerArea = this.containerWidth * this.containerHeight;
        const visualUtilization = (totalVisualArea / containerArea) * 100;
        
        // Calculate TRUE bottom-heaviness - distance from bottom
        const avgDistanceFromBottom = this.placedTransactions.length > 0
            ? this.placedTransactions.reduce((sum, tx) => {
                const distanceFromBottom = this.containerHeight - (tx.y + tx.height);
                return sum + distanceFromBottom;
            }, 0) / this.placedTransactions.length
            : 0;
        
        const bottomHeaviness = Math.max(0, 100 - (avgDistanceFromBottom / this.containerHeight * 100));
        
        const stats = {
            totalTransactions: this.placedTransactions.length,
            totalBytes: this.totalBytesUsed,
            capacityUsed: capacityUsed,
            efficiency: Math.min(capacityUsed, 100),
            avgSizeKB: Math.round(avgSizeBytes / 1024 * 10) / 10,
            visualUtilization: Math.round(visualUtilization * 10) / 10,
            remainingCapacity: this.maxBlockSizeBytes - this.totalBytesUsed,
            remainingCapacityPercent: Math.max(0, 100 - capacityUsed),
            bottomHeaviness: Math.round(bottomHeaviness * 10) / 10,
            avgDistanceFromBottom: Math.round(avgDistanceFromBottom),
            // Add spacing info to stats
            currentSpacing: this.config.minSpacing
        };
        
        console.log('📊 TRUE Bottom-up packing stats calculated:', stats);
        return stats;
    }
    
    // ENHANCED CLEANUP METHOD
    clearPacking() {
        console.log(`🧹 Clearing TRUE bottom-up packing data for ${this.placedTransactions.length} transactions`);
        
        this.placedTransactions = [];
        this.totalBytesUsed = 0;
        
        console.log('✅ Packing data cleared');
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }
    
    // Get detailed placement information for debugging
    getPlacementDetails() {
        return {
            placedCount: this.placedTransactions.length,
            totalBytes: this.totalBytesUsed,
            capacityPercent: (this.totalBytesUsed / this.maxBlockSizeBytes) * 100,
            spacingUsed: this.config.minSpacing,
            placements: this.placedTransactions.map(tx => ({
                id: tx.id,
                position: `(${tx.x}, ${tx.y})`,
                size: `${tx.width}x${tx.height}`,
                bytes: this.formatBytes(tx.sizeBytes),
                distanceFromBottom: this.containerHeight - (tx.y + tx.height)
            }))
        };
    }
    
    // Enhanced method to analyze TRUE bottom-up packing distribution
    getPackingDistribution() {
        if (this.placedTransactions.length === 0) {
            return { bottom: 0, middle: 0, top: 0 };
        }
        
        // Divide container into thirds for distribution analysis
        const thirdHeight = this.containerHeight / 3;
        let bottom = 0, middle = 0, top = 0;
        
        this.placedTransactions.forEach(tx => {
            // Use the center point of each transaction
            const centerY = tx.y + tx.height / 2;
            
            if (centerY >= thirdHeight * 2) {
                // Bottom third (closer to bottom = higher Y values)
                bottom++;
            } else if (centerY >= thirdHeight) {
                // Middle third
                middle++;
            } else {
                // Top third
                top++;
            }
        });
        
        return {
            bottom: Math.round((bottom / this.placedTransactions.length) * 100),
            middle: Math.round((middle / this.placedTransactions.length) * 100),
            top: Math.round((top / this.placedTransactions.length) * 100)
        };
    }
}