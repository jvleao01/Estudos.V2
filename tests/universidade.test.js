const test = require('node:test');
const assert = require('node:assert');
const { ehMovel, URL_PORTAL, URL_APP } = require('../frontend/assets/js/universidade.js');

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  ipadAntigo: 'Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1 Mobile/15E148 Safari/604.1',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
};

test('celulares e tablets', () => {
  assert.strictEqual(ehMovel(UA.iphone, 5), true);
  assert.strictEqual(ehMovel(UA.ipadAntigo, 5), true);
  assert.strictEqual(ehMovel(UA.mac, 5), true); // iPad com iPadOS 13+ se apresenta como Mac
  assert.strictEqual(ehMovel(UA.android, 5), true);
});

test('computadores', () => {
  assert.strictEqual(ehMovel(UA.mac, 0), false);
  assert.strictEqual(ehMovel(UA.windows, 0), false);
  assert.strictEqual(ehMovel(UA.windows, 10), false); // notebook com tela de toque continua computador
});

test('endereços', () => {
  assert.strictEqual(URL_PORTAL, 'https://portal.siaaluno.com.br/sianet/Logon');
  assert.strictEqual(URL_APP, 'https://apps.apple.com/br/app/integrees/id1541892299');
});
