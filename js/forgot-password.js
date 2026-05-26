/* Forgot Password JS — handles form submit, validation, toasts, loaders */
(() => {
  const form = document.getElementById('forgotForm');
  const emailInput = document.getElementById('email');
  const sendBtn = document.getElementById('sendBtn');
  const overlay = document.getElementById('overlay');
  const messageNode = document.getElementById('fp-message');
  const toastRoot = document.getElementById('toast-root');

  function debug(...args){ console.debug('[FP]', ...args); }

  function showOverlay(show=true){ overlay.classList.toggle('hidden', !show); overlay.setAttribute('aria-hidden', String(!show)); }

  function createToast(type, text, opts={duration:4000}){
    const id = `toast_${Date.now()}`;
    const div = document.createElement('div');
    div.className = `toast toast-${type}`;
    div.textContent = text;
    div.id = id;
    toastRoot.appendChild(div);
    if(opts.duration>0) setTimeout(()=>{div.classList.add('hide'); setTimeout(()=>div.remove(),300)}, opts.duration);
    return id;
  }

  function validateEmail(email){
    if(!email) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(String(email).toLowerCase());
  }

  async function submitForgot(e){
    e.preventDefault();
    const email = emailInput.value?.trim();
    debug('submit', email);
    if(!validateEmail(email)){
      createToast('error','Please enter a valid email address');
      return;
    }
    // prevent duplicate
    if(sendBtn.disabled) return;
    try{
      sendBtn.disabled = true; sendBtn.classList.add('loading'); showOverlay(true);
      createToast('loading','Sending reset link...',{duration:0});

      const res = await fetch('/api/auth/forgot-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      const data = await res.json().catch(()=>({}));
      debug('response', res.status, data);

      // remove persistent loading toasts
      Array.from(toastRoot.querySelectorAll('.toast-loading')).forEach(t=>t.remove());

      if(res.ok){
        createToast('success','Password reset link sent to your email');
        messageNode.innerHTML = `<strong>Check your inbox</strong><div class="msg-sub">Password reset link sent to ${email}</div>`;
        messageNode.classList.add('show');
      } else {
        const err = data?.message || 'Failed to send reset link';
        createToast('error',err);
      }
    }catch(err){
      debug('error', err);
      createToast('error','Network error. Please try again');
    }finally{
      sendBtn.disabled = false; sendBtn.classList.remove('loading'); showOverlay(false);
    }
  }

  // attach styles for toasts (simple, inserted here so file is self-contained)
  (function injectToastStyles(){
    const s = document.createElement('style'); s.textContent = `#toast-root{position:fixed;top:18px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:10px}
      .toast{padding:10px 14px;border-radius:10px;color:#041025;font-weight:600;backdrop-filter:blur(6px)}
      .toast-success{background:linear-gradient(90deg,#baf6ff,#b48bff)}
      .toast-error{background:linear-gradient(90deg,#ff8b8b,#ff6bcd)}
      .toast-loading{background:linear-gradient(90deg,#bcd4ff,#9b6bff)}
      .toast.hide{opacity:0;transform:translateX(10px);transition:all .28s}
    `; document.head.appendChild(s);
  })();

  form.addEventListener('submit', submitForgot);
  emailInput.addEventListener('input', ()=>{ messageNode.textContent=''; });

})();
