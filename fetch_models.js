
const https = require('https');

https.get('https://generativelanguage.googleapis.com/v1beta/models?key=AIzaSyAD7iLLfesMF3EPZXIZMEwiSE-C9bQHj-s', (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    const models = JSON.parse(data).models;
    const gemmaModels = models.filter(m => m.name.includes('gemma'));
    console.log(JSON.stringify(gemmaModels, null, 2));
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
