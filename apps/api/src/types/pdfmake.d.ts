declare module 'pdfmake/build/pdfmake' {
  const pdfMake: any;
  export default pdfMake;
  export = pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: any;
  export { vfs };
}

declare module 'pdfkit' {
  const PDFDocument: any;
  export = PDFDocument;
}
