// tts.js - TTS 发音封装

let _voicesReady = false;
let _pendingCallback = null; // 防止重复注册 voiceschanged

function speak(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const voices = window.speechSynthesis.getVoices();

  // iOS Safari 首次调用时 voices 可能为空，等待 voiceschanged 后重试
  if (voices.length === 0 && !_voicesReady) {
    // 清除上次挂的 listener，避免重复注册
    if (_pendingCallback) {
      window.speechSynthesis.removeEventListener('voiceschanged', _pendingCallback);
    }
    _pendingCallback = () => {
      _voicesReady = true;
      window.speechSynthesis.removeEventListener('voiceschanged', _pendingCallback);
      _pendingCallback = null;
      speak(word); // 重试
    };
    window.speechSynthesis.addEventListener('voiceschanged', _pendingCallback);
    // 设置超时，避免永远等待
    setTimeout(() => {
      if (_pendingCallback) {
        window.speechSynthesis.removeEventListener('voiceschanged', _pendingCallback);
        _pendingCallback = null;
      }
      _voicesReady = true;
      _doSpeak(word, []);
    }, 1000);
    return;
  }

  _doSpeak(word, voices);
}

function _doSpeak(word, voices) {
  if (!window.speechSynthesis) return;
  const u = new SpeechSynthesisUtterance(word);
  u.lang = 'en-US';
  const en = voices.find(v => v.lang.startsWith('en-US')) || voices.find(v => v.lang.startsWith('en'));
  if (en) u.voice = en;
  window.speechSynthesis.speak(u);
}

// Preload voices（只注册一次 onvoiceschanged）
if (window.speechSynthesis) {
  const initialVoices = window.speechSynthesis.getVoices();
  if (initialVoices.length > 0) {
    _voicesReady = true;
  } else {
    window.speechSynthesis.addEventListener('voiceschanged', function onLoad() {
      window.speechSynthesis.getVoices();
      _voicesReady = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onLoad);
    });
  }
}

export { speak };
