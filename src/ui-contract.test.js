const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'renderer', 'styles.css'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));

test('the register form asks for every parish column', () => {
  for (const label of [
    'Baptism Name',
    'House Name',
    "Father's Name",
    "Mother's Name",
    'Gender',
    'Residence start date',
    'Permanent Parish',
    'Diocese',
    'DOB',
    'Registration date',
  ]) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /Search by baptism name, house name/);
  assert.match(html, /id="paper"/);
  assert.match(css, /@media print/);
});

test('the Windows package creates a desktop shortcut and embeds the cross icon', () => {
  assert.equal(pkg.build.win.icon, 'assets/icon.ico');
  assert.equal(pkg.build.nsis.createDesktopShortcut, 'always');
  assert.equal(pkg.build.nsis.createStartMenuShortcut, true);
  assert.match(main, /setAppUserModelId\('com\.stalphonsa\.peoplesregister'\)/);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'assets', 'icon.ico')), true);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'renderer', 'emblem.png')), true);
});
