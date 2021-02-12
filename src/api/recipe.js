const got = require('got');
const Chance = require('chance');
const { decode } = require('html-entities');

const api = got.extend({
  method: 'GET',
  url: 'http://www.recipepuppy.com/api',
  responseType: 'json',
});

const postProcess = (r) => {
  r.title = decode(r.title.trim());
};

module.exports = {
  sample: async (keys, q, ch) => {
    const k = Array.isArray(keys) ? keys : [keys];
    let ub = 100;
    const chance = ch ? ch : new Chance();
    while (true) {
      const p = chance.integer({ min: 1, max: ub });
      const { body } = await api({ searchParams: { i: k.join(','), p, q } });
      body.results.forEach(postProcess);
      if (body.results.length) return body.results;
      if (p === 1) return null;
      ub = Math.ceil(p / 2);
    }
  },
  check: async (keys, q) => {
    const k = Array.isArray(keys) ? keys : [keys];
    const { body } = await api({ searchParams: { i: k.join(','), q } });
    return body.results.length;
  },
};
