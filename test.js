const { fmt, html, FormattedString } = require('./index.js');

console.log(html`HTML test & hack <b>${'hack & <i>hack</i></b> hack'}</b>` === 'HTML test & hack <b>hack &amp; &lt;i&gt;hack&lt;/i&gt;&lt;/b&gt; hack</b>');

console.log(fmt`Te${['st', 'bold']}`.substring(1, 2));

console.log(fmt`Lorem ${['ipsum', { type: 'italic' }]}`.concat(fmt`test`));

console.log(fmt`Lorem ${['ipsum', 'bold']}`);

const users = [{ firstName: 'A', lastName: 'B', website: 'https://google.com/' }, { firstName: 'C', lastName: 'D' }];

const formatted = fmt`Участники:\n\n${
  FormattedString.join(users.map(user => fmt`${[
    fmt`${[user.firstName, 'bold']} ${user.lastName}`,
    user.website && { type: 'text_link', url: user.website }
  ]}`), '\n')
}`

console.log(formatted);