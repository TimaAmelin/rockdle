# Rockdle

Статическая игра о камнях. Нужны только HTML, CSS и JavaScript — без сервера и пакетов npm.

## GitHub Pages

Публикуется **корень ветки `main`**. В репозитории GitHub откройте **Settings → Pages** и выберите **Deploy from a branch → `main` → `/ (root)`**. После публикации адрес проекта: https://timaamelin.github.io/rockdle/.

`index.html` и все локальные ресурсы используют относительные пути, поэтому игра работает и по адресу с префиксом `/rockdle/`. Файл `.nojekyll` отключает обработку Jekyll.

## Структура

- `index.html`, `styles.css`, `app.js`, `stones.js`, `images.js`, `images.json` — исходники и готовые файлы для GitHub Pages.
- `scripts/build-site.mjs` — создаёт `dist/` для хостинга Sites: `npm run build`.
- `scripts/build-images.mjs` — обновляет данные фотографий Wikimedia: `npm run refresh:images`.
- `dist/` — генерируемая копия для Sites, не хранится в Git.

Чтобы запустить локально, откройте `index.html` или поднимите статический сервер из корня репозитория. Фотографии загружаются с Wikimedia, поэтому для них нужен доступ к сети; если изображение недоступно, игра показывает иллюстрацию.
