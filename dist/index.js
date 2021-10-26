import e from"fs-extra";import t from"get-value";import r from"object.defaults/mutable.js";import o from"ora";import a from"chalk";import n from"log-symbols";import s from"path";import i from"sane";import{debounce as c}from"throttle-debounce";import l from"camelcase";import{findUp as p}from"find-up";import{globby as u}from"globby";import f from"pupa";import d from"set-value";import m from"uppercamelcase";import g from"object.pick";import{promisify as h}from"util";import{exec as y}from"child_process";function w(e){return e.replace(/([\da-z])([A-Z])/g,"$1-$2").replace(/([A-Z])([A-Z])(?=[a-z])/g,"$1-$2").toLowerCase()}function $(e,t){const r=/@([\d.]+)x/.exec(e);return r?Number.parseFloat(r[1]):void 0!==t?t:1}function x(e){let r=t(e,"meta.number_of_packs",{default:0});return 0===r&&(r=t(e,"meta.related_multi_packs",{default:[]}).length+1),r}function j(e,t){let r=(e=`${e}`).replace(`${t}/`,"").split("/").map((e=>function(e){return e.replace(/(\W)/g,"_").replace(/_{2,}/g,".").replace(/^_/,"").replace(/_$/,"")}(e))),o=r.pop();o=o.toUpperCase(),r=r.map((e=>l(e)));let a=t.split("/");return a=a.slice(a.length-(1===a.length?1:2)),a.push("sprites"),a=m(a.join("-")),r.length>0?[a,e=(e=r.join(".")).replace(/(\W^\.)/g,"").replace(/\.{2,}/g,".").replace(/^\./,"").replace(/\.$/,""),o].join("."):[a,o].join(".")}function b(e){if(e.length>0){const r=e[0];return t(r,"meta.number_of_packs",{default:1})}return 0}async function k(r,o,i,c){const l=await async function(r,o,a,n){const i=t(n,"includeSizeInfo",a.includeSizeInfo),c=t(n,"includePNGExpressMetadata",a.includePNGExpressMetadata),l={};if(!i&&!c)return l;for(const e of r||[])for(const t of Object.keys(e.frames)){const r=e.frames[t];l[t]={id:t,width:r.sourceSize.w,height:r.sourceSize.h}}if(c)try{const t=await p("pngexpress-metadata.json",{cwd:s.join(a.sourceDirectory,o),type:"file"});if(t){const r=`${s.relative(t,s.join(a.sourceDirectory,o)).replace("../","")}/`,n=await e.readJson(t);for(const e of n.assets)for(const t of e.states){let a=o+e.id.replace(r,"");a="/"===a[0]?a.slice(1):a,a="default"===t?a:a+t,l[a]={...g(e,["x","y","zIndex","visible","opacity"]),...l[a]}}return l}}catch(e){console.log(e)}return l}(r,o,i,c),u=t(c,"includeSizeInfo",i.includeSizeInfo),f=t(c,"includePNGExpressMetadata",i.includePNGExpressMetadata),m=o,h={};for(const e of r||[])for(const t of Object.keys(e.frames)){let e=t;(u||f)&&(l[t]?e={id:t,...l[t]}:console.log("\n",n.warning,a.yellow(`Could not find asset info for ${t}, check the export filename.`),"\n")),t.includes("eiland")&&console.log("build",j(t,m),e),d(h,j(t,m),e)}return h}function v(e,t){let r="";const o=Object.keys(e)[0],a=function(e){const t=[];for(const r of Object.keys(e))Object.prototype.hasOwnProperty.call(e,r)&&t.push([r,e[r]]);t.sort(((e,t)=>{const r=e[0],o=t[0];return r<o?-1:r>o?1:0}));const r={};for(const e of t)r[e[0]]=e[1];return r}(e[o]);let n=JSON.stringify(a,void 0,2);return n=n.replace(/"([^"()]+)":/g,"$1:"),r=`${r}${f("export const {assetName} = {assetData};",{assetName:o,assetData:n})}\n`,r=`${r}${f("export const {assetsVariable}LoaderInfo = {\n  assets: {assetsVariable},\n  fileName : '{fileName}',\n  numberOfParts : {numberOfParts},\n  type: 'sprites'\n};",{assetsVariable:o,fileName:t.fileName,numberOfParts:t.numberOfParts})}\n`,r}async function D(r,o,a){const n=t(a,"scriptDirectory",o.scriptDirectory),i=await u(`${s.join(o.targetDirectory,r)}/*[0-9]+.json`),c=[];for(const t of i)c.push(e.readJson(t));const l=await Promise.all(c),p=v(await k(l,r,o,a),{fileName:r,numberOfParts:b(l)}),f=function(e,t){const r=e.split("/"),o=r.pop();return r.length<2&&r.push(o),e=r.join("/"),`${s.join(t,e)}/assets/sprites-${o}.ts`}(r,n);await e.outputFile(f,p)}const P=h(y),N={format:"pixijs4","texture-format":"png","jpg-quality":100,"max-size":2048,"png-opt-level":0,opt:"RGBA8888","prepend-folder-name":!0,"trim-sprite-names":!0,algorithm:"MaxRects","maxrects-heuristics":"Best","pack-mode":"Best","scale-mode":"Smooth",multipack:!0,"force-identical-layout":!0,"trim-mode":"Trim","alpha-handling":"ClearTransparentPixels","default-pivot-point":"0,0","enable-rotation":!0,quiet:!0,extrude:"0","shape-padding":"2",variant:["1:@2x","0.5:"]};async function O(e,t){const o=function(e,t){"1"===(t=t||{}).extrude&&(t["shape-padding"]=0);"jpg"===t["texture-format"]&&(t["alpha-handling"]="ReduceBorderArtifacts");const r=new _;r.addPath(`${e}`);for(const e of Object.keys(t))r.addOption(e,t[e]);return r.build()}(e,r(t,N));try{await P(o)}catch(e){if(e&&e.stderr)throw new Error(e.stderr);return!1}return!0}class _{constructor(){this.commands=[],this.path=""}addPath(e){this.path=e}addOption(e,t){this.commands.push({option:`--${w(e)}`,value:t})}build(){if(!this.path)throw new Error("Must specify a path to process (image/directory)");const e=this.commands.map((e=>this.resolveValue(e.option,e.value))).join(" ");return`TexturePacker ${this.path} ${e}`}resolveValue(e,t){return Array.isArray(t)?t.map((t=>this.resolveValue(e,t))).join(" "):`${e}${t=!0===t?"":` ${t}`}`}}const z={},S={};async function A(r,i){let c,l;Array.isArray(r)?(c=r[0],l=r[1]):c=r;const p=c.split("/").pop();if(z[c])return console.log(n.warning,a.yellow("Allready packing, starting again afterwards...")),void(S[c]=!0);z[c]=!0;const f=t(l,"textureFormat",i.textureFormat),m={sheet:`${s.join(i.targetDirectory,c,p)}-{n1}{v}.${f}`,data:`${s.join(i.targetDirectory,c,p)}-{n1}{v}.json`,replace:`^${p}=${c}`,extrude:t(l,"extrude",i.extrude)?"1":"0","texture-format":f,"max-size":t(l,"maxSize",i.maxSize)},g=o(`Packing ${c}`).start();try{if(!await O(`${s.join(i.sourceDirectory,c)}`,m))return void g.fail(`Error packing ${c}`)}catch(e){return g.fail(`Error packing ${c}`),void console.error(n.warning,e.message)}await async function(t){const r=await u(`${t}/*.json`);for(const t of r){const r=$(t),o=await e.readJson(t);d(o,"meta.scale",r),d(o,"meta.number_of_packs",x(o)),d(o,"meta.related_multi_packs"),await e.writeJson(t,o)}}(`${s.join(i.targetDirectory,c)}`),await D(c,i,l),z[c]=!1,S[c]?(S[c]=!1,g.warn("Needs repacking, something changed while packing..."),await A(r,i)):g.succeed(`Done packing ${c}`)}async function E(e,t){return new Promise((r=>{let o,l={};if(Array.isArray(e)?(o=e[0],l=e[1]):o=e,!0!==t.watch&&!0!==l.watch||!1===l.watch)return void r();const p=c(t.watchDelay,(()=>{A(e,t)})),u=i(`${s.join(t.sourceDirectory,o)}`,{glob:["**/*.png","**/*.jpg"]});u.on("ready",(()=>{console.log(n.info,a.blue(`Started watching ${o} with a delay of ${t.watchDelay/1e3}s`)),r()})),u.on("change",p),u.on("add",p),u.on("delete",p)}))}async function F(s){const i=await async function(a){const n=o(`Reading settings from ${a}...`).start();let s={};try{const o=await e.readJSON(a);s=t(o,"sprites",{}),s=r(s,{sourceDirectory:"./assets/",scriptDirectory:"./assets/converted/",targetDirectory:"./assets/converted/",watch:!1,watchDelay:500,extrude:!1,textureFormat:"png",includeSizeInfo:!1,includePNGExpressMetadata:!1,directories:[]})}catch{return n.fail(`Could not load settings from ${a}... (does it exist?)`),s}const i=s.directories.length;return i?n.succeed(`Found ${i} directories to process...`):n.fail("Found no directories to process..."),s}(s),c=i.directories;delete i.directories,i&&c&&(await async function(e,t){console.log(n.info,a.blue("Start packing all items..."));for(const r of e)await A(r,t);console.log(n.success,a.green("Done packing all items..."))}(c,i),await async function(e,t){for(const r of e)await E(r,t)}(c,i))}function I(e){F(e||"assets.json")}export{I as pack};
