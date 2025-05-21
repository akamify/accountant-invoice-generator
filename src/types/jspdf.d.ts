import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    setGradient(
      x: number,
      y: number,
      x1: number,
      y1: number,
      color1: string,
      color2: string,
      x2?: number,
      y2?: number,
      x3?: number,
      y3?: number,
      x4?: number,
      y4?: number
    ): jsPDF;
  }
}
