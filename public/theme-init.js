// Applies the saved theme and language before Angular boots (no flash of the wrong theme).
// Kept as an external file so the Content-Security-Policy can forbid inline scripts.
(function () {
  try {
    var theme = localStorage.getItem('kh.theme') || 'system';
    var dark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    var lang = localStorage.getItem('kh.lang');
    if (lang === 'es' || lang === 'en') document.documentElement.lang = lang;
  } catch (e) {}
})();
