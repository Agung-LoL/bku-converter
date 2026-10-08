# React Hooks Cascading Render Bugfix Design

## Overview

The RiwayatBKU component has a critical React Hooks bug causing cascading re-renders and performance degradation. The useEffect hook at line 46 calls a load function that contains multiple synchronous setState calls, which triggers unnecessary re-renders. Additionally, the hook has a missing dependency (`activeEntry`) causing stale closure issues. This fix also addresses related performance issues including unused code, Fast Refresh problems, and security concerns with localStorage password storage.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the load function is called with synchronous setState operations and missing useEffect dependencies
- **Property (P)**: The desired behavior - state updates should be batched/minimized and all dependencies properly declared
- **Preservation**: Existing data loading, display, and user interaction functionality that must remain unchanged by the fix
- **load function**: The function in `RiwayatBKU.jsx` that loads riwayat data and updates component state
- **useEffect hook**: The React hook at line 46 that calls load(false) on component mount
- **activeEntry**: The React state variable tracking the currently selected BKU entry

## Bug Details

### Bug Condition

The bug manifests when the RiwayatBKU component mounts and the useEffect hook executes. The load function is called with multiple synchronous setState operations (`setRiwayat`, `setActiveGroup`, `setActiveEntry`) without batching, causing cascading re-renders. Additionally, the useEffect hook has a missing dependency (`activeEntry`) which creates a stale closure, potentially causing incorrect behavior when preserving active entries.

**Formal Specification:**
```
FUNCTION isBugCondition(componentState, hookConfig)
  INPUT: componentState of type RiwayatBKUState
         hookConfig of type {hasMissingDependencies: boolean, hasSyncSetState: boolean}
  OUTPUT: boolean
  
  RETURN hookConfig.hasMissingDependencies = true
         AND hookConfig.hasSyncSetState = true
         AND componentState.loadFunctionCalled = true
END FUNCTION
```

### Examples

- **Example 1 - Mount Time Bug**: When component mounts, useEffect calls load(false) which executes setRiwayat(data), setActiveGroup(firstKey), and setActiveEntry(latestEntry) synchronously → triggers 3 separate re-renders
- **Example 2 - Stale Closure Bug**: When activeEntry exists and load(true) is called, the function references a potentially stale activeEntry value due to missing dependency → may incorrectly preserve wrong entry
- **Example 3 - Performance Impact**: Each synchronous setState triggers a re-render → with 50 BKU entries, could cause 150+ unnecessary re-renders during initial load
- **Example 4 - Edge Case**: Empty riwayat state still triggers unnecessary re-renders through synchronous setState(null) calls

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Data loading from localStorage must continue to work exactly as before
- Active entry selection and preservation must remain functional
- UI display of riwayat data must be identical
- All user interactions (selecting entries, deleting, exporting) must continue to work
- Toast notifications must display correctly
- Pagination and table display must function as before

**Scope:**
All functionality that does NOT involve synchronous setState calls or missing dependencies should be completely unaffected by this fix. This includes:
- Data storage and retrieval operations
- User interface rendering and styling
- Excel export functionality
- Modal display and interactions
- All existing business logic for BKU management

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Synchronous State Updates**: The load function makes three consecutive setState calls without batching
   - `setRiwayat(data)` triggers a re-render
   - `setActiveGroup(firstKey)` triggers another re-render
   - `setActiveEntry(latestEntry)` triggers a third re-render
   - Each setState causes React to schedule a re-render immediately

2. **Missing useEffect Dependency**: The useEffect hook at line 46 doesn't include `activeEntry` in its dependency array
   - The load function references `activeEntry` in its closure
   - When the component re-renders with a new activeEntry value, the useEffect callback still uses the stale value
   - This violates the Rules of Hooks and can cause incorrect behavior

3. **Additional Performance Issues**:
   - **Unused Code**: BarChart function in Dashboard.jsx is defined but not used
   - **Unused Variables**: failCount and detailEnd variables in multiple components serve no purpose
   - **Fast Refresh Issue**: MasterKodeKegiatan.jsx may have Fast Refresh problems due to complex state logic
   - **Security Concern**: Password storage in localStorage without encryption

4. **Bundle Size Impact**:
   - Unused code increases bundle size unnecessarily
   - Lack of code splitting affects initial load performance

## Correctness Properties

Property 1: Bug Condition - Synchronous State Updates Fixed

_For any_ component render where the bug condition holds (isBugCondition returns true), the fixed RiwayatBKU component SHALL batch state updates to minimize re-renders and include all necessary dependencies in useEffect hooks.

**Validates: Requirements 2.1, 2.2, 2.3**

Property 2: Preservation - Existing Functionality Maintained

_For any_ user interaction or data operation that does NOT involve synchronous setState calls or missing dependencies, the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for data loading, display, and user interactions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/components/RiwayatBKU.jsx`

**Function**: `RiwayatBKU()`

**Specific Changes**:
1. **Batch State Updates**: Replace synchronous setState calls with batched updates
   - Use functional updates where appropriate
   - Consider using `useReducer` or state object for related state
   - Implement `ReactDOM.unstable_batchedUpdates` if needed

2. **Fix useEffect Dependency**: Add `activeEntry` to useEffect dependency array
   - Update line 46: `useEffect(() => { load(false) }, [])` → `useEffect(() => { load(false) }, [activeEntry])`
   - Or refactor load function to not depend on activeEntry

3. **Refactor load function**: Optimize state update logic
   - Calculate all state changes first, then update once
   - Use object spread or reducer pattern for related state
   - Add proper cleanup for stale closures

4. **Address Additional Issues**:
   - Remove unused BarChart function from Dashboard.jsx
   - Remove unused failCount and detailEnd variables
   - Fix Fast Refresh in MasterKodeKegiatan.jsx
   - Implement basic password hashing for localStorage storage
   - Add code splitting for better performance

5. **Performance Optimization**:
   - Implement React.memo for expensive components
   - Use useCallback for event handlers
   - Add proper cleanup in useEffect hooks
   - Consider virtual scrolling for large data sets

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that simulate component mounting and measure re-render counts. Run these tests on the UNFIXED code to observe failures and understand the root cause.

**Test Cases**:
1. **Mount Performance Test**: Measure re-render count when component mounts (will show 3+ re-renders on unfixed code)
2. **Dependency Test**: Verify useEffect has missing dependency (will fail on unfixed code)
3. **Stale Closure Test**: Test that activeEntry preservation works correctly (may fail on unfixed code)
4. **Memory Leak Test**: Check for potential memory leaks from stale closures (may fail on unfixed code)

**Expected Counterexamples**:
- Component re-renders 3+ times on initial mount
- useEffect dependency array missing `activeEntry`
- Potential incorrect active entry preservation
- Possible memory leaks from stale event handlers

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL componentState WHERE isBugCondition(componentState) DO
  result := RiwayatBKU_fixed(componentState)
  ASSERT reRenderCount(result) <= 1
  ASSERT hasAllDependencies(result.useEffect)
  ASSERT noStaleClosures(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL userInteraction WHERE NOT isBugCondition(userInteraction) DO
  ASSERT RiwayatBKU_original(userInteraction) = RiwayatBKU_fixed(userInteraction)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for data loading and user interactions, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Data Loading Preservation**: Observe that data loads correctly on unfixed code, then write test to verify this continues after fix
2. **UI Display Preservation**: Observe that UI displays correctly on unfixed code, then write test to verify this continues after fix
3. **User Interaction Preservation**: Observe that all user interactions work on unfixed code, then write test to verify this continues after fix
4. **Export Functionality Preservation**: Observe that Excel export works on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test useEffect dependency array includes all necessary dependencies
- Test state updates are batched properly
- Test load function handles all edge cases (empty data, single entry, multiple entries)
- Test active entry preservation logic
- Test cleanup functions work correctly

### Property-Based Tests

- Generate random riwayat data sets and verify rendering performance
- Generate random user interactions and verify behavior preservation
- Test that all non-state-update functionality works across many scenarios
- Verify no regressions in data loading and display logic

### Integration Tests

- Test full component lifecycle from mount to unmount
- Test interaction with child components (Modal, KonversiBKU, TambahTransaksi)
- Test integration with localStorage data layer
- Test that visual feedback (toasts) occurs correctly
