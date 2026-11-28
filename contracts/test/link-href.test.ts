import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { isLinkHref } from '../src/ui.ts';

test('isLinkHref: лише абсолютні http(s)', () => {
  assert.equal(isLinkHref('http://127.0.0.1:4711'), true);
  assert.equal(isLinkHref('https://mac.tailnet.ts.net/app/#overview'), true);
  for (const bad of ['javascript:alert(1)', 'file:///etc/passwd', '//evil.example', '/app', 'http://', 'http:// host', 'ftp://host', '']) {
    assert.equal(isLinkHref(bad), false, bad);
  }
});
