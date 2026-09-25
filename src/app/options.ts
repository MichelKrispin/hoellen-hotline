export interface DisplayOptions {
  palette: "standard" | "contrast";
  uiScale: number;
  textScale: number;
  reducedMotion: boolean;
  reducedFlash: boolean;
}

const key = "hoellen-hotline.display.v1";
const defaults: DisplayOptions = {
  palette: "standard",
  uiScale: 1,
  textScale: 1,
  reducedMotion: false,
  reducedFlash: false,
};

function read(): DisplayOptions {
  try {
    const saved = JSON.parse(
      localStorage.getItem(key) ?? "null",
    ) as Partial<DisplayOptions> | null;
    return {
      palette: saved?.palette === "contrast" ? "contrast" : "standard",
      uiScale: [0.9, 1, 1.1].includes(saved?.uiScale ?? 1)
        ? saved!.uiScale!
        : 1,
      textScale: [1, 1.15, 1.3].includes(saved?.textScale ?? 1)
        ? saved!.textScale!
        : 1,
      reducedMotion: saved?.reducedMotion === true,
      reducedFlash: saved?.reducedFlash === true,
    };
  } catch {
    return { ...defaults };
  }
}

export const displayOptions = read();

export function prefersReducedMotion(): boolean {
  return (
    displayOptions.reducedMotion ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function prefersReducedFlash(): boolean {
  return displayOptions.reducedFlash || prefersReducedMotion();
}

export function applyDisplayOptions(): void {
  const html = document.documentElement;
  html.dataset.palette = displayOptions.palette;
  html.dataset.reducedMotion = String(prefersReducedMotion());
  html.dataset.reducedFlash = String(displayOptions.reducedFlash);
  html.style.setProperty("--ui-scale", String(displayOptions.uiScale));
  html.style.setProperty("--text-scale", String(displayOptions.textScale));
}

export class OptionsOverlay {
  private readonly root = document.createElement("div");
  private readonly button = document.createElement("button");
  private readonly dialog = document.createElement("dialog");
  private readonly keydown = (event: KeyboardEvent): void => {
    if (
      event.key.toLowerCase() !== "o" ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement
    )
      return;
    event.preventDefault();
    this.open();
  };

  constructor() {
    applyDisplayOptions();
    this.root.className = "display-options";
    this.button.textContent = "⚙ Optionen (O)";
    this.button.setAttribute("aria-label", "Darstellungsoptionen öffnen");
    this.button.onclick = () => this.open();
    this.dialog.setAttribute("aria-label", "Darstellungsoptionen");
    this.dialog.innerHTML = `<form method="dialog"><h2>Darstellung</h2><label>Farbpalette<select name="palette"><option value="standard">Standard</option><option value="contrast">Kontrastreiche Graustufen</option></select></label><label>UI-Größe<select name="uiScale"><option value="0.9">90 %</option><option value="1">100 %</option><option value="1.1">110 %</option></select></label><label>Textgröße<select name="textScale"><option value="1">100 %</option><option value="1.15">115 %</option><option value="1.3">130 %</option></select></label><label><input type="checkbox" name="reducedMotion"> Bewegung reduzieren</label><label><input type="checkbox" name="reducedFlash"> Blitzreduktion</label><p>Symbole und Texte kennzeichnen Ziele und Status zusätzlich zur Farbe.</p><button value="close">Schließen</button></form>`;
    this.dialog.addEventListener("change", () => this.save());
    this.root.append(this.button, this.dialog);
    document.body.append(this.root);
    window.addEventListener("keydown", this.keydown);
  }

  private open(): void {
    const form = this.dialog.querySelector("form")!;
    (form.elements.namedItem("palette") as HTMLSelectElement).value =
      displayOptions.palette;
    (form.elements.namedItem("uiScale") as HTMLSelectElement).value = String(
      displayOptions.uiScale,
    );
    (form.elements.namedItem("textScale") as HTMLSelectElement).value = String(
      displayOptions.textScale,
    );
    (form.elements.namedItem("reducedMotion") as HTMLInputElement).checked =
      displayOptions.reducedMotion;
    (form.elements.namedItem("reducedFlash") as HTMLInputElement).checked =
      displayOptions.reducedFlash;
    if (!this.dialog.open) this.dialog.showModal();
  }

  private save(): void {
    const form = this.dialog.querySelector("form")!;
    displayOptions.palette =
      (form.elements.namedItem("palette") as HTMLSelectElement).value ===
      "contrast"
        ? "contrast"
        : "standard";
    displayOptions.uiScale = Number(
      (form.elements.namedItem("uiScale") as HTMLSelectElement).value,
    );
    displayOptions.textScale = Number(
      (form.elements.namedItem("textScale") as HTMLSelectElement).value,
    );
    displayOptions.reducedMotion = (
      form.elements.namedItem("reducedMotion") as HTMLInputElement
    ).checked;
    displayOptions.reducedFlash = (
      form.elements.namedItem("reducedFlash") as HTMLInputElement
    ).checked;
    try {
      localStorage.setItem(key, JSON.stringify(displayOptions));
    } catch {
      /* Storage is optional. */
    }
    applyDisplayOptions();
  }
}
