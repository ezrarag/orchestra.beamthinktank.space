'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, FileCheck, Download, Send } from 'lucide-react'

interface W4FormData {
  firstName: string
  lastName: string
  middleName: string
  address: string
  city: string
  state: string
  zip: string
  ssn: string
  filingStatus: string
  allowances: string
  additionalWithholding: string
  claimExempt: boolean
  signature: string
  signatureDate: string
}

interface DocumentSignerProps {
  isOpen: boolean
  onClose: () => void
  documentType: 'w4' | 'contract' | 'mediaRelease'
  musicianName: string
  musicianEmail: string
}

export default function DocumentSigner({ isOpen, onClose, documentType, musicianName, musicianEmail }: DocumentSignerProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<Partial<W4FormData>>({
    firstName: musicianName.split(' ')[0] || '',
    lastName: musicianName.split(' ').slice(1).join(' ') || '',
    filingStatus: 'single',
    allowances: '0',
    additionalWithholding: '',
    claimExempt: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const documentTitles = {
    w4: 'W-4 Employee Withholding Certificate',
    contract: 'Performance Contract',
    mediaRelease: 'Media Release Agreement'
  }

  const handleInputChange = (field: keyof W4FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
      // Create PDF document
      const pdfData = await generateW4PDF(formData as W4FormData)
      
      // Upload to Firebase Storage
      const downloadUrl = await uploadToFirebase(documentType, pdfData, musicianName)
      
      // Send email notification
      await sendEmailNotification(documentType, musicianName, musicianEmail, downloadUrl)
      
      // Save metadata to Firestore
      await saveDocumentMetadata(documentType, downloadUrl, musicianEmail)
      
      setSubmitted(true)
    } catch (error) {
      console.error('Error submitting document:', error)
      alert('Error submitting document. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateW4PDF = async (data: W4FormData): Promise<Blob> => {
    // This would use a library like jsPDF or pdf-lib to generate the PDF
    // For now, we'll create a simple form that can be printed/exported
    const htmlContent = generateW4HTML(data)
    
    // Return as blob for now - in production, use proper PDF generation
    return new Blob([htmlContent], { type: 'text/html' })
  }

  const generateW4HTML = (data: W4FormData): string => {
    return `
<!DOCTYPE html>
<html>
<head>
  <title>W-4 Form for ${data.firstName} ${data.lastName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .form-field { margin: 5px 0; }
    .label { font-weight: bold; }
  </style>
</head>
<body>
  <h2>Form W-4 (2025)</h2>
  <div class="form-field">
    <span class="label">Name:</span> ${data.firstName} ${data.middleName} ${data.lastName}
  </div>
  <div class="form-field">
    <span class="label">Address:</span> ${data.address}
  </div>
  <div class="form-field">
    <span class="label">City, State ZIP:</span> ${data.city}, ${data.state} ${data.zip}
  </div>
  <div class="form-field">
    <span class="label">Social Security Number:</span> ${data.ssn}
  </div>
  <div class="form-field">
    <span class="label">Filing Status:</span> ${data.filingStatus}
  </div>
  <div class="form-field">
    <span class="label">Allowances:</span> ${data.allowances}
  </div>
  <div class="form-field">
    <span class="label">Additional Withholding:</span> ${data.additionalWithholding}
  </div>
  <div class="form-field">
    <span class="label">Claim Exempt:</span> ${data.claimExempt ? 'Yes' : 'No'}
  </div>
  <div class="form-field">
    <span class="label">Signature:</span> ${data.signature}
  </div>
  <div class="form-field">
    <span class="label">Date:</span> ${data.signatureDate}
  </div>
</body>
</html>
    `
  }

  const uploadToFirebase = async (docType: string, data: Blob, musicianName: string): Promise<string> => {
    // This would upload to Firebase Storage
    // For now, return a placeholder URL
    console.log('Uploading document to Firebase Storage...')
    return `https://example.com/documents/${docType}_${musicianName.replace(/\s/g, '_')}_${Date.now()}.pdf`
  }

  const sendEmailNotification = async (docType: string, musicianName: string, email: string, downloadUrl: string): Promise<void> => {
    const response = await fetch('/api/documents/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentType: docType,
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
    // Save to Firestore
    console.log('Saving document metadata to Firestore...', { docType, downloadUrl, email })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
        aria-hidden="true"
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <FileCheck className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">{documentTitles[documentType]}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileCheck className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Document Submitted Successfully!</h3>
              <p className="text-gray-400 mb-6">
                Your W-4 form has been submitted and will be sent to the payroll team for processing.
              </p>
              <button
                onClick={onClose}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <form className="space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">First Name *</label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Last Name *</label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Middle Name / Initial</label>
                  <input
                    type="text"
                    value={formData.middleName || ''}
                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Address</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Street Address *</label>
                  <input
                    type="text"
                    value={formData.address || ''}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">City *</label>
                    <input
                      type="text"
                      value={formData.city || ''}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">State *</label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">ZIP Code *</label>
                    <input
                      type="text"
                      value={formData.zip || ''}
                      onChange={(e) => handleInputChange('zip', e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Tax Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Tax Information</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Social Security Number *</label>
                  <input
                    type="text"
                    value={formData.ssn || ''}
                    onChange={(e) => handleInputChange('ssn', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="XXX-XX-XXXX"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Filing Status *</label>
                  <select
                    value={formData.filingStatus || 'single'}
                    onChange={(e) => handleInputChange('filingStatus', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="single">Single</option>
                    <option value="married">Married filing jointly</option>
                    <option value="marriedSeparate">Married filing separately</option>
                    <option value="headOfHousehold">Head of household</option>
                  </select>
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Number of Allowances *</label>
                  <input
                    type="number"
                    value={formData.allowances || '0'}
                    onChange={(e) => handleInputChange('allowances', e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="claimExempt"
                    checked={formData.claimExempt || false}
                    onChange={(e) => handleInputChange('claimExempt', e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                  />
                  <label htmlFor="claimExempt" className="text-sm text-gray-300">
                    Claim exempt (ensure you are legally exempt)
                  </label>
                </div>
              </div>

              {/* Signature */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Signature</h3>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Signature (Type your name) *</label>
                  <input
                    type="text"
                    value={formData.signature || ''}
                    onChange={(e) => handleSignature(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Date *</label>
                  <input
                    type="date"
                    value={formData.signatureDate || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, signatureDate: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-between p-6 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:opacity-50 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-200"
            >
              {isSubmitting ? (
                <>⏳ Submitting...</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit & Send</span>
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

