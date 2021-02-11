const translate = require('./api/translate');

const func = async () => {
  console.log(await translate.zh2en('芹菜'));
}

func();
