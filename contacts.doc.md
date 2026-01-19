# Дослідження проекту

## Огляд
Проект є шаблоном для створення категорій з інтеграцією AI (наразі симульованою). Основна логіка створення категорії зосереджена в компоненті `CategoryModal`.

## Файли
- `components/category-modal.tsx`: Головний компонент модального вікна створення категорії. Містить 4 кроки:
  1. Category details (Name, Type, Description)
  2. Select category capsules
  3. Set up custom fields
  4. Select a workflow
- `app/page.tsx`: Головна сторінка, яка відображає `CategoryModal`.
- `smart-title-generation-plan.md` та `title-settings-improvements-plan.md`: Плани впровадження AI функціоналу.

## Потік даних
- Наразі дані зберігаються в локальному стані (`useState`) всередині `CategoryModal`.
- AI генерація симулюється за допомогою `setTimeout` та перемішування попередньо визначеного списку `aiSuggestions`.

## Бекенд
- Прямих викликів до бекенду або AI API (Gemini, OpenAI) поки що немає.
- Проект використовує Next.js з клієнтськими компонентами.

## Посилання
- [CategoryModal](components/category-modal.tsx)
- [Home Page](app/page.tsx)
