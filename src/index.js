const express = require('express');
const monday = require('./api/monday');
const recipe = require('./api/recipe');
const translate = require('./api/translate');
const wrapper = require('./wrapper');

const app = express();
const wrap = fn => (...args) => fn(...args).catch(args[2]);

app.get('/', wrapper.synth);

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

app.post('/api/classifyGenres', wrap(async (req, res) => {
  const items = await monday.find('tier', req.query.tier, { key: 1, genre: 1 });
  const modified = [];
  await Promise.all(items.map(async (item) => {
    if (!item.key) return;
    if (item.genre !== 'Unknown') return;
    if (!await recipe.check(item.key)) {
      item.genre = 'Disabled';
      return;
    }
    item.genre = 'Main';
    console.log(`${item.name} -> Main`);
    modified.push(item);
  }));
  if (modified.length)
    await monday.save(modified);
  res.json(items);
}));

app.listen(3000);
