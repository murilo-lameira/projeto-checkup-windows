const fs = require('fs');
const pngToIco = require('png-to-ico').default;

pngToIco('src/assets/icons/exame.png')
  .then((buffer) => fs.writeFileSync('src/assets/icon.ico', buffer))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
