const monday = require('./api/monday');

const func = async () => {
  const r = await monday.find('quantity', 'Rare', { genre: 1 });
  console.log(r);
}

func();
