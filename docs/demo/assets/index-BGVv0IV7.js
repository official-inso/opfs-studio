(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))a(r);new MutationObserver(r=>{for(const i of r)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function n(r){const i={};return r.integrity&&(i.integrity=r.integrity),r.referrerPolicy&&(i.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?i.credentials="include":r.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(r){if(r.ep)return;r.ep=!0;const i=n(r);fetch(r.href,i)}})();const W=200;let g=null;function V(e){g=e}function l(e,t){if(!g){console[e==="err"?"error":"log"](t);return}const n=document.createElement("li");n.className=e;const a=document.createElement("span");for(a.className="time",a.textContent=new Date().toLocaleTimeString(),n.appendChild(a),n.appendChild(document.createTextNode(t)),g.appendChild(n);g.childElementCount>W;)g.removeChild(g.firstElementChild);g.scrollTop=g.scrollHeight}function X(){if(g)for(;g.firstChild;)g.removeChild(g.firstChild)}function K(e){return e instanceof DOMException?`${e.name}: ${e.message}`:e instanceof Error?`${e.name}: ${e.message}`:String(e)}async function c(e,t){l("info",e);try{const n=await t();return n!==void 0?l("ok",`${e} → ${Y(n)}`):l("ok",`${e} done`),n}catch(n){throw l("err",`${e}: ${K(n)}`),n}}function Y(e){if(e instanceof Uint8Array)return`Uint8Array(${e.byteLength})`;if(e instanceof ArrayBuffer)return`ArrayBuffer(${e.byteLength})`;if(e instanceof Blob)return`Blob(${e.size} bytes, ${e.type||"no-type"})`;if(typeof e=="string")return e.length>120?`"${e.slice(0,120)}…"`:`"${e}"`;if(typeof e=="object")try{return JSON.stringify(e)}catch{return String(e)}return String(e)}const P="opfs-example:active-tab";function _(){try{return sessionStorage.getItem(P)}catch{return null}}function J(e){try{sessionStorage.setItem(P,e)}catch{}}function Q(e){const t=Array.from(document.querySelectorAll(".tab")),n=Array.from(document.querySelectorAll(".tab-pane"));if(t.length===0||n.length===0)return;const a=new Set(t.map(s=>s.dataset.tab??"")),r=_(),i=r&&a.has(r)?r:e;function o(s){for(const d of t)d.classList.toggle("active",d.dataset.tab===s);for(const d of n){const m=d.id.replace(/^tab-/,"");d.classList.toggle("active",m===s),d.hidden=m!==s}J(s)}for(const s of t)s.addEventListener("click",()=>{const d=s.dataset.tab;d&&o(d)});o(i)}async function Z(){const e=await navigator.storage.estimate();return{usage:e.usage,quota:e.quota,usageDetails:e.usageDetails}}async function ee(){const e=await navigator.storage.persist();return e||l("warn","persist() returned false. Browser may need a user-engagement signal or the origin doesn't qualify."),e}async function te(){return await navigator.storage.persisted()}async function u(){return await navigator.storage.getDirectory()}async function ne(e){return await(await u()).getDirectoryHandle(e,{create:!0}),e}async function ae(e){return await(await u()).removeEntry(e,{recursive:!0}),e}async function re(){const e=await u();let t=0;for await(const n of e.keys())try{await e.removeEntry(n,{recursive:!0}),t++}catch(a){l("err",`failed to remove "${n}": ${a.message}`)}return t}async function ie(){const e=await u(),t=[];for await(const[n,a]of e.entries())t.push(`${a.kind}:${n}`);return l("info",t.length?t.join(", "):"(empty)"),t}async function se(){const e=await u(),t=[];for await(const n of e.keys())t.push(n);return l("info",t.length?t.join(", "):"(empty)"),t}async function oe(){const e=await u(),t=[];for await(const n of e.values())t.push(`${n.kind}:${n.name}`);return l("info",t.length?t.join(", "):"(empty)"),t}async function ce(){const e=await u(),t=[];for await(const[n,a]of e.entries())t.push(a.kind==="directory"?`${n}/`:n);return t.length?t.join(", "):"(empty)"}async function de(e){const t=await u(),n=await t.getFileHandle(e,{create:!1}).catch(async()=>await t.getDirectoryHandle(e,{create:!1}));return await t.resolve(n)}async function le(e,t){const r=await(await(await u()).getFileHandle(e,{create:!0})).createWritable();return await r.write(t),await r.close(),t.length}async function ue(e){return await(await(await(await u()).getFileHandle(e)).getFile()).text()}async function fe(e){const r=await(await(await(await u()).getFileHandle(e)).getFile()).arrayBuffer();return new Uint8Array(r)}async function we(e){return await(await u()).removeEntry(e),e}async function me(e,t){const n=await u(),a=await n.getFileHandle(e);if(typeof a.move=="function")try{return await a.move(t),`move() native → ${t}`}catch(s){l("warn",`move() failed (${s.message}), falling back to copy+delete`)}else l("warn","FileSystemFileHandle.move() not supported, falling back to copy+delete");const r=await a.getFile(),o=await(await n.getFileHandle(t,{create:!0})).createWritable();return await o.write(await r.arrayBuffer()),await o.close(),await n.removeEntry(e),`fallback copy+delete → ${t}`}async function v(e,t=!1){return await(await(await u()).getFileHandle(e,{create:!0})).createWritable({keepExistingData:t})}async function pe(e){const t=await v(e);return await t.write("aaa"),await t.write("bbb"),await t.write("ccc"),await t.close(),"aaabbbccc"}async function ge(e){const t=await v(e,!0);return await t.write("0123456789"),await t.seek(3),await t.write("XXX"),await t.close(),"012XXX6789"}async function ye(e,t){const n=await v(e,!0);return await n.truncate(t),await n.close(),t}async function he(e){const t=await v(e);return await t.write({type:"write",position:0,data:"head-"}),await t.write({type:"write",position:5,data:"tail"}),await t.close(),"head-tail"}async function be(e){const t=await v(e),n=new Blob(["blob-payload"],{type:"text/plain"});return await t.write(n),await t.close(),n.size}async function ve(e){const t=await v(e),n=new Uint8Array([222,173,190,239]);return await t.write(n),await t.close(),n.byteLength}const k=["a","b","c"],B="d.txt";async function Se(){let t=await u();for(const r of k)t=await t.getDirectoryHandle(r,{create:!0});const a=await(await t.getFileHandle(B,{create:!0})).createWritable();return await a.write("nested leaf payload"),await a.close(),`${k.join("/")}/${B}`}async function xe(){const e=await u();let t=0;async function n(a,r){for await(const[i,o]of a.entries()){const s=`${r}${i}`;if(o.kind==="file"){const d=await o.getFile();l("info",`  file ${s} (${d.size}B)`),t++}else l("info",`  dir  ${s}/`),await n(o,`${s}/`)}}return await n(e,""),t}async function $e(){return await(await u()).removeEntry(k[0],{recursive:!0}),k[0]}const L="stress";async function Ae(e){const n=await(await u()).getDirectoryHandle(L,{create:!0});for(let a=0;a<e;a++){const i=await(await n.getFileHandle(`f-${String(a).padStart(4,"0")}.txt`,{create:!0})).createWritable();await i.write(`stress file #${a}`),await i.close()}return e}async function ke(){const t=await(await u()).getDirectoryHandle(L,{create:!0}),n=1024*1024,a=new Uint8Array(n).fill(65);let r=0,i=0;try{for(let o=0;o<4096;o++){const d=await(await t.getFileHandle(`fill-${o}.bin`,{create:!0})).createWritable();if(await d.write(a),await d.close(),r++,i+=n,o%16===0){const m=await navigator.storage.estimate();l("info",`  progress: ${r} files, ${(i/1024/1024).toFixed(1)} MB, usage ${m.usage??0}/${m.quota??0}`)}}}catch(o){if(o instanceof DOMException&&o.name==="QuotaExceededError")l("warn",`QuotaExceededError at file #${r}, bytes=${i}`);else throw o}return{filesCreated:r,bytesWritten:i}}const Ee="sync-test.bin",Fe=new TextEncoder().encode("sync-handle-payload");let b=null,Te=1;const E=new Map;async function D(){if(b)return"already running";const e=new Worker(new URL("/opfs-studio/demo/assets/sync-worker-C_s3Smc9.js",import.meta.url),{type:"module"});return b=e,e.addEventListener("message",t=>{const n=t.data;if(n.id===-1){l("info","worker ready");return}const a=E.get(n.id);a&&(E.delete(n.id),n.ok?a.resolve(n.value):a.reject(new Error(n.error)))}),e.addEventListener("error",t=>{l("err",`worker error: ${t.message}`)}),"spawned"}function S(e,t={},n=[]){if(!b)return Promise.reject(new Error("worker not spawned"));const a=Te++;return new Promise((r,i)=>{E.set(a,{resolve:r,reject:i}),b.postMessage({id:a,kind:e,name:Ee,...t},n)})}async function Ce(){await x();const e=Fe.slice().buffer;return await S("write",{data:e},[e])}async function Be(){await x();const e=await S("read"),t=new TextDecoder().decode(new Uint8Array(e.bytes));return l("info",`decoded: "${t}"`),{read:e.read,text:t}}async function Oe(){return await x(),await S("size")}async function Pe(e){return await x(),await S("truncate",{size:e})}async function Le(){await x();const e=await S("close");return b?.terminate(),b=null,E.clear(),e}async function x(){b||await D()}const De=e=>document.getElementById(e),w=(e,t="")=>De(e)?.value??t,Me={"quota:estimate":()=>c("quota.estimate",Z),"quota:persist":()=>c("quota.persist",ee),"quota:persisted":()=>c("quota.persisted",te),"dir:create":()=>{const e=w("dir-name","my-dir")||"my-dir";return c(`dir.create("${e}")`,()=>ne(e))},"dir:remove":()=>{const e=w("dir-name","my-dir")||"my-dir";return c(`dir.remove("${e}", recursive)`,()=>ae(e))},"dir:entries":()=>c("dir.entries()",ie),"dir:keys":()=>c("dir.keys()",se),"dir:values":()=>c("dir.values()",oe),"dir:resolve":()=>{const e=w("file-name","hello.txt")||"hello.txt";return c(`dir.resolve("${e}")`,()=>de(e))},"file:create":()=>{const e=w("file-name","hello.txt")||"hello.txt",t=w("file-content");return c(`file.create("${e}", ${t.length}B)`,()=>le(e,t))},"file:read-text":()=>{const e=w("file-name","hello.txt")||"hello.txt";return c(`file.readText("${e}")`,()=>ue(e))},"file:read-binary":()=>{const e=w("file-name","hello.txt")||"hello.txt";return c(`file.readBinary("${e}")`,()=>fe(e))},"file:delete":()=>{const e=w("file-name","hello.txt")||"hello.txt";return c(`file.delete("${e}")`,()=>we(e))},"file:move":()=>{const e=w("move-from"),t=w("move-to");return c(`file.move("${e}" → "${t}")`,()=>me(e,t))},"write:sequential":()=>{const e=w("write-file","stream.txt")||"stream.txt";return c(`write.sequential("${e}")`,()=>pe(e))},"write:seek":()=>{const e=w("write-file","stream.txt")||"stream.txt";return c(`write.seek("${e}")`,()=>ge(e))},"write:truncate":()=>{const e=w("write-file","stream.txt")||"stream.txt";return c(`write.truncate("${e}", 5)`,()=>ye(e,5))},"write:params":()=>{const e=w("write-file","stream.txt")||"stream.txt";return c(`write.params("${e}")`,()=>he(e))},"write:blob":()=>{const e=w("write-file","stream.txt")||"stream.txt";return c(`write.blob("${e}")`,()=>be(e))},"write:buffer":()=>{const e=w("write-file","stream.txt")||"stream.txt";return c(`write.buffer("${e}")`,()=>ve(e))},"sync:spawn":()=>c("sync.spawn",D),"sync:write":()=>c("sync.write",Ce),"sync:read":()=>c("sync.read",Be),"sync:size":()=>c("sync.size",Oe),"sync:truncate":()=>c("sync.truncate(4)",()=>Pe(4)),"sync:close":()=>c("sync.close",Le),"nested:create":()=>c("nested.create a/b/c/d.txt",Se),"nested:walk":()=>c("nested.walk",xe),"nested:remove":()=>c("nested.remove a recursive",$e),"stress:create":()=>{const e=Number(w("stress-count","100"))||100;return c(`stress.create(${e})`,()=>Ae(e))},"stress:fill":()=>c("stress.fill until quota",ke)};function je(){const e=document.getElementById("tab-advanced");e&&e.querySelectorAll("button[data-act]").forEach(t=>{const n=t.dataset.act;n&&t.addEventListener("click",()=>{const a=Me[n];if(!a){l("err",`unknown action: ${n}`);return}try{const r=a();r instanceof Promise&&r.catch(()=>{})}catch{}})})}async function M(e,t){let n=e;for(const a of t)n=await n.getDirectoryHandle(a,{create:!0});return n}async function He(e){const t=await navigator.storage.getDirectory(),n=e.split("/").filter(Boolean);return await M(t,n),e}async function h(e,t){const n=await navigator.storage.getDirectory(),a=e.split("/").filter(Boolean),r=a.pop();if(!r)throw new Error(`Invalid path: "${e}"`);const s=await(await(await M(n,a)).getFileHandle(r,{create:!0})).createWritable();let d=0;return typeof t=="string"?(await s.write(t),d=new Blob([t]).size):t instanceof Blob?(await s.write(t),d=t.size):t instanceof Uint8Array?(await s.write(t),d=t.byteLength):(await s.write(t),d=t.byteLength),await s.close(),{path:e,size:d}}function j(){return["OPFS Studio · sample text file","================================","","Lorem ipsum dolor sit amet, consectetur adipiscing elit.","Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.","",`Generated at: ${new Date().toISOString()}`].join(`
`)}function H(){const e={generatedAt:new Date().toISOString(),items:Array.from({length:5},(t,n)=>({id:n+1,name:`item-${n+1}`,value:Math.round(Math.random()*1e3)/10}))};return JSON.stringify(e,null,2)+`
`}function I(){return[["id","name","score"],["1","alpha","12.4"],["2","bravo","7.9"],["3","charlie","15.1"],["4","delta","9.0"],["5","echo","13.7"]].map(t=>t.join(",")).join(`
`)+`
`}function R(){return`# OPFS Studio · sample readme

A full markdown showcase to verify how the preview renders every common
construct. Generated at ${new Date().toISOString()}.

## Heading 2

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

---

## Inline formatting

This paragraph mixes **bold**, *italic*, ***bold italic***, ~~strikethrough~~,
\`inline code\`, and a [link to MDN](https://developer.mozilla.org/). You can also
hide text inside an HTML <span title="hover me">tooltip span</span> — the
sanitiser keeps safe tags.

A line with a hard&nbsp;break
and a soft break on the next line.

## Block quotes

> A single-line block quote.

> Multi-paragraph quote.
>
> Second paragraph inside the same quote.
>
> > Nested quote level two.

## Lists

Unordered list:

- First item
- Second item with **emphasis**
  - Nested item
    - Deeper nested item
- Third item

Ordered list:

1. Step one
2. Step two
   1. Sub-step a
   2. Sub-step b
3. Step three

Task list:

- [x] Completed task
- [ ] Pending task
- [ ] Another pending task

## Code

Inline: \`const x: number = 42;\`

Fenced block with language:

\`\`\`ts
interface Item {
  id: number;
  name: string;
}

export function greet(item: Item): string {
  return \`Hello, \${item.name} (#\${item.id})\`;
}
\`\`\`

Plain fenced block:

\`\`\`
$ npm run build:chrome
$ npm run dev
\`\`\`

## Tables

| Component       | Status | Notes                          |
| --------------- | :----: | ------------------------------ |
| Side panel      |   ✅   | works in Chrome / Edge         |
| DevTools panel  |   ✅   | F12 → OPFS Studio              |
| Action popup    |   ✅   | small window above the toolbar |
| Conflict UI     |   ⚠️   | requires open file + diff      |

## Links and images

Reference-style link: [docs][docs-ref].

[docs-ref]: https://example.com/docs

Inline image (1×1 transparent PNG, base64):

![placeholder pixel](data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=)

## Horizontal rule

***

## Footnotes

Markdown supports footnotes[^1] which the renderer may or may not honour.

[^1]: This is a footnote definition.

## HTML passthrough

<details>
  <summary>Click to expand</summary>

  Hidden content revealed on click. The DOMPurify pass keeps \`<details>\` and
  \`<summary>\` because they're safe interactive HTML.

</details>

---

End of file.
`}function U(){return`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4dd0e1"/>
      <stop offset="100%" stop-color="#5c6bc0"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" fill="url(#g)"/>
  <text x="100" y="100" text-anchor="middle" dominant-baseline="middle"
        font-family="monospace" font-size="14" fill="white">OPFS</text>
  <text x="100" y="160" text-anchor="middle" font-family="monospace"
        font-size="9" fill="rgba(255,255,255,0.7)">${new Date().toISOString().slice(0,19)}</text>
</svg>
`}async function q(){const e=document.createElement("canvas");e.width=200,e.height=200;const t=e.getContext("2d");if(!t)throw new Error("2d context unavailable");const n=t.createLinearGradient(0,0,200,200);return n.addColorStop(0,"#4dd0e1"),n.addColorStop(1,"#5c6bc0"),t.fillStyle=n,t.fillRect(0,0,200,200),t.fillStyle="white",t.font="bold 28px ui-monospace, monospace",t.textAlign="center",t.textBaseline="middle",t.fillText("OPFS",100,100),t.fillStyle="rgba(255,255,255,0.7)",t.font="10px ui-monospace, monospace",t.fillText(new Date().toISOString().slice(0,19),100,175),await new Promise((a,r)=>{e.toBlob(i=>i?a(i):r(new Error("canvas.toBlob returned null")),"image/png")})}function G(e=1,t=440,n=44100){const a=Math.floor(e*n),r=n*2,i=a*2,o=new ArrayBuffer(44+i),s=new DataView(o);A(s,0,"RIFF"),s.setUint32(4,36+i,!0),A(s,8,"WAVE"),A(s,12,"fmt "),s.setUint32(16,16,!0),s.setUint16(20,1,!0),s.setUint16(22,1,!0),s.setUint32(24,n,!0),s.setUint32(28,r,!0),s.setUint16(32,2,!0),s.setUint16(34,16,!0),A(s,36,"data"),s.setUint32(40,i,!0);const d=2*Math.PI*t/n;for(let m=0;m<a;m++){const p=Math.sin(d*m)*.4,f=Math.max(-1,Math.min(1,p));s.setInt16(44+m*2,f<0?f*32768:f*32767,!0)}return new Uint8Array(o)}function A(e,t,n){for(let a=0;a<n.length;a++)e.setUint8(t+a,n.charCodeAt(a))}async function N(e=2e3){const t=Ie();if(!t)return null;const n=document.createElement("canvas");n.width=320,n.height=180;const a=n.getContext("2d");if(!a)return null;const i=n.captureStream(30),o=new MediaRecorder(i,{mimeType:t}),s=[];o.ondataavailable=p=>{p.data&&p.data.size&&s.push(p.data)};const d=new Promise(p=>{o.onstop=()=>p()});o.start();const m=performance.now();return await new Promise(p=>{const f=$=>{const T=($-m)/e;if(T>=1){p();return}const C=T*360|0,F=a.createLinearGradient(0,0,n.width,n.height);F.addColorStop(0,`hsl(${C}, 70%, 55%)`),F.addColorStop(1,`hsl(${(C+90)%360}, 70%, 35%)`),a.fillStyle=F,a.fillRect(0,0,n.width,n.height),a.fillStyle="white",a.font="bold 24px ui-monospace, monospace",a.textAlign="center",a.textBaseline="middle",a.fillText("OPFS",n.width/2,n.height/2),requestAnimationFrame(f)};requestAnimationFrame(f)}),o.stop(),i.getTracks().forEach(p=>p.stop()),await d,new Blob(s,{type:t})}function Ie(){const e=["video/webm;codecs=vp9","video/webm;codecs=vp8","video/webm"];for(const t of e)if(typeof MediaRecorder<"u"&&MediaRecorder.isTypeSupported(t))return t;return null}function z(e="OPFS Studio · sample PDF"){const t=new TextEncoder,n=[],a=[];let r=0;const i=f=>{const $=t.encode(f);n.push($),r+=$.byteLength};i(`%PDF-1.4
%âãÏÓ
`),a[1]=r,i(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
`),a[2]=r,i(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
`),a[3]=r,i(`3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
`);const s=`BT
/F1 24 Tf
72 770 Td
(${e.replace(/[()\\]/g,f=>`\\${f}`)}) Tj
ET
`;a[4]=r,i(`4 0 obj
<< /Length ${t.encode(s).byteLength} >>
stream
${s}endstream
endobj
`),a[5]=r,i(`5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
`);const d=r;i(`xref
0 6
`),i(`0000000000 65535 f 
`);for(let f=1;f<=5;f++)i(`${String(a[f]).padStart(10,"0")} 00000 n 
`);i(`trailer
<< /Size 6 /Root 1 0 R >>
startxref
${d}
%%EOF
`);const m=new Uint8Array(r);let p=0;for(const f of n)m.set(f,p),p+=f.byteLength;return m}async function Re(){const e=[],t=[],n=await q();await h("assets/images/image.png",n),e.push("assets/images/image.png"),await h("assets/images/image.svg",U()),e.push("assets/images/image.svg"),await h("assets/audio/tone.wav",G()),e.push("assets/audio/tone.wav");const a=await N();return a?(await h("assets/videos/clip.webm",a),e.push("assets/videos/clip.webm")):t.push("assets/videos/clip.webm (MediaRecorder not supported)"),await h("assets/docs/sample.pdf",z()),e.push("assets/docs/sample.pdf"),await h("assets/docs/readme.md",R()),e.push("assets/docs/readme.md"),await h("assets/data/data.json",H()),e.push("assets/data/data.json"),await h("assets/data/data.csv",I()),e.push("assets/data/data.csv"),await h("assets/data/notes.txt",j()),e.push("assets/data/notes.txt"),{created:e,skipped:t}}async function y(e,t){const n=await h(e,t);return{path:n.path,size:n.size}}const Ue=[{id:"dir.assets",label:"Create folder assets/",description:"Empty directory at the OPFS root.",kind:"dir",async run(){return{path:await He("assets"),message:"directory created"}}},{id:"img.png",label:"Generate PNG image",description:"200×200 gradient with overlayed text. Saved as assets/image.png.",kind:"file",async run(){const e=await q();return y("assets/image.png",e)}},{id:"img.svg",label:"Generate SVG image",description:"Static SVG gradient. Saved as assets/image.svg.",kind:"file",async run(){return y("assets/image.svg",U())}},{id:"audio.wav",label:"Generate WAV (1s 440Hz)",description:"PCM-16 mono sine wave. Saved as assets/tone.wav.",kind:"file",async run(){return y("assets/tone.wav",G())}},{id:"video.webm",label:"Generate WebM (2s)",description:"MediaRecorder captures a 2-second canvas gradient as WebM.",kind:"file",async run(){const e=await N();return e?y("assets/video.webm",e):{message:"MediaRecorder not supported in this browser"}}},{id:"doc.pdf",label:"Generate PDF",description:"Minimal valid PDF 1.4 with one text line. Saved as assets/sample.pdf.",kind:"file",async run(){return y("assets/sample.pdf",z())}},{id:"text.txt",label:"Generate TXT",description:"Plain text with a timestamp. Saved as notes.txt.",kind:"file",async run(){return y("notes.txt",j())}},{id:"text.json",label:"Generate JSON",description:"Small JSON payload. Saved as data.json.",kind:"file",async run(){return y("data.json",H())}},{id:"text.json-update",label:"Update data.json",description:"Reads data.json, appends a new item, bumps generatedAt. Creates the file if missing.",kind:"file",async run(){const e=await navigator.storage.getDirectory();let t={generatedAt:"",items:[]};try{const r=await(await(await e.getFileHandle("data.json")).getFile()).text(),i=JSON.parse(r);t={generatedAt:typeof i.generatedAt=="string"?i.generatedAt:"",items:Array.isArray(i.items)?i.items:[]}}catch{}const n=(t.items.at(-1)?.id??0)+1;return t.items.push({id:n,name:`item-${n}`,value:Math.round(Math.random()*1e3)/10}),t.generatedAt=new Date().toISOString(),y("data.json",JSON.stringify(t,null,2)+`
`)}},{id:"text.csv",label:"Generate CSV",description:"5 rows × 3 columns. Saved as data.csv.",kind:"file",async run(){return y("data.csv",I())}},{id:"text.md",label:"Generate Markdown",description:"Sample readme. Saved as readme.md.",kind:"file",async run(){return y("readme.md",R())}},{id:"tree.demo",label:"Create demo tree",description:"assets/{images,audio,videos,docs,data}/… with one file of each kind.",kind:"tree",async run(){return{tree:await Re()}}}];function qe(e){if(e.tree){const t=e.tree.created.length,n=e.tree.skipped.length,a=n?`, ${n} skipped`:"";return`created ${t} file${t===1?"":"s"}${a}`}return e.path&&typeof e.size=="number"?`${e.path} (${e.size}B)`:e.path?e.path:e.message?e.message:"done"}function Ge(){const e=document.getElementById("simple-grid");if(e){e.replaceChildren();for(const t of Ue){const n=document.createElement("article");n.className=`preset-card preset-${t.kind}`;const a=document.createElement("h3");a.textContent=t.label;const r=document.createElement("p");r.textContent=t.description;const i=document.createElement("button");i.textContent="Run",i.dataset.presetId=t.id,i.addEventListener("click",()=>{i.disabled=!0,c(`simple:${t.id}`,async()=>{const o=await t.run();if(o.tree){for(const s of o.tree.created)l("ok",`  + ${s}`);for(const s of o.tree.skipped)l("warn",`  · ${s}`)}return qe(o)}).catch(()=>{}).finally(()=>{i.disabled=!1})}),n.append(a,r,i),e.append(n)}}}const O=document.getElementById("log");O&&V(O);document.getElementById("clear-log")?.addEventListener("click",X);document.getElementById("clear-opfs")?.addEventListener("click",()=>{c("wipe OPFS root",re)});document.getElementById("refresh-list")?.addEventListener("click",()=>{c("list root",ce)});Q("simple");Ge();je();!("storage"in navigator)||!("getDirectory"in navigator.storage)?l("err","OPFS API is not available in this browser context"):l("info","Ready. Open the OPFS Studio extension to inspect changes.");
