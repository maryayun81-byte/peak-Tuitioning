'use client'

import React, { useRef, useState } from 'react'
import { Download, CheckCircle, Sparkles, Loader2, Printer } from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Button } from './ui/Button'

interface ReceiptProps {
  payment: {
    receipt_number: string
    amount: number
    payment_date: string
    method: string
    student_name: string
    week_number?: number | null
    paid_dates?: string | null
    is_published?: boolean
  }
  eventName?: string
  centerName?: string
}

export function Receipt({ payment, eventName, centerName }: ReceiptProps) {
  const receiptRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(false)

  const downloadPDF = async () => {
    if (!receiptRef.current) return
    setDownloading(true)
    
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0)
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Receipt-${payment.receipt_number}.pdf`)
    } catch (err) {
      console.error('Failed to generate PDF:', err)
    } finally {
      setDownloading(false)
    }
  }

  const printReceipt = () => {
    window.print()
  }

  return (
    <div className="flex flex-col items-center max-w-2xl mx-auto w-full">
      {/* Action Bar */}
      <div className="w-full flex justify-end gap-3 mb-6 print:hidden">
        <Button variant="secondary" onClick={printReceipt} className="font-bold">
          <Printer size={16} className="mr-2" /> Print
        </Button>
        <Button onClick={downloadPDF} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" disabled={downloading}>
          {downloading ? <Loader2 className="animate-spin mr-2" size={16} /> : <Download size={16} className="mr-2" />}
          Download PDF
        </Button>
      </div>

      {/* Actual Receipt - This is what gets rendered to PDF */}
      <div 
        ref={receiptRef}
        className="bg-white w-full shadow-2xl relative overflow-hidden"
        style={{ 
          minHeight: '297mm', // A4 aspect ratio approximation in web view
          padding: '40px 50px',
          fontFamily: 'Inter, sans-serif',
          color: '#0f172a'
        }}
      >
        {/* Watermark Background */}
        <div 
          className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0"
          style={{ transform: 'rotate(-45deg)', fontSize: '150px', fontWeight: 900, whiteSpace: 'nowrap' }}
        >
          PEAK PERFORMANCE
        </div>

        {/* Content Container (z-10 to stay above watermark) */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-100 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="text-white w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter text-slate-900">PEAK PERFORMANCE</h1>
                <p className="text-sm font-bold tracking-widest text-slate-400 uppercase mt-1">Official Payment Receipt</p>
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Receipt No.</p>
              <p className="text-xl font-mono font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg">
                {payment.receipt_number}
              </p>
            </div>
          </div>

          {/* Customer & Date Info */}
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Billed To</p>
              <p className="text-lg font-black text-slate-900">{payment.student_name}</p>
              <p className="text-sm font-medium text-slate-500">Student Account</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Payment Date</p>
              <p className="text-base font-bold text-slate-800">{formatDate(payment.payment_date)}</p>
              <div className="flex items-center justify-end gap-1 text-emerald-600 text-sm font-bold mt-2">
                <CheckCircle size={14} /> <span>Paid via {payment.method}</span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="w-full mb-12 flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-900 text-left">
                  <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500">Description</th>
                  <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Period</th>
                  <th className="py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-6">
                    <p className="font-bold text-slate-900">{eventName || 'Tuition Event Fees'}</p>
                    <p className="text-sm text-slate-500 mt-1">{centerName || 'Main Campus'}</p>
                    {payment.paid_dates && (
                      <div className="mt-3 flex flex-wrap gap-1 max-w-xs">
                        {payment.paid_dates.split(',').map(d => (
                          <span key={d} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                            {formatDate(d).slice(0, 6)}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-6 text-center align-top">
                    <span className="inline-flex items-center justify-center bg-slate-50 border border-slate-200 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">
                      Week {payment.week_number || 'N/A'}
                    </span>
                  </td>
                  <td className="py-6 text-right align-top font-mono font-bold text-lg text-slate-900">
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Totals Section */}
          <div className="w-full flex justify-end mb-16">
            <div className="w-64 space-y-4">
              <div className="flex justify-between text-sm font-bold text-slate-500">
                <span>Subtotal</span>
                <span className="font-mono">{formatCurrency(payment.amount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-500 pb-4 border-b border-slate-200">
                <span>Tax</span>
                <span className="font-mono">{formatCurrency(0)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-base font-black uppercase tracking-widest text-slate-900">Total Paid</span>
                <span className="text-2xl font-black font-mono text-emerald-600">{formatCurrency(payment.amount)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-auto pt-8 border-t-2 border-slate-100 text-center space-y-2">
            <p className="text-sm font-bold text-slate-900">Thank you for investing in excellence.</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Peak Performance Tuition • Nairobi, Kenya • support@peaktuition.com
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
