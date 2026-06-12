const https = require('https');
https.get('https://shop-cash-manager.vercel.app', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // We want to find the main chunks, maybe a layout or page chunk.
    const scriptMatches = data.match(/src="(\/_next\/static\/chunks\/[^"]+\.js)"/g);
    if (!scriptMatches) return console.log('no scripts found');
    
    console.log('Found scripts:', scriptMatches.length);
    scriptMatches.forEach(src => {
        const url = 'https://shop-cash-manager.vercel.app' + src.replace('src="', '').replace('"', '');
        https.get(url, (res2) => {
            let js = '';
            res2.on('data', c => js += c);
            res2.on('end', () => {
                if (js.includes('placeholder-url')) {
                    console.log('FOUND PLACEHOLDER IN:', url);
                }
                const matches = js.match(/https:\/\/[a-zA-Z0-9-]+\.supabase\.co/g);
                if (matches && !matches.includes('https://placeholder-url.supabase.co')) {
                    console.log('Found REAL Supabase URL in', url, [...new Set(matches)]);
                }
            });
        });
    });
  });
});
