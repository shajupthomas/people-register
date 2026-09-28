# Contributing to People's Register

People's Register is an Electron desktop app for St. Alphonsa Syro-Malabar Church, Kankanady. It stores parish members locally using SQLite through `sql.js` and prepares temporary residence and parish membership certificates. Contributions should preserve existing register data and the Windows desktop workflow.

## Set up locally

Install a current Node.js LTS release and npm. A graphical desktop is needed to run Electron; use Windows when checking Windows-specific printing and installer behavior.

From the repository root, run:

```bash
npm ci
npm test
npm start
```

`npm ci` installs the versions recorded in `package-lock.json`. If you intentionally change dependencies, use `npm install` and include both `package.json` and `package-lock.json` in the change.

**Use fictional member data during development.** The development app uses Electron's user-data directory, just like the installed app. On Windows, the database is normally `%APPDATA%\Peoples Register\parish-register.sqlite`. Do not run experiments against a live parish register; use a separate development OS account or environment. Back up any existing register through Parish Settings before testing changes that could affect it. Restoring a backup replaces the current register.

## Find the relevant code

- `main.js`: Electron lifecycle, IPC handlers, database access, backup/restore dialogs, and printing.
- `preload.js`: the `window.register` API exposed to the renderer through Electron's context bridge.
- `renderer/`: plain JavaScript, HTML, and CSS for the register and certificate interface.
- `src/db.js`: local database operations and member validation.
- `src/certificate.js` and `src/dates.js`: certificate content and date helpers.
- `src/*.test.js`: Node test-runner coverage for certificates, the database, and UI contracts.
- `assets/`: application icons and parish artwork.
- `scripts/make-icons.py`: icon generation; `scripts/demo.js`: demo automation.

## Make a focused change

For a bug report, include reproduction steps, expected and actual behavior, the app version, and the operating system. Discuss substantial changes before implementing them, especially changes to stored data or certificate wording.

Work on a branch and keep each pull request focused on one fix or feature. Follow the surrounding code: JavaScript uses two-space indentation, semicolons, and CommonJS modules in the main process and `src/`. Avoid unrelated formatting or dependency updates.

Keep renderer access to privileged operations behind `preload.js` and the main-process IPC handlers. Preserve context isolation, sandboxing, and disabled renderer Node integration. Validate data at the database or main-process boundary rather than relying only on form controls.

Add regression tests for bug fixes and tests for new behavior. Use the existing `node:test` and `node:assert/strict` patterns; database tests should use temporary directories and clean them up. Treat existing register files and backup compatibility as part of the behavior to preserve.

Never commit real parish records, database files, backups, generated certificates, or screenshots containing personal information. Database files are not covered by the current `.gitignore`, so inspect your changes before committing. Do not commit `node_modules/`, installer output in `dist/`, or logs.

## Verify your work

Run the automated suite after code changes:

```bash
npm test
```

This runs `src/certificate.test.js`, `src/db.test.js`, and `src/ui-contract.test.js`. There is no separate lint or formatting script configured.

For UI or Electron changes, also run `npm start` and check the affected workflows with fictional data:

- Create, search, edit, and delete members; check validation errors.
- Prepare certificates and verify names, pronouns, dates, and purpose text.
- Confirm printing stays disabled until a parish email is saved, then check the print dialog and A4 output.
- For persistence changes, close and reopen the app and test backup/restore using disposable registers.

For packaging changes, build and test the Windows x64 installer:

```bash
npm run dist:win
```

The Electron Builder configuration produces an NSIS installer in `dist/`, named `PeoplesRegister-Setup-<version>.exe`. Verify installation, shortcuts, launch, and printing on Windows; building alone does not verify those behaviors.

If changing the generated icons, install Python 3 with NumPy and Pillow, ensure `python3` is available, and run:

```bash
npm run icons
```

Review the resulting assets in `assets/` and `renderer/` and include the intended generated changes. The parish emblem source is `assets/emblem.png`.

Documentation-only changes do not require running the application or test suite; check that paths, commands, and descriptions match the repository.

## Submit a pull request

Include:

- A short explanation of the problem and the approach, with any related issue linked.
- Tests and manual checks performed, including the OS for Windows-specific checks. State explicitly which checks you could not run.
- Screenshots for visible changes, using fictional data only.
- Any effects on existing databases, backup compatibility, certificate text, or packaging, and any required recovery steps.

Update the README when setup instructions or user-facing behavior change. Keep generated installers and private data out of the pull request.
