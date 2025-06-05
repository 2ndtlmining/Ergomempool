// PackingAlgorithm.js - Enhanced gravity-based bin packing with bottom alignment

export class GravityPackingAlgorithm {
    constructor(containerWidth, containerHeight, maxCapacityBytes = 2 * 1024 * 1024) {
        this.containerWidth = containerWidth - 40; // Account for padding/margins
        this.containerHeight = containerHeight - 40; // Reduced to allow more packing space
        this.maxCapacityBytes = maxCapacityBytes; // 2MB default
        this.margin = 1; // Minimum gap between transactions (reduced for tighter packing)
        
        // Bottom-packing specific settings
        this.groundLevel = this.containerHeight - 5; // Very bottom boundary
        this.packingStartY = this.groundLevel; // Start packing from bottom
        
        console.log(`📦 Gravity Packing Algorithm initialized:`);
        console.log(`   Container: ${this.containerWidth} × ${this.containerHeight} pixels`);
        console.log(`   Capacity: ${(this.maxCapacityBytes / (1024 * 1024)).toFixed(1)}MB`);
        console.log(`   Ground level: y=${this.groundLevel}`);
        
        this.reset();
    }
    
    reset() {
        // Track filled areas for collision detection
        this.occupiedSpaces = [];
        this.placedTransactions = [];
        this.totalBytesPlaced = 0;
    }
    
    // Main packing function - returns array of positioned transactions
    packTransactions(transactions) {
        console.log(`🔄 Starting BOTTOM-UP gravity packing for ${transactions.length} transactions...`);
        
        this.reset();
        const positions = [];
        
        // Calculate max value for consistent color coding
        const maxValue = Math.max(...transactions.map(tx => tx.value || 0), 1);
        
        // Update transaction colors with consistent max value
        transactions.forEach(tx => {
            tx.maxValue = maxValue;
            tx.color = tx.getColorByValue();
        });
        
        // STEP 1: Sort transactions by priority (largest first for bottom foundation)
        const sortedTransactions = this.sortTransactionsByGravity(transactions);
        
        // STEP 2: Pack each transaction using BOTTOM-UP approach
        for (const tx of sortedTransactions) {
            // Check if adding this transaction would exceed capacity
            if (this.totalBytesPlaced + tx.sizeBytes > this.maxCapacityBytes) {
                console.log(`⚠️ Transaction ${tx.id.substring(0,8)} rejected - would exceed ${(this.maxCapacityBytes / (1024 * 1024)).toFixed(1)}MB capacity`);
                continue;
            }
            
            const position = this.findBottomPosition(tx);
            
            if (position) {
                // Successfully placed
                positions.push({
                    transaction: tx,
                    x: position.x,
                    y: position.y
                });
                
                // Mark space as occupied
                this.markSpaceOccupied(position.x, position.y, tx.width, tx.height);
                this.placedTransactions.push(tx);
                this.totalBytesPlaced += tx.sizeBytes;
                
                console.log(`✅ Placed TX ${tx.id.substring(0,8)} (${tx.sizeKB.toFixed(1)}KB, ${tx.value.toFixed(2)}ERG) at (${position.x}, ${position.y})`);
            } else {
                console.log(`❌ Could not place transaction ${tx.id.substring(0,8)} (${tx.width}×${tx.height}px) - no space available`);
            }
        }
        
        console.log(`📦 BOTTOM PACKING complete: ${positions.length}/${transactions.length} transactions placed`);
        console.log(`📊 Total capacity used: ${(this.totalBytesPlaced / 1024).toFixed(1)}KB / ${(this.maxCapacityBytes / 1024).toFixed(0)}KB (${((this.totalBytesPlaced / this.maxCapacityBytes) * 100).toFixed(1)}%)`);
        
        return positions;
    }
    
    // Sort transactions with gravity preference (largest first for foundation)
    sortTransactionsByGravity(transactions) {
        return [...transactions].sort((a, b) => {
            // Primary sort: by area (larger transactions form the foundation)
            const areaA = a.getArea();
            const areaB = b.getArea();
            
            if (areaB !== areaA) {
                return areaB - areaA; // Larger first (foundation blocks)
            }
            
            // Secondary sort: by width (wider transactions first for stability)
            if (b.width !== a.width) {
                return b.width - a.width;
            }
            
            // Tertiary sort: by value (higher value transactions get priority)
            return (b.value || 0) - (a.value || 0);
        });
    }
    
    // BOTTOM-UP POSITIONING: Find position starting from the bottom
    findBottomPosition(transaction) {
        const { width, height } = transaction;
        
        // STRICT BOTTOM-UP GRAVITY ALGORITHM
        // Start from absolute ground level and work upward systematically
        
        const stepSize = 1; // Very small step for precise placement
        const leftBoundary = 10;
        const rightBoundary = this.containerWidth - width - 10;
        
        // For each height level (bottom to top) - start from ground
        for (let y = this.groundLevel - height; y >= 10; y -= stepSize) {
            
            // Try left-to-right placement at this level
            for (let x = leftBoundary; x <= rightBoundary; x += stepSize) {
                if (this.canPlaceAt(x, y, width, height)) {
                    
                    // For ground level, accept immediately (perfect support)
                    if (y + height >= this.groundLevel - 2) {
                        return { 
                            x: Math.round(x), 
                            y: Math.round(y), 
                            supportScore: 100
                        };
                    }
                    
                    // For higher levels, check support
                    const supportScore = this.calculateSupportScore(x, y, width, height);
                    
                    // Accept position if it has good support
                    if (supportScore >= 70) {
                        return { 
                            x: Math.round(x), 
                            y: Math.round(y), 
                            supportScore 
                        };
                    }
                }
            }
            
            // Also try right-to-left at this level for better packing
            for (let x = rightBoundary; x >= leftBoundary; x -= stepSize) {
                if (this.canPlaceAt(x, y, width, height)) {
                    
                    // Ground level priority
                    if (y + height >= this.groundLevel - 2) {
                        return { 
                            x: Math.round(x), 
                            y: Math.round(y), 
                            supportScore: 100
                        };
                    }
                    
                    const supportScore = this.calculateSupportScore(x, y, width, height);
                    
                    if (supportScore >= 70) {
                        return { 
                            x: Math.round(x), 
                            y: Math.round(y), 
                            supportScore 
                        };
                    }
                }
            }
        }
        
        return null; // Cannot place transaction
    }
    
    // Check if a transaction can be placed at given position
    canPlaceAt(x, y, width, height) {
        // Check container bounds with minimal margins
        if (x < 5 || y < 5 || 
            x + width > this.containerWidth - 5 || 
            y + height > this.containerHeight) {
            return false;
        }
        
        // Check collision with existing transactions
        for (const occupied of this.occupiedSpaces) {
            if (this.rectanglesOverlap(
                x, y, width, height,
                occupied.x, occupied.y, occupied.width, occupied.height,
                this.margin
            )) {
                return false;
            }
        }
        
        return true;
    }
    
    // Calculate support score (how well supported a position is)
    calculateSupportScore(x, y, width, height) {
        let supportScore = 0;
        
        // GROUND CONTACT: Maximum support if touching bottom
        if (y + height >= this.groundLevel - 2) {
            supportScore += 100;
            return supportScore; // Ground contact is perfect support
        }
        
        // TRANSACTION SUPPORT: Check for support from transactions below
        let totalSupportWidth = 0;
        
        for (const occupied of this.occupiedSpaces) {
            // Check if there's a transaction directly below this position
            const verticalGap = occupied.y - (y + height);
            
            if (verticalGap >= -1 && verticalGap <= 2) { // Very close below
                // Calculate horizontal overlap
                const leftOverlap = Math.max(x, occupied.x);
                const rightOverlap = Math.min(x + width, occupied.x + occupied.width);
                const overlapWidth = Math.max(0, rightOverlap - leftOverlap);
                
                if (overlapWidth > 0) {
                    totalSupportWidth += overlapWidth;
                }
            }
        }
        
        // Calculate support percentage
        const supportPercentage = totalSupportWidth / width;
        supportScore += supportPercentage * 90; // Up to 90 points for full support
        
        // BONUS: Prefer positions that are well-supported
        if (supportPercentage > 0.5) { // At least 50% supported
            supportScore += 20;
        }
        
        return supportScore;
    }
    
    // Check if two rectangles overlap (with margin)
    rectanglesOverlap(x1, y1, w1, h1, x2, y2, w2, h2, margin = 0) {
        return !(
            x1 + w1 + margin <= x2 || 
            x2 + w2 + margin <= x1 || 
            y1 + h1 + margin <= y2 || 
            y2 + h2 + margin <= y1
        );
    }
    
    // Mark space as occupied for collision detection
    markSpaceOccupied(x, y, width, height) {
        this.occupiedSpaces.push({
            x: x,
            y: y,
            width: width,
            height: height
        });
    }
    
    // Get current packing statistics
    getPackingStats() {
        const totalTransactions = this.placedTransactions.length;
        const capacityUsed = (this.totalBytesPlaced / this.maxCapacityBytes) * 100;
        
        // Calculate visual space utilization
        const totalVisualArea = this.placedTransactions.reduce(
            (sum, tx) => sum + tx.getArea(), 0
        );
        const containerArea = this.containerWidth * this.containerHeight;
        const visualUtilization = (totalVisualArea / containerArea) * 100;
        
        // Calculate average transaction size
        const avgSizeKB = totalTransactions > 0 ? 
            (this.totalBytesPlaced / 1024) / totalTransactions : 0;
        
        // Calculate packing efficiency (how well we're using space)
        const theoreticalPixels = this.totalBytesPlaced * (containerArea / this.maxCapacityBytes);
        const actualPixels = totalVisualArea;
        const packingEfficiency = theoreticalPixels > 0 ? (actualPixels / theoreticalPixels) * 100 : 100;
        
        return {
            totalTransactions,
            totalBytes: this.totalBytesPlaced,
            totalKB: this.totalBytesPlaced / 1024,
            capacityUsed,
            visualUtilization,
            avgSizeKB,
            efficiency: Math.min(packingEfficiency, 100), // Cap at 100%
            remainingCapacity: this.maxCapacityBytes - this.totalBytesPlaced,
            // Additional metrics
            avgTransactionArea: totalTransactions > 0 ? totalVisualArea / totalTransactions : 0,
            packingDensity: (totalVisualArea / containerArea) * 100
        };
    }
    
    // Advanced packing: Try to fill gaps with smaller transactions
    optimizePacking(transactions) {
        console.log('🔧 Running bottom-up packing optimization...');
        
        // Find unplaced small transactions that might fit in gaps
        const unplacedTransactions = transactions.filter(tx => 
            !this.placedTransactions.includes(tx) && 
            tx.sizeBytes <= this.maxCapacityBytes - this.totalBytesPlaced
        );
        
        // Sort small transactions by size (smallest first for gap filling)
        const smallTransactions = unplacedTransactions
            .filter(tx => tx.getArea() <= 600) // Small area threshold
            .sort((a, b) => a.getArea() - b.getArea());
        
        const additionalPlacements = [];
        
        for (const tx of smallTransactions) {
            if (this.totalBytesPlaced + tx.sizeBytes > this.maxCapacityBytes) {
                continue;
            }
            
            const position = this.findBottomPosition(tx);
            if (position) {
                additionalPlacements.push({
                    transaction: tx,
                    x: position.x,
                    y: position.y
                });
                
                this.markSpaceOccupied(position.x, position.y, tx.width, tx.height);
                this.placedTransactions.push(tx);
                this.totalBytesPlaced += tx.sizeBytes;
                
                console.log(`🔧 Optimized placement for TX ${tx.id.substring(0,8)}`);
            }
        }
        
        console.log(`🔧 Bottom-up optimization complete: ${additionalPlacements.length} additional transactions placed`);
        return additionalPlacements;
    }
    
    // Utility: Validate packing (check for overlaps)
    validatePacking() {
        const overlaps = [];
        
        for (let i = 0; i < this.occupiedSpaces.length; i++) {
            for (let j = i + 1; j < this.occupiedSpaces.length; j++) {
                const space1 = this.occupiedSpaces[i];
                const space2 = this.occupiedSpaces[j];
                
                if (this.rectanglesOverlap(
                    space1.x, space1.y, space1.width, space1.height,
                    space2.x, space2.y, space2.width, space2.height
                )) {
                    overlaps.push({ space1, space2 });
                }
            }
        }
        
        if (overlaps.length > 0) {
            console.error(`❌ Packing validation failed: ${overlaps.length} overlaps detected`);
            return false;
        }
        
        console.log('✅ Bottom-up packing validation passed: no overlaps detected');
        return true;
    }
}