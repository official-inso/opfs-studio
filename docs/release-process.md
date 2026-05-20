# Release process

OPFS Studio releases are **automated** via GitLab CI. You don't bump versions
or build packages by hand.

## TL;DR — how to ship a release

1. Develop on `main` as usual (it mirrors to GitHub `main`).
2. When ready to release, merge `main` → **`master`** and push `master`.
3. CI does the rest:
   - derives the next version from your commit messages,
   - bumps `package.json` + all manifests,
   - builds + zips the Chrome package,
   - publishes to the Chrome Web Store,
   - commits the bump, tags `vX.Y.Z`, pushes to GitLab + GitHub,
   - the tag triggers a **GitHub Release** (with the zip attached).

## Version bumping (conventional commits)

`scripts/ci/compute-version.mjs` inspects commits since the last `v*` tag:

| Commit contains | Bump |
| --- | --- |
| `BREAKING CHANGE` in body, or `type!:` in subject | **major** (`2.0.0`) |
| any `feat:` | **minor** (`1.3.0`) |
| `fix:` / `perf:` / `refactor:` (no feat) | **patch** (`1.2.4`) |
| anything else | patch |

So write commits like `feat: add X`, `fix: handle Y`, `feat!: drop Z`.

## Branches

- **`main`** — development. Push → `verify` + mirror to GitHub `main`.
- **`master`** — release line. Push → `verify` + `release:tag-and-publish`.
  The release commit carries `[skip ci]` so it never re-triggers the pipeline.

## Required CI/CD variables (GitLab → Settings → CI/CD → Variables)

| Key | Type | Notes |
| --- | --- | --- |
| `MIRROR_SSH_KEY` | File, Protected | GitHub deploy key (already set) |
| `GITLAB_RELEASE_TOKEN` | Var, Masked, Protected | Project Access Token, scope `write_repository` — lets CI push the bump+tag back to `master` |
| `CWS_EXTENSION_ID` | Var, Protected | Chrome Web Store item id |
| `CWS_CLIENT_ID` | Var, Masked, Protected | Google OAuth client id |
| `CWS_CLIENT_SECRET` | Var, Masked, Protected | Google OAuth client secret |
| `CWS_REFRESH_TOKEN` | Var, Masked, Protected | OAuth refresh token (scope `chromewebstore`) |

If the `CWS_*` variables are absent, the release job still builds + tags +
creates the GitHub Release, and just skips the Chrome Web Store upload.

## Chrome Web Store

- First listing was created manually in the dashboard (item, description,
  screenshots, privacy policy, categories). CI only **updates the package**.
- Store metadata (description / screenshots / locales) lives in
  `docs/store-listing/` and is entered via the CWS dashboard.
- Privacy policy: `docs/privacy-policy.md`, published on GitHub Pages.

### Rotating the CWS refresh token

OAuth refresh tokens can expire/revoke. To refresh: re-run the OAuth flow for
the Desktop client (scope `https://www.googleapis.com/auth/chromewebstore`),
get a new refresh token, update `CWS_REFRESH_TOKEN`.

## GitHub Releases

`.github/workflows/release.yml` runs on GitHub when a `v*` tag arrives (mirrored
from GitLab). It rebuilds the Chrome zip and publishes a GitHub Release using
the built-in `GITHUB_TOKEN` — no secrets, nothing to rotate.

## Manual release

GitLab → CI/CD → Pipelines → Run pipeline → branch `master`.
