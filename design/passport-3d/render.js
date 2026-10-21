// Render the Food Passport scenes (scene.html) with three.js in headless Chromium.
// Usage: CHROME_PATH=/path/to/chromium node render.js hero,spread,fan 2400 1800
const http=require('http'),fs=require('fs'),path=require('path');
const {chromium}=require('playwright-core');
const ROOT=__dirname;
const CHROME=process.env.CHROME_PATH; // a Chromium / Chrome binary (WebGL via SwiftShader)
const MIME={'.html':'text/html','.js':'application/javascript','.png':'image/png'};
const server=http.createServer((req,res)=>{const p=path.join(ROOT,decodeURIComponent(req.url.split('?')[0]));fs.readFile(p,(e,d)=>{if(e){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':MIME[path.extname(p)]||'application/octet-stream'});res.end(d);});});
(async()=>{
  await new Promise(r=>server.listen(8199,r));
  const b=await chromium.launch({executablePath:CHROME,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
  const scenes=(process.argv[2]||'hero,spread,fan').split(',');
  const W=+(process.argv[3]||2000), H=+(process.argv[4]||1500);
  for(const s of scenes){
    const pg=await b.newPage({viewport:{width:W,height:H}});
    pg.on('console',m=>{if(m.type()==='error'||m.type()==='warning')console.log(s,m.type(),m.text().slice(0,200));});
    pg.on('pageerror',e=>console.log(s,'PAGEERROR',e.message));
    const t0=Date.now();
    await pg.goto(`http://127.0.0.1:8199/scene.html?scene=${s}&w=${W}&h=${H}`);
    await pg.waitForFunction(()=>window.__done===true,null,{timeout:600000});
    await pg.locator('canvas').screenshot({path:path.join(ROOT,'out-'+s+'.png')});
    console.log(s,'rendered in',((Date.now()-t0)/1000).toFixed(1)+'s');
    await pg.close();
  }
  await b.close();server.close();
})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
