# Источники и ограничения
Дата сборки: 25 октября 2026.

## Макеты
11 PNG созданы генератором изображений для Chorla AI. Это визуальные концепты, не экспорт из Figma и не снимки работающего приложения.
Иллюстративные имена, баланс 2000, тариф START и статусы не являются данными для БД.
Только 05-integrations.png содержит также мобильный вариант. Остальные макеты показывают десктоп.
Логотипы внутри PNG могут отличаться от оригиналов; брать отдельные файлы assets.

## Chorla AI
docs/design/chorla-logo-reference.png – ранее выбранная пользователем презентация логотипа. Число 03 и нижний демонстрационный блок не относятся к логотипу.
public/brand/chorla-symbol-*.svg – аккуратная геометрическая реконструкция двух клиньев, не точная векторизация исходника. favicon.svg основан на ней. Все файлы действительно векторные.
Точный векторный wordmark «Chorla AI» не предоставлен. Не подменять его похожим системным шрифтом. Использовать существующий оригинал проекта; при его отсутствии подготовить отдельную точную векторизацию.

## Бренды сервисов
Файлы Google и Telegram взяты из ранее загруженных оригинальных ресурсов, без изменения графики:
– google-calendar.png: https://www.gstatic.com/images/branding/product/2x/calendar_2020q4_48dp.png
– google-g.png: https://developers.google.com/identity/images/g-logo.png
– telegram.svg: https://telegram.org/img/t_logo.svg?1
Источники подтверждены сохранённым ui-assets/sources.json. Google Calendar – PNG, не SVG; используйте на малых размерах интерфейса, не растягивайте до иллюстрации.

Instagram и WhatsApp: community SVG Simple Icons 13.21.0, не официальный архив Meta. Добавлен фирменный цвет fill; геометрия сохранена:
– https://unpkg.com/simple-icons@13.21.0/icons/instagram.svg
– https://unpkg.com/simple-icons@13.21.0/icons/whatsapp.svg
– https://unpkg.com/simple-icons@13.21.0/LICENSE.md
Лицензия приложена. Наличие открытой лицензии на файлы не означает передачи прав на товарные знаки. Перед публикацией сверить актуальные брендовые требования Meta и заменить на официальные ассеты при необходимости.

Справочные страницы:
– https://telegram.org/tour/screenshots
– https://developers.google.com/identity/branding-guidelines
– https://about.meta.com/brand/resources/instagram/instagram-brand/
– https://about.meta.com/brand/resources/whatsapp/whatsapp-brand/
Google G предназначен для обозначения Google, а не замены значка Google Calendar. Кнопка входа через Google должна отдельно соответствовать Google Identity branding guidelines.

## Иконки интерфейса
Lucide 1.8.0 из установленного пакета. SVG экспортированы из icon nodes, stroke-width установлен в 1.75, имена отражены в design-system/icon-map.json.
Приложена полная лицензия Lucide, включая применимые уведомления Feather.
https://lucide.dev/license

Стоковые фотографии, скриншоты исходного приложения с персональными данными, ключи и .env в комплект не входят.
