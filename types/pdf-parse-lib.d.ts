declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfParseResult = {
    text?: string;
    numpages?: number;
    numrender?: number;
    info?: Record<string, unknown>;
    metadata?: unknown;
    version?: string;
  };

  function pdfParse(dataBuffer: Uint8Array | Buffer): Promise<PdfParseResult>;

  export default pdfParse;
}
