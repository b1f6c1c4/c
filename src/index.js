const express = require('express');
const monday = require('./api/monday');
const recipe = require('./api/recipe');
const translate = require('./api/translate');

const app = express();
const wrap = fn => (...args) => fn(...args).catch(args[2]);

app.set('views', './views');
app.set('view engine', 'pug');
app.get('/', (req, res) => {
  res.render('index', {
    recipes: [
      {
        title: { o: 'Creamy Beef Sandwiches', t: '奶油牛肉三明治' },
        href: 'http://www.recipezaar.com/Creamy-Beef-Sandwiches-257471',
        ingredients: [
          { className: 'tier-first ', o: 'cheddar cheese', t: '切达干酪', },
          { className: 'tier-second ', o: 'beef', t: '牛肉', },
          { className: 'tier-third ', o: 'lettuce', t: '生菜', },
          { className: 'tier-fourth ', o: 'mayonnaise', t: '蛋黄酱', },
          { className: 'tier-fifth ', o: 'ranch dressing', t: '牧场调味料', },
          { className: 'unknown ', o: 'bread', t: '面包', },
        ],
        thumbnail: 'http://img.recipepuppy.com/333025.jpg',
      },
    ],
  });
});

app.post('/api/updateKeys', wrap(async (req, res) => {
  const items = await monday.find('genre', 'Unknown', { key: 1 }, +req.query.n);
  const modified = [];
  await Promise.all(items.map(async (item) => {
    if (item.key) return;
    item.key = await translate.zh2en(item.name);
    item.key = item.key.toLowerCase();
    console.log(`${item.name} -> ${item.key}`);
    modified.push(item);
  }));
  if (modified.length)
    await monday.save(modified);
  res.json(modified);
}));

app.listen(3000);
