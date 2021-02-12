const pug = require('pug');
const Synth = require('./synth');

exports.synth = (req, res) => {
  const synth = new Synth(req.query.s ? +req.query.s : undefined, req.query.q);
  synth.draw(10).then((recipes) => {
    res.status(200).send(pug.renderFile('views/index.pug', { recipes }));
  }).catch((e) => {
    res.status(500).send(e);
  });
};
