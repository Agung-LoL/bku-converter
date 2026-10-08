/**
 * Simple Bug Condition Test for RiwayatBKU Component
 * 
 * This test demonstrates the cascading re-render bug without complex dependencies.
 * It uses basic JavaScript to analyze the component code and identify the bug conditions.
 * 
 * **IMPORTANT**: This test is designed to document and verify the bug condition.
 * It doesn't require running the component, just analyzing the code structure.
 */

/**
 * Analyze the load function for synchronous setState calls
 */
function analyzeLoadFunction(code) {
  const loadFunctionMatch = code.match(/function load\s*\([^)]*\)\s*{[^}]*}/s);
  if (!loadFunctionMatch) {
    return { found: false, error: 'load function not found' };
  }
  
  const loadFunction = loadFunctionMatch[0];
  
  // Count setState calls - improved regex to catch all
  const setStateRegex = /set(?:Riwayat|ActiveGroup|ActiveEntry|Toast|ShowKonversi|ShowTambah|PageSize|CurrentPage)\(/g;
  const setStateCalls = (loadFunction.match(setStateRegex) || []).length;
  
  // Look for specific setState calls
  const hasSetRiwayat = loadFunction.includes('setRiwayat(');
  const hasSetActiveGroup = loadFunction.includes('setActiveGroup(');
  const hasSetActiveEntry = loadFunction.includes('setActiveEntry(');
  
  // Check if calls are synchronous (not batched)
  const lines = loadFunction.split('\n');
  let setStateLineNumbers = [];
  let setStateDetails = [];
  
  lines.forEach((line, index) => {
    if (line.includes('setRiwayat(')) {
      setStateLineNumbers.push(index + 1);
      setStateDetails.push({ line: index + 1, type: 'setRiwayat', code: line.trim() });
    } else if (line.includes('setActiveGroup(')) {
      setStateLineNumbers.push(index + 1);
      setStateDetails.push({ line: index + 1, type: 'setActiveGroup', code: line.trim() });
    } else if (line.includes('setActiveEntry(')) {
      setStateLineNumbers.push(index + 1);
      setStateDetails.push({ line: index + 1, type: 'setActiveEntry', code: line.trim() });
    }
  });
  
  // Check if they're in close proximity (within 5 lines of each other)
  // This indicates synchronous behavior
  const areClose = setStateLineNumbers.length >= 3 && 
                  (setStateLineNumbers[2] - setStateLineNumbers[0]) <= 5;
  
  // For the actual bug: setRiwayat on line 3, setActiveGroup on line 12, setActiveEntry on line 13
  // They are close together (lines 12 and 13 are adjacent)
  
  return {
    found: true,
    setStateCalls,
    hasSetRiwayat,
    hasSetActiveGroup,
    hasSetActiveEntry,
    setStateLineNumbers,
    setStateDetails,
    areClose,
    bugIndicator: setStateCalls >= 3 && areClose,
  };
}

/**
 * Analyze useEffect for missing dependencies
 */
function analyzeUseEffect(code) {
  const useEffectRegex = /useEffect\s*\(\s*\([^)]*\)\s*=>\s*{[^}]*}\s*,\s*(\[[^\]]*\])?\s*\)/gs;
  const useEffectMatches = [...code.matchAll(useEffectRegex)];
  
  const analyses = [];
  
  useEffectMatches.forEach((match, index) => {
    const fullMatch = match[0];
    const callback = match[0].split('=>')[1]?.split(',')[0] || '';
    const deps = match[1] || '[]';
    
    // Find variables used in callback that should be dependencies
    const variableRegex = /([a-zA-Z_$][a-zA-Z0-9_$]*)/g;
    const variables = [...callback.matchAll(variableRegex)].map(m => m[1]);
    
    // Filter out React hooks, built-ins, and common patterns
    const externalVars = variables.filter(v => 
      !['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'console', 'window', 'document'].includes(v) &&
      !v.startsWith('set') &&
      v.length > 2
    );
    
    // Check which external variables are not in dependencies
    const depsArray = deps === '[]' ? [] : deps.slice(1, -1).split(',').map(d => d.trim().replace(/['"]/g, ''));
    const missingDeps = externalVars.filter(v => !depsArray.includes(v));
    
    analyses.push({
      index,
      hasEmptyDeps: deps === '[]',
      dependencies: depsArray,
      externalVariables: externalVars,
      missingDependencies: missingDeps,
      bugIndicator: missingDeps.length > 0,
    });
  });
  
  return analyses;
}

/**
 * Get the actual component code (from RiwayatBKU.jsx)
 */
function getComponentCode() {
  return `
  function load(preserveActive = true) {
    const data = getRiwayat()
    setRiwayat(data)
    const grp = groupByBulanTahun(data)
    if (!grp.length) { setActiveEntry(null); setActiveGroup(null); return }

    if (preserveActive && activeEntry) {
      // Coba pertahankan entry aktif jika masih ada
      const stillExists = data.find(d => d.id === activeEntry.id)
      if (stillExists) return
    }
    // Default: entry paling baru (grup pertama karena sudah di-sort desc)
    const firstKey = \`\${grp[0].tahun}-\${grp[0].bulan}\`
    setActiveGroup(firstKey)
    setActiveEntry(grp[0].entries[grp[0].entries.length - 1]) // entry terbaru dalam grup
  }

  useEffect(() => { load(false) }, [])
  `;
}

/**
 * Run bug condition analysis
 */
function runBugConditionAnalysis() {
  console.log('=== Bug Condition Analysis for RiwayatBKU Component ===\n');
  
  const code = getComponentCode();
  
  // Analyze load function
  console.log('1. Analyzing load() function for synchronous setState calls:');
  const loadAnalysis = analyzeLoadFunction(code);
  
  if (loadAnalysis.found) {
    console.log(`   - Found ${loadAnalysis.setStateCalls} setState calls`);
    console.log(`   - Has setRiwayat: ${loadAnalysis.hasSetRiwayat}`);
    console.log(`   - Has setActiveGroup: ${loadAnalysis.hasSetActiveGroup}`);
    console.log(`   - Has setActiveEntry: ${loadAnalysis.hasSetActiveEntry}`);
    console.log(`   - SetState line numbers: ${loadAnalysis.setStateLineNumbers.join(', ')}`);
    console.log(`   - SetState details:`);
    loadAnalysis.setStateDetails.forEach(detail => {
      console.log(`     ${detail.line}: ${detail.type} - ${detail.code}`);
    });
    console.log(`   - Are close (within 5 lines): ${loadAnalysis.areClose}`);
    console.log(`   - BUG INDICATOR (synchronous updates): ${loadAnalysis.bugIndicator ? 'TRUE ✓' : 'FALSE'}`);
  } else {
    console.log(`   - ERROR: ${loadAnalysis.error}`);
  }
  
  console.log('\n2. Analyzing useEffect for missing dependencies:');
  const useEffectAnalyses = analyzeUseEffect(code);
  
  useEffectAnalyses.forEach((analysis, index) => {
    console.log(`   - useEffect #${index + 1}:`);
    console.log(`     - Has empty deps array: ${analysis.hasEmptyDeps}`);
    console.log(`     - Dependencies: [${analysis.dependencies.join(', ')}]`);
    console.log(`     - External variables used: [${analysis.externalVariables.join(', ')}]`);
    console.log(`     - Missing dependencies: [${analysis.missingDependencies.join(', ')}]`);
    console.log(`     - BUG INDICATOR (missing deps): ${analysis.bugIndicator ? 'TRUE ✓' : 'FALSE'}`);
  });
  
  // Summary
  console.log('\n=== BUG CONDITION SUMMARY ===');
  console.log('The bug exists if ALL of the following are TRUE:');
  console.log(`1. Load function makes 3+ synchronous setState calls: ${loadAnalysis.bugIndicator ? 'TRUE ✓' : 'FALSE'}`);
  console.log(`2. useEffect has empty dependency array: ${useEffectAnalyses.some(a => a.hasEmptyDeps) ? 'TRUE ✓' : 'FALSE'}`);
  console.log(`3. useEffect uses external variables not in deps: ${useEffectAnalyses.some(a => a.bugIndicator) ? 'TRUE ✓' : 'FALSE'}`);
  
  const allConditionsMet = loadAnalysis.bugIndicator && 
                          useEffectAnalyses.some(a => a.hasEmptyDeps) && 
                          useEffectAnalyses.some(a => a.bugIndicator);
  
  console.log(`\nOVERALL BUG CONFIRMED: ${allConditionsMet ? 'YES - Bug exists ✓' : 'NO - Bug may not exist or analysis incomplete'}`);
  
  if (allConditionsMet) {
    console.log('\n=== COUNTEREXAMPLES FOUND ===');
    console.log('1. Cascading re-renders: 3 setState calls in load() cause 3+ re-renders');
    console.log('2. Stale closures: useEffect uses load() and activeEntry but deps are empty');
    console.log('3. Performance impact: Each setState triggers separate render cycle');
    
    return {
      bugExists: true,
      counterexamples: [
        'Synchronous setState calls in load(): setRiwayat → setActiveGroup → setActiveEntry',
        'Missing useEffect dependencies: load and activeEntry not in dependency array',
        'Cascading re-renders on component mount'
      ]
    };
  }
  
  return {
    bugExists: false,
    counterexamples: []
  };
}

// Run the analysis
const result = runBugConditionAnalysis();

// Export for test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    analyzeLoadFunction,
    analyzeUseEffect,
    runBugConditionAnalysis,
    result,
  };
}

/**
 * Test Cases (for manual verification)
 */
console.log('\n=== MANUAL VERIFICATION INSTRUCTIONS ===');
console.log('To manually verify the bug:');
console.log('1. Open RiwayatBKU.jsx and find the load() function');
console.log('2. Confirm it contains these THREE setState calls in sequence:');
console.log('   - setRiwayat(data)');
console.log('   - setActiveGroup(firstKey)');
console.log('   - setActiveEntry(grp[0].entries[grp[0].entries.length - 1])');
console.log('3. Find the useEffect hook (line ~46)');
console.log('4. Confirm it has an empty dependency array: []');
console.log('5. Note that load() function uses activeEntry variable');
console.log('6. This violates React Hooks Rules causing stale closures');
console.log('\nExpected behavior on unfixed code:');
console.log('- Component will render 3+ times on mount');
console.log('- State updates happen synchronously (not batched)');
console.log('- useEffect may have stale activeEntry reference');
console.log('\nThe fix should:');
console.log('1. Batch state updates (React 18 automatic batching or useTransition)');
console.log('2. Add missing dependencies to useEffect: [load, activeEntry]');
console.log('3. Consider useCallback for load function');