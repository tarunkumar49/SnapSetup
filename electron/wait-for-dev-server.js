const http = require('http');

function checkServer(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      attempts++;
      console.log(`Checking dev server (attempt ${attempts}/${maxAttempts})...`);

      http.get(url, (res) => {
        if (res.statusCode === 200) {
          console.log('Dev server is ready!');
          resolve();
        } else {
          retry();
        }
      }).on('error', () => {
        retry();
      });
    };

    const retry = () => {
      if (attempts >= maxAttempts) {
        reject(new Error('Dev server did not start in time'));
      } else {
        setTimeout(check, interval);
      }
    };

    check();
  });
}

checkServer('http://localhost:5173')
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
