(() => {
  const storageKey = "natal-safety-language";
  const options = [...document.querySelectorAll("[data-language]")];
  const languageUrls = new Map(options.map((link) => [link.dataset.language, new URL(link.href)]));
  const current = document.documentElement.lang.split("-")[0];
  const url = new URL(window.location.href);
  const requested = url.searchParams.get("lang")?.trim().toLowerCase().split(/[-_]/)[0];
  const remember = (language) => {
    try {
      localStorage.setItem(storageKey, language);
    } catch {}
  };

  function getDestination(language) {
    const destination = new URL(languageUrls.get(language));
    destination.search = url.search;
    destination.searchParams.delete("lang");
    destination.hash = url.hash;
    return destination;
  }

  for (const link of options) {
    link.href = getDestination(link.dataset.language).href;
    link.addEventListener("click", () => remember(link.dataset.language));
  }

  const menu = document.querySelector(".language-menu");
  menu.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || !menu.open) return;
    menu.open = false;
    menu.querySelector("summary").focus();
  });

  if (!document.documentElement.hasAttribute("data-detect-language")) return;
  let preferred = languageUrls.has(requested) ? requested : undefined;
  if (preferred) remember(preferred);

  if (!preferred) {
    try {
      const saved = localStorage.getItem(storageKey);
      if (languageUrls.has(saved)) preferred = saved;
    } catch {}
  }

  if (!preferred) {
    const browserLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
    preferred = browserLanguages
      .map((language) => language?.toLowerCase().split("-")[0])
      .find((language) => languageUrls.has(language)) || "en";
  }

  if (preferred !== current || requested === current) window.location.replace(getDestination(preferred));
})();
