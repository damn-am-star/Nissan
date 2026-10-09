(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Reveal on scroll
  const targets = document.querySelectorAll(
    '.panel, .bottle, .athlete, .section__head, .stat__row, .cta__title, .cta__form, .foot__col'
  );
  targets.forEach((el) => el.classList.add('reveal'));

  if (reduce) {
    targets.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
  );
  targets.forEach((el) => io.observe(el));

  // Stagger the bottle grid on initial paint
  document.querySelectorAll('.bottle').forEach((el, i) => {
    el.style.transitionDelay = `${i * 80}ms`;
  });
  document.querySelectorAll('.athlete').forEach((el, i) => {
    el.style.transitionDelay = `${i * 60}ms`;
  });
})();