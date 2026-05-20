---
title: OPFS Studio — Privacy Policy
---

# Privacy Policy — OPFS Studio

_Last updated: 2026-05-20_

## English

**OPFS Studio** is a developer tool that lets you inspect and edit the Origin
Private File System (OPFS) of the website you are visiting, directly inside the
browser.

### What data the extension handles

- **Your files in OPFS.** The extension reads and writes files in the Origin
  Private File System of the currently active tab, only when you explicitly act
  (open, edit, save, create, delete). This data **never leaves your browser** —
  it is not transmitted to us or any third party.
- **UI preferences.** Theme, selected language, expanded folders and the last
  opened file are stored locally via `chrome.storage` / browser storage to
  remember your settings between sessions.

### What we do NOT collect

- We do **not** collect, transmit or store the contents, names or paths of your
  files.
- We do **not** sell or share any personal data.
- We do **not** use remote code.

### Anonymous usage analytics

The extension sends **anonymous, aggregated** event pings (e.g. "panel opened",
"file created") to Yandex Metrica purely to understand feature usage. These
pings contain **no file paths, no file contents, and no personal data** — only
the event name and a small set of whitelisted non-sensitive parameters
(such as the UI language or theme).

### Permissions

- `storage` — save UI preferences locally.
- `activeTab` / `scripting` — read and edit OPFS of the active tab on your
  request.
- `sidePanel` — show the editor in the browser side panel.

### Contact

Questions about this policy: open an issue at
<https://github.com/official-inso/opfs-studio/issues>.

---

## Русский

**OPFS Studio** — инструмент для разработчиков, позволяющий просматривать и
редактировать Origin Private File System (OPFS) открытого сайта прямо в браузере.

### Какие данные обрабатывает расширение

- **Ваши файлы в OPFS.** Расширение читает и записывает файлы в Origin Private
  File System активной вкладки только при ваших явных действиях (открыть,
  изменить, сохранить, создать, удалить). Эти данные **никогда не покидают ваш
  браузер** — мы не передаём их ни нам, ни третьим сторонам.
- **Настройки интерфейса.** Тема, выбранный язык, раскрытые папки и последний
  открытый файл хранятся локально через `chrome.storage` / хранилище браузера,
  чтобы запоминать ваши настройки между сессиями.

### Что мы НЕ собираем

- Мы **не** собираем, не передаём и не храним содержимое, имена или пути ваших
  файлов.
- Мы **не** продаём и не передаём персональные данные.
- Мы **не** используем удалённый код.

### Анонимная аналитика использования

Расширение отправляет **анонимные обобщённые** события (например, «панель
открыта», «файл создан») в Яндекс.Метрику исключительно для понимания
использования функций. Эти события **не содержат путей к файлам, содержимого
файлов и персональных данных** — только имя события и небольшой набор
нечувствительных параметров из белого списка (например, язык или тема
интерфейса).

### Разрешения

- `storage` — локальное сохранение настроек интерфейса.
- `activeTab` / `scripting` — чтение и редактирование OPFS активной вкладки по
  вашему запросу.
- `sidePanel` — показ редактора в боковой панели браузера.

### Контакты

Вопросы по политике: создайте issue на
<https://github.com/official-inso/opfs-studio/issues>.
