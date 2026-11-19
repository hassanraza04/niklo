# Niklo local recovery

Moved and cleaned on November 18, 2026.

The project folder measured 2,622,184 KiB before cleanup and
147,904 KiB after cleanup, including the local Git backup.
Removed 9 generated directories. Verified 739 retained project files
by checksum. No existing tracked project files changed.

## Where to work

Open `/Users/hassan/Documents/niklo` as the project folder.
This is the original repository, including its Git history, local files,
databases, scraper output, venue photos, and configuration.

The old path was:
`/Users/hassan/Documents/Codex/2026-07-08/ac/work/niklo`.
That path now holds a symbolic link to the new folder. It is not a second copy.
Old Codex chats can still resolve it. Use the new Documents folder for new work.

The original project plan is now in
`.local-recovery/niklo-project-plan.md` (local only).
Its old location also links to this saved file.

## What was removed

Only Node dependencies, Python virtual environments, build output, and tool
caches were selected. This includes `web/node_modules`, `web/.next`,
`web/.open-next`, and `pipeline/.venv`.

The complete directory list, allocated sizes, and installed Python package
versions are in
`.local-recovery/cleanup-inventory.json` (local only).
The inventory records the measured space after cleanup too.

Source files, manifests, lockfiles, databases, images, and local data were kept.
The Recurve repository under the older `access-the-niklo-proj` folder is a
different project and was left in place.

## Restore dependencies

Use Node 22 or newer, Python 3.12 or newer, and `uv`, as required by the README.
Install only the part you need. Internet access to package registries is required.

```bash
cd /Users/hassan/Documents/niklo/web
npm ci
npm run dev
```

```bash
cd /Users/hassan/Documents/niklo/pipeline
uv sync --locked
```

The app and pipeline recreate their build output and caches when needed.
Both `web/package-lock.json` and `pipeline/uv.lock` are tracked by Git.
The Python lockfile passed an offline validation before cleanup.

No dependencies were reinstalled during cleanup. No application test or build
result is claimed. See `README.md` for project checks and deployment instructions.

## Recover code from GitHub

Repository: [hassanraza04/niklo](https://github.com/hassanraza04/niklo).

```bash
git clone https://github.com/hassanraza04/niklo.git niklo
cd niklo
```

At the start of cleanup, the local checkout was on `main` at
`d7e28183dff4286bec89e0afc9937c9f44abfd23`.
After fetching GitHub on the cleanup date, it was 112 commits behind
`origin/main`, with no local-only commits on `main`.
The move did not update or replace the checked-out source.
Review the newer changes before switching to `main` and using
`git pull --ff-only` to update it.

To inspect the exact version kept during this cleanup in a fresh clone:

```bash
git switch -c recovered-local-version d7e28183dff4286bec89e0afc9937c9f44abfd23
```

Restore configuration and secret values from their owning service or a private
backup. GitHub does not restore ignored files such as local databases,
scraper results, photo caches, or secret configuration.

## Local backup and retained files

`.local-recovery/all-local-refs.bundle` (local only)
contains all local Git refs from before cleanup. It was verified with Git.
It can create a separate recovery checkout:

```bash
git clone --branch main /Users/hassan/Documents/niklo/.local-recovery/all-local-refs.bundle /path/to/niklo-recovered
```

The bundle contains committed Git content. It does not contain ignored files,
uncommitted files, or this new guide. Keep a private off-machine backup of local
data if you need protection from disk failure.
The `.local-recovery` directory is excluded using `.git/info/exclude`.
It includes the relocation record and checksums of retained project files.

This guide and the retained committed code are published on the GitHub branch
`codex/local-recovery-2026-11-18`. The local working folder uses that branch.
To recover it on another computer:

```bash
git clone --branch codex/local-recovery-2026-11-18 https://github.com/hassanraza04/niklo.git niklo
```

The inventories, Git bundle, and local notes stay on this computer.
No public site was deployed by this cleanup.

For a future cleanup, remove only the generated directories listed in the
inventory after stopping development servers. Keep source, lockfiles, `.git`,
configuration, databases, and photos. Avoid `git clean -fdx` because it can
delete ignored local data and secrets.
