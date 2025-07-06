# Algorithm Solver - Node.js TypeScript Project

A Node.js application built with Express.js and TypeScript for implementing a **distributed consensus algorithm** for the ball sorting problem.

## 🎯 Featured: Distributed Ball Sorting Consensus Algorithm

This project implements a **distributed, self-stabilizing consensus algorithm** that solves the crypto tech test requirements:

### 🎮 **Live Demo Available!**
- **Start Server**: `npm run dev` 
- **Open Browser**: http://localhost:3000
- **Watch the Algorithm**: Real-time visualization of the distributed consensus

### � **Problem Statement**
Three independent processes, each starting with mixed colored balls, must reach consensus where each process has balls of only one color, using only local message passing.


## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start the Express server with consensus algorithm
npm run dev

# Open browser to see the visualization
open http://localhost:3000

# Run comprehensive tests
npm test

# Build the project
npm run build

# Start production server
npm start
```

## 🌐 **Consensus Algorithm Endpoints**

### Express.js API
```bash
# Start the consensus algorithm
curl -X POST http://localhost:3000/consensus/start

# Get current system state  
curl http://localhost:3000/consensus/state

# Reset to initial state
curl -X POST http://localhost:3000/consensus/reset

# Get algorithm info and documentation
curl http://localhost:3000/consensus/info
```


## 🔬 **Technical Implementation**

### Modular Service-Based Architecture
- **BaseConsensusService**: Core algorithm logic without framework dependencies
- **StandaloneConsensusService**: Lightweight wrapper for Express.js integration
- **Specialized Services**: Modular design with focused responsibilities

### Service Components
```typescript
- ColorSelectionService     // Handles color computation and conflict resolution
- PartnerSelectionService   // Manages partner selection algorithms
- MessageHandlingService    // Processes all message types (REQUEST/SEND/DONE)
- SystemStateService        // State management and persistence
```

### Core Algorithm Properties
- **Self-Stabilizing**: Guaranteed convergence from any initial state
- **Distributed**: No central coordinator or shared state
- **Message-Passing**: Asynchronous communication between processes
- **Potential Function**: Φ = total miscolored balls (proves termination)
- **Modular Design**: Clean separation of concerns for maintainability

### Process Behavior
```typescript
1. Compute wanted color (majority in current stack)
2. Choose partner (round-robin among active processes)  
3. Send REQUEST(color) to partner
4. If partner has unwanted ball of that color, receive SEND(color)
5. Check for monochrome state → broadcast DONE if achieved
6. Repeat until all processes are monochrome
```

## 📝 **Test Results**

```bash
npm run test:consensus
```

**Typical Performance:**
- ✅ Convergence Time: 2-5 seconds
- ✅ Total Exchanges: 15-25 ball transfers
- ✅ Final State: All processes monochrome
- ✅ Invariants: Ball count and color distribution preserved

## 📚 **Original Algorithm Library**

This project also includes implementations of classic algorithms:

### Sorting Algorithms
- Bubble Sort, Quick Sort, Merge Sort

### Search Algorithms  
- Binary Search, Linear Search, Find Kth Largest Element

### Data Structures
- Stack, Queue, Linked List Node, Binary Tree Node

## 🧪 **Testing & Verification**

### Automated Test Suite
```bash
npm test                    # Run all tests
```


## 📊 **API Documentation**

### Simple Algorithm API

The application also provides basic algorithm endpoints:

```bash
# Get available algorithms
curl http://localhost:3000/api/algorithms

# Solve Two Sum problem
curl -X POST http://localhost:3000/api/algorithms/two-sum \
  -H "Content-Type: application/json" \
  -d '{"nums": [2, 7, 11, 15], "target": 9}'

# Calculate Fibonacci number
curl http://localhost:3000/api/algorithms/fibonacci/10
```

### Development Commands

```bash
npm run build              # Compile TypeScript to JavaScript
npm run dev               # Start Express.js development server
npm start                 # Start production server
npm test                  # Run test suite
npm run clean             # Remove compiled files
```

**🎉 Ready to explore distributed consensus algorithms? Start the server and watch the magic happen!**
