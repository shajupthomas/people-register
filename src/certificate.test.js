const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCertificate, letterheadFields, PLACEHOLDER_EMAIL } = require('./certificate');

const member = {
  baptism_name: 'Thomas',
  house_name: 'Palamattam',
  father_name: 'Joseph Palamattam',
  mother_name: 'Mary Palamattam',
  gender: 'Male',
  residence_start: '2022-08-15',
  permanent_parish: 'St. Sebastian Church, Bendur',
  diocese: 'Diocese of Mangalore',
  dob: '1990-01-01',
  registration_date: '2022-08-15',
};

test('male certificate uses the register and today\'s date', () => {
  const certificate = buildCertificate(member, {
    purpose: 'Marriage preparation',
    refNo: '12/2026',
    issueDate: '2026-09-21',
    parishEmail: 'office@stalphonsa.example',
  });

  assert.equal(certificate.churchName, 'ST. ALPHONSA SYRO-MALABAR CHURCH');
  assert.equal(certificate.addressLine, 'Kankanady, Mangalore, Karnataka – 575002');
  assert.equal(certificate.eparchy, 'Eparchy of Belthangady');
  assert.equal(certificate.contactLine, 'Phone: +91 824 2432209 | Email: office@stalphonsa.example');
  assert.equal(certificate.refDisplay, '12/2026');
  assert.equal(certificate.date, '21 / 09 / 2026');
  assert.equal(certificate.title, 'TEMPORARY RESIDENCE & PARISH MEMBERSHIP CERTIFICATE');
  assert.deepEqual(certificate.signLines, [
    'Rev. Fr. Parish Priest',
    'St. Alphonsa Forane Church',
    'Kankanady, Mangalore',
  ]);
  assert.equal(
    certificate.paragraphs[0],
    'This is to certify that Thomas Palamattam, son of Joseph Palamattam and Mary Palamattam, whose permanent parish is St. Sebastian Church, Bendur, Diocese of Mangalore, has been temporarily residing within the parish boundaries of St. Alphonsa Church, Kankanady, Mangalore. He has been a temporary member of our parish from 15 / 08 / 2022 to 21 / 09 / 2026. During this period, his conduct and character have been exemplary, and he has actively participated in our parish community life.',
  );
  assert.equal(
    certificate.paragraphs[1],
    'This certificate is issued at the request of the member for Marriage preparation.',
  );
});

test('female certificate uses daughter, She, and her', () => {
  const certificate = buildCertificate({ ...member, gender: 'Female', baptism_name: 'Anna' }, {
    purpose: 'Higher Studies.',
    refNo: '',
    issueDate: '2026-09-21',
    parishEmail: '',
  });
  assert.equal(certificate.email, PLACEHOLDER_EMAIL);
  assert.equal(certificate.refDisplay, '___________________');
  assert.match(certificate.paragraphs[0], /Anna Palamattam, daughter of/);
  assert.match(certificate.paragraphs[0], /She has been a temporary member/);
  assert.match(certificate.paragraphs[0], /her conduct and character/);
  assert.match(certificate.paragraphs[0], /and she has actively participated/);
  assert.doesNotMatch(certificate.paragraphs[0], /\bson\b|\bHe\b|\bhis\b/);
  assert.equal(
    certificate.paragraphs[1],
    'This certificate is issued at the request of the member for Higher Studies.',
  );
});

test('letterhead keeps the parish phone and eparchy', () => {
  const header = letterheadFields('  parish@example.org ');
  assert.equal(header.email, 'parish@example.org');
  assert.equal(header.emailIsPlaceholder, false);
  assert.equal(header.phone, '+91 824 2432209');
});

test('certificate rejects a missing purpose', () => {
  assert.throws(
    () => buildCertificate(member, { purpose: '   ', issueDate: '2026-09-21' }),
    /purpose/i,
  );
});
