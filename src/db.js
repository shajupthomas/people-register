const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const { isISODate, todayISO } = require('./dates');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  baptism_name TEXT NOT NULL,
  house_name TEXT NOT NULL,
  father_name TEXT NOT NULL,
  mother_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  residence_start TEXT NOT NULL,
  permanent_parish TEXT NOT NULL,
  diocese TEXT NOT NULL,
  dob TEXT NOT NULL,
  registration_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;

const TEXT_FIELDS = [
  ['baptism_name', 80, 'Baptism name'],
  ['house_name', 80, 'House name'],
  ['father_name', 80, "Father's name"],
  ['mother_name', 80, "Mother's name"],
  ['permanent_parish', 160, 'Permanent parish and place'],
  ['diocese', 120, 'Diocese'],
];

const REQUIRED_COLUMNS = [
  'id', 'baptism_name', 'house_name', 'father_name', 'mother_name', 'gender',
  'residence_start', 'permanent_parish', 'diocese', 'dob', 'registration_date',
];

function tidy(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function validateMember(input, today = todayISO()) {
  const member = {};
  for (const [field, limit, label] of TEXT_FIELDS) {
    const value = tidy(input?.[field]);
    if (!value) throw new Error(`${label} is required.`);
    if (value.length > limit) throw new Error(`${label} must be ${limit} characters or fewer.`);
    member[field] = value;
  }

  const gender = tidy(input?.gender);
  if (gender !== 'Male' && gender !== 'Female') throw new Error('Select Male or Female.');
  member.gender = gender;

  const dates = [
    ['dob', 'Date of birth'],
    ['residence_start', 'Residence start date'],
    ['registration_date', 'Registration date'],
  ];
  for (const [field, label] of dates) {
    const value = tidy(input?.[field]);
    if (!isISODate(value)) throw new Error(`Enter a valid ${label.toLowerCase()}.`);
    member[field] = value;
  }

  if (!isISODate(today)) throw new Error('Enter a valid date.');
  if (member.dob > today) throw new Error('Date of birth cannot be in the future.');
  if (member.residence_start < member.dob) {
    throw new Error('Residence start date cannot be earlier than the date of birth.');
  }
  if (member.residence_start > today) throw new Error('Residence start date cannot be in the future.');
  if (member.registration_date < member.dob) {
    throw new Error('Registration date cannot be earlier than the date of birth.');
  }
  return member;
}

function publicMember(row) {
  return {
    id: Number(row.id),
    baptism_name: row.baptism_name,
    house_name: row.house_name,
    father_name: row.father_name,
    mother_name: row.mother_name,
    gender: row.gender,
    residence_start: row.residence_start,
    permanent_parish: row.permanent_parish,
    diocese: row.diocese,
    dob: row.dob,
    registration_date: row.registration_date,
  };
}

class RegisterDb {
  constructor(db, filePath, SQL) {
    this.db = db;
    this.filePath = filePath;
    this.SQL = SQL;
  }

  persist() {
    const data = Buffer.from(this.db.export());
    const directory = path.dirname(this.filePath);
    fs.mkdirSync(directory, { recursive: true });
    const tmp = `${this.filePath}.tmp`;
    const handle = fs.openSync(tmp, 'w');
    try {
      fs.writeSync(handle, data);
      fs.fsyncSync(handle);
    } finally {
      fs.closeSync(handle);
    }
    fs.renameSync(tmp, this.filePath);
  }

  all(sql, params = []) {
    const statement = this.db.prepare(sql);
    statement.bind(params);
    const rows = [];
    while (statement.step()) rows.push(statement.getAsObject());
    statement.free();
    return rows;
  }

  get(sql, params = []) {
    return this.all(sql, params)[0] || null;
  }

  getMember(id) {
    const row = this.get('SELECT * FROM members WHERE id = ?', [id]);
    return row ? publicMember(row) : null;
  }

  list(query = '') {
    const text = tidy(query).replace(/[%_]/g, '').slice(0, 80);
    const total = Number(this.get('SELECT COUNT(*) AS n FROM members').n);
    if (!text) {
      const rows = this.all('SELECT * FROM members ORDER BY baptism_name, house_name, id');
      return { members: rows.map(publicMember), total };
    }
    const like = `%${text}%`;
    const rows = this.all(
      `SELECT * FROM members
       WHERE baptism_name LIKE ? COLLATE NOCASE
          OR house_name LIKE ? COLLATE NOCASE
          OR father_name LIKE ? COLLATE NOCASE
          OR mother_name LIKE ? COLLATE NOCASE
       ORDER BY baptism_name, house_name, id`,
      [like, like, like, like],
    );
    return { members: rows.map(publicMember), total };
  }

  create(input, today) {
    const member = validateMember(input, today);
    const now = new Date().toISOString();
    this.db.run(
      `INSERT INTO members (
        baptism_name, house_name, father_name, mother_name, gender,
        residence_start, permanent_parish, diocese, dob, registration_date,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        member.baptism_name, member.house_name, member.father_name, member.mother_name,
        member.gender, member.residence_start, member.permanent_parish, member.diocese,
        member.dob, member.registration_date, now, now,
      ],
    );
    const id = Number(this.get('SELECT last_insert_rowid() AS id').id);
    this.persist();
    return this.getMember(id);
  }

  update(id, input, today) {
    const memberId = assertId(id);
    if (!this.getMember(memberId)) throw new Error('That member could not be found.');
    const member = validateMember(input, today);
    this.db.run(
      `UPDATE members SET
        baptism_name = ?, house_name = ?, father_name = ?, mother_name = ?, gender = ?,
        residence_start = ?, permanent_parish = ?, diocese = ?, dob = ?,
        registration_date = ?, updated_at = ?
       WHERE id = ?`,
      [
        member.baptism_name, member.house_name, member.father_name, member.mother_name,
        member.gender, member.residence_start, member.permanent_parish, member.diocese,
        member.dob, member.registration_date, new Date().toISOString(), memberId,
      ],
    );
    this.persist();
    return this.getMember(memberId);
  }

  remove(id) {
    const memberId = assertId(id);
    if (!this.getMember(memberId)) throw new Error('That member could not be found.');
    this.db.run('DELETE FROM members WHERE id = ?', [memberId]);
    this.persist();
    return { deleted: true };
  }

  getSetting(key) {
    const row = this.get('SELECT value FROM settings WHERE key = ?', [key]);
    return row ? row.value : '';
  }

  setSetting(key, value) {
    this.db.run(
      'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
      [key, value],
    );
    this.persist();
  }

  getSettings() {
    return {
      parishEmail: this.getSetting('parishEmail'),
      dbPath: this.filePath,
      memberCount: Number(this.get('SELECT COUNT(*) AS n FROM members').n),
    };
  }

  setEmail(parishEmail) {
    const email = tidy(parishEmail);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid parish email, or leave it blank.');
    }
    if (email.length > 120) throw new Error('Parish email must be 120 characters or fewer.');
    this.setSetting('parishEmail', email);
    return this.getSettings();
  }

  exportTo(destPath) {
    this.persist();
    fs.copyFileSync(this.filePath, destPath);
    return destPath;
  }

  importFrom(sourcePath) {
    const bytes = fs.readFileSync(sourcePath);
    let incoming;
    try {
      incoming = new this.SQL.Database(bytes);
    } catch {
      throw new Error("This file is not a People's Register database.");
    }
    try {
      assertRegisterDatabase(incoming);
    } catch (error) {
      const message = error && error.message ? error.message : '';
      if (message.includes("People's Register")) throw error;
      throw new Error("This file is not a People's Register database.");
    } finally {
      incoming.close();
    }
    const directory = path.dirname(this.filePath);
    fs.mkdirSync(directory, { recursive: true });
    const tmp = `${this.filePath}.import`;
    fs.writeFileSync(tmp, bytes);
    fs.renameSync(tmp, this.filePath);
    this.db.close();
    this.db = new this.SQL.Database(fs.readFileSync(this.filePath));
    this.db.exec(SCHEMA);
    return this.getSettings();
  }

  close() {
    this.db.close();
  }
}

function assertId(id) {
  const number = Number(id);
  if (!Number.isInteger(number) || number <= 0) throw new Error('That member could not be found.');
  return number;
}

function assertRegisterDatabase(database) {
  const statement = database.prepare('PRAGMA table_info(members)');
  const columns = [];
  while (statement.step()) columns.push(statement.getAsObject().name);
  statement.free();
  const missing = REQUIRED_COLUMNS.filter((name) => !columns.includes(name));
  if (missing.length) throw new Error("This file is not a People's Register database.");
}

async function openDatabase(filePath, wasmFile) {
  if (!wasmFile || !fs.existsSync(wasmFile)) {
    throw new Error('Could not find the local database engine.');
  }
  const SQL = await initSqlJs({ locateFile: () => wasmFile });
  const existed = fs.existsSync(filePath);
  const db = existed ? new SQL.Database(fs.readFileSync(filePath)) : new SQL.Database();
  db.exec(SCHEMA);
  const register = new RegisterDb(db, filePath, SQL);
  if (!existed) register.persist();
  return register;
}

module.exports = {
  openDatabase,
  validateMember,
  RegisterDb,
};
