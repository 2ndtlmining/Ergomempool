# Ergomempool - Real-time Ergo Blockchain Mempool Visualizer

A sophisticated real-time visualization tool for the Ergo blockchain mempool, featuring multiple interactive visualization modes, transaction origin detection, and advanced packing algorithms.

![Ergomempool Logo](public/Ergomempool_logo_f.svg)

## 🌟 Features

- **Real-time Transaction Monitoring**: Live updates from the Ergo blockchain mempool
- **Multiple Visualization Modes**: Four different ways to visualize transaction data
- **Transaction Origin Detection**: Automatically identifies transactions from major Ergo platforms
- **Advanced Packing Algorithm**: Gravity-based bottom-up packing simulation
- **Wallet Integration**: Connect your Ergo wallet to highlight your transactions
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices
- **Platform Activity Tracking**: Monitor activity from DEXs, bridges, mining pools, and more

## 🎨 Visualization Modes

### 1. Transaction Packing Grid (Default)
The main visualization mode that simulates how transactions would be packed into blocks using a gravity-based algorithm.

- **Algorithm**: Bottom-up gravity packing with responsive spacing
- **Features**: Real-time capacity monitoring, packing efficiency display
- **Interactions**: Add test transactions, repack with gravity simulation
- **Color Coding**: Transactions colored by value (blue → purple → red for increasing values)

### 2. Hexagon Packing Mode
An artistic hexagonal visualization that shows transaction packing in a honeycomb pattern.

- **Layout**: Hexagonal grid with automatic packing animation
- **Animation**: Smooth transitions and packing sequences
- **Best For**: Presentations and aesthetic appeal

### 3. Ball Physics Mode
A dynamic physics simulation where transactions are represented as balls with realistic physics.

- **Physics**: Gravity, friction, collision detection, and pressure simulation
- **Features**: Block mining animations, capacity pressure effects
- **Interactions**: Balls settle naturally, respond to new transactions
- **Visual Effects**: Pressure-based color shifts and scaling

### 4. Grid View Mode
A clean, table-like grid layout for detailed transaction analysis.

- **Layout**: Organized rows and columns
- **Information**: Detailed transaction metadata
- **Best For**: Analysis and data inspection

## 🎯 Transaction Detection & Color Coding

### Platform Detection
The app automatically detects transactions from major Ergo ecosystem platforms:

#### DEXs & Trading
- **ErgoDEX** - Blue (`#3498db`)
- **Spectrum Finance** - Various colors
- **Mew Finance** - Various colors

#### Bridges & Cross-chain
- **Rosen Bridge** - Orange (`#e67e22`)

#### Privacy & Mixing
- **Ergomixer** - Purple (`#9b59b6`)

#### Stablecoins & Finance
- **SigUSD** - Red (`#e74c3c`)
- **SigmaFi** - Dark blue (`#34495e`)
- **Duckpools** - Various colors

#### Mining Pools
- **2Miners** - Auto-detected payouts
- **Woolypooly** - Auto-detected payouts
- **Herominers** - Auto-detected payouts
- **And many more...**

#### Exchanges
- **KuCoin** - Auto-detected deposits/withdrawals
- **Gate.io** - Auto-detected transactions
- **MEXC** - Auto-detected transactions
- **And many more...**

#### Other Platforms
- **Auction House** - NFT marketplace
- **Duckpools** - Gaming platform
- **Ergo Raffle** - Community raffles
- **And 20+ more platforms**

### Color Coding System

#### By Transaction Value
- **Light Blue** (`#3498db`): Low value transactions (0-20% of max)
- **Medium Blue** (`#2980b9`): Low-medium value (20-40% of max)
- **Purple** (`#9b59b6`): Medium value (40-60% of max)
- **Dark Purple** (`#8e44ad`): Medium-high value (60-80% of max)
- **Red** (`#e74c3c`): High value (80-90% of max)
- **Dark Red** (`#c0392b`): Highest value (90-100% of max)

#### Special Transaction Types
- **Wallet Transactions**: Gold border (`#f39c12`) with glow effect
- **Test Transactions**: Orange border with "🧪" indicator
- **Donation Transactions**: Red with "💖" indicator

## 🔧 Packing Algorithm

### Gravity-Based Bottom-Up Packing
The core packing algorithm simulates how transactions would be efficiently packed into blocks:

#### Algorithm Features
- **Density-Based Spacing**: Automatically adjusts spacing based on container size
- **Bottom-Up Priority**: Transactions settle towards the bottom like gravity
- **Collision Detection**: Prevents overlapping transactions
- **Capacity Limits**: Respects Ergo's 2MB block size limit
- **Responsive Design**: Adapts to different screen sizes

#### Configuration Options
```javascript
// API refresh intervals (easily configurable)
TRANSACTIONS_INTERVAL: 10000,    // 10 seconds
BLOCKS_INTERVAL: 60000,          // 1 minute  
PRICE_INTERVAL: 300000,          // 5 minutes

// Visual parameters
minSpacing: responsive,          // Dynamic based on screen size
maxAttempts: 200,               // Placement attempts per transaction
edgePadding: scaled,            // Proportional to container
```

#### Packing Stats
The algorithm provides real-time statistics:
- **Block Capacity**: 2MB limit visualization
- **Mempool Size**: Current transaction count
- **Utilization**: Percentage of block space used
- **Efficiency**: Packing algorithm efficiency
- **Status**: Ready/Packing/Full indicators

## 🛠️ Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm, pnpm, or yarn
- Modern web browser with ES2020+ support


## ⚙️ Configuration

### API Settings
The app includes configurable API refresh intervals in `+page.svelte`:

```javascript
const API_REFRESH_CONFIG = {
    TRANSACTIONS_INTERVAL: 10000,    // Adjust refresh rate
    BLOCKS_INTERVAL: 60000,          
    PRICE_INTERVAL: 300000,          
    ENABLE_AUTO_REFRESH: true,       // Toggle auto-refresh
    MAX_CONSECUTIVE_FAILURES: 3,    // Error handling
};
```

## 🔌 API Endpoints

The app connects to Ergo blockchain APIs:

- **Transactions**: `/api?endpoint=transactions`
- **Blocks**: `/api?endpoint=blocks`  
- **Price**: `/api?endpoint=price`

Error handling includes:
- Automatic retries with exponential backoff
- Fallback data preservation
- Network error recovery
- Server error handling

## 🎮 User Interactions

### Header Controls
- **Mode Selector**: Switch between visualization modes
- **Refresh Button**: Manual data refresh
- **Test Transactions**: Add dummy transactions for testing
- **Repack Button**: Trigger gravity-based repacking

### Wallet Integration
- **Connect Wallet**: Support for Nautilus, Eternl, Minotaur
- **Transaction Highlighting**: Your transactions get special styling
- **Address Detection**: Automatic detection of wallet transactions

### Real-time Features
- **Live Updates**: Configurable refresh intervals
- **Block Mining**: Animated block confirmation
- **New Transactions**: Smooth entry animations
- **Capacity Monitoring**: Real-time block space tracking

## 📊 Statistics & Monitoring

### Packing Statistics
- Total transactions in mempool
- Block capacity utilization
- Packing efficiency percentage
- Average transaction size
- Bottom-heaviness metric

### Platform Activity
- Transaction count by platform
- Volume by platform
- Activity trends over time
- Origin distribution

### Performance Metrics
- API response times
- Update frequencies
- Error rates
- Data freshness indicators


## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add platform configurations if needed
5. Test thoroughly
6. Submit a pull request




**Built with ❤️ for the Ergo ecosystem**