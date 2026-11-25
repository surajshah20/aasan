import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { Booking, Venue, EventItem, SelectedSeat } from '../../types';

export interface ProcessedSeatItem extends SelectedSeat {
  standName?: string;
  blockLabel?: string;
  groupKey: string;
  groupTitle: string;
  fullLabel: string;
  shortSeat: string;
  gateOrStand: string;
  qrData: string;
}

export interface TicketGenData {
  booking: Booking;
  venue: Venue;
  event: EventItem;
  seats: ProcessedSeatItem[];
  language: 'en' | 'ne';
  formattedPaymentMethod: string;
  formattedDateTime: string;
  venueHeadline: string;
  venueSubline: string;
}

/**
 * Generate a standalone 1200 x 450 px light-designed ticket canvas for one seat.
 * Clean, hairline borders, zero glow/glass, white background, near-black text, crimson accent.
 */
export async function createSingleTicketCanvas(
  data: TicketGenData,
  seatIndex: number
): Promise<HTMLCanvasElement> {
  const { booking, venue, event, seats, language, formattedPaymentMethod, formattedDateTime, venueHeadline, venueSubline } = data;
  const seat = seats[seatIndex] || seats[0];

  const width = 1200;
  const height = 450;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Could not get canvas context');

  // 1. Crisp White Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Outer Hairline Grey Border with Rounded Corners
  ctx.save();
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(10, 10, width - 20, height - 20, 16);
  ctx.stroke();
  ctx.restore();

  // 3. One Crimson Accent (#dc143c) line on top
  ctx.fillStyle = '#dc143c';
  ctx.beginPath();
  ctx.roundRect(10, 10, width - 20, 5, [16, 16, 0, 0]);
  ctx.fill();

  // 4. Perforated Tear-off Line separating Stub on Right (x = 895)
  const stubX = 895;
  ctx.save();
  ctx.setLineDash([7, 6]);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(stubX, 12);
  ctx.lineTo(stubX, height - 12);
  ctx.stroke();
  ctx.setLineDash([]);

  // Perforation semi-circular punch notches (top & bottom)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;

  // Top notch
  ctx.beginPath();
  ctx.arc(stubX, 10, 12, 0, Math.PI);
  ctx.fill();
  ctx.stroke();

  // Bottom notch
  ctx.beginPath();
  ctx.arc(stubX, height - 10, 12, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  // 5. Requirement 4: Light Diagonal Watermark across the main ticket body
  ctx.save();
  ctx.translate(460, 225);
  ctx.rotate((-20 * Math.PI) / 180);
  ctx.fillStyle = 'rgba(220, 20, 60, 0.055)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 38px "Noto Sans Devanagari", Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('DEMO TICKET — NOT VALID FOR ENTRY', 0, -14);
  ctx.font = '700 20px "Noto Sans Devanagari", Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('डेमो टिकट — वास्तविक प्रवेशको लागि मान्य छैन', 0, 20);
  ctx.restore();

  // ==========================================
  // MAIN BODY (Left: x = 35 to 870)
  // ==========================================

  // Row 1: Brand & Demo Honesty Badge
  // Brand Header
  ctx.fillStyle = '#dc143c';
  ctx.font = '800 22px "Noto Sans Devanagari", Outfit, Inter, sans-serif';
  ctx.fillText('AASAN (आसन)', 35, 52);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 13px system-ui, -apple-system, sans-serif';
  ctx.fillText('• 3D SEAT & TICKETING NEPAL', 205, 52);

  // Demo Honesty Pill on right side of main body
  const demoPillX = 510;
  const demoPillY = 32;
  const demoPillW = 355;
  const demoPillH = 28;
  ctx.save();
  ctx.fillStyle = 'rgba(220, 20, 60, 0.04)';
  ctx.strokeStyle = 'rgba(220, 20, 60, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(demoPillX, demoPillY, demoPillW, demoPillH, 14);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dc143c';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('DEMO TICKET — NOT VALID FOR ENTRY', demoPillX + demoPillW / 2, demoPillY + demoPillH / 2);
  ctx.restore();

  // Row 2: Event Title in Full
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 25px "Noto Sans Devanagari", Inter, system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const displayTitle = (venue.type === 'cinema' && event.title?.en)
    ? (event.title.en.includes('(') ? event.title.en : `${event.title.en} (${event.title.ne || ''})`)
    : (event.title?.[language] || event.title?.en || 'Nepal vs Netherlands — T20 Tri-Series Final');
  ctx.fillText(displayTitle, 35, 104);

  // Subtitle / category
  ctx.fillStyle = '#64748b';
  ctx.font = '500 13px "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
  const displaySubtitle = event.subtitle?.[language] || event.subtitle?.en || 'Official Ticketing';
  ctx.fillText(displaySubtitle, 35, 128);

  // Row 3: Venue & Date/Time block
  // Left: Venue
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('VENUE & LOCATION', 35, 162);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
  ctx.fillText(venueHeadline, 35, 184);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 12px "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
  ctx.fillText(venueSubline, 35, 202);

  // Right: Date & Time
  const dateColX = 520;
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('DATE & TIME', dateColX, 162);

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 16px "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
  ctx.fillText(formattedDateTime, dateColX, 184);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 12px system-ui, -apple-system, sans-serif';
  ctx.fillText(venue.type === 'cinema' ? 'Doors open 15 mins before showtime' : 'Gate opens 2 hours before start', dateColX, 202);

  // Row 4: Large Seat Box
  const seatBoxY = 224;
  const seatBoxH = 82;
  const seatBoxW = 830;
  ctx.save();
  ctx.fillStyle = '#f8fafc';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(35, seatBoxY, seatBoxW, seatBoxH, 12);
  ctx.fill();
  ctx.stroke();

  // Crimson accent strip on left of seat box
  ctx.fillStyle = '#dc143c';
  ctx.beginPath();
  ctx.roundRect(35, seatBoxY, 6, seatBoxH, [12, 0, 0, 12]);
  ctx.fill();
  ctx.restore();

  // Seat Box Content
  ctx.fillStyle = '#dc143c';
  ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
  ctx.fillText(`CONFIRMED SEAT ASSIGNMENT (PASS ${seatIndex + 1} OF ${seats.length})`, 54, seatBoxY + 24);

  // Stand / Tier / Block / Row / Seat in LARGE TYPE
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 23px "Noto Sans Devanagari", Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText(seat.fullLabel, 54, seatBoxY + 56);

  // Row 5: Meta info: Price, Payment method, and Booking ID
  const metaY = 345;
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px system-ui, -apple-system, sans-serif';
  ctx.fillText(`Price: NPR ${seat.priceNPR.toLocaleString()}`, 35, metaY);

  ctx.fillStyle = '#475569';
  ctx.font = '500 13px system-ui, -apple-system, sans-serif';
  ctx.fillText(`· Paid via ${formattedPaymentMethod} (Demo Mode)`, 180, metaY);

  // Booking ID Monospace Pill
  ctx.save();
  const idPillText = `ID: ${booking.id}`;
  ctx.font = 'bold 13px monospace';
  const idPillW = ctx.measureText(idPillText).width + 24;
  const idPillX = 865 - idPillW;
  const idPillY = metaY - 18;
  ctx.fillStyle = '#f1f5f9';
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(idPillX, idPillY, idPillW, 26, 13);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.fillText(idPillText, idPillX + 12, idPillY + 18);
  ctx.restore();

  // Horizontal divider
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(35, 375);
  ctx.lineTo(865, 375);
  ctx.stroke();

  // Row 6: Requirement 4 Footer Line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 11px system-ui, -apple-system, sans-serif';
  ctx.fillText('Demo concept. Not affiliated with any venue or cinema. • www.aasan.com.np', 35, 402);

  // ==========================================
  // TEAR-OFF STUB (Right: x = 895 to 1200)
  // ==========================================
  const stubCenterX = 895 + (width - 895) / 2;

  // Stub Title
  ctx.fillStyle = '#dc143c';
  ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ENTRY PASS STUB', stubCenterX, 45);

  // Gate / Stand Badge
  const gateStand = seat.gateOrStand || 'GATE P1';
  ctx.save();
  ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
  const gateBadgeW = Math.max(100, ctx.measureText(gateStand).width + 24);
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(stubCenterX - gateBadgeW / 2, 60, gateBadgeW, 26, 6);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(gateStand, stubCenterX, 73);
  ctx.restore();

  // Seat in stub
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 17px "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(seat.shortSeat, stubCenterX, 115);

  ctx.fillStyle = '#64748b';
  ctx.font = '500 12px "Noto Sans Devanagari", system-ui, -apple-system, sans-serif';
  ctx.fillText(seat.blockLabel || seat.standName || (venue.type === 'cinema' ? 'Audi 1' : 'Block P1'), stubCenterX, 134);

  // QR Code Generation onto Stub
  // QR encodes booking ID + seat
  const qrString = `${booking.id} · ${seat.fullLabel}`;
  const qrCanvas = document.createElement('canvas');
  await QRCode.toCanvas(qrCanvas, qrString, {
    width: 155,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#0a0b10',
      light: '#ffffff',
    },
  });

  const qrX = stubCenterX - 78;
  const qrY = 152;
  // White border card around QR
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(qrX - 4, qrY - 4, 164, 164, 8);
  ctx.fill();
  ctx.stroke();

  ctx.drawImage(qrCanvas, qrX, qrY, 156, 156);
  ctx.restore();

  // Stub Booking Ref & tear instruction
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(booking.id, stubCenterX, 342);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '500 10px system-ui, -apple-system, sans-serif';
  ctx.fillText('TEAR ALONG PERFORATION', stubCenterX, 362);

  return canvas;
}

/**
 * Generate A4 PDF with multi-seat stacking:
 * Stacks up to 3 tickets per A4 page and continues on the next page.
 * For 4-seat booking: 2 tickets on Page 1, 2 tickets on Page 2 ("two tickets on a page").
 * File name: "Aasan-ticket-ASN-931651.pdf".
 */
export async function generateTicketPDF(data: TicketGenData): Promise<void> {
  const { booking, seats } = data;
  const doc = new jsPDF('p', 'mm', 'a4'); // A4 is 210 x 297 mm
  const pageWidth = 210;
  const pageHeight = 297;

  // Stacking configuration:
  // If 4 seats: exactly 2 tickets per page across 2 pages (two tickets on a page)
  // If <= 2 seats: 2 tickets per page
  // If 3 seats or > 4 seats: up to 3 tickets per page
  const ticketsPerPage = seats.length === 4 ? 2 : (seats.length <= 2 ? 2 : 3);
  const totalPages = Math.ceil(seats.length / ticketsPerPage);

  const ticketWidthMm = 186; // margins: left 12mm, right 12mm
  const ticketHeightMm = (186 * 450) / 1200; // ~69.75 mm height
  const marginX = (pageWidth - ticketWidthMm) / 2; // 12 mm

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage();
    }

    const startSeat = pageIdx * ticketsPerPage;
    const endSeat = Math.min(startSeat + ticketsPerPage, seats.length);
    const countThisPage = endSeat - startSeat;

    // Header strip on top of PDF page
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('AASAN (आसन) DIGITAL TICKETING • OFFICIAL ELECTRONIC TICKET PASS', marginX, 12);
    doc.setFont('courier', 'bold');
    doc.text(`BOOKING REF: ${booking.id}`, pageWidth - marginX - 45, 12);

    // Calculate vertical spacing
    const availableHeight = pageHeight - 32; // between y = 16 and y = 285
    const gap = countThisPage === 2 ? 40 : 18;
    const totalBlockH = countThisPage * ticketHeightMm + (countThisPage - 1) * gap;
    const startY = 18 + (availableHeight - totalBlockH) / 2;

    for (let i = startSeat; i < endSeat; i++) {
      const idxOnPage = i - startSeat;
      const y = startY + idxOnPage * (ticketHeightMm + gap);

      const ticketCanvas = await createSingleTicketCanvas(data, i);
      const imgData = ticketCanvas.toDataURL('image/png');

      doc.addImage(imgData, 'PNG', marginX, y, ticketWidthMm, ticketHeightMm, undefined, 'FAST');
    }

    // Clean footer line on bottom of PDF page
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Page ${pageIdx + 1} of ${totalPages} • Booking ID: ${booking.id} • Demo concept. Not valid for actual venue entry.`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Save the PDF file named "Aasan-ticket-ASN-931651.pdf"
  doc.save(`Aasan-ticket-${booking.id}.pdf`);
}

/**
 * Generate 1200 px wide PNG for "Save images".
 */
export async function generateTicketPNGs(data: TicketGenData): Promise<void> {
  const { booking, seats } = data;
  for (let i = 0; i < seats.length; i++) {
    const canvas = await createSingleTicketCanvas(data, i);
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `Aasan-ticket-${booking.id}-seat-${i + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    await new Promise((r) => setTimeout(r, 200));
  }
}
