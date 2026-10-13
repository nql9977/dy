(() => {
 const $ = id => document.getElementById(id);
 let current = null, loading = false;
 async function api(path, options = {}) {
   const response = await fetch('/api/library/' + path,{...options,credentials:'same-origin',cache:'no-store'});
   let data; try { data = await response.json(); } catch { throw new Error('知识库服务尚未接通，请稍后再试。'); }
   if (!response.ok) {
     if (response.status === 401) { $('reader').hidden=true; $('gate').hidden=false; }
     throw new Error(data.message || '暂时无法读取，请稍后重试。');
   }
   return data;
 }
 async function read(id) {
   current=id; $('body').textContent='正在读取…'; $('title').textContent=''; $('section').textContent='';
   document.querySelectorAll('#catalog button').forEach(b=>b.setAttribute('aria-current',b.dataset.id===id?'page':'false'));
   try {
     const {article}=await api('article?id='+encodeURIComponent(id));
     if(current!==id)return;
     $('title').textContent=article.title; $('section').textContent=article.section;
     // Plain text rendering prevents imported content from executing scripts.
     $('body').textContent=article.body;
   } catch(error) { if(current===id)$('body').textContent=error.message; }
 }
 async function open() {
   $('gate').hidden=true; $('reader').hidden=false; $('reader-status').textContent='正在读取目录…';
   try {
     const {articles}=await api('articles'); $('catalog').replaceChildren();
     for(const article of articles){
       const button=document.createElement('button');button.type='button';button.dataset.id=article.id;
       const title=document.createElement('span');title.textContent=article.title;button.append(title);
       const section=document.createElement('small');section.textContent=article.section;button.append(section);
       button.addEventListener('click',()=>read(article.id));$('catalog').append(button);
     }
     $('reader-status').textContent=articles.length?'':'知识库内容正在准备，请稍后再来。';
     if(articles.length)await read(articles.some(a=>a.id===current)?current:articles[0].id);
   } catch(error){$('reader-status').textContent=error.message;}
 }
 $('redeem').addEventListener('submit',async event=>{
   event.preventDefault();if(loading)return;loading=true;$('submit').disabled=true;$('status').textContent='正在核对兑换码…';
   try {await api('redeem',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:$('code').value})});$('code').value='';$('status').textContent='';await open();}
   catch(error){$('status').textContent=error.message;}
   finally{loading=false;$('submit').disabled=false;}
 });
 $('refresh').addEventListener('click',open);
 api('session').then(data=>data.unlocked&&open()).catch(error=>$('status').textContent=error.message)
   .finally(()=>{$('submit').disabled=false;$('submit').textContent='兑换并开始阅读';});
})();
