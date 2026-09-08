/**
 * Unit tests for Web Speech PTT lifecycle.
 * Run: node scripts/test-webspeech-ptt.mjs
 */

class FakeRecognition {
  constructor() {
    this.lang = '';
    this.continuous = false;
    this.interimResults = false;
    this.maxAlternatives = 1;
    this.onstart = null;
    this.onresult = null;
    this.onerror = null;
    this.onend = null;
    this._started = false;
    FakeRecognition.instances.push(this);
  }

  start() {
    if (this._started) throw new Error('already started');
    this._started = true;
    FakeRecognition.startCount += 1;
    queueMicrotask(() => this.onstart?.());
  }

  stop() {
    FakeRecognition.stopCount += 1;
    this._started = false;
    queueMicrotask(() => this.onend?.());
  }

  abort() {
    FakeRecognition.abortCount += 1;
    this._started = false;
    queueMicrotask(() => this.onend?.());
  }

  emitBrowserEnd() {
    this._started = false;
    this.onend?.();
  }

  emitResult(text, isFinal = false) {
    this.onresult?.({
      resultIndex: 0,
      results: [{ isFinal, 0: { transcript: text, confidence: 0.9 }, length: 1 }]
    });
  }
}

FakeRecognition.instances = [];
FakeRecognition.startCount = 0;
FakeRecognition.stopCount = 0;
FakeRecognition.abortCount = 0;

function resetFake() {
  FakeRecognition.instances = [];
  FakeRecognition.startCount = 0;
  FakeRecognition.stopCount = 0;
  FakeRecognition.abortCount = 0;
}

globalThis.window = globalThis;
globalThis.webkitSpeechRecognition = FakeRecognition;
globalThis.SpeechRecognition = FakeRecognition;

const { speechService } = await import('../src/speechService.js');

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function flush(ms = 0) {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitStarted(minCount = 1, timeoutMs = 2000) {
  const t0 = Date.now();
  while (FakeRecognition.startCount < minCount) {
    if (Date.now() - t0 > timeoutMs) {
      throw new Error(`timeout waiting for startCount>=${minCount}, got ${FakeRecognition.startCount}`);
    }
    await flush(20);
  }
}

async function testHoldStartStopOnce() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  const ends = [];
  const handle = speechService.startThaiRecognition({
    onEnd: (text, meta) => ends.push({ text, meta })
  });
  await waitStarted(1);
  assert(FakeRecognition.startCount === 1, 'should start once');
  FakeRecognition.instances.at(-1).emitResult('สวัสดี', true);
  handle.stop();
  await flush(80);
  assert(FakeRecognition.stopCount === 1, 'should stop once');
  assert(FakeRecognition.startCount === 1, 'must NOT loop-restart after stop');
  assert(ends.length === 1, 'onEnd once');
  assert(ends[0].text.includes('สวัสดี'), 'transcript kept');
  console.log('✓ hold start/stop once');
}

async function testPrematureEndRetriesOnceWhileHeld() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  let held = true;
  const ends = [];
  speechService.startThaiRecognition({
    wantHold: () => held,
    onEnd: (text, meta) => ends.push({ text, meta })
  });
  await waitStarted(1);
  assert(FakeRecognition.startCount === 1, 'first start');
  // Instant browser death while still held
  FakeRecognition.instances.at(-1).emitBrowserEnd();
  await waitStarted(2);
  assert(FakeRecognition.startCount === 2, 'one premature retry while held');
  assert(ends.length === 0, 'onEnd deferred until retry finishes');
  held = false;
  FakeRecognition.instances.at(-1).emitBrowserEnd();
  await flush(80);
  assert(ends.length === 1, 'onEnd after release/end');
  assert(FakeRecognition.startCount === 2, 'no further restarts');
  console.log('✓ premature end retries once while held');
}

async function testLateBrowserEndNoRestart() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  let held = true;
  const ends = [];
  speechService.startThaiRecognition({
    wantHold: () => held,
    onEnd: (text, meta) => ends.push({ text, meta })
  });
  await waitStarted(1);
  // Simulate longer session then browser silence timeout
  await flush(800);
  FakeRecognition.instances.at(-1).emitBrowserEnd();
  await flush(300);
  assert(FakeRecognition.startCount === 1, 'no restart after long session end');
  assert(ends.length === 1, 'ended');
  console.log('✓ late browser end does not restart');
}

async function testSessionsSerialized() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  const h1 = speechService.startThaiRecognition({ onEnd: () => {} });
  await waitStarted(1);
  h1.stop();
  await flush(20);
  // Start immediately without waiting full gate — should still serialize
  const h2 = speechService.startThaiRecognition({ onEnd: () => {} });
  await flush(20);
  assert(FakeRecognition.startCount === 1, 'second start waits for gate');
  await waitStarted(2);
  assert(FakeRecognition.startCount === 2, 'second start after settle');
  h2.stop();
  await flush(80);
  console.log('✓ sessions are serialized (no start-while-closing)');
}

await testHoldStartStopOnce();
await testPrematureEndRetriesOnceWhileHeld();
await testLateBrowserEndNoRestart();
await testSessionsSerialized();
console.log('\nAll Web Speech PTT tests passed.');
