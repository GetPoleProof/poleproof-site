document.addEventListener('DOMContentLoaded', function () {
  // Scroll reveal
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('on'); });
  }

  // Savings calculator: fully client-side, no data leaves the page.
  var spendEl = document.getElementById('calcSpend');
  var rateEl = document.getElementById('calcRate');
  if (spendEl && rateEl) {
    var rateValEl = document.getElementById('calcRateVal');
    var foundEl = document.getElementById('calcFound');
    var feeEl = document.getElementById('calcFee');
    var netEl = document.getElementById('calcNet');
    var FEE_SHARE = 0.30;
    function money(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
    function recalc() {
      var spend = parseFloat(spendEl.value.replace(/[^0-9.]/g, '')) || 0;
      var rate = parseFloat(rateEl.value) || 0;
      rateValEl.textContent = rate + '%';
      var found = spend * (rate / 100);
      var fee = found * FEE_SHARE;
      foundEl.textContent = money(found);
      feeEl.textContent = money(fee);
      netEl.textContent = money(found - fee);
    }
    function formatSpend() {
      var digits = spendEl.value.replace(/[^0-9]/g, '');
      spendEl.value = digits ? parseInt(digits, 10).toLocaleString('en-US') : '';
    }
    spendEl.addEventListener('input', function () { formatSpend(); recalc(); });
    rateEl.addEventListener('input', recalc);
    formatSpend();
    recalc();
  }

  // All forms are front-end only until the backend ships. Prevent submit (CSP blocks inline handlers)
  // and show an honest notice on the account forms.
  document.querySelectorAll('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msgId = form.id === 'signupForm' ? 'suMsg' : (form.id === 'loginForm' ? 'liMsg' : null);
      if (msgId) {
        if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }
        var m = document.getElementById(msgId);
        if (m) { m.style.display = 'block'; }
      }
    });
  });
});
