import { PROGRESS_KEY, normalizeProgress, recordProgress, adjacentLesson } from './education-state.mjs';

const CLOUD_COURSE_ORIGIN = 'https://duyue-site-316337-8-1470502664.sh.run.tcloudbase.com/';
const SESSION_KEY = 'duyue.ai.course.session.v1';
let memorySessionToken = '';

let hlsLoader;
function loadHlsLibrary(siteBase) {
  if (window.Hls) return Promise.resolve(window.Hls);
  if (hlsLoader) return hlsLoader;
  hlsLoader = new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=new URL('hls.min.js',siteBase).href;
    script.async=true;
    script.onload=()=>window.Hls?resolve(window.Hls):reject(new Error('HLS library did not initialize.'));
    script.onerror=()=>reject(new Error('HLS library could not be loaded.'));
    document.head.appendChild(script);
  });
  return hlsLoader;
}

function initializeEducation() {
const root = document.querySelector('.ai-education');
if (root && !root.dataset.educationReady) {
  root.dataset.educationReady = 'true';
  const siteBase = new URL('./', import.meta.url);
  const publicStaticHost = location.hostname === 'nqldy.top' || location.hostname === 'www.nqldy.top';
  const apiBase = publicStaticHost ? new URL(CLOUD_COURSE_ORIGIN) : siteBase;
  const credentials = publicStaticHost ? 'omit' : 'same-origin';
  const sessionToken = () => {
    if (!publicStaticHost) return '';
    try { return localStorage.getItem(SESSION_KEY) || memorySessionToken; }
    catch { return memorySessionToken; }
  };
  const saveSessionToken = token => {
    if (!publicStaticHost || !/^[A-Za-z0-9_-]{43}$/.test(token || '')) return;
    memorySessionToken = token;
    try { localStorage.setItem(SESSION_KEY, token); } catch { /* Current page can still use the in-memory token. */ }
  };
  const apiHeaders = (headers = {}) => {
    const token = sessionToken();
    return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
  };
  const apiUrl = (path, media = false) => {
    const url = new URL(path, apiBase);
    const token = sessionToken();
    if (media && token) url.searchParams.set('access_token', token);
    return url;
  };
  const dialog = root.querySelector('#education-enrollment');
  let enrollmentTrigger;
  root.querySelectorAll('[data-enroll]').forEach(button => button.addEventListener('click', () => {
    enrollmentTrigger = button;
    dialog?.showModal();
  }));
  dialog?.addEventListener('close', () => enrollmentTrigger?.focus());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  const learning = root.querySelector('[data-course-video]');
  const player = learning ? initializeLearning(root, learning, { siteBase, apiUrl, apiHeaders, credentials }) : null;

  root.querySelectorAll('[data-activation-form]').forEach(form => form.addEventListener('submit', async event => {
    event.preventDefault();
    const input = form.elements.namedItem('code');
    const status = form.querySelector('[data-activation-status]');
    const button = form.querySelector('button');
    const code = input.value.trim().toUpperCase();
    if (!/^DYAI-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code)) {
      status.textContent = '请核对 DYAI-XXXX-XXXX-XXXX 格式的渡月课程激活码。';
      return;
    }
    button.disabled = true;
    status.textContent = '正在验证激活码…';
    try {
      const response = await fetch(apiUrl('api/education/activate'), {
        method: 'POST', credentials,
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ code }), signal: AbortSignal.timeout(10000),
      });
      const result = await response.json();
      status.textContent = result.message || '暂时无法验证，请稍后重试。';
      if (response.ok && result.unlocked) {
        if (result.sessionToken) saveSessionToken(result.sessionToken);
        input.value = '';
        if (player) {
          dialog?.close();
          player.unlock();
        } else location.href = new URL('ai-education/learn/', siteBase).href;
      }
    } catch { status.textContent = '暂时无法连接课程服务，请稍后重试或联系渡月。'; }
    finally { button.disabled = false; }
  }));
}
}

window.duyueEducationInit = initializeEducation;
initializeEducation();

function initializeLearning(root, video, connection) {
  const { siteBase, apiUrl, apiHeaders, credentials } = connection;
  const buttons = [...root.querySelectorAll('[data-lesson-id]')];
  const ids = buttons.map(button => button.dataset.lessonId);
  const byId = new Map(buttons.map(button => [button.dataset.lessonId, button]));
  const empty = root.querySelector('[data-video-empty]');
  const message = root.querySelector('[data-playback-message]');
  const entitlement = root.querySelector('[data-entitlement-status]');
  const speed = root.querySelector('[data-playback-rate]');
  const previous = root.querySelector('[data-previous]');
  const next = root.querySelector('[data-next]');
  const accessPanel = root.querySelector('[data-access-panel]');
  let current = '';
  let unlocked = false;
  let playable = false;
  let lastPersist = 0;
  let storageWorks = true;
  let hls = null;
  let sourceRequest = 0;
  let state;
  try { state = normalizeProgress(JSON.parse(localStorage.getItem(PROGRESS_KEY)), ids); }
  catch { state = normalizeProgress(null, ids); }

  function persist() {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(state)); }
    catch { storageWorks = false; message.textContent = '当前浏览器没有保存进度，本次仍可继续观看。'; }
  }
  function renderProgress() {
    const completed = ids.filter(id => state.lessons[id]?.completed).length;
    root.querySelector('[data-course-progress]').textContent = `已学完 ${completed} / ${ids.length} 讲`;
    root.querySelector('[data-course-progress-bar]').value = completed;
    buttons.forEach(button => { button.querySelector('[data-completed]').hidden = !state.lessons[button.dataset.lessonId]?.completed; });
  }
  function saveCurrent(ended = false) {
    if (!current || !playable || video.readyState < 1) return;
    state = recordProgress(state, current, video.currentTime, video.duration, ended);
    persist(); renderProgress();
  }
  function showLocked() {
    video.hidden = true;
    empty.hidden = false;
    speed.disabled = true;
    root.querySelector('[data-empty-title]').textContent = '这节课等待激活';
    root.querySelector('[data-empty-description]').textContent = '付款后输入渡月发送的激活码，即可观看六讲。';
    message.textContent = '尚未解锁课程。可以先浏览六讲目录，再决定是否购买。';
  }
  function selectLesson(id, updateHistory = true) {
    const button = byId.get(id);
    if (!button) return { ok: false, error: '没有这节课' };
    saveCurrent();
    playable = false;
    sourceRequest += 1;
    hls?.destroy(); hls = null;
    video.pause(); video.removeAttribute('src'); video.load(); video.hidden = true;
    current = id;
    buttons.forEach(item => { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', String(item === button)); });
    root.querySelector('[data-current-title]').textContent = button.dataset.title;
    root.querySelector('[data-lesson-number]').textContent = `第 ${id} 讲 · ${button.dataset.subtitle}`;
    previous.disabled = !adjacentLesson(ids, id, -1);
    next.disabled = !adjacentLesson(ids, id, 1);
    if (unlocked) {
      empty.hidden = false;
      root.querySelector('[data-empty-title]').textContent = '正在加载课程视频';
      root.querySelector('[data-empty-description]').textContent = '加载完成后，点击播放。';
      message.textContent = '视频仅向已激活的当前浏览器开放。';
      const requestNumber=sourceRequest;
      const sourceUrl=apiUrl(`api/education/video/${id}`, true).href;
      fetch(sourceUrl,{method:'HEAD',credentials,headers:apiHeaders(),signal:AbortSignal.timeout(10000)}).then(async response=>{
        if(requestNumber!==sourceRequest || current!==id) return;
        if(!response.ok) throw new Error(`Video source returned ${response.status}`);
        const type=response.headers.get('content-type')||'';
        video.hidden=false;
        if(type.includes('mpegurl')) {
          if(video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src=sourceUrl; video.load();
          } else {
            const Hls=await loadHlsLibrary(siteBase);
            if(requestNumber!==sourceRequest || current!==id) return;
            if(!Hls.isSupported()) throw new Error('This browser does not support HLS playback.');
            hls=new Hls({enableWorker:true,maxBufferLength:90});
            hls.on(Hls.Events.ERROR,(_event,data)=>{if(data?.fatal) video.dispatchEvent(new Event('error'));});
            hls.loadSource(sourceUrl); hls.attachMedia(video);
          }
        } else {
          video.src=sourceUrl; video.load();
        }
      }).catch(()=>{
        if(requestNumber!==sourceRequest || current!==id) return;
        video.dispatchEvent(new Event('error'));
      });
    } else showLocked();
    if (updateHistory) { const url = new URL(location.href); url.searchParams.set('lesson', id); history.replaceState(null, '', url); }
    return { ok: true, lessonId: id, title: button.dataset.title, status: unlocked ? 'loading' : 'locked' };
  }
  buttons.forEach(button => button.addEventListener('click', () => selectLesson(button.dataset.lessonId)));
  previous.addEventListener('click', () => selectLesson(adjacentLesson(ids, current, -1)));
  next.addEventListener('click', () => selectLesson(adjacentLesson(ids, current, 1)));
  video.addEventListener('loadedmetadata', () => {
    playable = true; video.hidden = false; empty.hidden = true; speed.disabled = false;
    video.playbackRate = Number(speed.value);
    const saved = state.lessons[current];
    if (saved && !saved.completed && saved.time > 0 && saved.time < video.duration - 2) {
      video.currentTime = Math.min(saved.time, video.duration);
      message.textContent = `已回到上次看到的位置，点击播放继续。${storageWorks ? '' : '本机进度存储不可用。'}`;
    }
  });
  video.addEventListener('error', () => {
    if (!video.getAttribute('src')) return;
    playable = false; video.hidden = true; empty.hidden = false; speed.disabled = true;
    root.querySelector('[data-empty-title]').textContent = '视频暂时无法播放';
    root.querySelector('[data-empty-description]').textContent = '请检查网络后重试；若仍有问题，请联系渡月。';
    message.textContent = '重新点击这节课可重试，学习记录不会被删除。';
  });
  speed.addEventListener('change', () => { video.playbackRate = Number(speed.value); });
  video.addEventListener('timeupdate', () => { if (Date.now() - lastPersist > 2000) { lastPersist = Date.now(); saveCurrent(); } });
  video.addEventListener('pause', () => saveCurrent());
  video.addEventListener('ended', () => saveCurrent(true));
  addEventListener('pagehide', () => saveCurrent());
  document.addEventListener('visibilitychange', () => { if (document.hidden) saveCurrent(); });
  root.querySelector('[data-reset-progress]').addEventListener('click', () => {
    if (!confirm('只清除当前浏览器的学习进度，是否继续？')) return;
    video.pause(); state = normalizeProgress(null, ids); persist(); renderProgress();
    if (video.readyState >= 1) video.currentTime = 0;
    message.textContent = '已清除本机学习进度。';
  });
  const requested = new URLSearchParams(location.search).get('lesson');
  selectLesson(byId.has(requested) ? requested : state.lastLessonId || ids[0], false);
  renderProgress();

  async function checkSession() {
    try {
      const response = await fetch(apiUrl('api/education/session'), { credentials, headers: apiHeaders(), signal: AbortSignal.timeout(8000) });
      const result = await response.json();
      if (response.ok && result.unlocked) unlock();
      else {
        entitlement.textContent = '课程未解锁';
        if (response.status === 503) message.textContent = '课程激活服务尚未就绪，请联系渡月；此处不会接受无效码。';
      }
    } catch { entitlement.textContent = '暂时无法确认权限'; message.textContent = '暂时无法连接课程服务，请稍后刷新页面。'; }
  }
  function unlock() {
    unlocked = true;
    entitlement.textContent = '已解锁六讲';
    accessPanel.hidden = true;
    selectLesson(current, false);
  }
  checkSession();
  return { unlock };
}
