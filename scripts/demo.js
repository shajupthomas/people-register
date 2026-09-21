const fs = require('fs');
const path = require('path');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = async function demo(win) {
  const dir = process.env.REGISTER_DEMO;
  const shot = async (name) => {
    const image = await win.capturePage();
    fs.writeFileSync(path.join(dir, name), image.toPNG());
  };
  const run = (code) => win.webContents.executeJavaScript(code);

  try {
    await sleep(400);
    const prefilled = await run('document.getElementById("registrationDate").value');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(prefilled)) throw new Error(`Registration date was not filled: ${prefilled}`);
    await shot('01-register.png');

    await run(`new Promise((resolve, reject) => {
      const form = document.getElementById('memberForm');
      const set = (name, value) => { form.elements[name].value = value; };
      set('baptism_name', 'Thomas');
      set('house_name', 'Palamattam');
      set('father_name', 'Joseph Palamattam');
      set('mother_name', 'Mary Palamattam');
      set('dob', '1990-01-01');
      set('residence_start', '1980-01-01');
      set('permanent_parish', 'St. Sebastian Church, Bendur');
      set('diocese', 'Diocese of Mangalore');
      form.querySelector('input[value="Male"]').checked = true;
      const toast = document.getElementById('toast');
      const error = document.getElementById('formError');
      const done = () => {
        if (!error.hidden) resolve(error.textContent);
        else if (!toast.hidden) resolve(toast.textContent);
      };
      new MutationObserver(done).observe(error, { attributes: true, childList: true });
      new MutationObserver(done).observe(toast, { attributes: true, childList: true });
      document.getElementById('saveBtn').click();
      setTimeout(() => reject(new Error('save did not finish')), 4000);
    })`);
    await shot('02-date-error.png');

    const saved = await run(`new Promise((resolve, reject) => {
      document.getElementById('memberForm').elements.residence_start.value = '2022-08-15';
      const toast = document.getElementById('toast');
      const error = document.getElementById('formError');
      const done = () => {
        if (!toast.hidden) resolve(toast.textContent);
        if (!error.hidden && error.textContent) reject(new Error(error.textContent));
      };
      new MutationObserver(done).observe(toast, { attributes: true, childList: true });
      document.getElementById('saveBtn').click();
      setTimeout(() => reject(new Error('member was not saved')), 4000);
    })`);
    if (!/saved/i.test(saved)) throw new Error(saved);
    await shot('03-saved.png');

    await run(`document.querySelector('[data-view="members"]').click()`);
    await sleep(300);
    const found = await run(`new Promise((resolve) => {
      document.getElementById('search').value = 'mary';
      document.getElementById('search').dispatchEvent(new Event('input'));
      setTimeout(() => resolve(document.getElementById('memberRows').textContent), 400);
    })`);
    if (!found.includes('Thomas Palamattam')) throw new Error(`Search missed the mother name: ${found}`);
    await shot('04-search.png');

    const notParish = await run(`new Promise((resolve) => {
      const input = document.getElementById('search');
      input.value = 'Bendur';
      input.dispatchEvent(new Event('input'));
      setTimeout(() => resolve(document.getElementById('emptyText').textContent), 400);
    })`);
    if (!/No names match/.test(notParish)) throw new Error(`Parish search should not match: ${notParish}`);

    await run(`document.getElementById('search').value = ''; document.getElementById('search').dispatchEvent(new Event('input'));`);
    await sleep(300);
    await shot('05-members.png');

    await run(`document.querySelector('#memberRows .row-actions button:nth-child(2)').click()`);
    await sleep(400);
    await run(`document.getElementById('purpose').value = 'Marriage preparation'; document.getElementById('purpose').dispatchEvent(new Event('change')); document.getElementById('refNo').value = '12/2026'; document.getElementById('refNo').dispatchEvent(new Event('input'));`);
    await sleep(250);
    const blocked = await run('document.getElementById("printBtn").disabled && document.getElementById("printHint").textContent');
    if (!blocked || !/email/i.test(blocked)) throw new Error(`Print should wait for an email: ${blocked}`);

    await run(`document.querySelector('[data-view="settings"]').click()`);
    await sleep(200);
    await run(`new Promise((resolve) => {
      document.getElementById('parishEmail').value = 'office@stalphonsa.example';
      document.getElementById('emailForm').requestSubmit();
      setTimeout(resolve, 300);
    })`);
    await shot('06-settings.png');

    await run(`document.querySelector('[data-view="certificate"]').click()`);
    await sleep(300);
    await run(`document.getElementById('purpose').value = 'Marriage preparation'; document.getElementById('purpose').dispatchEvent(new Event('change')); document.getElementById('refNo').value = '12/2026'; document.getElementById('refNo').dispatchEvent(new Event('input'));`);
    await sleep(300);
    const male = await run('document.getElementById("certPara1").textContent');
    if (!male.includes('Thomas Palamattam, son of Joseph Palamattam and Mary Palamattam')) throw new Error(male);
    if (!male.includes('He has been a temporary member')) throw new Error(male);
    if (!male.includes('his conduct') || !male.includes('he has actively')) throw new Error(male);
    const printable = await run('document.getElementById("printBtn").disabled');
    if (printable) throw new Error('Print stayed disabled after the email was saved');
    await shot('07-certificate.png');

    const pdf = await win.webContents.printToPDF({
      pageSize: 'A4',
      printBackground: false,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });
    fs.writeFileSync(path.join(dir, 'certificate.pdf'), pdf);
    console.log('DEMO_OK');
    appQuit(0);
  } catch (error) {
    console.error('DEMO_FAIL', error);
    appQuit(1);
  }
};

function appQuit(code) {
  setTimeout(() => process.exit(code), 200);
}
