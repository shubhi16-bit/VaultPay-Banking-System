import PDFDocument from 'pdfkit';
import crypto from 'crypto';
import { TransactionService } from './transaction.service.js';

export class ReceiptService {
  /**
   * Fetch transaction receipt data and augment with verification hash & receipt number
   */
  static async getReceiptData(userId, transactionIdentifier) {
    const tx = await TransactionService.getTransactionById(userId, transactionIdentifier);

    // Generate cryptographic verification hash for authenticity simulation
    const hashData = `${tx.referenceId}|${tx.amount}|${tx.createdAt}|${tx.status}`;
    const verificationHash = crypto.createHash('sha256').update(hashData).digest('hex').substring(0, 32).toUpperCase();

    return {
      ...tx,
      receiptNumber: `REC-${tx.referenceId}`,
      verificationHash,
      issuedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate vector-rendered PDF receipt and pipe to response stream
   */
  static generateReceiptPdf(receipt, outputStream) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 45,
          info: {
            Title: `VaultPay Receipt - ${receipt.referenceId}`,
            Author: 'VaultPay Digital Banking System',
            Subject: 'Transaction Payment Receipt',
          },
        });

        doc.on('error', reject);
        outputStream.on('finish', resolve);
        outputStream.on('error', reject);

        doc.pipe(outputStream);

        // Header Background Banner
        doc.rect(45, 45, 505, 75).fill('#0f172a');

        // Brand Title
        doc.fontSize(22).font('Helvetica-Bold').fillColor('#ffffff').text('VaultPay', 65, 60);
        doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text('Digital Banking & Transaction Management System', 65, 88);

        // Receipt Pill
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#38bdf8').text('PAYMENT RECEIPT', 380, 72, { align: 'right' });

        // Status Badge & Amount Card
        const isSuccess = receipt.status === 'completed';
        const statusColor = isSuccess ? '#16a34a' : '#dc2626';

        doc.rect(45, 135, 505, 110).fillAndStroke('#f8fafc', '#e2e8f0');

        doc.fontSize(11).font('Helvetica-Bold').fillColor(statusColor).text(`● ${receipt.status.toUpperCase()}`, 65, 150);

        const formattedAmount = `INR ${receipt.amount.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        doc.fontSize(28).font('Helvetica-Bold').fillColor('#0f172a').text(formattedAmount, 65, 172);

        doc.fontSize(10).font('Helvetica').fillColor('#64748b').text(
          `Transaction Type: ${receipt.type === 'deposit' ? 'Simulated Demo Deposit' : 'Instant P2P Transfer'}`,
          65,
          212
        );

        // Transaction Metadata Section
        let yPos = 265;
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text('Transaction Details', 45, yPos);
        yPos += 20;

        doc.moveTo(45, yPos).lineTo(550, yPos).strokeColor('#cbd5e1').stroke();
        yPos += 15;

        const printRow = (label, value) => {
          doc.fontSize(10).font('Helvetica-Bold').fillColor('#475569').text(label, 45, yPos, { width: 150 });
          doc.fontSize(10).font('Helvetica').fillColor('#0f172a').text(String(value || 'N/A'), 200, yPos, { width: 350 });
          yPos += 22;
        };

        printRow('Reference ID', receipt.referenceId);
        printRow('Receipt Number', receipt.receiptNumber);
        printRow('Date & Time', new Date(receipt.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
        printRow('Payment Note', receipt.note || 'None');
        if (receipt.failureReason) {
          printRow('Failure Reason', receipt.failureReason);
        }

        yPos += 10;
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text('Transfer Information', 45, yPos);
        yPos += 20;
        doc.moveTo(45, yPos).lineTo(550, yPos).strokeColor('#cbd5e1').stroke();
        yPos += 15;

        // Paid By (Sender)
        const senderName = receipt.sender?.fullName || 'VaultPay Treasury';
        const senderVpa = receipt.sender?.vaultpayId || 'treasury@vaultpay';
        const senderBank = receipt.sender?.bankName || 'Simulated Central Reserve';
        const senderAcc = receipt.sender?.maskedAccountNumber || 'Simulated Reserve Pool';
        printRow('Paid By (Sender)', `${senderName} (${senderVpa})`);
        printRow('Sender Bank', `${senderBank} [${senderAcc}]`);

        // Paid To (Recipient)
        const recipientName = receipt.recipient?.fullName || 'VaultPay User';
        const recipientVpa = receipt.recipient?.vaultpayId || 'unknown@vaultpay';
        const recipientBank = receipt.recipient?.bankName || 'Partner Bank';
        const recipientAcc = receipt.recipient?.maskedAccountNumber || 'N/A';
        printRow('Paid To (Recipient)', `${recipientName} (${recipientVpa})`);
        printRow('Recipient Bank', `${recipientBank} [${recipientAcc}]`);

        // Ledger & Security Verification Section
        yPos += 10;
        doc.fontSize(13).font('Helvetica-Bold').fillColor('#1e293b').text('Audit & Ledger Verification', 45, yPos);
        yPos += 20;
        doc.moveTo(45, yPos).lineTo(550, yPos).strokeColor('#cbd5e1').stroke();
        yPos += 15;

        printRow('Bookkeeping Mode', 'Balanced Double-Entry General Ledger');
        printRow('Verification Hash', receipt.verificationHash);
        if (receipt.ledgerEntries && receipt.ledgerEntries.length > 0) {
          const firstEntry = receipt.ledgerEntries[0];
          printRow('Ledger Entry Ref', `Entry #${firstEntry.entryId} (${firstEntry.entryType.toUpperCase()})`);
          printRow('Balance After', `INR ${firstEntry.balanceAfter.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`);
        }

        // Regulatory & Academic Disclaimer Footer
        doc.rect(45, 710, 505, 55).fill('#f1f5f9');
        doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b').text('SIMULATED DIGITAL BANKING RECEIPT', 55, 718);
        doc.fontSize(8).font('Helvetica').fillColor('#94a3b8').text(
          'VaultPay is an educational simulation for demonstration and B.Tech RDBMS portfolio purposes only. No real fiat money, banks, or payment gateways are involved.',
          55,
          730,
          { width: 485 }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}
