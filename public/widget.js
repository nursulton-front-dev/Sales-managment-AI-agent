/* Chorla website chat. Install using the generated script in Integrations. */
(function () {
  'use strict';
  var script = document.currentScript;
  var id = script && script.getAttribute('data-widget-id');
  if (!id || !/^[a-zA-Z0-9_-]{16,80}$/.test(id)) return;
  if (document.querySelector('[data-chorla-widget="' + id + '"]')) return;
  var base = new URL(script.src).origin;
  var endpoint = base + '/api/widget/' + encodeURIComponent(id);
  var storageKey = 'chorla-chat:' + base + ':' + id;
  var token = '';
  try { token = sessionStorage.getItem(storageKey) || ''; } catch { /* Storage may be blocked. The current page still works. */ }
  var opened = false, sending = false, polling = false, seen = new Set(), unread = 0;
  var retryMessage = null, settings, lastMessages = [], lastStatus = 'active';
  var host = document.createElement('div');
  host.setAttribute('data-chorla-widget', id);
  var root = host.attachShadow({ mode: 'open' });
  function element(tag, text, attributes) {
    var node = document.createElement(tag);
    if (text) node.textContent = text;
    Object.keys(attributes || {}).forEach(function (key) { node.setAttribute(key, attributes[key]); });
    return node;
  }
  var style = element('style');
  style.textContent = ':host{all:initial;position:fixed;bottom:20px;z-index:2147483000;font:15px/1.5 system-ui,sans-serif;color:#162033}*{box-sizing:border-box}button,textarea{font:inherit}button{cursor:pointer;min-height:44px;border:0;border-radius:10px}button:focus-visible,textarea:focus-visible,a:focus-visible{outline:3px solid #1474d4;outline-offset:3px}button:disabled{opacity:.6;cursor:wait}.launcher{background:var(--chat-color);color:var(--chat-foreground);padding:12px 20px;box-shadow:0 4px 24px #0003;font-weight:600}.panel{display:flex;flex-direction:column;width:min(370px,calc(100vw - 32px));height:min(540px,calc(100dvh - 105px));background:white;border:1px solid #dce2eb;border-radius:16px;box-shadow:0 12px 50px #0003;margin-bottom:12px;overflow:hidden}.panel[hidden]{display:none}header{display:flex;align-items:center;gap:10px;background:var(--chat-color);color:var(--chat-foreground);padding:12px 16px}h2{font-size:17px;margin:0;flex:1;overflow-wrap:anywhere}.close{background:transparent;color:inherit;width:44px;font-size:26px}.messages{overflow:auto;flex:1;padding:16px;overscroll-behavior:contain}.bubble{padding:10px 12px;margin:0 24px 10px 0;background:#f0f3f8;border-radius:12px;overflow-wrap:anywhere;white-space:pre-wrap}.client{margin-left:24px;margin-right:0;background:#e3efff}.label{display:block;font-size:11px;font-weight:600;margin-bottom:3px}.notice{font-size:13px;color:#526077;padding:0 16px 8px;min-height:24px}.error{color:#aa2525}form{padding:10px 12px;border-top:1px solid #e5e7eb;display:flex;gap:8px;align-items:end}textarea{resize:vertical;min-height:44px;max-height:110px;flex:1;min-width:0;border:1px solid #aeb8c7;border-radius:8px;padding:10px;color:#162033;background:white}.send{background:var(--chat-color);color:var(--chat-foreground);padding:10px 13px}.footer{padding:0 12px 8px;display:flex;justify-content:space-between;font-size:11px;color:#617087}.new-chat{background:transparent;min-height:28px;font-size:12px;color:#285c9a}.badge{margin-left:8px;background:white;color:#162033;border-radius:12px;padding:1px 6px}.retry{background:#fff0e9;color:#963500;margin:0 16px 8px;padding:6px 10px} @media(prefers-reduced-motion:no-preference){.launcher{transition:box-shadow .15s}}';
  root.appendChild(style);
  var panel = element('section', '', { class: 'panel', hidden: '', role: 'region', 'aria-label': 'Чат с компанией' });
  var header = element('header'), title = element('h2'), close = element('button', '×', { type: 'button', class: 'close', 'aria-label': 'Закрыть чат' });
  header.append(title, close);
  var messages = element('div', '', { class: 'messages', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions' });
  var notice = element('div', '', { class: 'notice', role: 'status' });
  var retry = element('button', 'Повторить отправку', { type: 'button', class: 'retry', hidden: '' });
  var form = element('form'), input = element('textarea', '', { rows: '1', maxlength: '4000', placeholder: 'Напишите сообщение…', 'aria-label': 'Ваше сообщение' });
  var send = element('button', 'Отправить', { type: 'submit', class: 'send' });
  form.append(input, send);
  var footer = element('div', '', { class: 'footer' }), credit = element('span', 'Чат с ИИ · Chorla'), newChat = element('button', 'Новый диалог', { type: 'button', class: 'new-chat' });
  footer.append(credit, newChat);
  panel.append(header, messages, notice, retry, form, footer);
  var launcher = element('button', 'Написать нам', { type: 'button', class: 'launcher', 'aria-expanded': 'false', 'aria-label': 'Открыть чат' });
  root.append(panel, launcher);
  function showError(message) { notice.className = 'notice error'; notice.textContent = message; }
  function setNotice(message) { notice.className = 'notice'; notice.textContent = message; }
  async function api(path, body) {
    var headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    var response = await fetch(endpoint + path, { method: body === undefined ? 'GET' : 'POST', headers: headers, body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(20000) });
    var data = await response.json();
    if (!response.ok || !data.success) {
      var error = new Error(data.error || 'Чат временно недоступен. Попробуйте позже.');
      error.status = response.status;
      throw error;
    }
    return data;
  }
  function appendMessage(message) {
    var bubble = element('div', '', { class: 'bubble' + (message.sender === 'client' ? ' client' : '') });
    bubble.appendChild(element('span', message.sender === 'client' ? 'Вы' : message.sender === 'human' ? 'Сотрудник' : 'ИИ-помощник', { class: 'label' }));
    bubble.appendChild(document.createTextNode(message.text));
    messages.appendChild(bubble);
  }
  function clearMessages() {
    messages.replaceChildren();
    appendMessage({ sender: 'agent', text: settings.greeting });
    seen.clear(); lastMessages = []; unread = 0;
  }
  async function ensureSession() {
    if (token) return;
    token = (await api('/session', {})).token;
    try { sessionStorage.setItem(storageKey, token); } catch { /* Session remains in memory. */ }
  }
  async function poll() {
    if (!token || polling || document.hidden) return;
    var polledToken = token;
    polling = true;
    try {
      var data = await api('/messages');
      if (token !== polledToken) return;
      lastStatus = data.status;
      lastMessages = data.messages;
      var appended = false;
      data.messages.forEach(function (message) {
        if (seen.has(message.id)) return;
        seen.add(message.id); appended = true;
        appendMessage(message);
        if (!opened && message.sender !== 'client') unread += 1;
      });
      if (appended && opened) messages.scrollTop = messages.scrollHeight;
      launcher.textContent = opened ? 'Закрыть чат' : 'Написать нам' + (unread ? ' (' + unread + ')' : '');
      if (!sending && !retryMessage) setNotice(data.status === 'closed' ? 'Диалог завершён. Можно начать новый.' : data.needsHelp || data.status === 'human_takeover' ? 'Диалог передан сотруднику. Ответ появится здесь.' : data.pending ? 'Сообщение принято. Ожидаем ответ…' : '');
      send.disabled = sending || data.status === 'closed';
    } catch (error) {
      if (token !== polledToken) return;
      showError(error.message || 'Нет связи с чатом. Сообщения сохранятся после восстановления.');
      if (error.status === 401) { token = ''; try { sessionStorage.removeItem(storageKey); } catch {} }
    } finally { polling = false; }
  }
  async function toggle() {
    opened = !opened;
    panel.hidden = !opened;
    launcher.setAttribute('aria-expanded', String(opened));
    launcher.textContent = opened ? 'Закрыть чат' : 'Написать нам';
    if (opened) {
      unread = 0; input.focus();
      try { await ensureSession(); await poll(); } catch (error) { showError(error.message); }
    } else launcher.focus();
  }
  async function submit(message) {
    if (sending || lastStatus === 'closed') return;
    sending = true; send.disabled = true; retry.hidden = true;
    setNotice('Отправляем…');
    try {
      await ensureSession();
      await api('/messages', message);
      retryMessage = null; input.value = '';
      setNotice(lastStatus === 'human_takeover' ? 'Сообщение передано сотруднику.' : 'Сообщение принято. Ожидаем ответ…');
      await poll();
    } catch (error) {
      retryMessage = message; retry.hidden = false;
      showError(error.message || 'Не удалось отправить сообщение. Повторите попытку.');
    } finally { sending = false; send.disabled = lastStatus === 'closed'; }
  }
  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text || sending) return;
    // Reuse the same id after an uncertain HTTP response. The server accepts it only once.
    var message = retryMessage && retryMessage.text === text ? retryMessage : { text: text, requestId: crypto.randomUUID() };
    void submit(message);
  });
  input.addEventListener('keydown', function (event) { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); form.requestSubmit(); } });
  retry.addEventListener('click', function () { if (retryMessage) void submit(retryMessage); });
  launcher.addEventListener('click', function () { void toggle(); });
  close.addEventListener('click', function () { void toggle(); });
  root.addEventListener('keydown', function (event) { if (event.key === 'Escape' && opened) { event.preventDefault(); void toggle(); } });
  newChat.addEventListener('click', function () {
    if (sending || retryMessage || !window.confirm('Начать новый диалог? История текущего останется у компании.')) return;
    token = ''; lastStatus = 'active';
    try { sessionStorage.removeItem(storageKey); } catch {}
    clearMessages(); void ensureSession().then(poll).catch(function (error) { showError(error.message); });
  });
  api('/config').then(function (data) {
    settings = data.widget;
    host.style.setProperty('--chat-color', settings.color);
    host.style.setProperty('--chat-foreground', settings.foreground);
    host.style.setProperty(settings.position === 'left' ? 'left' : 'right', '16px');
    title.textContent = settings.title; clearMessages();
    document.body.appendChild(host);
    var timer = setInterval(function () { if (opened || unread || lastMessages.length) void poll(); }, 4000);
    window.addEventListener('pagehide', function () { clearInterval(timer); }, { once: true });
  }).catch(function () { console.warn('Chorla: чат недоступен. Проверьте включение виджета и разрешённый адрес сайта в интеграциях.'); });
})();
