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

  // Track selected filenames for the email-fallback body
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

  // Email fallback used when the upload endpoint is unavailable or the payload is too large
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

  function setText(id, s) { var el = document.getElementById(id); if (el) el.textContent = s; }
  function reveal() {
    form.style.display = 'none';
    success.style.display = 'block';
    success.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function showUploaded() {
    setText('success-h', 'Your documents are in.');
    setText('success-p', 'Thank you. Your details and documents reached the PoleProof intake team. Your findings report comes back within 10 business days, and we will email you at the address you gave if anything is missing.');
    setText('success-sub', 'A confirmation will come from audit@getpoleproof.com.');
    reveal();
  }
  function showEmail() {
    try { window.location.href = buildMailto(); } catch (err) { /* no mail handler: on-page fallback text is shown */ }
    setText('success-h', 'One last step: send your email.');
    setText('success-p', 'We have opened a message to audit@getpoleproof.com with your details filled in. Attach the documents you have, your invoice or estimate and your signed agreement if available, then hit send. Your findings report comes back within 10 business days.');
    setText('success-sub', 'If your email app did not open, email your documents to audit@getpoleproof.com.');
    reveal();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!nda.checked) return;
    if (!form.checkValidity()) { form.reportValidity(); return; }

    var original = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    var fd = new FormData(form);
    fd.append('nda_accepted', 'true');
    fd.append('stage_label', stageLabel());

    // Primary: post directly to the same-origin handler. Fallback: email compose.
    fetch('/api/intake', { method: 'POST', body: fd })
      .then(function (resp) { if (resp && resp.ok) { showUploaded(); } else { showEmail(); } })
      .catch(function () { showEmail(); })
      .then(function () { submitBtn.disabled = false; submitBtn.textContent = original; });
  });
})();
