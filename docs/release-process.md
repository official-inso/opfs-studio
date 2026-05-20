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

`scripts/ci/compute-version.mjs` inspects commits since the last `v*` tag and
picks the **highest** bump found (precedence: major > minor > patch):

| Commit subject / body | Bump | Example: `1.2.3` → |
| --- | --- | --- |
| `BREAKING CHANGE` in body, or `type!:` in subject (e.g. `feat!:`) | **major** | `2.0.0` |
| any `feat:` | **minor** | `1.3.0` |
| `fix:` / `perf:` / `refactor:` (and no `feat`) | **patch** | `1.2.4` |
| only `chore:` / `ci:` / `docs:` / `style:` / `test:` / `build:` / merges | **nothing** — release is skipped (no version, no publish) |

So a push to `master` only ships a release when there is at least one
`feat:` / `fix:` / `perf:` / `refactor:` (or breaking) commit since the last tag.
Service-only commits leave the store untouched.

## How to make each release type

You don't type a version number anywhere — the version is **derived from your
commit messages**. Write them with a conventional prefix, then merge to `master`.

- **Bugfix / patch** (`1.2.3` → `1.2.4`): use `fix:` (or `perf:` / `refactor:`).

  ```
  fix: prevent crash when opening empty file
  perf: speed up large directory listing
  ```

- **Minor / feature** (`1.2.3` → `1.3.0`): use `feat:`.

  ```
  feat: add CSV table preview
  ```

- **Major / breaking** (`1.2.3` → `2.0.0`): add `!` after the type, **or** put
  `BREAKING CHANGE:` in the commit body.

  ```
  feat!: drop support for Manifest V2

  # or:
  feat: rework messaging protocol

  BREAKING CHANGE: content-script API is no longer backward compatible
  ```

Optional scope is allowed: `feat(panel): …`, `fix(opfs): …`.
When several commits are released together, the strongest one wins
(one `feat!` makes the whole release major).

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
| `GITHUB_RELEASE_TOKEN` | Var, Masked, Protected | GitHub classic PAT (no expiration), scope `repo` — lets CI create the GitHub Release |
| `ELS_API_KEY` | Var, Masked, Protected | ELS telemetry key, injected into the build |

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

The GitHub Release is created **by the GitLab release job** via the GitHub API
(`GITHUB_RELEASE_TOKEN`), right after it pushes the tag. We do this from CI
because the tag reaches GitHub through a **deploy-key mirror**, and such pushes
do **not** trigger GitHub Actions — so relying on `.github/workflows/release.yml`
(`on: push: tags`) would never fire. The PAT is a classic token with **no
expiration**, scope `repo`.

## Manual release

GitLab → CI/CD → Pipelines → Run pipeline → branch `master`.
