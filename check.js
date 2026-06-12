const https = require('https');
const fs = require('fs');

https.get('https://shop-cash-manager.vercel.app', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    const scripts = html.match(/\/_next\/static\/chunks\/[^"]+\.js/g) || [];
    if (scripts.length === 0) {
      console.log('No scripts found in HTML');
      return;
    }
    
    let foundUrl = false;
    let foundMock = false;
    let pending = scripts.length;
    
    const results = [];
    
    scripts.forEach(scriptPath => {
      const url = 'https://shop-cash-manager.vercel.app' + scriptPath;
      https.get(url, (res2) => {
        let js = '';
        res2.on('data', c => js += c);
        res2.on('end', () => {
          if (js.includes('placeholder-url')) {
             results.push('FOUND PLACEHOLDER in ' + scriptPath);
             foundMock = true;
          }
          if (js.includes('oopwxbo')) {
             results.push('FOUND REAL URL in ' + scriptPath);
             foundUrl = true;
          }
          pending--;
          if (pending === 0) {
             console.log(results.join('\n'));
             console.log('Final Result:');
             console.log('Has Mock:', foundMock);
             console.log('Has Real URL:', foundUrl);
          }
        });
      });
    });
  });
});
