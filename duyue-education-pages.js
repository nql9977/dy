const root = document.querySelector('.ai-education');
const dialog = root?.querySelector('#education-enrollment');
let enrollmentTrigger;

root?.querySelectorAll('[data-enroll]').forEach(button => button.addEventListener('click', () => {
  enrollmentTrigger = button;
  dialog?.showModal();
}));
dialog?.addEventListener('close', () => enrollmentTrigger?.focus());
dialog?.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});

root?.querySelectorAll('[data-activation-form]').forEach(form => {
  form.innerHTML = `<p>已经收到激活码？请进入安全看课页完成激活。</p>
    <a class="ai-btn" href="/ai-education/learn/">进入学员看课页 ↗</a>`;
});
