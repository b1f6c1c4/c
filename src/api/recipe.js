const got = require('got');

const api = got.extend({
  method: 'GET',
  url: 'http://www.recipepuppy.com/api',
  responseType: 'json',
});
module.exports = {
  sample: async (keys) => {
    const k = Array.isArray(keys) ? keys : [keys];
    let ub = 100;
    while (true) {
      const p = Math.floor(Math.random() * ub) + 1;
      const { body } = await api({ searchParams: { i: k.join(','), p } });
      if (body.results.length) return body.results;
      if (p === 1) return null;
      ub = Math.ceil(p / 2);
    }
  },
  check: async (keys) => {
    const k = Array.isArray(keys) ? keys : [keys];
    const { body } = await api({ searchParams: { i: k.join(',') } });
    return body.results.length;
  },
};
