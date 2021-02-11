const got = require('got');
const fs = require('fs');
const JSON5 = require('json5');

const config = JSON5.parse(fs.readFileSync('secret.json5', 'utf-8')).monday;
const api = got.extend({
  method: 'POST',
  url: 'https://api.monday.com/v2',
  headers: { authorization: config.apiKey },
  responseType: 'json',
});
const query = async (query, vars = {}) => {
  const { body: { data, errors } } = await api({ json: {
    query,
    variables: {
      bId: config.bId,
      ...vars,
    },
  }});
  if (errors)
    throw new Error(errors[0].message);
  return data;
};
config.cIdsR = {};
Object.entries(config.cIds).forEach(([k, v]) => {
  config.cIdsR[v] = k;
});

module.exports = {
  find: async (column, value, fields = { quantity: 1, genre: 1, tier: 1, key: 1 }) => {
    const cIds = [];
    Object.entries(fields).forEach(([k, v]) => {
      if (v) cIds.push(config.cIds[k]);
    });
    const data = await query(`query find($bId: Int!, $cId: String!, $value: String!, $cIds: [String]) {
      items_by_column_values(board_id: $bId, column_id: $cId, column_value: $value, limit: 1) {
        id
        name
        column_values(ids: $cIds) { id value }
      }
    }`, { cId: config.cIds[column], value, cIds });
    return data.items_by_column_values.map((tmp) => {
      const result = {
        id: tmp.id,
        name: tmp.name,
      };
      tmp.column_values.forEach(({ id, value }) => {
        result[config.cIdsR[id]] = value;
      });
      return result;
    });
  },
};
