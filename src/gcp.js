const pug = require('pug');
const fs = require('fs');
const { encode } = require('html-entities');
const Synth = require('./synth');

const files = Promise.all([
  fs.promises.readFile('views/prolog.html', 'utf-8'),
  fs.promises.readFile('views/index.pug', 'utf-8').then((p) => pug.compile(p)),
  fs.promises.readFile('views/epilog.html', 'utf-8'),
]);

const synth = async (req, res) => {
  const [prolog, pugIndex, epilog] = await files;
  res.status(200);
  res.write(prolog);
  try {
    const synth = new Synth(req.query.s ? +req.query.s : undefined, req.query.q);
    await synth.draw((item) => {
      console.log('Writting item:', item.title);
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
