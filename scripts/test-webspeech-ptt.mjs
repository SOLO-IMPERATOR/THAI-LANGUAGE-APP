/**
 * Unit tests for Web Speech PTT lifecycle (linear, no mid-hold restarts).
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
  speechService._sttLastEndedAt = 0;
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
  assert(FakeRecognition.startCount === 1, 'must NOT restart after stop');
  assert(ends.length === 1, 'onEnd once');
  assert(ends[0].text.includes('สวัสดี'), 'transcript kept');
  console.log('✓ hold start/stop once');
}

async function testPrematureEndDoesNotRestart() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  speechService._sttLastEndedAt = 0;
  const ends = [];
  speechService.startThaiRecognition({
    onEnd: (text, meta) => ends.push({ text, meta })
  });
  await waitStarted(1);
  FakeRecognition.instances.at(-1).emitBrowserEnd();
  await flush(400);
  assert(FakeRecognition.startCount === 1, 'no mid-hold restart');
  assert(ends.length === 1, 'ended once');
  console.log('✓ premature end does not restart');
}

async function testIdleStartIsImmediate() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  speechService._sttLastEndedAt = 0;
  const t0 = Date.now();
  speechService.startThaiRecognition({ onEnd: () => {} });
  await waitStarted(1);
  assert(Date.now() - t0 < 80, 'idle start should not wait settle');
  console.log('✓ idle start is immediate');
}

async function testSessionsSerializedWithSettle() {
  resetFake();
  speechService.abortRecognitionHard();
  speechService._sttGate = Promise.resolve();
  speechService._sttLastEndedAt = 0;
  const h1 = speechService.startThaiRecognition({ onEnd: () => {} });
  await waitStarted(1);
  h1.stop();
  await flush(40);
  // Start immediately after stop — must wait settle (~450ms), not pile starts
  const h2 = speechService.startThaiRecognition({ onEnd: () => {} });
  await flush(80);
  assert(FakeRecognition.startCount === 1, 'second start waits settle');
  await waitStarted(2, 2000);
  assert(FakeRecognition.startCount === 2, 'second start after settle');
  h2.stop();
  await flush(80);
  console.log('✓ sessions serialized with settle between holds');
}

await testHoldStartStopOnce();
await testPrematureEndDoesNotRestart();
await testIdleStartIsImmediate();
await testSessionsSerializedWithSettle();
console.log('\nAll Web Speech PTT tests passed.');
