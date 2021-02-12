const pug = require('pug');
const fs = require('fs');
const path = require('path');
const { encode } = require('html-entities');
const Synth = require('./synth');

const files = Promise.all([
  fs.promises.readFile(path.join(__dirname, '../views/prolog.html'), 'utf-8'),
  fs.promises.readFile(path.join(__dirname, '../views/index.pug'), 'utf-8').then((p) => pug.compile(p)),
  fs.promises.readFile(path.join(__dirname, '../views/epilog.html'), 'utf-8'),
]);

const synth = async (req, res) => {
  const [prolog, pugIndex, epilog] = await files;
  res.status(200);
  res.write(prolog);
  let flag = true;
  try {
    const synth = new Synth(req.query.s ? +req.query.s : undefined, req.query.q);
    await synth.draw((item) => {
      console.log('Writting item:', item.title);
      if (flag) {
        res.write('<style>.loading-prompt { display: none; }</style>');
        flag = false;
      }
      res.write(pugIndex({ item }));
    });
  } catch (e) {
    console.error('Error running synth:', e);
    res.write('<pre>' + encode(e) + '</pre>');
  }
  res.write(epilog);
  res.end();
};

module.exports.synth = (req, res) => {
  synth(req, res).catch((e) => {
    res.status(500).send(e);
  });
};
