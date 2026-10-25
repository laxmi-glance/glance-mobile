import {
  PDF_PREVIEW_CSP,
  PREVIEW_ORIGIN_WHITELIST,
  createPreviewNavigationGuard,
  inlinePreviewNavigationGuard,
  pdfHtml,
} from "../documentPreviewHtml";

// Node builtins. This app does not depend on @types/node.
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs") as {
  readFileSync: (filePath: string, encoding: "utf8") => string;
};
const { createRequire } = require("module") as {
  createRequire: (filename: string) => {
    resolve: (specifier: string) => string;
  };
};
/* eslint-enable @typescript-eslint/no-require-imports */

const nodeRequire = createRequire(`${process.cwd()}/package.json`);

function bundledPdfJs(fileName: string): string {
  return fs.readFileSync(nodeRequire.resolve(`pdfjs-dist/legacy/build/${fileName}`), "utf8");
}

const SAMPLE_PDF_BASE64 = "JVBERi0xLjEKJcKlwrE=";

describe("pdfHtml", () => {
  const html = pdfHtml(SAMPLE_PDF_BASE64, "/* main */", "/* worker */");

  test("does not load an external script or stylesheet", () => {
    expect(html).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(html).not.toMatch(/<link\b[^>]*\bhref\s*=/i);
    expect(html).not.toContain("cdnjs.cloudflare.com");
    expect(html).not.toContain("pdf.js/3.11.174");
  });

  test("sets a content security policy that blocks network and eval", () => {
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="${PDF_PREVIEW_CSP}" />`
    );
    expect(PDF_PREVIEW_CSP).toContain("default-src 'none'");
    expect(PDF_PREVIEW_CSP).toContain("connect-src 'none'");
    expect(PDF_PREVIEW_CSP).not.toContain("unsafe-eval");
  });

  test("disables pdf.js eval when opening the document", () => {
    expect(html).toContain("isEvalSupported: false");
  });

  test("shows an error when the viewer fails to start", () => {
    const script = html.slice(html.indexOf("<script"), html.lastIndexOf("</script>"));
    const tryAt = script.indexOf("try {");
    const importAt = script.indexOf("await import");
    const catchAt = script.lastIndexOf("catch");

    expect(tryAt).toBeGreaterThan(-1);
    expect(importAt).toBeGreaterThan(tryAt);
    expect(catchAt).toBeGreaterThan(importAt);
    expect(script).toContain("Could not render this PDF.");
  });

  test("keeps a script breakout inside the inline module", () => {
    const hostile = '</script><script src="https://evil.example/payload.js"></script>';
    const page = pdfHtml(SAMPLE_PDF_BASE64, hostile, hostile);
    expect(page.match(/<script\b/gi)).toHaveLength(1);
    expect(page).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(page).not.toContain('<script src="https://evil.example/payload.js">');
  });

  test("inlines the shipped pdf.js bundles without adding a script url", () => {
    const main = bundledPdfJs("pdf.min.mjs");
    const worker = bundledPdfJs("pdf.worker.min.mjs");
    expect(main).toContain("4.10.38");
    expect(worker).toContain("4.10.38");

    const page = pdfHtml(SAMPLE_PDF_BASE64, main, worker);
    expect(page).not.toMatch(/<script\b[^>]*\bsrc\s*=/i);
    expect(page).not.toMatch(/<link\b[^>]*\bhref\s*=/i);
    expect(page).toContain("isEvalSupported: false");
    expect(page.match(/<script\b/gi)).toHaveLength(1);
  });
});

describe("preview navigation", () => {
  const documentUrl = "https://files.example/invoices/a.pdf?sig=1";

  test("accepts the signed document once and then refuses every other url", () => {
    const allow = createPreviewNavigationGuard([documentUrl]);

    expect(allow(documentUrl)).toBe(true);
    expect(allow(documentUrl)).toBe(false);
    expect(allow("http://evil.example/phish")).toBe(false);
    expect(allow("https://evil.example/phish")).toBe(false);
    expect(allow("javascript:alert(1)")).toBe(false);
    expect(allow("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(allow("intent://evil.example#Intent;scheme=https;end")).toBe(false);
    expect(allow("mailto:phish@evil.example")).toBe(false);
    expect(allow("tel:15551212")).toBe(false);
    expect(allow("market://details?id=com.example")).toBe(false);
  });

  test("does not treat an attack url as the first load", () => {
    const allow = createPreviewNavigationGuard([documentUrl]);

    expect(allow("javascript:alert(1)")).toBe(false);
    expect(allow("https://evil.example")).toBe(false);
    expect(allow("data:text/html,hi")).toBe(false);
    expect(allow("intent://scan/#Intent;end")).toBe(false);
    expect(allow("http://evil.example")).toBe(false);
    expect(allow(documentUrl)).toBe(true);
  });

  test("accepts the synthetic inline origin as the first load", () => {
    const allow = inlinePreviewNavigationGuard();

    expect(allow("https://pdf-preview.invalid/")).toBe(true);
    expect(allow("https://evil.example/phish")).toBe(false);
    expect(allow("javascript:alert(1)")).toBe(false);
    expect(allow("data:text/html,hi")).toBe(false);
    expect(allow("intent://evil.example#Intent;end")).toBe(false);
    expect(allow("http://evil.example")).toBe(false);
  });

  test("accepts the inline page once and then refuses other urls", () => {
    const allow = inlinePreviewNavigationGuard();

    expect(allow("about:blank")).toBe(true);
    expect(allow("about:blank")).toBe(false);
    expect(allow("https://pdf-preview.invalid/")).toBe(false);
    expect(allow("http://evil.example")).toBe(false);
    expect(allow("https://evil.example")).toBe(false);
    expect(allow("javascript:alert(1)")).toBe(false);
    expect(allow("data:text/html,hi")).toBe(false);
    expect(allow("intent://evil.example#Intent;end")).toBe(false);
  });

  test("keeps every scheme inside the navigation handler", () => {
    expect(PREVIEW_ORIGIN_WHITELIST).not.toContain("*");

    const matches = (url: string) => {
      const origin = /^[A-Za-z][A-Za-z0-9+\-.]+:(\/\/)?[^/]*/.exec(url)?.[0] ?? "";
      return PREVIEW_ORIGIN_WHITELIST.some((entry) => {
        const pattern = `^${entry.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/\\\*/g, ".*")}`;
        return new RegExp(pattern).test(origin);
      });
    };

    for (const url of [
      "https://files.example/invoices/a.pdf?sig=1",
      "http://evil.example/phish",
      "javascript:alert(1)",
      "data:text/html,hi",
      "intent://evil.example#Intent;end",
      "blob:https://pdf-preview.invalid/id",
      "file:///tmp/a.pdf",
      "content://media/1",
      "mailto:phish@evil.example",
      "tel:15551212",
      "market://details?id=com.example",
    ]) {
      expect(matches(url)).toBe(true);
    }
  });
});
