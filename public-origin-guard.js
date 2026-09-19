(() => {
  const cloudHost = location.hostname.endsWith('.sh.run.tcloudbase.com');
  if (cloudHost) {
    location.replace(`https://nqldy.top${location.pathname}${location.search}${location.hash}`);
  }
})();
