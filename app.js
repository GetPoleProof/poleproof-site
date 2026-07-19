document.addEventListener('DOMContentLoaded', function () {
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
      var net = found - fee;
      foundEl.textContent = money(found);
      feeEl.textContent = money(fee);
      netEl.textContent = money(net);
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

  // Account forms are front-end only until the backend ships. Show an honest notice on submit.
  [['signupForm', 'suMsg'], ['loginForm', 'liMsg']].forEach(function (pair) {
    var form = document.getElementById(pair[0]);
    var msg = document.getElementById(pair[1]);
    if (form && msg) {
      form.addEventListener('submit', function () {
        if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }
        msg.style.display = 'block';
      });
    }
  });
});
