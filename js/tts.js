// tts.js - TTS 发音封装

let _voicesReady = false;

function speak(word) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const voices = window.speechSynthesis.getVoices();

  // iOS Safari 首次调用时 voices 可能为空，等待 voiceschanged 后重试
  if (voices.length === 0 && !_voicesReady) {
    const onReady = () => {
      _voicesReady = true;
      window.speechSynthesis.removeEventListener('voiceschanged', onReady);
      speak(word); // 重试
    };
    window.speechSynthesis.addEventListener('voiceschanged', onReady);
    // 设置超时，避免永远等待
    setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', onReady);
      // 即使没有 voices 也尝试朗读
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

// Preload voices
if (window.speechSynthesis) {
  const initialVoices = window.speechSynthesis.getVoices();
  if (initialVoices.length > 0) _voicesReady = true;
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
    _voicesReady = true;
  };
}

export { speak };
