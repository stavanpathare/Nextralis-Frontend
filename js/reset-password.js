/* Reset Password JS — handles token, validation, strength meter, toasts, loaders */
(() => {
  const form = document.getElementById('resetForm');
  const pwd = document.getElementById('password');
  const confirm = document.getElementById('confirm');
  const resetBtn = document.getElementById('resetBtn');
  const overlay = document.getElementById('overlay');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  const toastRoot = document.getElementById('toast-root');
  const messageNode = document.getElementById('rp-message');

  function debug(...args){ console.debug('[RP]', ...args); }
  function showOverlay(show=true){ overlay.classList.toggle('hidden', !show); overlay.setAttribute('aria-hidden', String(!show)); }

  function createToast(type, text, opts={duration:4000}){
    const id = `toast_${Date.now()}`;
    const div = document.createElement('div');
    div.className = `toast toast-${type}`;
    if(type==='loading') div.classList.add('toast-loading');
    div.textContent = text;
    toastRoot.appendChild(div);
    if(opts.duration>0) setTimeout(()=>{div.classList.add('hide'); setTimeout(()=>div.remove(),300)}, opts.duration);
    return id;
  }

  function getToken(){
    try{
      const params = new URLSearchParams(window.location.search);
      return params.get('token');
    }catch(e){ debug('malformed url', e); return null }
  }

  function scorePassword(p){
    let score=0; if(!p) return 0;
    if(p.length>=8) score+=1; if(/[A-Z]/.test(p)) score+=1; if(/[0-9]/.test(p)) score+=1; if(/[^A-Za-z0-9]/.test(p)) score+=1; if(p.length>=12) score+=1; return score;
  }

  function updateStrength(){
    const val = pwd.value||''; const s = scorePassword(val); const pct = (s/5)*100;
    strengthBar.style.setProperty('--pct', pct+"%");
    strengthBar.querySelector('::after');
    strengthBar.style.setProperty('--width', pct + '%');
    strengthBar.querySelector('::after');
    strengthBar.style.setProperty('--w', pct + '%');
    // update pseudo element via inline style
    strengthBar.style.background = `linear-gradient(90deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))`; // base
    strengthBar.style.setProperty('--fill', pct + '%');
    const inner = strengthBar.querySelector('.fill');
    if(!inner){ const f = document.createElement('div'); f.className='fill'; f.style.width = pct + '%'; f.style.height='100%'; f.style.background='linear-gradient(90deg,#6ee7ff,#9b6bff)'; f.style.transition='width .28s'; strengthBar.appendChild(f); }
    else inner.style.width = pct + '%';
    const labels = ['Very weak','Weak','Okay','Good','Strong','Excellent'];
    strengthText.textContent = labels[s];
  }

  function setVisibilityToggle(){
    document.querySelectorAll('.eye-toggle').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const tgt = document.getElementById(btn.dataset.target);
        if(!tgt) return;
        const isPwd = tgt.type === 'password';
        tgt.type = isPwd ? 'text' : 'password';
        btn.textContent = isPwd ? '🙈' : '👁️';
      });
    });
  }

  async function submitReset(e){
    e.preventDefault(); const token = getToken(); debug('submit', token);
    if(!token){ createToast('error','Missing or malformed token'); return; }
    const password = pwd.value||''; const conf = confirm.value||'';
    if(password.length<8){ createToast('error','Password must be at least 8 characters'); return; }
    if(password !== conf){ createToast('error','Passwords do not match'); return; }
    const s = scorePassword(password); if(s<3){ createToast('warning','Choose a stronger password'); }

    if(resetBtn.disabled) return;
    try{
      resetBtn.disabled=true; resetBtn.classList.add('loading'); showOverlay(true); createToast('loading','Resetting password...',{duration:0});
      const res = await fetch(`/api/auth/reset-password/${encodeURIComponent(token)}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})});
      const data = await res.json().catch(()=>({})); debug('response', res.status, data);
      Array.from(toastRoot.querySelectorAll('.toast-loading')).forEach(t=>t.remove());
      if(res.ok){ createToast('success','Password reset successful'); messageNode.innerHTML='<strong>Password updated</strong><div class="msg-sub">Redirecting to login…</div>';
        setTimeout(()=>{ window.location.href = '/login.html'; },2000);
      } else {
        const err = data?.message || 'Failed to reset password'; createToast('error',err);
      }
    }catch(err){ debug('error',err); createToast('error','Network error. Try again'); }
    finally{ resetBtn.disabled=false; resetBtn.classList.remove('loading'); showOverlay(false); }
  }

  // inject small toast styles
  (function injectToastStyles(){
    const s = document.createElement('style'); s.textContent = `#toast-root{position:fixed;top:18px;right:18px;z-index:9999;display:flex;flex-direction:column;gap:10px}
      .toast{padding:10px 14px;border-radius:10px;color:#041025;font-weight:600}
      .toast-success{background:linear-gradient(90deg,#baf6ff,#b48bff)}
      .toast-error{background:linear-gradient(90deg,#ff8b8b,#ff6bcd)}
      .toast-warning{background:linear-gradient(90deg,#ffd58b,#ff9bd7)}
      .toast-loading{background:linear-gradient(90deg,#bcd4ff,#9b6bff)}
      .toast.hide{opacity:0;transform:translateX(10px);transition:all .28s}
    `; document.head.appendChild(s);
  })();

  // init
  setVisibilityToggle();
  pwd.addEventListener('input', updateStrength);
  form.addEventListener('submit', submitReset);

  // handle missing token early
  if(!getToken()){
    messageNode.innerHTML = '<strong>Missing token</strong><div class="msg-sub">The reset link appears invalid or incomplete.</div>';
  }

})();
