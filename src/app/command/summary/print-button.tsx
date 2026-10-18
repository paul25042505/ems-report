"use client";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className="btn-dark btn-sm no-print">
      🖨 列印 / 存成 PDF
    </button>
  );
}
