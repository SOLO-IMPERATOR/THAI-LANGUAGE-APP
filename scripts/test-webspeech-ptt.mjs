/**
 * Unit tests for Web Speech PTT lifecycle (no auto-restart).
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

  /** Simulate browser ending session early (Android silence timeout). */
  emitBrowserEnd() {
    this._started = false;
    this.onend?.();
  }

  emitResult(text, isFinal = false) {
    this.onresult?.({
      resultIndex: 0,
      results: [
        {
          isFinal,
          0: { transcript: text, confidence: 0.9 },
          length: 1
        }
      ]
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

async function flush() {
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
}

async function testHoldStartStopOnce() {
  resetFake();
  speechService.abortRecognitionHard();
  const ends = [];
  const handle = speechService.startThaiRecognition({
    onEnd: (text, meta) => ends.push({ text, meta })
  });
  await flush();
  assert(FakeRecognition.startCount === 1, 'should start once');
  FakeRecognition.instances[0].emitResult('สวัสดี', true);
  handle.stop();
  await flush();
  assert(FakeRecognition.stopCount === 1, 'should stop once');
  assert(FakeRecognition.startCount === 1, 'must NOT restart after stop');
  assert(ends.length === 1, 'onEnd once');
  assert(ends[0].text.includes('สวัสดี'), 'transcript kept');
  assert(ends[0].meta.intentional === true, 'intentional stop');
  console.log('✓ hold start/stop once');
}

async function testBrowserEndDoesNotRestart() {
  resetFake();
  speechService.abortRecognitionHard();
  const ends = [];
  speechService.startThaiRecognition({
    onEnd: (text, meta) => ends.push({ text, meta })
  });
  await flush();
  FakeRecognition.instances[0].emitResult('ครับ', false);
  FakeRecognition.instances[0].emitBrowserEnd();
  await flush();
  assert(FakeRecognition.startCount === 1, 'no auto-restart on browser end');
  assert(ends.length === 1, 'onEnd after browser end');
  assert(ends[0].meta.intentional === false, 'not intentional');
  console.log('✓ browser end does not restart (no mic beep loop)');
}

async function testSecondHoldGetsFreshInstance() {
  resetFake();
  speechService.abortRecognitionHard();
  const h1 = speechService.startThaiRecognition({ onEnd: () => {} });
  await flush();
  h1.stop();
  await flush();
  const h2 = speechService.startThaiRecognition({ onEnd: () => {} });
  await flush();
  assert(FakeRecognition.startCount === 2, 'second hold starts again');
  assert(FakeRecognition.instances.length === 2, 'fresh instance per hold');
  h2.stop();
  await flush();
  console.log('✓ second hold uses fresh instance');
}

await testHoldStartStopOnce();
await testBrowserEndDoesNotRestart();
await testSecondHoldGetsFreshInstance();
console.log('\nAll Web Speech PTT tests passed.');
