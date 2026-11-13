(t) => { const b = document.querySelector('.bin3'); b.classList.remove('poked'); void b.offsetWidth; b.classList.add('poked');
  return new Promise(r => setTimeout(() => { document.getAnimations().filter(a => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('.bin3')).forEach(a => { a.pause(); a.currentTime = t; }); r(1); }, 50)); }
