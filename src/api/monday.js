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
const run = async (query, vars = {}) => {
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

const preProcess = (fields) => {
  const cIds = [];
  Object.entries(fields).forEach(([k, v]) => {
    if (v) cIds.push(config.cIds[k]);
  });
  return { cIds };
};
const postProcess = (arr) => arr.map((tmp) => {
  const result = {
    id: tmp.id,
    name: tmp.name,
  };
  tmp.column_values.forEach(({ id, text }) => {
    result[config.cIdsR[id]] = text;
  });
  return result;
});

const fullFields = { quantity: 1, genre: 1, tier: 1, key: 1 };

module.exports = {
  find: async (column, value, fields = fullFields) => {
    const data = await run(`query find($bId: Int!, $cId: String!, $value: String!, $cIds: [String]) {
      items_by_column_values(board_id: $bId, column_id: $cId, column_value: $value) {
        id
        name
        column_values(ids: $cIds) { id text }
      }
    }`, { cId: config.cIds[column], value, ...preProcess(fields) });
    return postProcess(data.items_by_column_values);
  },
  findAll: async (fields = fullFields) => {
    const data = await run(`query findAll($bId: [Int], $cIds: [String]) {
      boards(ids: $bId) {
        items {
          id
          name
          column_values(ids: $cIds) { id text }
        }
      }
    }`, preProcess(fields));
    return postProcess(data.boards[0].items);
  },
  save: async (objs) => {
    const lst = Array.isArray(objs) ? objs : [ objs ];
    let mut = 'mutation save($bId: Int!';
    const vars = {};
    lst.forEach((o, i) => {
      mut += `, $v${i}: JSON!`;
      if (!o.id && o.name != null) mut += `, $n${i}: String`
    });
    mut += ') {';
    lst.forEach((o, i) => {
      if (o.id) {
        mut += `
          op${i}: change_multiple_column_values(board_id: $bId, item_id: ${o.id}, column_values: $v${i}) { id }
        `;
      } else {
        mut += `
          op${i}: create_item(board_id: $bId, `;
        if (o.name != null) mut += `item_name: $n${i}, `
        mut += `column_values: $v${i}) { id }
        `;
      }
      const m = {};
      const saveStatusField = (k) => {
        if (o.hasOwnProperty(k))
          m[config.cIds[k]] = { label: o[k] };
      };
      const saveTextField = (k) => {
        if (o.hasOwnProperty(k))
          m[config.cIds[k]] = o[k];
      };
      ['quantity', 'genre', 'tier'].forEach(saveStatusField);
      ['key'].forEach(saveTextField);
      vars['v' + i] = JSON.stringify(m);
      if (!o.id && o.name != null)
        vars['n' + i] = o.name;
    });
    mut += '}';
    const data = await run(mut, vars);
    lst.forEach((o, i) => {
      if (!o.id) o.id = data['op' + i].id;
    });
  },
};
