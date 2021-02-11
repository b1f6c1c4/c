const express = require('express');
const Chance = require('chance');
const monday = require('./api/monday');
const recipe = require('./api/recipe');
const translate = require('./api/translate');

const chance = new Chance();
const app = express();
const wrap = fn => (...args) => fn(...args).catch(args[2]);

const weightIngredient = ({ expire, quantity, genre, tier }) => {
  const genreWeights = {
    'Main': 50,
    'Individual': 10,
    'Disabled': 35,
    'Unknown': 0,
  };
  const tierWeights = {
    'First': 1000,
    'Second': 800,
    'Third': 600,
    'Fourth': 200,
    'Fifth': 50,
    'Unknown': 10,
  };
  if (quantity === 'Empty') return 0;
  let v = genreWeights[genre] + tierWeights[tier];
  if (expire) {
    const exp = new Date() - new Date(expire);
    if (exp > 99 * 86400000)
      v /= 2;
    else if (exp > 0)
      v /= 1 + 0.01 * exp / 86400000;
    else if (exp > -2 * 86400000)
      v *= 2 + exp / 86400000
  }
  return v;
};

const renaming = (ingr) => {
  const rt = {
    'pasta (in general)': 'pasta',
    'mozzarella cheese': 'mozzarella',
    'garlic powder': 'garlic',
    'lemon juice': 'lemon',
    'lemon zest': 'lemon',
    'parmesan': 'cheese',
    'mayonaise': 'mayonnaise',
    'hamburger bun': 'burger gun',
    'ricotta cheese': 'cheese',
  };
  if (rt.hasOwnProperty(ingr)) return rt[ingr];
  return ingr;
};

app.set('views', './views');
app.set('view engine', 'pug');
app.get('/', wrap(async (req, res) => {
  const full = await monday.findAll();
  const lookup = {};
  full.forEach((item) => {
    const append = (k) => {
      if (!lookup.hasOwnProperty(k))
        lookup[k] = [];
      lookup[k].push(item);
    };
    if (/s$/.test(item.key)) {
      append(item.key.replace(/s$/, ''));
      append(item.key);
    } else {
      append(item.key);
      append(item.key + 's');
    }
  });
  Object.keys(lookup).forEach((k) => {
    lookup[k] = lookup[k].sort((a, b) => weightIngredient(b) - weightIngredient(a))[0];
  });
  const weightRecipe = ({ ingrs, found }) => {
    let v = ingrs.map((ingr) => lookup.hasOwnProperty(ingr)
      ? weightIngredient(lookup[ingr]) : 0).reduce((a, b) => a + b);
    v /= found;
    v /= Math.pow(ingrs.length, 0.05);
    v += found / ingrs.length * 300;
    return v;
  };
  const recipes = [];
  {
    const mains = full.filter((item) => item.genre === 'Main');
    const wmains = mains.map(weightIngredient);
    while (recipes.length < 10) {
      const rst = chance.weighted(mains, wmains);
      if (rst.selected) {
        console.error(`Reselect ${rst.name} out of ${mains.length} items`);
        continue;
      }
      rst.selected = true;
      const rcp = await recipe.sample(rst.key, req.query.q);
      if (!rcp) {
        console.error(`No recipe found for ${rst.name}/${rst.key}`);
        continue;
      }
      const rcpGoods = rcp.filter((rc) => {
        const ingrs = rc.ingredients.split(', ').map(renaming);
        const found = ingrs.filter((ingr) => lookup.hasOwnProperty(ingr)).length;
        if (found < ingrs.length / 2 && ingrs.length >= 4)
          return false;
        rc.ingrs = ingrs;
        rc.found = found;
        return true;
      });
      if (!rcpGoods.length) {
        console.error(`No good recipe found for ${rst.name}/${rst.key}`);
        continue;
      }
      const wrcpGoods = rcpGoods.map(weightRecipe);
      for (let j = 0, x = rcpGoods.length; recipes.length < 10 && j < 2 && x; x--) {
        const rcrst = chance.weighted(rcpGoods, wrcpGoods);
        if (rcrst.selected) {
          console.error(`Reselect ${rcrst.title} out of ${rcpGoods.length} items`);
          continue;
        }
        rcrst.selected = true;
        recipes.push({
          w: weightRecipe(rcrst),
          ...rcrst,
          title: { o: rcrst.title, t: await translate.en2zh(rcrst.title) },
          ingredients: await Promise.all(rcrst.ingrs.map(async (ingr) => {
            const l = lookup[ingr];
            if (!l) {
              return {
                o: ingr,
                t: await translate.en2zh(ingr),
                className: 'unknown',
              };
            }
            return {
              o: ingr,
              t: l.name,
              className: `tier-${l.tier.toLowerCase()}`,
            };
          })),
        });
        j++;
      }
    }
  }
  {
    const individuals = full.filter((item) => item.genre === 'Individual');
    const windividuals = individuals.map(weightIngredient);
    for (let i = 0; i < 2; i++) {
      const rst = chance.weighted(individuals, windividuals);
      if (rst.selected) {
        i--;
        continue;
      }
      rst.selected = true;
      recipes.push({
        w: weightIngredient(rst),
        title: { o: rst.key, t: rst.name },
        ingredients: [],
      });
    }
  }
  recipes.sort(({w: a}, {w: b}) => b - a);
  res.render('index', { recipes });
}));

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
