(() => {
  const root = document.querySelector(".home-v3");
  if (!root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;

  if (!reduceMotion) {
    const revealTargets = root.querySelectorAll([
      ".v3-section-head",
      ".v3-method-card",
      ".v3-scenario-copy",
      ".v3-scene-card",
      ".v3-focus-card",
      ".v3-story-list article",
      ".v3-case-card",
      ".v3-service-grid article",
      ".v3-notes-grid > a",
      ".v3-contact > div",
    ].join(","));

    document.documentElement.classList.add("v3-motion-ready");
    revealTargets.forEach((element) => element.classList.add("v3-reveal"));

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -7%", threshold: 0.08 });

    revealTargets.forEach((element) => observer.observe(element));
  }

  if (!finePointer || reduceMotion) return;

  const aura = root.querySelector(".v3-pointer-aura");
  const tiltTarget = root.querySelector("[data-tilt]");
  let pointerX = -60;
  let pointerY = -60;
  let pointerFrame = 0;
  let tiltFrame = 0;

  const moveAura = () => {
    pointerFrame = 0;
    if (aura) aura.style.transform = `translate3d(${pointerX - 11}px, ${pointerY - 11}px, 0)`;
  };

  document.addEventListener("pointermove", (event) => {
    pointerX = event.clientX;
    pointerY = event.clientY;
    if (!pointerFrame) pointerFrame = requestAnimationFrame(moveAura);
  }, { passive: true });

  root.addEventListener("pointerover", (event) => {
    if (!(event.target instanceof Element) || !aura) return;
    const interactive = event.target.closest("a, .v3-photo-frame, .v3-method-card, .v3-focus-card, .v3-service-grid article");
    aura.classList.toggle("is-visible", Boolean(interactive));
    aura.classList.toggle("is-emphasis", Boolean(interactive?.matches("a, .v3-photo-frame")));
  });

  root.addEventListener("pointerout", (event) => {
    if (!aura || !(event.relatedTarget instanceof Element)) {
      aura?.classList.remove("is-visible", "is-emphasis");
      return;
    }
    if (!event.relatedTarget.closest("a, .v3-photo-frame, .v3-method-card, .v3-focus-card, .v3-service-grid article")) {
      aura.classList.remove("is-visible", "is-emphasis");
    }
  });

  if (tiltTarget) {
    tiltTarget.addEventListener("pointermove", (event) => {
      if (tiltFrame) return;
      tiltFrame = requestAnimationFrame(() => {
        tiltFrame = 0;
        const rect = tiltTarget.getBoundingClientRect();
        const rotateY = ((event.clientX - rect.left) / rect.width - 0.5) * 4.2;
        const rotateX = (0.5 - (event.clientY - rect.top) / rect.height) * 3.4;
        tiltTarget.style.transform = `perspective(1100px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(0)`;
      });
    }, { passive: true });

    tiltTarget.addEventListener("pointerleave", () => {
      tiltTarget.style.transform = "perspective(1100px) rotateX(0deg) rotateY(0deg) translateZ(0)";
    });
  }
})();
