# tg-format

Боты для Telegram, использующие [Telegram Bot API](https://core.telegram.org/bots/api), могут использовать различные методы для отправки и редактирования сообщений – `sendMessage`, `sendPhoto`, `editMessageText` и пр. Все эти методы поддерживают форматирование текста при помощи HTML разметки (используя параметр `parse_mode`), либо вручную сформированным массивом размеченных сущностей `entities` (или `caption_entities`). Эта библиотека упрощает использование обоих способов разметки.

## Установка

```
npm install tg-format
```

## Форматирование при помощи HTML

Самый простой способ разметки — при помощи [HTML-тегов](https://core.telegram.org/bots/api#html-style). Однако при подстановке пользовательских данных в тело сообщения в них необходимо экранировать символы '&lt;', '&gt;' и '&amp;'. Для этого доступна функция `html`, которую предполагается использовать в [tagged template literals](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals#tagged_templates):

```js
const { html } = require('tg-format');

// Предполагается, что функция sendMessage вызывает соответствующий метод Telegram Bot API
sendMessage({
  // ... chat_id, reply_markup и т.д.
  text: html`Имя пользователя: <b>${user.firstName}</b> ${user.lastName}`,
  parse_mode: 'HTML',
})
```

Она экранирует символы '&lt;', '&gt;' и '&amp;' для всех подставляемых значений (заменяя их на '&amp;lt;', '&amp;gt;' и '&amp;amp;' соответственно):

```js
const hackyName = 'foo</b> bar'; // Пользовательские данные; например, имя или введённое сообщение
console.log(`Name: <b>${hackyName}</b>`); // Выведет 'Name: <b>foo</b> bar</b>' — некорректная разметка
console.log(html`Name: <b>${hackyName}</b>`); // Выведет 'Name: <b>foo&lt;/b&gt; bar</b>' — правильно экранированное значение
```

Экранирование текста для разметки с помощью Markdown не поддерживается, так как следует более сложным (и контекстно-зависимым) правилам.

## Форматирование при помощи массива entities

Более продвинутый способ создания форматированного текста — с помощью [массива сущностей](https://core.telegram.org/bots/api#messageentity) (который передаётся в параметре `entities` или `caption_entities`). Для этого используйте функцию `fmt`:

```js
const { fmt } = require('tg-format');

// Предполагается, что функция sendMessage вызывает соответствующий метод Telegram Bot API
const formatted = fmt`Имя пользователя: ${[user.firstName, 'bold']} ${user.lastName}`;
sendMessage({
  // ... chat_id, reply_markup и т.д.
  text: formatted.text,
  entities: formatted.entities,
})
```

Чтобы разметить подставляемое значение, используйте массив из двух (или более) элементов: само значение и тип сущности ('bold' в примере выше для выделения текста жирным). Тип сущности можно передавать строкой либо объектом (например `{ type: 'text_link', url: 'https://telegram.org' }`). Если объект требует указания дополнительного поля, то как правило тип можно не указывать: он будет определён автоматически (то есть указание `type: 'text_link'` в примере выше избыточно: наличие поля `url` уже приведёт к тому, что будет проставлен такой тип). Если передать больше двух элементов, будет создано несколько сущностей: например `${[user.firstName, 'bold', 'italic']}` выведет имя полужирным курсивом.

Функция `fmt` возвращает экземпляр класса `FormattedString`, содержащий два поля: `text` и `entities`. Так как метод `sendMessage` ожидает именно такие параметры, код выше можно записать лаконичнее при помощи оператора деструктуризации:

```js
sendMessage({
  // ... chat_id, reply_markup и т.д.
  ...fmt`Имя пользователя: ${[user.firstName, 'bold']} ${user.lastName}`,
})
```

В случае с методами, ожидающими другие параметры (например, `caption` и `caption_entities` для `sendPhoto`), можно использовать метод `toObject`:

```js
sendPhoto({
  // ... chat_id, reply_markup и т.д.
  ...fmt`Имя пользователя: ${[user.firstName, 'bold']} ${user.lastName}`.toObject('caption', 'caption_entities'),
})
```

Класс `FormattedString` реализует многие методы класса `String`. В данный момент только методы `substring` и `slice` возвращают новые экземпляры `FormattedString`.

В особенности может быть полезен метод `concat`, позволяющий конкатенировать с текущим объектом другие строки или экземпляры `FormattedString`. Это немутирующий метод, создающий новый экземпляр `FormattedString`. У него есть также мутирующий аналог `append` (который изменяет текущий экземпляр). Незначительное отличие от метода `concat` строк заключается в том, что массивы (любой вложенности), передаваемые как параметры, будут «распакованы» и их элементы будут конкатенированы без разделителей. Кроме того, непосредственно в конструктор `FormattedString` может быть передано любое число параметров, которые будут аналогичным образом конкатенированы вместе.

Также доступен статический метод `FormattedString.join(strings, separator)`, аналогичный методу `join` у массивов, склеивающий элементы массива, используя указанный разделитель.

Объекты `FormattedString` (или их массивы) можно использовать при подстановке в другие вызовы `fmt`:

```js
const formatted = fmt`Участники:\n\n${
  FormattedString.join(users.map(user => fmt`${[
    fmt`${[user.firstName, 'bold']} ${user.lastName}`,
    { type: 'text_link', url: user.website }
  ]}`), '\n')
}`;
```

