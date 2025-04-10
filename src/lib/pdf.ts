import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { supabase } from './supabase';
import { PDFDocument, PDFTextField, PDFForm } from 'pdf-lib';

interface PatronData {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  ctrs?: Array<CTREntry>;
}

interface CTREntry {
  ctr_id: string;
  gaming_day: string;
  ship: string;
  cash_in_total: number;
  cash_out_total: number;
  status: string;
}

interface CTRData {
  ctr_id: string;
  gaming_day: string;
  ship: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  embark_date: string;
  debark_date: string;
  cash_in_total: number;
  cash_out_total: number;
  patron_id: string;
}

export async function generatePatronPDF(patronId: string): Promise<Blob> {
  try {
    // Fetch patron data
    const { data: patron, error: patronError } = await supabase
      .from('patrons')
      .select(`
        *,
        ctrs (
          ctr_id,
          gaming_day,
          ship,
          cash_in_total,
          cash_out_total,
          status
        )
      `)
      .eq('id', patronId)
      .single();

    if (patronError) throw patronError;
    if (!patron) throw new Error('Patron not found');

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(20);
    doc.text('Patron Profile Report', pageWidth / 2, 20, { align: 'center' });

    // Patron Information
    doc.setFontSize(16);
    doc.text('Patron Information', 20, 40);

    doc.setFontSize(12);
    doc.text(`Name: ${patron.first_name} ${patron.last_name}`, 20, 50);
    doc.text(`Date of Birth: ${new Date(patron.date_of_birth).toLocaleDateString()}`, 20, 60);

    // CTR History
    if (patron.ctrs && patron.ctrs.length > 0) {
      doc.setFontSize(16);
      doc.text('CTR History', 20, 80);

      const tableData = patron.ctrs.map((ctr: CTREntry) => [
        new Date(ctr.gaming_day).toLocaleDateString(),
        ctr.ship,
        formatCurrency(ctr.cash_in_total),
        formatCurrency(ctr.cash_out_total),
        ctr.status
      ]);

      (doc as any).autoTable({
        head: [['Date', 'Ship', 'Cash In', 'Cash Out', 'Status']],
        body: tableData,
        startY: 90,
        margin: { left: 20 },
        headStyles: { fillColor: [66, 139, 202] },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Statistics
      const totalCashIn = patron.ctrs.reduce((sum: number, ctr: CTREntry) => sum + ctr.cash_in_total, 0);
      const totalCashOut = patron.ctrs.reduce((sum: number, ctr: CTREntry) => sum + ctr.cash_out_total, 0);
      const avgCashIn = totalCashIn / patron.ctrs.length;
      const avgCashOut = totalCashOut / patron.ctrs.length;

      const finalY = (doc as any).lastAutoTable.finalY || 90;
      
      doc.setFontSize(16);
      doc.text('Statistics', 20, finalY + 20);

      doc.setFontSize(12);
      doc.text(`Total Cash In: ${formatCurrency(totalCashIn)}`, 20, finalY + 30);
      doc.text(`Total Cash Out: ${formatCurrency(totalCashOut)}`, 20, finalY + 40);
      doc.text(`Average Cash In per CTR: ${formatCurrency(avgCashIn)}`, 20, finalY + 50);
      doc.text(`Average Cash Out per CTR: ${formatCurrency(avgCashOut)}`, 20, finalY + 60);
    } else {
      doc.setFontSize(12);
      doc.text('No CTR history found.', 20, 90);
    }

    // Footer
    doc.setFontSize(10);
    const footerText = `Generated on ${new Date().toLocaleString()}`;
    doc.text(
      footerText,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    // Return as blob
    return new Blob([doc.output('blob')], { type: 'application/pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

export async function generateCTRFromTemplate(ctrData: CTRData): Promise<Blob> {
  try {
    // Fetch the CTR template from Supabase storage
    const { data: templateData, error: templateError } = await supabase.storage
      .from('templates')
      .download('CTR_Template.pdf');

    if (templateError) {
      console.error('Error fetching template:', templateError);
      throw templateError;
    }
    if (!templateData) {
      throw new Error('CTR template not found');
    }

    // Convert template data to ArrayBuffer and return as Blob
    const arrayBuffer = await templateData.arrayBuffer();
    const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
    
    // Return the blob without triggering a download
    return blob;
  } catch (error) {
    console.error('Error handling CTR template:', error);
    throw error;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}