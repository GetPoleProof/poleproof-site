/* PoleProof audit intake — external script (CSP: script-src 'self') */
(function () {
  'use strict';
  var nda = document.getElementById('nda-agree');
  var submitBtn = document.getElementById('submit-btn');
  var form = document.getElementById('intake-form');
  var success = document.getElementById('success');
  if (!form || !nda || !submitBtn) return;

  // NDA gate: submit stays disabled until the mutual NDA is accepted
  function syncGate() { submitBtn.disabled = !nda.checked; }
  nda.addEventListener('change', syncGate);
  syncGate();

  // Track selected filenames so they can be listed in the handoff email
  var selected = {};

  var zones = document.querySelectorAll('[data-dz]');
  Array.prototype.forEach.call(zones, function (zone) {
    var input = zone.querySelector('input[type=file]');
    var out = zone.querySelector('[data-files]');
    if (!input || !out) return;
    function render() {
      if (input.files && input.files.length) {
        var names = Array.prototype.map.call(input.files, function (f) { return f.name; });
        out.textContent = names.join(',  ');
        zone.classList.add('has-file');
        selected[input.name] = names;
      } else {
        out.textContent = '';
        zone.classList.remove('has-file');
        delete selected[input.name];
      }
    }
    input.addEventListener('change', render);
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', function () { zone.classList.remove('drag'); });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
        try { input.files = e.dataTransfer.files; } catch (err) { /* older browsers: ignore */ }
        render();
      }
    });
  });

  function val(id) { var el = document.getElementById(id); return el ? el.value.trim() : ''; }
  function stageLabel() {
    var r = form.querySelector('input[name=stage]:checked');
    if (!r) return '';
    return r.value === 'estimate' ? 'Pending estimate (before payment)' : 'Invoice already received (after payment)';
  }
  function allFiles() {
    var list = [];
    Object.keys(selected).forEach(function (k) { list = list.concat(selected[k]); });
    return list;
  }

  // Email-first launch: compose a prefilled message to the intake inbox.
  // Files are attached by the sender in their mail client (mailto cannot carry attachments).
  // Upgrade path: POST fields + files to a same-origin handler (form-action 'self'), e.g. /api/intake.
  function buildMailto() {
    var company = val('company');
    var subject = 'Free audit request' + (company ? ' for ' + company : '');
    var files = allFiles();
    var body = [
      'New free audit request from the PoleProof intake form.',
      '',
      'Name: ' + val('name'),
      'Company: ' + company,
      'Work email: ' + val('email'),
      'Pole owner: ' + (val('owner') || 'not provided'),
      'Approximate amount under review: ' + (val('amount') || 'not provided'),
      'Type: ' + stageLabel(),
      '',
      'Mutual NDA: accepted via the intake form.',
      '',
      'Notes: ' + (val('note') || 'none'),
      '',
      'Documents to attach to this email:',
      (files.length
        ? files.map(function (n) { return '  - ' + n; }).join('\n')
        : '  (please attach your invoice or estimate, and your signed pole attachment agreement if available)'),
      '',
      'Reminder: attach the documents listed above before sending. Thank you.'
    ].join('\n');
    return 'mailto:audit@getpoleproof.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!nda.checked) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    try { window.location.href = buildMailto(); } catch (err) { /* no mail handler: on-page fallback is shown */ }

    form.style.display = 'none';
    if (success) {
      success.style.display = 'block';
      success.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
})();
