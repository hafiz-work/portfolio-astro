// "Cetak jadual": print one <section>'s table from a small window of its own, so
// the site layout (navbar, gutters, footer) never needs print rules.
// The section supplies data-title, data-zone (subtitle) and data-footer.
// Rows with data-friday print bold; cells with data-key print bold (e.g. Imsak).
export function bindPrintTable(btn: HTMLElement | null, section: HTMLElement | null) {
  if (!btn || !section || btn.dataset.bound === "1") return;
  btn.dataset.bound = "1";
  btn.addEventListener("click", () => {
    const w = window.open("", "_blank", "width=900,height=1000");
    if (!w) return window.print();
    const title = section.dataset.title ?? "Jadual Waktu Solat";
    const doc = w.document;
    doc.title = title;
    const style = doc.createElement("style");
    style.textContent = `
      @page { size: A4 portrait; margin: 12mm; }
      body { font: 9.5pt system-ui, sans-serif; color: #000; margin: 0; }
      h1 { font-size: 15pt; margin: 0 0 2mm; text-transform: capitalize; }
      p { margin: 0 0 4mm; color: #444; }
      table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
      th, td { padding: 1.2mm 2mm; border-bottom: 0.3pt solid #ccc; text-align: left; }
      th { font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.08em; color: #555; }
      tr[data-friday], td[data-key], th[data-key] { font-weight: 700; color: #000; }
      span { color: #666; }
      footer { margin-top: 4mm; font-size: 7.5pt; color: #666; }`;
    doc.head.append(style);
    const h1 = doc.createElement("h1");
    h1.textContent = title;
    const zone = doc.createElement("p");
    zone.textContent = section.dataset.zone ?? "";
    const footer = doc.createElement("footer");
    footer.textContent = section.dataset.footer ?? "";
    doc.body.append(h1, zone, section.querySelector("table")!.cloneNode(true), footer);
    w.focus();
    w.print();
  });
}
