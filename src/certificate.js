const { formatDisplayDate, isISODate } = require('./dates');

const LETTERHEAD = {
  churchName: 'ST. ALPHONSA SYRO-MALABAR CHURCH',
  addressLine: 'Kankanady, Mangalore, Karnataka – 575002',
  eparchy: 'Eparchy of Belthangady',
  phone: '+91 824 2432209',
  title: 'TEMPORARY RESIDENCE & PARISH MEMBERSHIP CERTIFICATE',
  seal: '(Parish Seal)',
  signLines: [
    'Rev. Fr. Parish Priest',
    'St. Alphonsa Forane Church',
    'Kankanady, Mangalore',
  ],
};

const PLACEHOLDER_EMAIL = '[Insert Parish Email]';
const BLANK_REF = '___________________';

function tidy(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function pronouns(gender) {
  if (gender === 'Male') {
    return { relation: 'son', subject: 'He', possessive: 'his', subjectLower: 'he' };
  }
  if (gender === 'Female') {
    return { relation: 'daughter', subject: 'She', possessive: 'her', subjectLower: 'she' };
  }
  throw new Error('Select Male or Female before preparing a certificate.');
}

function letterheadFields(parishEmail) {
  const email = tidy(parishEmail) || PLACEHOLDER_EMAIL;
  return {
    ...LETTERHEAD,
    email,
    emailIsPlaceholder: email === PLACEHOLDER_EMAIL,
    contactLine: `Phone: ${LETTERHEAD.phone} | Email: ${email}`,
  };
}

function fullName(member) {
  return tidy(`${member.baptism_name} ${member.house_name}`);
}

function buildCertificate(member, options = {}) {
  if (!member) throw new Error('Select a member before preparing a certificate.');
  const purpose = tidy(options.purpose).replace(/[.]+$/g, '');
  if (!purpose) throw new Error('Choose the purpose of this certificate.');
  if (purpose.length > 160) throw new Error('Purpose must be 160 characters or fewer.');
  if (!isISODate(options.issueDate)) throw new Error('The certificate date is not valid.');
  if (!isISODate(member.residence_start)) throw new Error('This member has no residence start date.');

  const voice = pronouns(member.gender);
  const name = fullName(member);
  const parents = `${tidy(member.father_name)} and ${tidy(member.mother_name)}`;
  const parish = `${tidy(member.permanent_parish)}, ${tidy(member.diocese)}`;
  const start = formatDisplayDate(member.residence_start);
  const end = formatDisplayDate(options.issueDate);
  const refNo = tidy(options.refNo);
  if (refNo.length > 40) throw new Error('Reference number must be 40 characters or fewer.');

  const paragraphOne = `This is to certify that ${name}, ${voice.relation} of ${parents}, whose permanent parish is ${parish}, has been temporarily residing within the parish boundaries of St. Alphonsa Church, Kankanady, Mangalore. ${voice.subject} has been a temporary member of our parish from ${start} to ${end}. During this period, ${voice.possessive} conduct and character have been exemplary, and ${voice.subjectLower} has actively participated in our parish community life.`;
  const paragraphTwo = `This certificate is issued at the request of the member for ${purpose}.`;

  return {
    ...letterheadFields(options.parishEmail),
    refNo,
    refDisplay: refNo || BLANK_REF,
    date: end,
    fullName: name,
    paragraphs: [paragraphOne, paragraphTwo],
  };
}

module.exports = {
  LETTERHEAD,
  PLACEHOLDER_EMAIL,
  BLANK_REF,
  letterheadFields,
  buildCertificate,
  fullName,
  pronouns,
};
