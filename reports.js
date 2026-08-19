(()=>{
  const reportPad=n=>String(n).padStart(2,'0');
  const reportToday=()=>{const d=new Date();return `${d.getFullYear()}-${reportPad(d.getMonth()+1)}-${reportPad(d.getDate())}`};
  const entryDate=e=>{if(/^\d{4}-\d{2}-\d{2}$/.test(e.date||''))return e.date;const d=new Date(e.ts);return `${d.getFullYear()}-${reportPad(d.getMonth()+1)}-${reportPad(d.getDate())}`};
  const entryTime=e=>{const d=new Date(e.ts);return `${reportPad(d.getHours())}:${reportPad(d.getMinutes())}`};
  const prettyDate=s=>{const [y,m,d]=s.split('-');return `${y}.${m}.${d}`};
  const prettyMonth=s=>{const [y,m]=s.split('-');return `${y}년 ${Number(m)}월`};
  const dateLabel=s=>{const [y,m,d]=s.split('-');return `${y}년 ${Number(m)}월 ${Number(d)}일`};
  const latestDate=()=>log.length?log.map(entryDate).sort().at(-1):reportToday();
  const sortEntries=entries=>[...entries].sort((a,b)=>entryDate(b).localeCompare(entryDate(a))||new Date(b.ts)-new Date(a.ts));

  function setOptions(el,values,selected){
    el.innerHTML=values.map(v=>`<option value="${v}">${Number(v)}</option>`).join('');
    if(values.map(String).includes(String(selected)))el.value=String(selected);
  }
  function availableYears(){
    const now=new Date().getFullYear();
    const fromLogs=log.map(e=>Number(entryDate(e).slice(0,4))).filter(Number.isFinite);
    const min=Math.min(now-10,...fromLogs),max=Math.max(now+3,...fromLogs);
    return Array.from({length:max-min+1},(_,i)=>String(min+i));
  }
  function initDateGroup(prefix,date,withDay=true){
    const [y,m,d]=date.split('-');
    setOptions(document.getElementById(prefix+'Year'),availableYears(),y);
    setOptions(document.getElementById(prefix+'Month'),Array.from({length:12},(_,i)=>String(i+1)),Number(m));
    if(withDay){updateDays(prefix,Number(d));}
  }
  function updateDays(prefix,wanted){
    const y=Number(document.getElementById(prefix+'Year').value),m=Number(document.getElementById(prefix+'Month').value);
    const dayEl=document.getElementById(prefix+'Day'),keep=wanted||Number(dayEl.value)||1;
    const count=new Date(y,m,0).getDate();
    setOptions(dayEl,Array.from({length:count},(_,i)=>String(i+1)),Math.min(keep,count));
  }
  function selectedDay(prefix){
    return `${document.getElementById(prefix+'Year').value}-${reportPad(document.getElementById(prefix+'Month').value)}-${reportPad(document.getElementById(prefix+'Day').value)}`;
  }
  function selectedMonth(prefix){
    return `${document.getElementById(prefix+'Year').value}-${reportPad(document.getElementById(prefix+'Month').value)}`;
  }
  function periodEntries(period,key){return sortEntries(log.filter(e=>period==='day'?entryDate(e)===key:entryDate(e).startsWith(key+'-')))}
  function makeQuery(period,key){
    const entries=periodEntries(period,key);
    return {period,key,entries,label:period==='day'?dateLabel(key):prettyMonth(key),suffix:key.replaceAll('-','')};
  }
  function ioQuery(){const key=selectedDay('io');return makeQuery('day',key)}
  function currentLogQuery(){const period=document.getElementById('logPeriod').value,key=period==='day'?selectedDay('log'):selectedMonth('log');return makeQuery(period,key)}
  function monthQuery(){return makeQuery('month',selectedMonth('month'))}
  function activePage(){return document.querySelector('.tabs button.on')?.dataset.page||'stock'}

  function logCard(e,allowUndo){
    return `<div class="log"><div><div class="t1">${esc(e.cat)} · ${esc(e.name)}</div><div class="t2">${prettyDate(entryDate(e))} ${entryTime(e)}${e.note?' · '+esc(e.note):''}</div></div><div style="display:flex;align-items:center;gap:10px"><div class="amt ${e.mode}">${e.mode==='in'?'+':'−'}${e.qty}</div>${allowUndo?`<button class="undo" onclick="undo(${e.id})">취소</button>`:''}</div></div>`;
  }
  function renderFilteredLog(){
    const q=currentLogQuery(),el=document.getElementById('logList');
    document.getElementById('logScopeTitle').textContent=`${q.label} · ${q.entries.length}건`;
    el.innerHTML=q.entries.length?q.entries.map(e=>logCard(e,true)).join(''):'<div class="empty">선택한 기간의 입출고 기록이 없습니다.</div>';
  }
  function renderMonth(){
    const q=monthQuery(),incoming=q.entries.filter(e=>e.mode==='in'),outgoing=q.entries.filter(e=>e.mode==='out');
    document.getElementById('monthInCount').textContent=incoming.length;
    document.getElementById('monthOutCount').textContent=outgoing.length;
    document.getElementById('monthInQty').textContent=incoming.reduce((n,e)=>n+Number(e.qty||0),0);
    document.getElementById('monthOutQty').textContent=outgoing.reduce((n,e)=>n+Number(e.qty||0),0);
    document.getElementById('monthScopeTitle').textContent=`${q.label} · 총 ${q.entries.length}건`;
    const el=document.getElementById('monthList');
    if(!q.entries.length){el.innerHTML='<div class="empty">선택한 월의 입출고 기록이 없습니다.</div>';return}
    const groups={};q.entries.forEach(e=>(groups[entryDate(e)]||=[]).push(e));
    el.innerHTML=Object.keys(groups).sort().reverse().map(day=>`<div class="monthgroup"><div class="monthday">${dateLabel(day)} · ${groups[day].length}건</div>${groups[day].map(e=>logCard(e,false)).join('')}</div>`).join('');
  }

  function installDateEvents(){
    ['io','log'].forEach(prefix=>{
      document.getElementById(prefix+'Year').onchange=()=>{updateDays(prefix);if(prefix==='log')renderFilteredLog()};
      document.getElementById(prefix+'Month').onchange=()=>{updateDays(prefix);if(prefix==='log')renderFilteredLog()};
      document.getElementById(prefix+'Day').onchange=()=>{if(prefix==='log')renderFilteredLog()};
    });
    document.getElementById('monthYear').onchange=renderMonth;
    document.getElementById('monthMonth').onchange=renderMonth;
    document.getElementById('logPeriod').onchange=()=>{
      document.querySelector('.log-period-day').hidden=document.getElementById('logPeriod').value==='month';
      renderFilteredLog();
    };
  }

  document.getElementById('btnSubmit').onclick=()=>{
    const ci=Number(document.getElementById('selCat').value),ii=Number(document.getElementById('selItem').value);
    const q=parseInt(document.getElementById('inpQty').value,10),note=document.getElementById('inpNote').value.trim();
    const c=inv[ci],it=c&&c.items[ii],businessDate=selectedDay('io');
    if(!it){toast('품목을 선택해 주세요');return}
    if(!q||q<=0){toast('수량을 입력해 주세요');return}
    if(mode==='out'&&it.qty-q<0){toast(`재고가 부족합니다 (현재 ${it.qty})`);return}
    it.qty+=mode==='in'?q:-q;if(note)it.note=note;
    log.unshift({id:Date.now(),ts:new Date().toISOString(),date:businessDate,cat:c.cat,name:it.name,mode,qty:q,note});
    ss(K_INV,inv);ss(K_LOG,log);
    document.getElementById('inpQty').value='';document.getElementById('inpNote').value='';
    render();toast(`${dateLabel(businessDate)} ${mode==='in'?'입고':'출고'} 기록이 완료되었습니다`);
  };

  function reportTotals(entries){
    const incoming=entries.filter(e=>e.mode==='in'),outgoing=entries.filter(e=>e.mode==='out');
    return {inCount:incoming.length,outCount:outgoing.length,inQty:incoming.reduce((n,e)=>n+Number(e.qty||0),0),outQty:outgoing.reduce((n,e)=>n+Number(e.qty||0),0)};
  }
  function buildLogImage(q){
    const RH=48,HH=54,TITLE=126,PAD=36,CW=[165,150,365,90,90,260],TW=CW.reduce((a,b)=>a+b,0);
    const H=TITLE+HH+RH*q.entries.length+PAD+34,W=TW+PAD*2,S=H>7200?1:2;
    const cv=document.createElement('canvas');cv.width=W*S;cv.height=H*S;const x=cv.getContext('2d');x.scale(S,S);
    x.fillStyle='#fff';x.fillRect(0,0,W,H);x.textBaseline='middle';x.textAlign='center';
    x.fillStyle='#0f172a';x.font='700 29px "Noto Sans KR",sans-serif';x.fillText('입 출 고 기 록',W/2,42);
    x.font='700 19px "Noto Sans KR",sans-serif';x.fillStyle='#1d64c4';x.fillText(q.label,W/2,78);
    const totals=reportTotals(q.entries);x.font='14px "Noto Sans KR",sans-serif';x.fillStyle='#64748b';x.fillText(`입고 ${totals.inCount}건 / ${totals.inQty}개  ·  출고 ${totals.outCount}건 / ${totals.outQty}개`,W/2,106);
    const L=PAD,T=TITLE,headers=['일자 / 시간','분류','품목','구분','수량','비고'];let left=L;
    x.font='700 16px "Noto Sans KR",sans-serif';
    headers.forEach((h,i)=>{x.fillStyle='#e8f1fd';x.fillRect(left,T,CW[i],HH);x.strokeStyle='#1d64c4';x.lineWidth=1.4;x.strokeRect(left,T,CW[i],HH);x.fillStyle='#0f172a';x.fillText(h,left+CW[i]/2,T+HH/2);left+=CW[i]});
    let y=T+HH;
    q.entries.forEach((e,row)=>{left=L;const vals=[`${prettyDate(entryDate(e))} ${entryTime(e)}`,e.cat,e.name,e.mode==='in'?'입고':'출고',String(e.qty),e.note||''];
      vals.forEach((v,i)=>{x.fillStyle=row%2?'#f8fafc':'#fff';x.fillRect(left,y,CW[i],RH);x.strokeStyle='#cbd5e1';x.lineWidth=1;x.strokeRect(left,y,CW[i],RH);x.fillStyle=i===3?(e.mode==='in'?'#0f9d58':'#dc3545'):'#0f172a';x.font=i===4?'700 16px "JetBrains Mono",monospace':'14px "Noto Sans KR",sans-serif';x.fillText(fit(x,String(v),CW[i]-12),left+CW[i]/2,y+RH/2);left+=CW[i]});y+=RH;
    });
    x.fillStyle='#94a3b8';x.font='12px "Noto Sans KR",sans-serif';x.textAlign='right';x.fillText('재고관리 앱에서 생성',W-PAD,y+24);return cv;
  }

  let reportDownloadName='';
  function openImage(cv,title,fileName){
    lastImgURL=cv.toDataURL('image/png');reportDownloadName=fileName;
    document.getElementById('imgModalTitle').textContent=title;
    document.getElementById('imgPreview').src=lastImgURL;
    document.getElementById('imgModal').classList.add('on');
  }
  function showLogImage(q){if(!q.entries.length){toast('선택한 기간의 기록이 없습니다');return}openImage(buildLogImage(q),`${q.label} 입출고 기록`,`입출고_${q.suffix}.png`)}
  function showInventoryImage(){try{openImage(buildImage(),'재고현황 이미지',`재고현황_${stamp()}.png`)}catch(e){toast('이미지를 만들지 못했습니다')}}

  function exportLogExcel(q){
    if(!q.entries.length){toast('선택한 기간의 기록이 없습니다');return}
    if(typeof XLSX==='undefined'){toast('엑셀 기능을 불러오지 못했습니다');return}
    const wb=XLSX.utils.book_new(),rows=[['입출고일','등록시간','분류','품목','구분','수량','비고']];
    q.entries.forEach(e=>rows.push([prettyDate(entryDate(e)),entryTime(e),e.cat,e.name,e.mode==='in'?'입고':'출고',e.qty,e.note||'']));
    const ws=XLSX.utils.aoa_to_sheet(rows);ws['!cols']=[{wch:13},{wch:9},{wch:14},{wch:34},{wch:8},{wch:9},{wch:26}];XLSX.utils.book_append_sheet(wb,ws,'입출고기록');
    const t=reportTotals(q.entries),summary=[['조회 기간',q.label],['입고 건수',t.inCount],['출고 건수',t.outCount],['입고 수량',t.inQty],['출고 수량',t.outQty]];
    const sws=XLSX.utils.aoa_to_sheet(summary);sws['!cols']=[{wch:16},{wch:20}];XLSX.utils.book_append_sheet(wb,sws,'요약');
    XLSX.writeFile(wb,`입출고_${q.suffix}.xlsx`);toast(`${q.label} 엑셀이 저장되었습니다`);
  }
  function exportInventoryExcel(){
    if(typeof XLSX==='undefined'){toast('엑셀 기능을 불러오지 못했습니다');return}
    const wb=XLSX.utils.book_new(),a=[['품목','수량','상태','비고']];inv.forEach(c=>{a.push([c.cat,'','','']);c.items.forEach(i=>a.push(['   '+i.name,i.qty,lvlText(lvl(i.qty)),i.note||'']))});
    const w1=XLSX.utils.aoa_to_sheet(a);w1['!cols']=[{wch:34},{wch:10},{wch:8},{wch:20}];XLSX.utils.book_append_sheet(wb,w1,'재고현황');
    const b=[['입출고일','등록시간','분류','품목','구분','수량','비고']];sortEntries(log).forEach(e=>b.push([prettyDate(entryDate(e)),entryTime(e),e.cat,e.name,e.mode==='in'?'입고':'출고',e.qty,e.note||'']));
    const w2=XLSX.utils.aoa_to_sheet(b);w2['!cols']=[{wch:13},{wch:9},{wch:14},{wch:30},{wch:8},{wch:8},{wch:20}];XLSX.utils.book_append_sheet(wb,w2,'입출고기록');XLSX.writeFile(wb,`재고현황_${stamp()}.xlsx`);toast('엑셀 파일이 저장되었습니다');
  }
  function queryForActivePage(){const page=activePage();if(page==='io')return ioQuery();if(page==='log')return currentLogQuery();if(page==='month')return monthQuery();return null}

  document.getElementById('btnImage').onclick=()=>{const q=queryForActivePage();q?showLogImage(q):showInventoryImage()};
  document.getElementById('btnExcel').onclick=()=>{const q=queryForActivePage();q?exportLogExcel(q):exportInventoryExcel()};
  document.getElementById('btnLogImage').onclick=()=>showLogImage(currentLogQuery());
  document.getElementById('btnLogExcel').onclick=()=>exportLogExcel(currentLogQuery());
  document.getElementById('btnMonthImage').onclick=()=>showLogImage(monthQuery());
  document.getElementById('btnMonthExcel').onclick=()=>exportLogExcel(monthQuery());
  document.getElementById('btnImgSave').onclick=()=>{if(!lastImgURL)return;const a=document.createElement('a');a.href=lastImgURL;a.download=reportDownloadName||`재고현황_${stamp()}.png`;document.body.appendChild(a);a.click();a.remove();toast('이미지가 저장되었습니다')};

  const initialLatest=latestDate();
  initDateGroup('io',reportToday());
  initDateGroup('log',initialLatest);
  initDateGroup('month',initialLatest.slice(0,7)+'-01',false);
  installDateEvents();
  renderLog=renderFilteredLog;
  const baseRender=render;
  render=()=>{baseRender();renderMonth()};
  render();
})();
