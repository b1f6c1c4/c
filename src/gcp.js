const pug = require('pug');
const fs = require('fs');
const Synth = require('./synth');

const files = Promise.all([
  fs.promises.readFile('views/prolog.html', 'utf-8'),
  fs.promises.readFile('views/index.pug', 'utf-8').then((p) => pug.compile(p)),
  fs.promises.readFile('views/epilog.html', 'utf-8'),
]);

const synth = async (req, res) => {
  res.status(200);
  const [prolog, pugIndex, epilog] = await files;
  res.write(prolog);
  const synth = new Synth(req.query.s ? +req.query.s : undefined, req.query.q);
  await synth.draw((item) => {
    console.log('Writting item:', item.title);
    res.write(pugIndex({ item }));
  });
  res.write(epilog);
  res.end();
};

module.exports.synth = (req, res) => {
  synth(req, res).then((recipes) => {
    res.status(200).send(pug.renderFile('views/index.pug', { recipes }));
  }).catch((e) => {
    res.status(500).send(e);
  });
};
