# People's Register

A Windows desktop register for St. Alphonsa Syro-Malabar Church, Kankanady. It keeps parish members in a database on the computer where the app is installed, searches them by name, and prints a temporary residence and parish membership certificate.

## Install on Windows

1. Build the installer with `npm run dist:win`, or run `PeoplesRegister-Setup-1.0.0.exe` from the `dist` folder.
2. Step through the installer. It creates a **People's Register** shortcut on the desktop and in the Start menu. Both use the gold cross icon.
3. Open the shortcut. The same cross appears on the taskbar while the app is running, and the shortcut can be pinned there.

Windows may show “Windows protected your PC” because this build is not code-signed. Choose **More info**, then **Run anyway**.

The database file is:

`%APPDATA%\Peoples Register\parish-register.sqlite`

Parish Settings can back that file up and restore it later.

## What you can record

- Baptism name and house name
- Father's name and mother's name
- Gender
- Residence start date
- Permanent parish, place, and diocese
- Date of birth
- Registration date, filled with today and still editable

Search matches baptism name, house name, father's name, or mother's name.

## Certificate

Choose a member, a reference number if you have one, and a purpose (marriage preparation, permanent parish record, higher studies, employment verification, or your own wording).

The letterhead is St. Alphonsa Syro-Malabar Church, Kankanady. The member's name, parents, gender, permanent parish, and residence start date come from the register. **He/She**, **his/her**, and **son/daughter** follow the saved gender. The certificate date and the residence end date are the day you prepare it.

Save the parish email in Parish Settings before printing. Until then the letterhead shows `[Insert Parish Email]` and Print stays off. Print opens the Windows print dialog, where you can print or save a PDF.

## Develop

```bash
npm install
npm test
npm start
npm run dist:win
```

`npm run icons` redraws the desktop and taskbar icon from `scripts/make-icons.py`. The painted parish cross used inside the window is `assets/emblem.png`.
