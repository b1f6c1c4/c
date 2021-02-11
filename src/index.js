const recipe = require('./api/recipe');

const func = async () => {
  console.log(await recipe.sample(['beef', 'lamb']));
}

func();
