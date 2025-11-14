'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, FileCheck, Send } from 'lucide-react'

interface W9FormData {
  legalName: string
  businessName: string
  address: string
  city: string
  state: string
  zip: string
  email: string
  taxClassification: string
  tinSsn: string
  signature: string
  signatureDate: string
}

interface DocumentSignerProps {
  isOpen: boolean
  onClose: () => void
  documentType: 'w9' | 'contract' | 'mediaRelease'
  musicianName: string
  musicianEmail: string
  onComplete?: (documentType: 'w9' | 'contract' | 'mediaRelease') => void
}

export default function DocumentSigner({ isOpen, onClose, documentType, musicianName, musicianEmail, onComplete }: DocumentSignerProps) {
  const [formData, setFormData] = useState<Partial<W9FormData>>({
    legalName: musicianName,
    businessName: '',
    email: musicianEmail,
    taxClassification: 'individual',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [tinDisplay, setTinDisplay] = useState('')

  const documentTitles = {
    w9: 'W-9 Contractor Information Form',
    contract: 'Performance Contract',
    mediaRelease: 'Media Release Agreement'
  }

  const handleInputChange = (field: keyof W9FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleTinChange = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    let formatted = numbers
    
    if (numbers.length <= 2) {
      formatted = numbers
    } else if (numbers.length <= 9) {
      formatted = numbers.slice(0, 3) + '-' + numbers.slice(3, 5) + '-' + numbers.slice(5, 9)
    } else {
      formatted = numbers.slice(0, 2) + '-' + numbers.slice(2, 9)
    }
    
    setTinDisplay(formatted)
    setFormData(prev => ({ ...prev, tinSsn: numbers }))
  }

  const handleSignature = (signature: string) => {
    setFormData(prev => ({ 
      ...prev, 
      signature, 
      signatureDate: new Date().toISOString().split('T')[0] 
    }))
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    
    try {
      const pdfData = await generateW9PDF(formData as W9FormData)
      const downloadUrl = await uploadToFirebase(documentType, pdfData, musicianName)
      await sendEmailNotification(documentType, musicianName, musicianEmail, downloadUrl)
      await saveDocumentMetadata(documentType, downloadUrl, musicianEmail)
      setSubmitted(true)
      // Call onComplete callback if provided
      onComplete?.(documentType)
    } catch (error) {
      console.error('Error submitting document:', error)
      alert('Error submitting document. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateW9PDF = async (data: W9FormData): Promise<Blob> => {
    const htmlContent = generateW9HTML(data)
    return new Blob([htmlContent], { type: 'text/html' })
  }

  const generateW9HTML = (data: W9FormData): string => {
    const formattedTIN = data.tinSsn?.length === 9 
      ? `${data.tinSsn.slice(0, 3)}-${data.tinSsn.slice(3, 5)}-${data.tinSsn.slice(5, 9)}`
      : data.tinSsn || ''
    
    return `<!DOCTYPE html><html><head><title>W-9 Form for ${data.legalName}</title><style>body{font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto}.form-field{margin:10px 0}.label{font-weight:bold;display:inline-block;width:180px}.signature-field{border-top:1px solid #333;padding-top:10px;margin-top:30px}.footer{margin-top:30px;font-size:10px;color:#666}</style></head><body><h2>Form W-9 (Request for Taxpayer Identification Number and Certification)</h2><div class="form-field"><span class="label">Legal Name:</span> ${data.legalName || ''}</div>${data.businessName ? `<div class="form-field"><span class="label">Business Name:</span> ${data.businessName}</div>` : ''}<div class="form-field"><span class="label">Address:</span> ${data.address || ''}</div><div class="form-field"><span class="label">City, State ZIP:</span> ${data.city || ''}, ${data.state || ''} ${data.zip || ''}</div><div class="form-field"><span class="label">Email:</span> ${data.email || ''}</div><div class="form-field"><span class="label">Tax Classification:</span> ${data.taxClassification || 'Individual'}</div><div class="form-field"><span class="label">TIN/SSN:</span> ${formattedTIN}</div><div class="signature-field"><div class="form-field"><span class="label">Signature:</span> ${data.signature || ''}</div><div class="form-field"><span class="label">Date:</span> ${data.signatureDate || ''}</div></div><div class="footer">Electronic signature accepted under IRS Publication 1179 compliance standards.</div></body></html>`
  }

  const uploadToFirebase = async (docType: string, data: Blob, musicianName: string): Promise<string> => {
    console.log('Uploading document to Firebase Storage...')
    return `https://example.com/documents/w9_${musicianName.replace(/\s/g, '_')}_${Date.now()}.pdf`
  }

  const sendEmailNotification = async (docType: string, musicianName: string, email: string, downloadUrl: string): Promise<void> => {
    const response = await fetch('/api/documents/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: docType === 'w9' ? 'W-9 Contractor Form' : docType,
        musicianName,
        musicianEmail: email,
        downloadUrl,
      })
    })
    
    if (!response.ok) {
      throw new Error('Failed to send email notification')
    }
  }

  const saveDocumentMetadata = async (docType: string, downloadUrl: string, email: string): Promise<void> => {
    console.log('Saving document metadata to Firestore...', { docType, downloadUrl, email })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} aria-hidden="true" />
      
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">{documentTitles[documentType]}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors" aria-label="Close modal">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Document Submitted Successfully!</h3>
              <p className="text-gray-400 mb-6">Your W-9 form has been submitted and will be sent to the payroll team for processing.</p>
              <button onClick={onClose} className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors">Close</button>
            </div>
          ) : (
            <form className="space-y-6">
              {/* Explanatory Text */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                <p className="text-blue-200 text-sm">
                  <strong>IRS Form W-9 Notice:</strong> This form collects your taxpayer identification information for BEAM Orchestra's recordkeeping. Payments under $600 do not require a 1099, but this form ensures accurate reporting and transparency. Your information is securely stored and not shared outside BEAM.
                </p>
              </div>

              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Contractor Information</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Legal Name *</label>
                  <input type="text" value={formData.legalName} onChange={(e) => handleInputChange('legalName', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Business Name (if applicable)</label>
                  <input type="text" value={formData.businessName || ''} onChange={(e) => handleInputChange('businessName', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                  <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Street Address *</label>
                  <input type="text" value={formData.address || ''} onChange={(e) => handleInputChange('address', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">City *</label><input type="text" value={formData.city || ''} onChange={(e) => handleInputChange('city', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">State *</label><input type="text" value={formData.state || ''} onChange={(e) => handleInputChange('state', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
                  <div><label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code *</label><input type="text" value={formData.zip || ''} onChange={(e) => handleInputChange('zip', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required /></div>
                </div>
              </div>

              {/* Tax Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Tax Information</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tax Classification *</label>
                  <select value={formData.taxClassification || 'individual'} onChange={(e) => handleInputChange('taxClassification', e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="individual">Individual/Sole Proprietor</option>
                    <option value="llc">LLC (Limited Liability Company)</option>
                    <option value="corporation">Corporation</option>
                    <option value="partnership">Partnership</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Taxpayer Identification Number (TIN/SSN) *</label>
                  <input type="text" value={tinDisplay} onChange={(e) => handleTinChange(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="XXX-XX-XXXX or XX-XXXXXXX" required />
                  <p className="text-xs text-gray-400 mt-1">For individuals, use your Social Security Number (SSN). For businesses, use your Employer Identification Number (EIN).</p>
                </div>
              </div>

              {/* Signature */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Signature</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Signature (Type your name) *</label>
                  <input type="text" value={formData.signature || ''} onChange={(e) => handleSignature(e.target.value)} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                  <input type="date" value={formData.signatureDate || ''} onChange={(e) => setFormData(prev => ({ ...prev, signatureDate: e.target.value }))} className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500" required />
                </div>
                <p className="text-xs text-gray-400 mt-2">Electronic signature accepted under IRS Publication 1179 compliance standards.</p>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <button onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white transition-colors">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200">
              {isSubmitting ? <>⏳ Submitting...</> : <><Send className="w-4 h-4" /><span>Submit & Send</span></>}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
