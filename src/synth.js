const Chance = require('chance');
const monday = require('./api/monday');
const recipe = require('./api/recipe');
const translate = require('./api/translate');

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
  if (quantity === 'Empty') return 0.1;
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
  v += 1;
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

class Synth {
  lookup = {};
  full = undefined;
  recipes = [];
  maxRecipes = 10;

  constructor(seed, q) {
    this.chance = new Chance(seed);
    this.q = q ? q : '';
    this.loader = monday.findAll().then((full) => {
      this.full = full;
      full.forEach((item) => {
        const append = (k) => {
          if (!this.lookup.hasOwnProperty(k))
            this.lookup[k] = [];
          this.lookup[k].push(item);
        };
        if (/s$/.test(item.key)) {
          append(item.key.replace(/s$/, ''));
          append(item.key);
        } else {
          append(item.key);
          append(item.key + 's');
        }
      });
      Object.keys(this.lookup).forEach((k) => {
        this.lookup[k] = this.lookup[k].sort((a, b) =>
          weightIngredient(b) - weightIngredient(a))[0];
      });
    });
  }

  weightRecipe({ ingrs, found }) {
    let v = ingrs.map((ingr) => this.lookup.hasOwnProperty(ingr)
      ? weightIngredient(this.lookup[ingr]) : 0).reduce((a, b) => a + b);
    v /= found;
    v /= Math.pow(ingrs.length, 0.05);
    v *= (found + 2) / (ingrs.length + 2);
    v += 1;
    return v;
  }

  // Note: It modifies arr and warr
  plainDraw(arr, warr, limit) {
    const ga = [];
    for (; arr.length && limit; limit--) {
      if (warr.reduce((a, b) => a + b) === 0)
        break;
      const rst = this.chance.weighted(arr, warr);
      const id = arr.indexOf(rst);
      arr.splice(id, 1);
      warr.splice(id, 1);
      ga.push(rst);
    }
    return ga;
  }
  async aDraw(objs, wfunc, limit, func) {
    const arr = [...objs];
    const warr = arr.map(wfunc);
    let fulled = false;
    const procs = Array(limit).fill().map(async (_, i) => {
      do {
        const ga = this.plainDraw(arr, warr, 1);
        if (!ga.length) break;
        try {
          const status = await func(ga[0]);
          if (status === 'full') { fulled = true; break; }
          if (status === 'failure') { continue; }
        } catch (e) {
          console.error('Error when aDraw', ga[0], func, e);
          continue;
        }
      } while (false);
    });
    await Promise.all(procs);
    return fulled ? 'full' : 'success';
  }

  async drawIndividuals(limit) {
    await this.aDraw(
      this.full.filter((item) => item.genre === 'Individual'),
      weightIngredient,
      2,
      async (rst) => {
        if (this.recipes.length >= this.maxRecipes) return 'full';
        this.recipes.push({
          w: weightIngredient(rst),
          title: { o: rst.key, t: rst.name },
          ingredients: [],
        });
      },
    );
  }

  async drawMains(limit) {
    await this.aDraw(
      this.full.filter((item) => item.genre === 'Main'),
      weightIngredient,
      8,
      async (rst) => {
        if (this.recipes.length >= this.maxRecipes) return 'full';
        const rcp = await recipe.sample(rst.key, this.q, this.chance);
        if (!rcp) {
          console.error(`No recipe found for ${rst.name}/${rst.key} with q=${this.q}`);
          return 'failure';
        }
        const rcpGoods = rcp.filter((rc) => {
          const ingrs = rc.ingredients.split(', ').map(renaming);
          const found = ingrs.filter((ingr) => this.lookup.hasOwnProperty(ingr)).length;
          if (found < ingrs.length / 2 && ingrs.length >= 4)
            return false;
          rc.ingrs = ingrs;
          rc.found = found;
          return true;
        });
        if (!rcpGoods.length) {
          console.error(`No good recipe found for ${rst.name}/${rst.key}`);
          return 'failure';
        }
        console.error(`${rcpGoods.length} good recipes found for ${rst.name}/${rst.key}`);
        return this.aDraw(
          rcpGoods,
          this.weightRecipe.bind(this),
          2,
          async (rcrst) => {
            console.error(`${rst.name} -> ${rcrst.title}`);
            if (this.recipes.length >= this.maxRecipes) return 'full';
            const [titleT, ...ingredients] = await Promise.all([
              translate.en2zh(rcrst.title),
              ...rcrst.ingrs.map(async (ingr) => {
                const l = this.lookup[ingr];
                return l ? {
                  o: ingr,
                  t: l.name,
                  className: `tier-${l.tier.toLowerCase()}`,
                } : {
                  o: ingr,
                  t: await translate.en2zh(ingr),
                  className: 'unknown',
                };
              }),
            ]);
            if (this.recipes.length >= this.maxRecipes) return 'full';
            this.recipes.push({
              w: this.weightRecipe(rcrst),
              ...rcrst,
              title: { o: rcrst.title, t: titleT },
              ingredients,
            });
            return 'success';
          },
        );
      },
    );
  }

  async draw(n = 10) {
    this.maxRecipes = n;
    await this.loader;
    await Promise.all([this.drawIndividuals(), this.drawMains()]);
    this.recipes.sort(({w: a}, {w: b}) => b - a);
    return this.recipes;
  }
};

module.exports = Synth;
