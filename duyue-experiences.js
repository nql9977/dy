(() => {
  const gateway = document.querySelector('.duyue-gateway');
  if (!gateway) return;
  const legacySections = ['about','focus','cases','services','notes','contact','story'];
  if (legacySections.includes(location.hash.slice(1))) {
    location.replace(new URL(`psychology/${location.hash}`, location.href).href);
    return;
  }
  let opening = false;
  gateway.querySelectorAll('[data-door]').forEach(door => {
    door.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      event.preventDefault();
      if (opening) return;
      opening = true;
      door.classList.add('is-opening');
      setTimeout(() => location.assign(door.href), 600);
    });
  });
  addEventListener('pageshow', () => { opening = false; gateway.querySelectorAll('.is-opening').forEach(door => door.classList.remove('is-opening')); });
})();
