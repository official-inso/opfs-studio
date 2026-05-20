# GitLab → GitHub mirror

Каждый успешный пайплайн на ветке `main` зеркалит проект из GitLab на
`github.com/official-inso/opfs-studio` (ветка `main`). Реализация — `.gitlab-ci.yml`
(stage `publish`, джоба `mirror:github`) и `scripts/ci/mirror-to-github.sh`.

## Однократная настройка

### 1. GitHub PAT

1. На GitHub: **Settings → Developer settings → Personal access tokens → Fine-grained tokens**.
2. **Generate new token** с такими параметрами:
   - Resource owner: `official-inso`.
   - Repository access: **Only select repositories** → `official-inso/opfs-studio`.
   - Repository permissions:
     - `Contents`: **Read and write**.
     - `Metadata`: **Read-only** (включится автоматически).
   - Expiration: 90 дней (потом нужно будет ротировать).
3. Скопируй токен (показывается один раз).

### 2. GitLab CI variable

В GitLab → проект `opfs-studio` → **Settings → CI/CD → Variables → Add variable**:

| Поле | Значение |
| --- | --- |
| Key | `MIRROR_GH_TOKEN` |
| Value | `<paste PAT>` |
| Type | Variable |
| Environment | All |
| **Protect variable** | **ON** |
| **Mask variable** | **ON** |
| Expand variable reference | **OFF** |

«Protect» = переменная доступна только на protected-ветках. Убедись, что `main`
помечена protected: **Settings → Repository → Protected branches**.

### 3. Runner

Обе джобы используют общий instance docker-executor runner с тегом `docker`
(в инстансе это runner #107 «docker-builder»). Отдельной настройки на сервере
не требуется — раннер уже зарегистрирован и доступен всем проектам.

> Раннер `inso2-shell` из соседних проектов — это **project-runner** другого
> проекта (`sarov/sarov_web`), нашему `dev/opfs-studio` он недоступен, поэтому
> используется instance-раннер с тегом `docker`.

## Что делает pipeline

```
verify:typecheck-build  →  mirror:github
   node:20-alpine          alpine:3.20  (оба на runner tag: docker)
   npm ci, tsc, build      check-no-leak.sh, git push github HEAD:main
```

- `verify` запускается на любой ветке и в MR.
- `mirror:github` запускается **только** на `main` после успешного `verify`.
- `mirror:github` сначала прогоняет `scripts/ci/check-no-leak.sh` (hygiene-check).
- При нарушении hygiene push **не происходит** — GitHub остаётся без изменений.

## Hygiene-check

`scripts/ci/check-no-leak.sh` ищет в tracked-файлах и последних 100 коммит-сообщениях:

- `anthropic`, `claude.ai`, `claude-code`, `generated with claude`, `co-authored-by: claude`;
- стандартные AI-trailers (`Generated with …`, `Co-Authored-By: …`);
- внутренние домены `*.insoweb.ru`, `gitlab.dev.insoweb.ru`, `ssh inso1/inso2`.

Сам скрипт и эта документация исключены из сканирования (иначе они бы поймали
сами себя — паттерны в них перечислены).

### Что делать, если hygiene-check упал

В логе пайплайна будет вывод вида:

```
✗ pattern: anthropic
  src/foo.ts:42:  // sent to anthropic
✗ commit-message pattern: Co-Authored-By:[[:space:]]*Claude
  abc1234 fix: handle X
  Co-Authored-By: Claude <noreply@anthropic.com>
```

Варианты:

1. **Файлы:** убрать упоминание, закоммитить чистым, перепушить — pipeline
   перезапустится.
2. **Коммит-сообщения:** интерактивный rebase до чистого SHA:
   ```bash
   git rebase -i origin/main
   # пометить нужные коммиты как `reword` или `edit`
   git push --force-with-lease
   ```
   Force-push нужен, потому что rebase меняет SHA. После этого pipeline
   перезапустится.

## Ручной запуск

GitLab → **CI/CD → Pipelines → Run pipeline** → выбрать ветку `main` → Run.
Полезно после ротации PAT, чтобы убедиться, что новый токен валидный.

## Локальная проверка hygiene-check

```bash
bash scripts/ci/check-no-leak.sh
```

Без аргументов. Exit 0 — чисто, exit 1 — есть нарушения (выведет, какие).
