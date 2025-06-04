// PhysicsEngine.js - Fixed version without stale assignment warnings
// Provides realistic stacking and limited space simulation

export class PhysicsEngine {
    constructor(config) {
        this.config = {
            // Basic physics
            gravity: 0.18,
            friction: 0.992,
            bounce: 0.001,
            
            // Enhanced separation system
            separationForce: 0.8,
            minSeparationDistance: 3, // Minimum pixels between ball edges
            separationDecay: 0.95, // How separation force decreases with distance
            
            // Pressure system
            pressureRadius: 1, // How far to look for neighbors
            maxPressureForce: 0.1, // Maximum upward pressure
            pressureThreshold: 130, // Minimum neighbors to start applying pressure
            densityMultiplier: 0.1, // How much density affects pressure
            
            // Capacity simulation
            capacityPressureStart: 0.75, // At what capacity % to start global pressure
            maxCapacityPressure: 2, // Maximum global upward force when near capacity
            
            // Visual feedback
            enablePressureVisuals: false,
            pressureColorIntensity: 0.4,
            
            // Performance
            maxBalls: 150,
            targetFPS: 60,
            
            ...config // Override with provided config
        };
        
        this.balls = [];
        this.containerWidth = 0;
        this.containerHeight = 0;
        this.totalCapacity = 0;
        this.currentCapacity = 0;
    }
    
    // Initialize physics engine with container dimensions
    initialize(containerWidth, containerHeight, totalCapacity) {
        this.containerWidth = containerWidth;
        this.containerHeight = containerHeight;
        this.totalCapacity = totalCapacity;
        console.log(`🔧 Physics Engine initialized: ${containerWidth}x${containerHeight}, capacity: ${totalCapacity} bytes`);
    }
    
    // Add ball to physics simulation
    addBall(ball) {
        this.balls.push(ball);
        this.updateCapacity();
    }
    
    // Remove ball from physics simulation
    removeBall(ball) {
        const index = this.balls.indexOf(ball);
        if (index > -1) {
            this.balls.splice(index, 1);
            this.updateCapacity();
        }
    }
    
    // Update current capacity calculation
    updateCapacity() {
        this.currentCapacity = this.balls.reduce((total, ball) => 
            total + (ball.transaction.size || 0), 0);
    }
    
    // Main physics update loop
    updatePhysics() {
        if (this.balls.length === 0) return;
        
        // Calculate global pressure based on capacity
        const capacityRatio = this.currentCapacity / this.totalCapacity;
        const globalPressure = this.calculateGlobalPressure(capacityRatio);
        
        // Update each ball
        this.balls.forEach(ball => {
            this.updateBallPhysics(ball, globalPressure);
        });
        
        // Apply all forces and constraints
        this.balls.forEach(ball => {
            this.applyForcesAndConstraints(ball);
        });
    }
    
    // Calculate global upward pressure based on capacity
    calculateGlobalPressure(capacityRatio) {
        if (capacityRatio < this.config.capacityPressureStart) {
            return 0;
        }
        
        const pressureStart = this.config.capacityPressureStart;
        const pressureRange = 1.0 - pressureStart;
        const normalizedPressure = (capacityRatio - pressureStart) / pressureRange;
        
        // Exponential increase in pressure as capacity approaches 100%
        return Math.pow(normalizedPressure, 2) * this.config.maxCapacityPressure;
    }
    
    // Update physics for a single ball
    updateBallPhysics(ball, globalPressure) {
        // Apply gravity
        ball.vy += this.config.gravity;
        
        // Calculate local density and pressure
        const neighbors = this.findNearbyBalls(ball);
        const localPressure = this.calculateLocalPressure(ball, neighbors);
        
        // Apply separation forces
        this.applySeparationForces(ball, neighbors);
        
        // Apply pressure forces (both local and global)
        const totalPressure = localPressure + globalPressure;
        ball.vy -= totalPressure;
        
        // Apply visual pressure effects
        if (this.config.enablePressureVisuals) {
            this.applyPressureVisuals(ball, neighbors.length, totalPressure);
        }
        
        // Store physics data for debugging/display
        ball.physicsData = {
            neighbors: neighbors.length,
            localPressure: localPressure.toFixed(2),
            globalPressure: globalPressure.toFixed(2),
            totalPressure: totalPressure.toFixed(2)
        };
    }
    
    // Find balls within pressure radius
    findNearbyBalls(targetBall) {
        const neighbors = [];
        const targetCenterX = targetBall.x + targetBall.size / 2;
        const targetCenterY = targetBall.y + targetBall.size / 2;
        
        for (const ball of this.balls) {
            if (ball === targetBall) continue;
            
            const ballCenterX = ball.x + ball.size / 2;
            const ballCenterY = ball.y + ball.size / 2;
            
            const distance = Math.sqrt(
                (targetCenterX - ballCenterX) ** 2 + 
                (targetCenterY - ballCenterY) ** 2
            );
            
            if (distance <= this.config.pressureRadius) {
                neighbors.push({
                    ball: ball,
                    distance: distance,
                    centerX: ballCenterX,
                    centerY: ballCenterY
                });
            }
        }
        
        return neighbors;
    }
    
    // Calculate local pressure based on nearby balls
    calculateLocalPressure(ball, neighbors) {
        if (neighbors.length < this.config.pressureThreshold) {
            return 0;
        }
        
        // More neighbors = more pressure
        const neighborCount = neighbors.length;
        const basePressure = (neighborCount - this.config.pressureThreshold) * this.config.densityMultiplier;
        
        // Balls below this one contribute more to pressure
        const ballCenterY = ball.y + ball.size / 2;
        let weightedPressure = 0;
        
        neighbors.forEach(neighbor => {
            if (neighbor.centerY > ballCenterY) { // Ball is below
                const weight = 1.5; // Balls below contribute more pressure
                weightedPressure += weight;
            } else {
                weightedPressure += 0.5; // Balls above contribute less
            }
        });
        
        const totalPressure = Math.min(basePressure + weightedPressure * 0.2, this.config.maxPressureForce);
        return Math.max(0, totalPressure);
    }
    
    // Apply separation forces to prevent overlapping
    applySeparationForces(ball, neighbors) {
        const ballCenterX = ball.x + ball.size / 2;
        const ballCenterY = ball.y + ball.size / 2;
        
        neighbors.forEach(neighbor => {
            const dx = ballCenterX - neighbor.centerX;
            const dy = ballCenterY - neighbor.centerY;
            const distance = neighbor.distance;
            
            // Calculate minimum safe distance (including separation buffer)
            const minDistance = (ball.size + neighbor.ball.size) / 2 + this.config.minSeparationDistance;
            
            if (distance < minDistance && distance > 0) {
                // Calculate separation force
                const overlap = minDistance - distance;
                const separationIntensity = overlap / minDistance; // 0 to 1
                
                // Normalize direction
                const normalX = dx / distance;
                const normalY = dy / distance;
                
                // Apply separation force (stronger for more overlap)
                const forceMultiplier = this.config.separationForce * separationIntensity;
                ball.vx += normalX * forceMultiplier;
                ball.vy += normalY * forceMultiplier;
                
                // Also apply counter-force to the other ball (Newton's 3rd law)
                neighbor.ball.vx -= normalX * forceMultiplier * 0.5;
                neighbor.ball.vy -= normalY * forceMultiplier * 0.5;
            }
        });
    }
    
    // Apply visual effects based on pressure - FIXED VERSION
    applyPressureVisuals(ball, neighborCount, totalPressure) {
        if (!ball.element) return;
        
        // Calculate pressure intensity (0 to 1)
        const maxVisualPressure = this.config.maxPressureForce + this.config.maxCapacityPressure;
        const pressureIntensity = Math.min(totalPressure / maxVisualPressure, 1);
        
        // Apply visual effects based on pressure
        if (pressureIntensity > 0.1) {
            // Color shift - more red/orange under pressure
            const hueShift = pressureIntensity * 30; // Shift toward red
            const brightness = 1 + (pressureIntensity * 0.2); // Slightly brighter
            const saturation = 1 + (pressureIntensity * 0.3); // More saturated
            
            ball.element.style.filter = `
                hue-rotate(${hueShift}deg) 
                brightness(${brightness}) 
                saturate(${saturation})
            `;
            
            // Slight scale effect under extreme pressure - FIXED
            if (pressureIntensity > 0.7) {
                const scale = 1 + (pressureIntensity - 0.7) * 0.1; // Slight expansion
                const transformValue = `scale(${scale})`;
                ball.element.style.transform = transformValue;
            } else {
                // Reset transform instead of assigning empty string
                ball.element.style.removeProperty('transform');
            }
        } else {
            // Reset visual effects
            ball.element.style.removeProperty('filter');
            ball.element.style.removeProperty('transform');
        }
    }
    
    // Apply all forces and constraints to ball
    applyForcesAndConstraints(ball) {
        // Update position
        ball.x += ball.vx;
        ball.y += ball.vy;
        
        // Apply friction
        ball.vx *= this.config.friction;
        ball.vy *= this.config.friction;
        
        // Boundary collisions with enhanced stacking
        this.handleBoundaryCollisions(ball);
        
        // Update DOM element
        if (ball.element) {
            ball.element.style.left = ball.x + 'px';
            ball.element.style.top = ball.y + 'px';
        }
    }
    
    // Handle collisions with container boundaries
    handleBoundaryCollisions(ball) {
        // Left boundary
        if (ball.x <= 0) {
            ball.x = 0;
            ball.vx = -ball.vx * this.config.bounce;
        }
        
        // Right boundary
        if (ball.x >= this.containerWidth - ball.size) {
            ball.x = this.containerWidth - ball.size;
            ball.vx = -ball.vx * this.config.bounce;
        }
        
        // Top boundary
        if (ball.y <= 0) {
            ball.y = 0;
            ball.vy = -ball.vy * this.config.bounce;
        }
        
        // Bottom boundary - enhanced for stacking
        if (ball.y >= this.containerHeight - ball.size) {
            ball.y = this.containerHeight - ball.size;
            
            // Reduce bounce on bottom to encourage settling
            ball.vy = -ball.vy * (this.config.bounce * 0.6);
            
            // Add slight friction on bottom contact
            ball.vx *= 0.9;
        }
    }
    
    // Get current physics statistics
    getStats() {
        const capacityRatio = this.currentCapacity / this.totalCapacity;
        const globalPressure = this.calculateGlobalPressure(capacityRatio);
        
        // Calculate average pressure and density
        let totalLocalPressure = 0;
        let totalNeighbors = 0;
        
        this.balls.forEach(ball => {
            if (ball.physicsData) {
                totalLocalPressure += parseFloat(ball.physicsData.localPressure);
                totalNeighbors += ball.physicsData.neighbors;
            }
        });
        
        const avgLocalPressure = this.balls.length > 0 ? 
            (totalLocalPressure / this.balls.length).toFixed(2) : 0;
        const avgNeighbors = this.balls.length > 0 ? 
            (totalNeighbors / this.balls.length).toFixed(1) : 0;
        
        return {
            ballCount: this.balls.length,
            capacityRatio: (capacityRatio * 100).toFixed(1),
            globalPressure: globalPressure.toFixed(2),
            avgLocalPressure,
            avgNeighbors,
            currentCapacity: this.currentCapacity,
            totalCapacity: this.totalCapacity
        };
    }
    
    // Clear all balls
    clear() {
        this.balls = [];
        this.currentCapacity = 0;
    }
    
    // Update configuration - HELPFUL FOR TUNING BOUNCE/PRESSURE
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 Physics config updated:', newConfig);
    }
}