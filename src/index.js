const monday = require('./api/monday');

const func = async () => {
  // const rr = await monday.find('tier', 'Third');
  // console.log(rr);
  // const r = rr[0];
  // r.quantity = 'Empty';
  // r.genre = 'Main';
  // r.tier = 'Second';
  // r.key = 'fuck';
  // console.log(r);
  await monday.save([{
    name: 'testtt1',
    quantity: 'Rare',
    tier: 'First',
  }, {
    name: 'testtt2',
    quantity: 'Rare',
    tier: 'First',
  }]);
}

func();
