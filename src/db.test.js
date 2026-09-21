const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { openDatabase, validateMember } = require('./db');

const wasm = path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm');
const TODAY = '2026-09-21';

function sample(overrides = {}) {
  return {
    baptism_name: 'Thomas',
    house_name: 'Palamattam',
    father_name: 'Joseph Palamattam',
    mother_name: 'Mary Palamattam',
    gender: 'Male',
    residence_start: '2022-08-15',
    permanent_parish: 'St. Sebastian Church, Bendur',
    diocese: 'Diocese of Mangalore',
    dob: '1990-01-01',
    registration_date: TODAY,
    ...overrides,
  };
}

async function tempDb() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'register-'));
  const file = path.join(dir, 'parish-register.sqlite');
  const db = await openDatabase(file, wasm);
  return { db, file, dir };
}

test('saves a member and finds each name', async () => {
  const { db, dir } = await tempDb();
  try {
    const saved = db.create(sample({
      baptism_name: "  Thomas   ",
      father_name: "Joseph O'Brien",
    }), TODAY);
    assert.equal(saved.baptism_name, 'Thomas');
    assert.equal(saved.father_name, "Joseph O'Brien");
    assert.equal(saved.registration_date, TODAY);

    db.create(sample({
      baptism_name: 'Anna',
      house_name: 'D\'Souza',
      father_name: 'Peter D\'Souza',
      mother_name: 'Rosa D\'Souza',
      gender: 'Female',
    }), TODAY);

    assert.equal(db.list('THOMAS').members.length, 1);
    assert.equal(db.list('palamattam').members[0].baptism_name, 'Thomas');
    assert.equal(db.list("o'brien").members[0].id, saved.id);
    assert.equal(db.list('rosa').members[0].baptism_name, 'Anna');
    assert.equal(db.list('Bendur').members.length, 0);
    assert.equal(db.list('').total, 2);
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('updates, deletes, and reopens the database file', async () => {
  const { db, file, dir } = await tempDb();
  try {
    const saved = db.create(sample(), TODAY);
    const updated = db.update(saved.id, sample({ house_name: 'Kattar', gender: 'Female' }), TODAY);
    assert.equal(updated.house_name, 'Kattar');
    assert.equal(updated.gender, 'Female');
    assert.equal(db.remove(saved.id).deleted, true);
    assert.equal(db.list('').total, 0);

    const again = db.create(sample({ baptism_name: 'George' }), TODAY);
    db.setEmail('office@stalphonsa.example');
    db.close();

    const reopened = await openDatabase(file, wasm);
    assert.equal(reopened.getMember(again.id).baptism_name, 'George');
    assert.equal(reopened.getSettings().parishEmail, 'office@stalphonsa.example');
    reopened.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('rejects impossible dates and a bad email', async () => {
  assert.throws(() => validateMember(sample({ dob: '2026-09-22' }), TODAY), /future/);
  assert.throws(() => validateMember(sample({ residence_start: '1989-01-01' }), TODAY), /date of birth/);
  assert.throws(() => validateMember(sample({ gender: '' }), TODAY), /Male or Female/);

  const { db, dir } = await tempDb();
  try {
    assert.throws(() => db.setEmail('not-an-email'), /email/i);
    assert.equal(db.setEmail('').parishEmail, '');
  } finally {
    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('import replaces the register only for a real register file', async () => {
  const first = await tempDb();
  const second = await tempDb();
  try {
    first.db.create(sample({ baptism_name: 'First' }), TODAY);
    second.db.create(sample({ baptism_name: 'Second' }), TODAY);
    first.db.importFrom(second.file);
    assert.equal(first.db.list('').members[0].baptism_name, 'Second');
    assert.throws(() => first.db.importFrom(path.join(__dirname, 'dates.js')), /not a People's Register/);
  } finally {
    first.db.close();
    second.db.close();
    fs.rmSync(first.dir, { recursive: true, force: true });
    fs.rmSync(second.dir, { recursive: true, force: true });
  }
});
