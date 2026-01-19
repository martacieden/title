# План реалізації Smart Title Generation System

## Поточний стан
- ✅ Базова реалізація title settings в `category-modal.tsx`
- ✅ AI suggestions з 3 варіантами
- ✅ Manual customization mode
- ✅ Live preview
- ✅ Валідація шаблонів

## Основні вимоги

### 1. AI-powered Title Templates для консистентності категорій
**Мета**: Забезпечити консистентність заголовків в межах категорії

**Реалізація**:
- Зберігати шаблон для кожної категорії
- Застосовувати шаблон автоматично при створенні нового елемента
- Дозволити перевизначення на рівні елемента

### 2. Vacation Requests: creator + type + date fields
**Мета**: Спеціалізовані шаблони для vacation requests

**Реалізація**:
- Створити категорію "Vacation Requests" з дефолтним шаблоном
- Шаблон: `{creator} vacation / time off request ({field.start} - {field.end})`
- Автоматичне визначення типу запиту (vacation/time off)

### 3. Customizable Field Selection з Live Preview
**Мета**: Дозволити вибір полів для шаблону з миттєвим preview

**Реалізація**:
- ✅ Вже реалізовано: live preview працює
- Покращити: показати всі доступні поля з категорії
- Додати: візуальний вибір полів (checkboxes)
- Оновити preview при зміні вибраних полів

### 4. Три AI Suggestions + Manual Customization
**Мета**: Забезпечити баланс між автоматизацією та контролем

**Реалізація**:
- ✅ Вже реалізовано: 3 AI suggestions
- ✅ Вже реалізовано: manual customization
- Покращити: краще пояснення кожного варіанту
- Додати: можливість зберегти кастомний шаблон як дефолт

### 5. UX Concerns: Configuration Complexity vs Ease of Use
**Проблема**: Система може бути складною для початківців

**Рішення**:
- Smart defaults: автоматично вибирати найкращий шаблон
- Value messaging: пояснити переваги автоматичної генерації
- Progressive disclosure: показувати складні опції тільки при потребі
- Guided setup: покроковий майстер для налаштування

### 6. Template Library для загальних категорій
**Мета**: Бібліотека готових шаблонів для типових категорій

**Категорії**:
- HR: vacation requests, performance reviews, onboarding
- Maintenance: work orders, repairs, inspections
- Invoices: bill payments, vendor invoices, expense reports
- Family Offices: bills, vacation requests, investment decisions

**Реалізація**:
- Створити файл `lib/template-library.ts` з шаблонами
- Структура: `{ category: string, templates: Template[] }`
- Автоматичне застосування при виборі категорії
- Можливість перевизначення

### 7. Альтернативний підхід: Повна AI Автоматизація
**Мета**: Генерація заголовків без ручного налаштування

**Реалізація**:
- Використовувати структуровані AI об'єкти для консистентності
- Генерувати заголовки після створення елемента (не під час)
- Аналізувати контент елемента та автоматично створювати заголовок
- Дозволити користувачу редагувати згенерований заголовок

**Переваги**:
- Менше конфігурації
- Більш природні заголовки
- Адаптація до контексту

### 8. Структуровані AI Об'єкти для Консистентності
**Мета**: Забезпечити консистентність через структуровані дані

**Реалізація**:
```typescript
interface TitleTemplate {
  id: string
  category: string
  template: string
  fields: string[]
  description: string
  example: string
}
```

### 9. Генерація Після Створення (Post-Creation)
**Мета**: Генерувати заголовки після заповнення форми

**Реалізація**:
- Зберігати шаблон в категорії
- При створенні елемента: збирати дані з форми
- Після збереження: застосувати шаблон та згенерувати заголовок
- Дозволити редагування заголовка

### 10. Feature Requests & Design Patterns

#### AI Update Notifications
- Відстежувати timestamp останнього перегляду
- Показувати badge з кількістю нових оновлень
- Event sourcing для відтворення активності

#### Proactive Summary в Right-Hand AI Panel
- Показувати зведення активності
- Пропонувати дії на основі контексту
- Інтеграція з AI assistant

#### Standard Categories для Family Offices
- Bills: `Bill Payment - {vendor} - {due_date}`
- Vacation Requests: `{creator} Vacation ({field.start} - {field.end})`
- Investment Decisions: `Investment Decision - {field.asset} - {created_date}`

#### Toggle-able Defaults
- Дозволити встановити шаблон як дефолт для категорії
- Можливість вимкнути автоматичну генерацію
- Override на рівні елемента

#### Consistent Component Patterns
- Collapse/expand styling (як в e-signature)
- Required field indicators (червона зірочка)
- Стандартизація компонентів

#### Encourage Photo Uploads через Design
- Візуальні підказки замість конфігурації
- Drag & drop зона
- Preview завантажених фото

## План реалізації

### Фаза 1: Покращення поточної системи (Fast Mode)
1. ✅ Лоадер при включенні тоглу (вже реалізовано)
2. Покращити пояснення та value messaging
3. Додати metadata view для вибраного шаблону
4. Покращити UX порівняння варіантів

### Фаза 2: Template Library (Plan Mode)
1. Створити структуру для template library
2. Додати шаблони для стандартних категорій
3. Інтеграція з category selection
4. UI для перегляду та вибору шаблонів

### Фаза 3: Post-Creation Generation (Plan Mode)
1. Змінити логіку генерації (після створення)
2. Інтеграція з формою створення елемента
3. Редагування заголовка після генерації
4. Збереження шаблону в категорії

### Фаза 4: Повна AI Автоматизація (Innovate Mode)
1. Дослідити можливості AI для автоматичної генерації
2. Створити структуровані AI об'єкти
3. Інтеграція з AI сервісом
4. Fallback на шаблони при помилках

### Фаза 5: UX Покращення (Plan Mode)
1. Smart defaults
2. Progressive disclosure
3. Guided setup wizard
4. Consistent component patterns

## Технічні деталі

### Структура файлів
```
lib/
  template-library.ts      # Бібліотека шаблонів
  title-generator.ts       # Логіка генерації заголовків
  ai-title-service.ts      # AI сервіс для автоматичної генерації

components/
  title-settings/          # Компоненти для налаштування
    template-selector.tsx
    field-selector.tsx
    preview-panel.tsx
  title-generator/         # Компоненти для генерації
    ai-suggestions.tsx
    manual-editor.tsx
```

### Типи даних
```typescript
interface TitleTemplate {
  id: string
  category: string
  template: string
  fields: string[]
  description: string
  example: string
  isDefault?: boolean
}

interface TitleGenerationConfig {
  enabled: boolean
  template?: string
  autoGenerate: boolean
  allowEdit: boolean
}
```

## Пріоритети

### Високий пріоритет
1. Template Library для стандартних категорій
2. Покращення UX та value messaging
3. Post-creation generation

### Середній пріоритет
4. Повна AI автоматизація
5. Smart defaults
6. Consistent component patterns

### Низький пріоритет
7. AI update notifications
8. Proactive summary panel
9. Photo upload encouragement

