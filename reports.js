(()=>{
  const pad2=n=>String(n).padStart(2,'0');
  const todayKey=()=>{const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`};
  const recordDate=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.date||''))return e.date;const d=new Date(e.ts);return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`};
  const recordTime=e=>{const d=new Date(e.ts);return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`};
  const prettyDate=s=>s.replaceAll('-','.');
  const dayLabel=s=>{const [y,m,d]=s.split('-');return `${y}년 ${Number(m)}월 ${Number(d)}일`};
  const monthLabel=s=>{const [y,m]=s.split('-');return `${y}년 ${Number(m)}월`};
  const latestDate=()=>log.length?log.map(recordDate).sort().at(-1):todayKey();
  const sorted=entries=>[...entries].sort((a,b)=>recordDate(b).localeCompare(recordDate(a))||new Date(b.ts)-new Date(a.ts));

  function setOptions(el,values,selected){
    el.innerHTML=values.map(v=>`<option value="${v}">${Number(v)}</option>`).join('');
    if(values.map(String).includes(String(selected)))el.value=String(selected);
  }
  function years(){
    const now=new Date().getFullYear(),logged=log.map(e=>Number(recordDate(e).slice(0,4))).filter(Number.isFinite);
    const min=Math.min(now-10,...logged),max=Math.max(now+3,...logged);
    return Array.from({length:max-min+1},(_,i)=>String(min+i));
  }
  function updateDays(prefix,wanted){
    const y=Number(document.getElementById(prefix+'Year').value),m=Number(document.getElementById(prefix+'Month').value);
    const el=document.getElementById(prefix+'Day'),keep=wanted||Number(el.value)||1,count=new Date(y,m,0).getDate();
    setOptions(el,Array.from({length:count},(_,i)=>String(i+1)),Math.min(keep,count));
  }
  function initDateGroup(prefix,date){
    const [y,m,d]=date.split('-');
    setOptions(document.getElementById(prefix+'Year'),years(),y);
    setOptions(document.getElementById(prefix+'Month'),Array.from({length:12},(_,i)=>String(i+1)),Number(m));
    updateDays(prefix,Number(d));
  }
  function selectedDay(prefix){return `${document.getElementById(prefix+'Year').value}-${pad2(document.getElementById(prefix+'Month').value)}-${pad2(document.getElementById(prefix+'Day').value)}`}
  function selectedMonth(prefix){return `${document.getElementById(prefix+'Year').value}-${pad2(document.getElementById(prefix+'Month').value)}`}
  function filtered(period,key){return sorted(log.filter(e=>period==='day'?recordDate(e)===key:recordDate(e).startsWith(key+'-')))}
  function query(period,key){return {period,key,entries:filtered(period,key),label:period==='day'?dayLabel(key):monthLabel(key),suffix:key.replaceAll('-','')}}
  function ioQuery(){return query('day',selectedDay('io'))}
  function logQuery(){const period=document.getElementById('logPeriod').value;return query(period,period==='day'?selectedDay('log'):selectedMonth('log'))}

  function totals(entries){
    const incoming=entries.filter(e=>e.mode==='in'),outgoing=entries.filter(e=>e.mode==='out');
    return {inCount:incoming.length,outCount:outgoing.length,inQty:incoming.reduce((n,e)=>n+Number(e.qty||0),0),outQty:outgoing.reduce((n,e)=>n+Number(e.qty||0),0)};
  }
  function logCard(e){
    return `<div class="log"><div><div class="t1">${esc(e.cat)} · ${esc(e.name)}</div><div class="t2">${prettyDate(recordDate(e))} ${recordTime(e)}${e.note?' · '+esc(e.note):''}</div></div><div style="display:flex;align-items:center;gap:10px"><div class="amt ${e.mode}">${e.mode==='in'?'+':'−'}${e.qty}</div><button class="undo" onclick="undo(${e.id})">취소</button></div></div>`;
  }
  function renderLogView(){
    const q=logQuery(),el=document.getElementById('logList');
    document.getElementById('logScopeTitle').textContent=`${q.label} · ${q.entries.length}건`;
    if(!q.entries.length){el.innerHTML='<div class="empty">선택한 기간의 입출고 기록이 없습니다.</div>';return}
    if(q.period==='day'){el.innerHTML=q.entries.map(logCard).join('');return}
    const groups={};q.entries.forEach(e=>(groups[recordDate(e)]||=[]).push(e));
    el.innerHTML=Object.keys(groups).sort().reverse().map(day=>`<div class="monthgroup"><div class="monthday">${dayLabel(day)} · ${groups[day].length}건</div>${groups[day].map(logCard).join('')}</div>`).join('');
  }

  function renderDashboardMonth(){
    const key=todayKey().slice(0,7),t=totals(filtered('month',key));
    document.getElementById('dashMonthLabel').textContent=`${monthLabel(key)} · 합계를 누르면 기록으로 이동`;
    document.getElementById('dashInCount').textContent=t.inCount;document.getElementById('dashOutCount').textContent=t.outCount;
    document.getElementById('dashInQty').textContent=t.inQty;document.getElementById('dashOutQty').textContent=t.outQty;
  }
  function renderDashboardStock(){
    let total=0,red=0,orange=0,green=0;
    document.getElementById('stockList').innerHTML=inv.map((c,ci)=>{
      const items=c.items.map((it,ii)=>{total++;const level=lvl(it.qty);if(level==='red')red++;else if(level==='orange')orange++;else green++;
        return `<button class="dashitem" data-ci="${ci}" data-ii="${ii}"><span class="dn">${esc(it.name)}${it.note?`<span class="dnote">${esc(it.note)}</span>`:''}</span><span class="pill ${level}">${lvlText(level)}</span><span class="dq">${it.qty}</span><span class="go">›</span></button>`;
      }).join('');
      return `<div class="cat ${openCats[c.cat]?'open':''}"><button class="cathead" data-dashboard-cat="${ci}"><span class="left"><span class="badge">${c.items.length}</span><span class="nm">${esc(c.cat)}</span></span><span class="arw">▼</span></button><div class="catbody">${items||'<div class="row"><div class="note">등록된 품목이 없습니다.</div></div>'}</div></div>`;
    }).join('');
    document.querySelectorAll('[data-dashboard-cat]').forEach(b=>b.onclick=()=>toggleCat(inv[Number(b.dataset.dashboardCat)].cat));
    document.querySelectorAll('.dashitem').forEach(b=>b.onclick=()=>openEditor(Number(b.dataset.ci),Number(b.dataset.ii)));
    document.getElementById('sTotal').textContent=total;document.getElementById('sRed').textContent=red;document.getElementById('sOrange').textContent=orange;document.getElementById('sGreen').textContent=green;
  }
  function renderEditor(){
    document.getElementById('editInventoryList').innerHTML=inv.map((c,ci)=>`<div class="editcat"><h4>${esc(c.cat)} · ${c.items.length}개</h4>${c.items.map((it,ii)=>{const level=lvl(it.qty);return `<div class="editrow" id="edit-item-${ci}-${ii}"><div class="rowtop"><div class="itemname">${esc(it.name)}${it.note?`<div class="note">${esc(it.note)}</div>`:''}</div><span class="pill ${level}">${lvlText(level)}</span></div><div class="stepper"><button class="pm minus" onclick="manageBump(${ci},${ii},-1)">−</button><input class="qty" type="number" inputmode="numeric" value="${it.qty}" onchange="manageQty(${ci},${ii},this.value)" onfocus="this.select()"><button class="pm plus" onclick="manageBump(${ci},${ii},1)">＋</button></div><div class="rowtools"><button onclick="manageRename(${ci},${ii})">이름 수정</button><button onclick="manageDelete(${ci},${ii})">품목 삭제</button></div><div class="noteedit"><input type="text" maxlength="50" value="${esc(it.note||'')}" placeholder="비고 입력 (이미지에도 표시)" onfocus="this.select()"><button onclick="manageNote(${ci},${ii},this.previousElementSibling.value)">비고 저장</button></div></div>`}).join('')}</div>`).join('');
  }
  function openEditor(ci,ii){
    document.querySelector('.tabs button[data-page="edit"]').click();
    setTimeout(()=>{const el=document.getElementById(`edit-item-${ci}-${ii}`);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1800)},80);
  }
  window.manageBump=(ci,ii,d)=>{const it=inv[ci].items[ii];if(it.qty+d<0){toast('0보다 작아질 수 없습니다');return}it.qty+=d;ss(K_INV,inv);render()};
  window.manageQty=(ci,ii,v)=>{let n=parseInt(v,10);if(isNaN(n)||n<0)n=0;inv[ci].items[ii].qty=n;ss(K_INV,inv);render();toast('수량이 저장되었습니다')};
  window.manageNote=(ci,ii,v)=>{const note=String(v).trim();if(note)inv[ci].items[ii].note=note;else delete inv[ci].items[ii].note;ss(K_INV,inv);render();toast(note?'비고가 저장되었습니다':'비고가 삭제되었습니다')};
  window.manageRename=(ci,ii)=>{const it=inv[ci].items[ii],old=it.name,name=prompt('품목명을 수정해 주세요',old);if(name===null||!name.trim())return;it.name=name.trim();log.forEach(e=>{if(e.cat===inv[ci].cat&&e.name===old)e.name=it.name});ss(K_INV,inv);ss(K_LOG,log);render();toast('이름이 수정되었습니다')};
  window.manageDelete=(ci,ii)=>{if(!confirm(`"${inv[ci].items[ii].name}" 품목을 삭제하시겠습니까?`))return;inv[ci].items.splice(ii,1);ss(K_INV,inv);render();toast('삭제되었습니다')};

  document.getElementById('btnSubmit').onclick=()=>{
    const ci=Number(document.getElementById('selCat').value),ii=Number(document.getElementById('selItem').value),qty=parseInt(document.getElementById('inpQty').value,10);
    const note=document.getElementById('inpNote').value.trim(),c=inv[ci],it=c&&c.items[ii],date=selectedDay('io');
    if(!it){toast('품목을 선택해 주세요');return}if(!qty||qty<=0){toast('수량을 입력해 주세요');return}
    if(mode==='out'&&it.qty-qty<0){toast(`재고가 부족합니다 (현재 ${it.qty})`);return}
    it.qty+=mode==='in'?qty:-qty;if(note)it.note=note;
    log.unshift({id:Date.now(),ts:new Date().toISOString(),date,cat:c.cat,name:it.name,mode,qty,note});ss(K_INV,inv);ss(K_LOG,log);
    document.getElementById('inpQty').value='';document.getElementById('inpNote').value='';render();toast(`${dayLabel(date)} ${mode==='in'?'입고':'출고'} 기록이 완료되었습니다`);
  };

  function buildLogImage(q){
    const RH=48,HH=54,TITLE=126,PAD=36,CW=[165,150,365,90,90,260],TW=CW.reduce((a,b)=>a+b,0),H=TITLE+HH+RH*q.entries.length+PAD+34,W=TW+PAD*2,S=H>7200?1:2;
    const cv=document.createElement('canvas');cv.width=W*S;cv.height=H*S;const x=cv.getContext('2d');x.scale(S,S);x.fillStyle='#fff';x.fillRect(0,0,W,H);x.textBaseline='middle';x.textAlign='center';
    x.fillStyle='#0f172a';x.font='700 29px "Noto Sans KR",sans-serif';x.fillText('입 출 고 기 록',W/2,42);x.font='700 19px "Noto Sans KR",sans-serif';x.fillStyle='#1d64c4';x.fillText(q.label,W/2,78);
    const t=totals(q.entries);x.font='14px "Noto Sans KR",sans-serif';x.fillStyle='#64748b';x.fillText(`입고 ${t.inCount}건 / ${t.inQty}개  ·  출고 ${t.outCount}건 / ${t.outQty}개`,W/2,106);
    const headers=['일자 / 시간','분류','품목','구분','수량','비고'];let left=PAD,y=TITLE;x.font='700 16px "Noto Sans KR",sans-serif';
    headers.forEach((h,i)=>{x.fillStyle='#e8f1fd';x.fillRect(left,y,CW[i],HH);x.strokeStyle='#1d64c4';x.lineWidth=1.4;x.strokeRect(left,y,CW[i],HH);x.fillStyle='#0f172a';x.fillText(h,left+CW[i]/2,y+HH/2);left+=CW[i]});y+=HH;
    q.entries.forEach((e,row)=>{left=PAD;const vals=[`${prettyDate(recordDate(e))} ${recordTime(e)}`,e.cat,e.name,e.mode==='in'?'입고':'출고',String(e.qty),e.note||''];vals.forEach((v,i)=>{x.fillStyle=row%2?'#f8fafc':'#fff';x.fillRect(left,y,CW[i],RH);x.strokeStyle='#cbd5e1';x.lineWidth=1;x.strokeRect(left,y,CW[i],RH);x.fillStyle=i===3?(e.mode==='in'?'#0f9d58':'#dc3545'):'#0f172a';x.font=i===4?'700 16px "JetBrains Mono",monospace':'14px "Noto Sans KR",sans-serif';x.fillText(fit(x,String(v),CW[i]-12),left+CW[i]/2,y+RH/2);left+=CW[i]});y+=RH});
    x.fillStyle='#94a3b8';x.font='12px "Noto Sans KR",sans-serif';x.textAlign='right';x.fillText('재고관리 앱에서 생성',W-PAD,y+24);return cv;
  }
  let downloadName='';
  function openImage(cv,title,fileName){lastImgURL=cv.toDataURL('image/png');downloadName=fileName;document.getElementById('imgModalTitle').textContent=title;document.getElementById('imgPreview').src=lastImgURL;document.getElementById('imgSaveHint').textContent=`파일명: ${fileName}\n⬇️ 다운로드 → 파일 앱/내 파일의 다운로드 폴더\n📤 공유/사진 저장 → 사진 앱 또는 원하는 위치 선택`;document.getElementById('imgModal').classList.add('on')}
  function showReportImage(q){if(!q.entries.length){toast('선택한 기간의 기록이 없습니다');return}openImage(buildLogImage(q),`${q.label} 입출고 기록`,`입출고_${q.suffix}.png`)}
  function showStockImage(){try{openImage(buildImage(),'전체 재고 현황',`재고현황_${stamp()}.png`)}catch(e){toast('이미지를 만들지 못했습니다')}}

  function exportReport(q){
    if(!q.entries.length){toast('선택한 기간의 기록이 없습니다');return}if(typeof XLSX==='undefined'){toast('엑셀 기능을 불러오지 못했습니다');return}
    const wb=XLSX.utils.book_new(),rows=[['입출고일','등록시간','분류','품목','구분','수량','비고']];q.entries.forEach(e=>rows.push([prettyDate(recordDate(e)),recordTime(e),e.cat,e.name,e.mode==='in'?'입고':'출고',e.qty,e.note||'']));
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:13},{wch:9},{wch:14},{wch:34},{wch:8},{wch:9},{wch:26}];XLSX.utils.book_append_sheet(wb,ws,'입출고기록');const t=totals(q.entries);
    const sws=XLSX.utils.aoa_to_sheet([['조회 기간',q.label],['입고 건수',t.inCount],['출고 건수',t.outCount],['입고 수량',t.inQty],['출고 수량',t.outQty]]);sws['!cols']=[{wch:16},{wch:20}];XLSX.utils.book_append_sheet(wb,sws,'요약');XLSX.writeFile(wb,`입출고_${q.suffix}.xlsx`);toast(`${q.label} 엑셀이 저장되었습니다`);
  }
  function exportStock(){
    if(typeof XLSX==='undefined'){toast('엑셀 기능을 불러오지 못했습니다');return}const wb=XLSX.utils.book_new(),a=[['품목','수량','상태','비고']];
    inv.forEach(c=>{a.push([c.cat,'','','']);c.items.forEach(i=>a.push(['   '+i.name,i.qty,lvlText(lvl(i.qty)),i.note||'']))});const w1=XLSX.utils.aoa_to_sheet(a);w1['!cols']=[{wch:34},{wch:10},{wch:8},{wch:20}];XLSX.utils.book_append_sheet(wb,w1,'재고현황');
    const b=[['입출고일','등록시간','분류','품목','구분','수량','비고']];sorted(log).forEach(e=>b.push([prettyDate(recordDate(e)),recordTime(e),e.cat,e.name,e.mode==='in'?'입고':'출고',e.qty,e.note||'']));const w2=XLSX.utils.aoa_to_sheet(b);w2['!cols']=[{wch:13},{wch:9},{wch:14},{wch:30},{wch:8},{wch:8},{wch:20}];XLSX.utils.book_append_sheet(wb,w2,'입출고기록');XLSX.writeFile(wb,`재고현황_${stamp()}.xlsx`);toast('전체 재고 엑셀이 저장되었습니다');
  }
  function imageBlob(){if(!lastImgURL)return null;const [head,data]=lastImgURL.split(','),mime=(head.match(/data:([^;]+)/)||[])[1]||'image/png',raw=atob(data),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime})}
  function downloadImage(){const blob=imageBlob();if(!blob)return;const fileName=downloadName||`재고현황_${stamp()}.png`,url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast(`다운로드를 시작했습니다 · ${fileName}`,4500)}
  async function shareImage(){const blob=imageBlob();if(!blob)return;const fileName=downloadName||`재고현황_${stamp()}.png`,file=new File([blob],fileName,{type:'image/png'});try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({files:[file],title:document.getElementById('imgModalTitle').textContent});toast('선택한 위치로 이미지 작업을 완료했습니다',3500)}else downloadImage()}catch(e){if(e.name!=='AbortError')downloadImage()}}

  function openCurrentMonthLog(){
    const key=todayKey().slice(0,7),[y,m]=key.split('-');document.querySelector('.tabs button[data-page="log"]').click();
    document.getElementById('logPeriod').value='month';document.getElementById('logYear').value=y;document.getElementById('logMonth').value=String(Number(m));document.querySelector('.log-period-day').hidden=true;renderLogView();
  }
  function updateChrome(){const home=document.querySelector('.tabs button.on')?.dataset.page==='stock';document.querySelector('.summary').style.display=home?'flex':'none'}
  function bindEvents(){
    ['io','log'].forEach(prefix=>{document.getElementById(prefix+'Year').onchange=()=>{updateDays(prefix);if(prefix==='log')renderLogView()};document.getElementById(prefix+'Month').onchange=()=>{updateDays(prefix);if(prefix==='log')renderLogView()};document.getElementById(prefix+'Day').onchange=()=>{if(prefix==='log')renderLogView()}});
    document.getElementById('logPeriod').onchange=()=>{document.querySelector('.log-period-day').hidden=document.getElementById('logPeriod').value==='month';renderLogView()};
    document.querySelectorAll('.tabs button').forEach(b=>b.addEventListener('click',updateChrome));
    document.querySelectorAll('#page-stock .mstat').forEach(b=>b.onclick=openCurrentMonthLog);
    document.getElementById('btnHomeImage').onclick=showStockImage;document.getElementById('btnHomeExcel').onclick=exportStock;document.getElementById('btnHomeIO').onclick=()=>document.querySelector('.tabs button[data-page="io"]').click();
    document.getElementById('btnIoImage').onclick=()=>showReportImage(ioQuery());document.getElementById('btnIoExcel').onclick=()=>exportReport(ioQuery());
    document.getElementById('btnLogImage').onclick=()=>showReportImage(logQuery());document.getElementById('btnLogExcel').onclick=()=>exportReport(logQuery());
    document.getElementById('btnImage').onclick=showStockImage;document.getElementById('btnExcel').onclick=exportStock;
    document.getElementById('btnImgDownload').onclick=downloadImage;document.getElementById('btnImgSave').onclick=shareImage;
  }

  initDateGroup('io',todayKey());initDateGroup('log',latestDate());bindEvents();
  renderStock=renderDashboardStock;renderLog=renderLogView;const baseRender=render;
  render=()=>{baseRender();renderDashboardMonth();renderEditor();updateChrome()};
  render();
})();
