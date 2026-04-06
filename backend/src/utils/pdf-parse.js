import { PDFParse } from "pdf-parse";

export const ExtractText = async (pdfSource) => {
  try {
    let buffer;

    if (typeof pdfSource === "string") {
      if (!pdfSource.startsWith("http")) {
        throw new Error("Invalid PDF source URL.");
      }
      const response = await fetch(pdfSource);
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (Buffer.isBuffer(pdfSource)) {
      buffer = pdfSource;
    } else {
      throw new Error("Invalid PDF source. Provide a URL or Buffer.");
    }

    const parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    await parser.destroy().catch(() => undefined);

    const text = (data?.text || "").replace(/\s+/g, " ").trim();
    if (!text) {
      throw new Error("No selectable text found in PDF.");
    }

    return text;
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    throw error;
  }
};

