# React Testing Setup for BKU Converter

This document describes the testing environment setup for analyzing and fixing the React Hooks cascading render bug in the RiwayatBKU component.

## Overview

The testing setup includes:
- Jest test runner with JS DOM environment
- React Testing Library for component testing
- Custom utilities for analyzing React hooks and performance
- Mock data and functions for testing RiwayatBKU component

## Installation

Testing dependencies have been installed:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom @types/jest babel-jest @babel/preset-env @babel/preset-react identity-obj-proxy
```

## Configuration Files

1. **jest.config.js** - Jest configuration with JS DOM environment
2. **babel.config.js** - Babel configuration for JSX transformation
3. **jest.setup.js** - Global test setup with mocks for localStorage and console
4. **src/test-utils.js** - Custom testing utilities for React hooks analysis

## Test Utilities

### createRenderTracker()
Tracks render counts and state updates for performance analysis.

```javascript
const tracker = createRenderTracker();
const TrackedComponent = tracker.withRenderTracking(RiwayatBKU);
render(<TrackedComponent />);
console.log(tracker.getRenderCount()); // Number of renders
```

### analyzeUseEffectDependencies(componentCode)
Analyzes useEffect hooks for missing dependencies.

```javascript
const analyses = analyzeUseEffectDependencies(componentSourceCode);
analyses.forEach(analysis => {
  console.log('Missing dependencies:', analysis.missingDependencies);
});
```

### createRiwayatBKUTestHarness()
Creates mock data and functions for testing RiwayatBKU component.

```javascript
const harness = createRiwayatBKUTestHarness();
const mocks = harness.getMocks();
// Use mocks.getRiwayat, mocks.groupByBulanTahun, etc.
```

### measureReRenders(Component, props)
Measures re-render count for a component.

```javascript
const renderCount = await measureReRenders(RiwayatBKU);
console.log('Total renders:', renderCount);
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npx jest src/components/RiwayatBKU.test.jsx
```

### Run tests with coverage
```bash
npx jest --coverage
```

### Watch mode (for development)
```bash
npx jest --watch
```

## Test Files Structure

- `src/components/RiwayatBKU.test.jsx` - Main test file for RiwayatBKU component
- `src/test-utils.js` - Reusable testing utilities
- Additional test files will be created for specific bug conditions and preservation tests

## Test Categories

1. **Component Structure Analysis** - Basic component mounting and structure
2. **Render Counting Setup** - Utilities for tracking re-renders
3. **useEffect Dependency Analysis** - Analysis of hook dependencies
4. **Performance Monitoring Setup** - Tools for measuring performance
5. **Test Harness** - Mock data and functions
6. **Component Mounting Tests** - Basic lifecycle tests

## Next Steps for Bug Analysis

This testing setup will be used for:

1. **Task 2**: Write bug condition test for cascading re-renders
2. **Task 3**: Write bug condition test for missing dependencies
3. **Task 4**: Create preservation test for data loading
4. **Task 5**: Create preservation test for active entry selection
5. **Task 6**: Create preservation test for user interactions

## Notes

- The testing setup is designed to be non-invasive and doesn't modify the production code
- All mocks are isolated to test files
- Performance measurements use minimal overhead to avoid affecting test results
- The setup supports both unit tests and property-based tests (when needed)