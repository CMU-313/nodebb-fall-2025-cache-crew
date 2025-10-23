'use strict';

/**
 * tools/iroh-demo.js
 * Minimal Iroh dynamic-analysis demo with multi-API fallbacks.
 * Works with iroh@0.3.0 (dist/iroh-node.js export).
 */

/* eslint-disable no-new-func */
const iroh = require('iroh/dist/iroh-node.js');

// Tokens / namespaces available in iroh@0.3.0
const CALL = iroh.CALL;
const STAGE_NS = iroh.stage;
const StageCtor = iroh.Stage;

// Tiny snippet to execute (nice, observable output)
const SRC = `
  function endorsedLabel(on) { return on === true ? "Endorsed" : "Not Endorsed"; }
  console.log("->", endorsedLabel(true));
  console.log("->", endorsedLabel(false));
`;

// Unwrap helper (some versions box values as {value: ...})
const unwrap = (v) => (v && typeof v === 'object' && 'value' in v ? v.value : v);

// Listener tracking
let callDepth = 0;

// Optional listeners (best effort)
const listeners = {
  [CALL]: (e) => {
    const isEnter = e.type === 'enter' || !('type' in e);
    if (isEnter) {
      const name = (e.callee && e.callee.name) || '(anon)';
      const args = (e.arguments || e.args || []).map(unwrap);
      console.log('  '.repeat(callDepth) + 'call', name, JSON.stringify(args));
      callDepth++;
    } else {
      callDepth = Math.max(0, callDepth - 1);
      const name = (e.callee && e.callee.name) || '(anon)';
      const ret = unwrap(e.result ?? e.returnValue);
      console.log('  '.repeat(callDepth) + 'call end', name, '->', JSON.stringify(ret));
    }
  }
};

// Create stage with listeners properly attached
function createStageWithListeners(src) {
  let stage = null;
  
  // Try different Stage constructor patterns
  try {
    stage = new StageCtor(src);
  } catch (e1) {
    try {
      stage = new StageCtor(src, {});
    } catch (e2) {
      console.error('[iroh-demo] Failed to create Stage:', e2.message);
      return null;
    }
  }
  
  // Try to attach listener
  if (stage && typeof CALL === 'number') {
    try {
      // Method 1: .on() interface
      if (typeof stage.on === 'function') {
        stage.on(CALL, listeners[CALL]);
        console.error('[iroh-demo] Attached listener via stage.on()');
      } 
      // Method 2: .addListener() interface
      else if (typeof stage.addListener === 'function') {
        stage.addListener(CALL, listeners[CALL]);
        console.error('[iroh-demo] Attached listener via stage.addListener()');
      }
      // Method 3: Direct listener assignment
      else if (stage.listeners && typeof stage.listeners === 'object') {
        if (!stage.listeners[CALL]) stage.listeners[CALL] = [];
        stage.listeners[CALL].push(listeners[CALL]);
        console.error('[iroh-demo] Attached listener via stage.listeners array');
      }
    } catch (err) {
      console.error('[iroh-demo] Listener attachment failed:', err.message);
    }
  }
  
  return stage;
}

// Execute a program produced by Iroh
function runProgram(prog) {
  // Already-executable shapes
  if (typeof prog === 'function') { prog(); return 'function(prog)'; }
  if (prog && typeof prog.run === 'function') { prog.run(); return 'prog.run()'; }
  if (prog && typeof prog.execute === 'function') { prog.execute(); return 'prog.execute()'; }
  if (prog && prog.stage && typeof prog.stage.run === 'function') { prog.stage.run(); return 'prog.stage.run()'; }

  // Instance pattern
  if (iroh && typeof iroh.instance === 'function') {
    try {
      const inst = iroh.instance(prog);
      if (typeof inst === 'function') { inst(); return 'instance()'; }
      if (inst && typeof inst.run === 'function') { inst.run(); return 'instance.run()'; }
      if (inst && typeof inst.execute === 'function') { inst.execute(); return 'instance.execute()'; }
    } catch (_) { /* continue */ }
  }

  // Compiled script holder (function or string)
  if (prog && typeof prog.script === 'function') { prog.script(); return 'prog.script()'; }
  if (prog && typeof prog.script === 'string') {
    // Make Iroh available as a global when executing the generated script
    const originalIroh = global.Iroh;
    try {
      global.Iroh = iroh;
      const fn = new Function(prog.script);
      fn();
      return 'new Function(prog.script) with global.Iroh';
    } finally {
      // Restore original state
      if (originalIroh === undefined) {
        delete global.Iroh;
      } else {
        global.Iroh = originalIroh;
      }
    }
  }

  return null;
}

(function main() {
  if (typeof CALL !== 'number') {
    console.error('[iroh-demo] CALL token missing. Export keys:', Object.keys(iroh));
    process.exit(2);
  }

  console.error('[iroh-demo] Creating Stage with listeners...');
  const stage = createStageWithListeners(SRC);
  
  if (!stage) {
    console.error('[iroh-demo] Failed to create Stage object');
    console.error('[iroh-demo] iroh keys:', Object.keys(iroh));
    process.exit(2);
  }

  const how = runProgram(stage);
  if (!how) {
    console.error('[iroh-demo] Built program but could not execute. typeof:', typeof stage, 'keys:', Object.keys(stage || {}));
    if (stage && 'script' in stage) {
      console.error('[iroh-demo] typeof stage.script =', typeof stage.script);
    }
    process.exit(2);
  }

  console.error(`[iroh-demo] OK via ${how}`);
  process.exit(0);
})();