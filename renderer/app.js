const state = {
  view: 'register',
  editingId: null,
  certId: null,
  byId: new Map(),
  total: 0,
  parishEmail: '',
  previewReady: false,
};

const BLANK_REF = '___________________';

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function formatDisplayDate(iso) {
  const [year, month, day] = String(iso).split('-');
  return `${day} / ${month} / ${year}`;
}

function errorText(error) {
  const raw = error && error.message ? error.message : 'Something went wrong.';
  const wrapped = raw.match(/^Error invoking remote method '[^']+': (.*)$/);
  return wrapped ? wrapped[1] : raw;
}

let toastTimer;
function toast(message, kind = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = message;
  el.className = kind === 'error' ? 'toast error' : 'toast';
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 3400);
}

function showFormError(message) {
  const el = document.getElementById('formError');
  el.hidden = !message;
  el.textContent = message || '';
}

function remember(members) {
  for (const member of members) state.byId.set(member.id, member);
}

function selectedPurpose() {
  const purpose = document.getElementById('purpose').value;
  if (purpose === '__other') return document.getElementById('purposeOther').value.trim();
  return purpose.trim();
}

function refValue() {
  return document.getElementById('refNo').value.trim();
}

async function refreshMembers() {
  const query = document.getElementById('search').value.trim();
  const all = await window.register.list('');
  const shown = query ? await window.register.list(query) : all;
  state.byId = new Map(all.members.map((member) => [member.id, member]));
  state.total = all.total;
  document.getElementById('memberCount').textContent = String(all.total);
  renderTable(shown.members);
  if (state.view === 'certificate') renderCertPicker(await window.register.list(document.getElementById('certSearch').value.trim()));
}

function renderTable(members) {
  const empty = document.getElementById('empty');
  const wrap = document.getElementById('tableWrap');
  const body = document.getElementById('memberRows');
  body.replaceChildren();
  if (!members.length) {
    empty.hidden = false;
    wrap.hidden = true;
    document.getElementById('emptyText').textContent = state.total
      ? 'No names match that search.'
      : 'No members yet. Register the first person to begin the parish record.';
    document.querySelector('#empty .emblem').hidden = state.total > 0;
    return;
  }
  empty.hidden = true;
  wrap.hidden = false;
  for (const member of members) {
    const row = document.createElement('tr');
    row.append(
      cell(`${member.baptism_name} ${member.house_name}`, true),
      cell(member.father_name),
      cell(member.mother_name),
      genderCell(member.gender),
      cell(formatDisplayDate(member.residence_start)),
      parishCell(member),
      cell(formatDisplayDate(member.dob)),
      cell(formatDisplayDate(member.registration_date)),
      actionsCell(member),
    );
    body.append(row);
  }
}

function cell(text, strong = false) {
  const td = document.createElement('td');
  if (strong) {
    const name = document.createElement('strong');
    name.textContent = text;
    td.append(name);
  } else {
    td.textContent = text;
  }
  return td;
}

function genderCell(gender) {
  const td = document.createElement('td');
  const pill = document.createElement('span');
  pill.className = `pill ${gender === 'Female' ? 'female' : 'male'}`;
  pill.textContent = gender;
  td.append(pill);
  return td;
}

function parishCell(member) {
  const td = document.createElement('td');
  td.textContent = member.permanent_parish;
  const sub = document.createElement('span');
  sub.className = 'sub';
  sub.textContent = member.diocese;
  td.append(sub);
  return td;
}

function actionsCell(member) {
  const td = document.createElement('td');
  const box = document.createElement('div');
  box.className = 'row-actions';
  box.append(
    mini('Edit', 'ghost', () => beginEdit(member)),
    mini('Certificate', 'ghost', () => openCertificate(member.id)),
    mini('Remove', 'danger', () => removeMember(member)),
  );
  td.append(box);
  return td;
}

function mini(label, kind, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `btn mini ${kind}`;
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function renderCertPicker(result) {
  remember(result.members);
  const list = document.getElementById('certResults');
  list.replaceChildren();
  for (const member of result.members) {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    if (member.id === state.certId) button.className = 'selected';
    button.textContent = `${member.baptism_name} ${member.house_name} · ${member.gender} · DOB ${formatDisplayDate(member.dob)} · ${member.father_name}`;
    button.addEventListener('click', () => {
      state.certId = member.id;
      renderCertSummary();
      renderCertPicker(result);
      updatePreview().catch((error) => toast(errorText(error), 'error'));
    });
    item.append(button);
    list.append(item);
    if (member.id === state.certId) button.scrollIntoView({ block: 'nearest' });
  }
  renderCertSummary();
}

function renderCertSummary() {
  const summary = document.getElementById('certSummary');
  const member = state.byId.get(state.certId);
  summary.textContent = member
    ? `${member.baptism_name} ${member.house_name} · ${member.gender} · DOB ${formatDisplayDate(member.dob)} · residing from ${formatDisplayDate(member.residence_start)}`
    : 'No member selected.';
}

function fillLetterhead(header) {
  document.getElementById('certChurch').textContent = header.churchName;
  document.getElementById('certAddress').textContent = header.addressLine;
  document.getElementById('certEparchy').textContent = header.eparchy;
  const contact = document.getElementById('certContact');
  contact.textContent = header.contactLine;
  contact.classList.toggle('missing-email', header.emailIsPlaceholder);
  document.getElementById('certTitle').textContent = header.title;
  document.getElementById('certSeal').textContent = header.seal;
  const sign = document.getElementById('certSign');
  sign.replaceChildren();
  for (const line of header.signLines) {
    const row = document.createElement('div');
    row.textContent = line;
    sign.append(row);
  }
}

function setParagraphs(first, second, placeholder) {
  const para1 = document.getElementById('certPara1');
  const para2 = document.getElementById('certPara2');
  para1.textContent = first;
  para2.textContent = second || '';
  para1.classList.toggle('indent', !placeholder);
  para1.classList.toggle('placeholder', placeholder);
  para2.classList.toggle('indent', Boolean(second) && !placeholder);
  para2.hidden = !second;
}

function refreshPrintState() {
  const button = document.getElementById('printBtn');
  const hint = document.getElementById('printHint');
  button.disabled = !state.previewReady;
  if (!state.parishEmail) hint.textContent = 'Add the parish email in Parish Settings before printing.';
  else if (!state.certId) hint.textContent = 'Select the member this certificate is for.';
  else if (!selectedPurpose()) hint.textContent = 'Choose why the certificate is being issued.';
  else hint.textContent = 'Today’s date is filled in automatically. A blank reference number can be written by hand after printing.';
}

async function updatePreview() {
  const header = await window.register.letterhead();
  state.parishEmail = header.emailIsPlaceholder ? '' : header.email;
  fillLetterhead(header);
  const today = formatDisplayDate(todayISO());
  document.getElementById('issueDateLabel').textContent = today;
  document.getElementById('certDate').textContent = today;
  document.getElementById('certRef').textContent = refValue() || BLANK_REF;
  const purpose = selectedPurpose();
  if (!state.byId.get(state.certId)) {
    setParagraphs('Select a member to fill this certificate from the register.', '', true);
    state.previewReady = false;
    refreshPrintState();
    return;
  }
  if (!purpose) {
    setParagraphs('Choose a purpose to complete the certificate.', '', true);
    state.previewReady = false;
    refreshPrintState();
    return;
  }
  try {
    const certificate = await window.register.buildCertificate({
      id: state.certId,
      purpose,
      refNo: refValue(),
      issueDate: todayISO(),
    });
    fillLetterhead(certificate);
    document.getElementById('certRef').textContent = certificate.refDisplay;
    document.getElementById('certDate').textContent = certificate.date;
    setParagraphs(certificate.paragraphs[0], certificate.paragraphs[1], false);
    state.previewReady = !certificate.emailIsPlaceholder;
  } catch (error) {
    setParagraphs(errorText(error), '', true);
    state.previewReady = false;
  }
  refreshPrintState();
}

async function showView(name) {
  state.view = name;
  document.querySelectorAll('.view').forEach((view) => {
    view.classList.toggle('active', view.id === `view-${name}`);
  });
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === name);
  });
  if (name === 'members' || name === 'certificate') await refreshMembers();
  if (name === 'certificate') await updatePreview();
  if (name === 'settings') await loadSettings();
}

function readForm() {
  const data = new FormData(document.getElementById('memberForm'));
  return {
    baptism_name: data.get('baptism_name'),
    house_name: data.get('house_name'),
    father_name: data.get('father_name'),
    mother_name: data.get('mother_name'),
    gender: data.get('gender'),
    residence_start: data.get('residence_start'),
    permanent_parish: data.get('permanent_parish'),
    diocese: data.get('diocese'),
    dob: data.get('dob'),
    registration_date: data.get('registration_date'),
  };
}

function clearForm() {
  state.editingId = null;
  document.getElementById('memberForm').reset();
  document.getElementById('registrationDate').value = todayISO();
  document.getElementById('formTitle').textContent = 'Register a member';
  document.getElementById('saveBtn').textContent = 'Save member';
  document.getElementById('editingNote').hidden = true;
  showFormError('');
}

function beginEdit(member) {
  state.editingId = member.id;
  const form = document.getElementById('memberForm');
  for (const name of ['baptism_name', 'house_name', 'father_name', 'mother_name', 'residence_start', 'permanent_parish', 'diocese', 'dob', 'registration_date']) {
    form.elements[name].value = member[name];
  }
  for (const radio of form.querySelectorAll('input[name="gender"]')) {
    radio.checked = radio.value === member.gender;
  }
  document.getElementById('formTitle').textContent = 'Edit member';
  document.getElementById('saveBtn').textContent = 'Update member';
  document.getElementById('editingNote').hidden = false;
  showFormError('');
  showView('register');
}

async function openCertificate(id) {
  state.certId = id;
  document.getElementById('certSearch').value = '';
  await showView('certificate');
}

function confirmRemoval(message) {
  const modal = document.getElementById('modal');
  document.getElementById('modalText').textContent = message;
  modal.hidden = false;
  return new Promise((resolve) => {
    const ok = document.getElementById('modalOk');
    const cancel = document.getElementById('modalCancel');
    const finish = (value) => {
      modal.hidden = true;
      ok.removeEventListener('click', onOk);
      cancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      resolve(value);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    const onKey = (event) => {
      if (event.key === 'Escape') finish(false);
    };
    ok.addEventListener('click', onOk);
    cancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    cancel.focus();
  });
}

async function removeMember(member) {
  const yes = await confirmRemoval(`Remove ${member.baptism_name} ${member.house_name} from the register? This cannot be undone.`);
  if (!yes) return;
  try {
    await window.register.remove(member.id);
    if (state.editingId === member.id) clearForm();
    if (state.certId === member.id) state.certId = null;
    toast('Member removed.');
    await refreshMembers();
    if (state.view === 'certificate') await updatePreview();
  } catch (error) {
    toast(errorText(error), 'error');
  }
}

async function loadSettings() {
  const settings = await window.register.getSettings();
  state.parishEmail = settings.parishEmail;
  document.getElementById('parishEmail').value = settings.parishEmail;
  document.getElementById('dbPath').textContent = settings.dbPath;
  document.getElementById('settingsCount').textContent = String(settings.memberCount);
}

function bindEvents() {
  document.querySelectorAll('.nav-btn').forEach((button) => {
    button.addEventListener('click', () => {
      showView(button.dataset.view).catch((error) => toast(errorText(error), 'error'));
    });
  });

  document.getElementById('memberForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const payload = readForm();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.disabled = true;
    try {
      if (state.editingId) {
        await window.register.update(state.editingId, payload);
        toast('Member updated.');
      } else {
        await window.register.create(payload);
        toast('Member saved on this computer.');
      }
      clearForm();
      await refreshMembers();
    } catch (error) {
      showFormError(errorText(error));
    } finally {
      saveBtn.disabled = false;
    }
  });

  document.getElementById('clearBtn').addEventListener('click', clearForm);

  let searchTimer;
  document.getElementById('search').addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      refreshMembers().catch((error) => toast(errorText(error), 'error'));
    }, 150);
  });

  let certTimer;
  const queuePreview = () => {
    clearTimeout(certTimer);
    certTimer = setTimeout(() => {
      updatePreview().catch((error) => toast(errorText(error), 'error'));
    }, 80);
  };
  document.getElementById('certSearch').addEventListener('input', () => {
    clearTimeout(certTimer);
    certTimer = setTimeout(async () => {
      try {
        renderCertPicker(await window.register.list(document.getElementById('certSearch').value.trim()));
      } catch (error) {
        toast(errorText(error), 'error');
      }
    }, 150);
  });
  document.getElementById('purpose').addEventListener('change', () => {
    const other = document.getElementById('purposeOtherWrap');
    const custom = document.getElementById('purpose').value === '__other';
    other.hidden = !custom;
    if (custom) document.getElementById('purposeOther').focus();
    queuePreview();
  });
  document.getElementById('purposeOther').addEventListener('input', queuePreview);
  document.getElementById('refNo').addEventListener('input', queuePreview);
  document.getElementById('printBtn').addEventListener('click', () => {
    printCertificate().catch((error) => toast(errorText(error), 'error'));
  });

  document.getElementById('emailForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    try {
      const settings = await window.register.setEmail(document.getElementById('parishEmail').value);
      state.parishEmail = settings.parishEmail;
      toast(settings.parishEmail ? 'Parish email saved.' : 'Parish email cleared.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  });
  document.getElementById('backupBtn').addEventListener('click', async () => {
    try {
      const result = await window.register.backup();
      if (!result.cancelled) toast('Backup saved.');
    } catch (error) {
      toast(errorText(error), 'error');
    }
  });
  document.getElementById('restoreBtn').addEventListener('click', async () => {
    try {
      const result = await window.register.restore();
      if (result.cancelled) return;
      clearForm();
      state.certId = null;
      toast('Register restored from the backup.');
      await refreshMembers();
      await loadSettings();
    } catch (error) {
      toast(errorText(error), 'error');
    }
  });

  document.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      showView('members').then(() => document.getElementById('search').focus());
    }
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p' && state.view === 'certificate') {
      event.preventDefault();
      printCertificate().catch((error) => toast(errorText(error), 'error'));
    }
  });
}

async function printCertificate() {
  await updatePreview();
  if (!state.previewReady) return;
  const result = await window.register.print();
  if (result && result.ok === false && result.reason && result.reason !== 'cancelled') {
    toast(result.reason, 'error');
  }
}

async function init() {
  if (!window.register) {
    const message = document.createElement('p');
    message.className = 'boot-error';
    message.textContent = "Open People's Register from the installed application.";
    document.body.replaceChildren(message);
    return;
  }
  document.getElementById('registrationDate').value = todayISO();
  bindEvents();
  await refreshMembers();
  await loadSettings();
}

window.addEventListener('DOMContentLoaded', () => {
  init().catch((error) => toast(errorText(error), 'error'));
});
