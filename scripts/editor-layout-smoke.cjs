const {app,BrowserWindow}=require('electron');
const path=require('path');
// Run from the repository: node_modules/.bin/electron scripts/editor-layout-smoke.cjs
app.whenReady().then(async()=>{
 const win=new BrowserWindow({show:false,width:1280,height:900,webPreferences:{partition:'page-style-check'}});
 const evaluate=async source=>{
   const result=await win.webContents.executeJavaScript('(async()=>{try{return {value:await ('+source+')}}catch(error){return {error:String(error)}}})()');
   if(result.error)throw Error(result.error);
   return result.value;
 };
 try{
 await win.loadFile(path.resolve(__dirname,'../roadmap.html'));
 console.log(await evaluate(`(async()=>{
 const check=(ok,msg)=>{if(!ok)throw Error(msg);};
 S=buildTemplate('blank');S.roadmap.title='2026 플랫폼 로드맵';S.roadmap.subtitle='제품 경험부터 플랫폼 기반까지, 다음 단계를 함께 만듭니다.';S.roadmap.startDate='2026-01-01';S.roadmap.endDate='2026-12-31';
 const names=['플랫폼 기반','제품 경험','데이터 & 인사이트','안정성 & 운영'];
 const items=[['사용자 인증 개선','API 버전 2 출시','레이트 리밋 적용'],['디자인 시스템 정비','대시보드 개편','접근성 개선'],['이벤트 수집 파이프라인','분석 대시보드','실험 플랫폼'],['모니터링 고도화','배포 자동화','성능 최적화']];
 S.roadmap.categories=names.map((name,c)=>({id:'cat-'+c,name,subtitle:['안전하고 유연한 서비스 기반','일관되고 편리한 사용자 경험','데이터로 만드는 의사결정','지속 가능한 서비스 운영'][c],color:['#6366F1','#059669','#D97706','#0284C7'][c],items:items[c].map((name,i)=>({id:'item-'+c+'-'+i,name,start:'2026-02-01',end:'2026-08-01',fillColor:['#6366F1','#059669','#D97706','#0284C7'][c],progress:[80,45,20][i],statusId:'in-progress'}))}));
 tlScale='week';render();
 for(const style of ['default','card']){
 S.roadmap.style=style;render();
 const w=document.getElementById('tlWrap');
 check(w.scrollHeight<=w.clientHeight+1,'inner vertical overflow');
 window.scrollTo(0,500);check(window.scrollY===500,'document does not scroll');
 check(Math.abs(document.querySelector('.tl-date-index').getBoundingClientRect().top)<1,'index not sticky');
 w.scrollLeft=350;await new Promise(r=>setTimeout(r,100));
 check(document.querySelector('.tl-index-scroll').scrollLeft===w.scrollLeft,'index alignment');
 const b=w.getBoundingClientRect();
 const label=Array.from(document.querySelectorAll('.tl-item-label')).find(el=>{const r=el.getBoundingClientRect();return r.top>100&&r.bottom<700;});
 check(label&&Math.abs(label.getBoundingClientRect().left-b.left)<=2,'left labels not frozen '+style);
 const rect=label.getBoundingClientRect();
 check(document.elementFromPoint(rect.left+20,rect.top+20).closest('.tl-item-label'),'bar covers label '+style);
 render();check(window.scrollY===500,'page position lost');check(document.getElementById('tlWrap').scrollLeft===350,'horizontal position lost');
 }
 check(getComputedStyle(document.querySelector('.roadmap-stage--card')).backgroundColor==='rgb(255, 255, 255)','gray card exterior');
 check(document.querySelectorAll('.tl-category-group').length===4,'category groups missing');
 check(generateStaticHTMLFragment().includes('roadmap-design--card'),'export missing card design');
 window.scrollTo(0,0);document.getElementById('tlWrap').scrollLeft=0;
 return 'PASS: document scrolling, sticky index, horizontal sync, fixed labels, scroll restoration, white exterior, grouped cards, export style';
 })()`));
 win.setSize(560,800);await new Promise(r=>setTimeout(r,200));
 console.log(await evaluate(`(()=>{
 if(document.body.scrollWidth>innerWidth)throw Error('Mobile page overflows horizontally');
 const w=document.getElementById('tlWrap');
 if(w.scrollHeight>w.clientHeight+1)throw Error('Mobile timeline scrolls vertically');
 S.roadmap.darkMode=true;render();
 if(getComputedStyle(document.querySelector('.tl-cat-label')).backgroundColor!=='rgb(24, 34, 53)')throw Error('Dark card surface');
 for(const pattern of ['diagonal-lines','horizontal-lines','vertical-lines','grid-lines']){
 S.roadmap.statuses.find(s=>s.id==='in-progress').pattern=pattern;
 S.roadmap.statuses.find(s=>s.id==='in-progress').progressPattern=pattern;
 render();
 const bar=document.querySelector('.bar-pill'),progress=bar.querySelector('.bar-prog');
 if(getComputedStyle(bar).backgroundColor!=='rgb(255, 255, 255)'||getComputedStyle(progress).backgroundColor!=='rgb(255, 255, 255)')throw Error('Line pattern background '+pattern);
 if(!bar.classList.contains('line-pattern-label'))throw Error('Line pattern label contrast');
 if(!bar.querySelector('span[aria-hidden] > span'))throw Error('Line pattern strokes missing');
 const legend=document.querySelectorAll('.tl-legend-swatch')[1];
 if(getComputedStyle(legend).backgroundColor!=='rgb(255, 255, 255)')throw Error('Legend pattern background');
 if(!validate(S).valid)throw Error('Editor pattern validation');
 openStForm(S.roadmap.statuses.find(s=>s.id==='in-progress'));
 if(document.getElementById('fSpat').value!==pattern||document.getElementById('fSprogPat').value!==pattern)throw Error('Pattern selection round trip');
 closeModal();
 if(!generateStaticHTMLFragment().includes('line-pattern-label'))throw Error('Pattern export');
 }
 S.roadmap.darkMode=false;
 for(const style of ['default','card'])for(const progress of [0,50,100]){
 S.roadmap.style=style;
 Object.assign(S.roadmap.statuses.find(s=>s.id==='in-progress'),{pattern:'diagonal-lines',progressPattern:'solid'});
 S.roadmap.categories[0].items[0].progress=progress;
 render();
 const bar=document.querySelector('.bar-pill');
 const label=bar.querySelector('.bar-nm');
 if(getComputedStyle(label).backgroundColor!=='rgba(0, 0, 0, 0)')throw Error('Opaque label background '+style);
 if(progress){
 const fill=bar.querySelector('.bar-prog');
 if(getComputedStyle(fill).borderRadius!=='0px'||getComputedStyle(bar).overflow!=='hidden')throw Error('Independent progress corners '+style);
 if(style==='default'){
 bar.scrollIntoView({block:'center',inline:'nearest'});
 document.getElementById('tlWrap').scrollLeft=0;
 bar.querySelectorAll('.rzh').forEach(handle=>handle.style.pointerEvents='none');
 const rect=bar.getBoundingClientRect(),border=parseFloat(getComputedStyle(bar).borderLeftWidth);
 if(document.elementFromPoint(rect.left+border+1,rect.top+border+4)!==fill)throw Error('White gap at progress corner: '+document.elementFromPoint(rect.left+border+1,rect.top+border+4)?.className);
 }
 }
 }
 S.roadmap.categories=[];render();
 if(!document.querySelector('.empty-timeline'))throw Error('Empty roadmap');
 return 'PASS: narrow viewport, dark card surface, white line patterns, legend, settings, export, transparent labels, progress corners, empty roadmap';
 })()`));
 }catch(e){console.error(e);app.exit(1);return;}
 app.quit();
});
