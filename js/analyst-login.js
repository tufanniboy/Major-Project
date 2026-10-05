const form=document.querySelector('#analyst-login'), message=document.querySelector('#login-message');
form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('button');button.disabled=true;message.textContent='Signing in…';
  try {
    const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
    const result=await response.json();
    if(!response.ok)throw new Error(result.error || 'Sign-in failed.');
    form.reset();location.assign('/');
  } catch(error) { message.textContent=error.message;button.disabled=false; }
});
