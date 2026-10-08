/**
 * React Testing Utilities for analyzing hooks performance and behavior
 */

import { render, screen, act, fireEvent } from '@testing-library/react';
import { useState, useEffect, useRef } from 'react';

/**
 * Creates a mock for tracking render counts and state updates
 */
export function createRenderTracker() {
  const renderCount = { current: 0 };
  const stateUpdates = [];
  const effectCalls = [];
  
  return {
    getRenderCount: () => renderCount.current,
    getStateUpdates: () => [...stateUpdates],
    getEffectCalls: () => [...effectCalls],
    
    // Wrapper component to track renders
    withRenderTracking: (Component) => {
      return function TrackedComponent(props) {
        renderCount.current += 1;
        
        // Track state updates
        const originalUseState = useState;
        const trackedUseState = (initialState) => {
          const [state, setState] = originalUseState(initialState);
          const trackedSetState = (value) => {
            stateUpdates.push({
              timestamp: Date.now(),
              stateName: 'unknown', // Can be enhanced with proxy
              value,
              renderCount: renderCount.current,
            });
            return setState(value);
          };
          return [state, trackedSetState];
        };
        
        // Track effect calls
        const originalUseEffect = useEffect;
        const trackedUseEffect = (effect, deps) => {
          effectCalls.push({
            timestamp: Date.now(),
            dependencies: deps,
            renderCount: renderCount.current,
          });
          return originalUseEffect(effect, deps);
        };
        
        // Mock hooks for this render
        const MockedComponent = () => {
          // Temporarily replace hooks
          const originalHooks = { useState: global.React.useState, useEffect: global.React.useEffect };
          try {
            global.React.useState = trackedUseState;
            global.React.useEffect = trackedUseEffect;
            
            return Component(props);
          } finally {
            // Restore original hooks
            global.React.useState = originalHooks.useState;
            global.React.useEffect = originalHooks.useEffect;
          }
        };
        
        return <MockedComponent />;
      };
    },
  };
}

/**
 * Utility to measure React performance metrics
 */
export function createPerformanceMonitor() {
  const metrics = {
    renderTimes: [],
    stateUpdateCounts: [],
    effectExecutionTimes: [],
  };
  
  return {
    startMonitoring: () => {
      const startTime = performance.now();
      let renderStartTime = startTime;
      
      // Monkey patch render to measure time
      const originalRender = render;
      const monitoredRender = (ui, options) => {
        const result = originalRender(ui, options);
        
        // Measure time after first render
        const renderEndTime = performance.now();
        metrics.renderTimes.push(renderEndTime - renderStartTime);
        
        return result;
      };
      
      return {
        render: monitoredRender,
        getMetrics: () => ({ ...metrics }),
        startRender: () => { renderStartTime = performance.now(); },
      };
    },
  };
}

/**
 * Analyzes useEffect dependencies
 */
export function analyzeUseEffectDependencies(componentCode) {
  const useEffectRegex = /useEffect\s*\([^)]*\)/g;
  const useEffectMatches = componentCode.match(useEffectRegex) || [];
  
  const analyses = [];
  
  useEffectMatches.forEach((match, index) => {
    // Extract callback and dependencies
    const callbackMatch = match.match(/useEffect\s*\(\s*(\([^)]*\)|[^,]+)\s*,?\s*(\[[^\]]*\])?/);
    
    if (callbackMatch) {
      const callback = callbackMatch[1];
      const dependencies = callbackMatch[2];
      
      // Analyze closure variables
      const variableRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
      const variablesInCallback = callback.match(variableRegex) || [];
      
      // Filter out React hooks and common patterns
      const externalVariables = variablesInCallback.filter(v => 
        !['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'setState', 'state'].includes(v) &&
        !v.startsWith('set') &&
        v.length > 1
      );
      
      analyses.push({
        matchIndex: index,
        callback: callback.slice(0, 100) + (callback.length > 100 ? '...' : ''),
        dependencies: dependencies || '[]',
        externalVariables,
        missingDependencies: externalVariables.filter(v => 
          !dependencies || !dependencies.includes(v)
        ),
      });
    }
  });
  
  return analyses;
}

/**
 * Creates a test harness for RiwayatBKU component
 */
export function createRiwayatBKUTestHarness() {
  const mockData = [
    {
      id: '1',
      tanggal: '2024-01-15',
      noBukti: 'BKU-001',
      uraian: 'Belanja ATK',
      kegiatan: '423101',
      kodeRekening: '5.1.02.01.01',
      jumlah: 1500000,
      ppn: 0,
      pph: 0,
      total: 1500000,
      keterangan: 'ATK kantor',
    },
    {
      id: '2',
      tanggal: '2024-01-20',
      noBukti: 'BKU-002',
      uraian: 'Honorarium',
      kegiatan: '423101',
      kodeRekening: '5.1.02.02.01',
      jumlah: 2500000,
      ppn: 0,
      pph: 250000,
      total: 2750000,
      keterangan: 'Honor bulan Januari',
    },
  ];
  
  // Mock bkuStore functions
  const mockBkuStore = {
    getRiwayat: jest.fn(() => mockData),
    groupByBulanTahun: jest.fn((data) => {
      if (!data || data.length === 0) return [];
      return [
        {
          tahun: 2024,
          bulan: 1,
          entries: data,
        },
      ];
    }),
    groupByNoBukti: jest.fn(() => []),
    lookupUraianKegiatan: jest.fn(() => 'Test Uraian'),
    fmtRp: jest.fn((amount) => `Rp ${amount.toLocaleString('id-ID')}`),
    RIWAYAT_KEY: 'test-riwayat',
  };
  
  // Mock useStorage
  const mockUseStorage = {
    storageSet: jest.fn(),
  };
  
  return {
    mockData,
    mockBkuStore,
    mockUseStorage,
    
    getMocks: () => ({
      getRiwayat: mockBkuStore.getRiwayat,
      groupByBulanTahun: mockBkuStore.groupByBulanTahun,
      storageSet: mockUseStorage.storageSet,
    }),
    
    setupMocks: () => {
      jest.mock('../bkuStore', () => mockBkuStore);
      jest.mock('../useStorage', () => mockUseStorage);
    },
    
    cleanupMocks: () => {
      jest.resetModules();
    },
  };
}

/**
 * Measures re-render count for a component
 */
export async function measureReRenders(Component, props = {}) {
  const renderCount = { current: 0 };
  
  const TrackedComponent = () => {
    renderCount.current += 1;
    return Component(props);
  };
  
  const { rerender } = render(<TrackedComponent />);
  
  // Force a re-render to measure
  await act(async () => {
    rerender(<TrackedComponent />);
  });
  
  return renderCount.current;
}

export default {
  createRenderTracker,
  createPerformanceMonitor,
  analyzeUseEffectDependencies,
  createRiwayatBKUTestHarness,
  measureReRenders,
};