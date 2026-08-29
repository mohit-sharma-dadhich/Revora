import { AlertCircle, CheckCircle2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader } from './ui/card'

interface FileSelectState {
  customers: File | null
  products: File | null
  orders: File | null
}

interface DataImportPanelProps {
  onImport: (files: FormData) => Promise<unknown>
  isLoading?: boolean
  onSuccess?: () => void
}

const MIN_FILE_SIZE = 1; // 1 KB
const MAX_FILE_SIZE = 5 * 1024; // 5 MB in KB

const CSV_EXAMPLES = {
  customers: `externalId,name,email,segment
cust_001,Aarav Sharma,aarav@gmail.com,High Value
cust_002,Neha Patel,neha@yahoo.com,Frequent Buyer`,
  products: `externalId,name,category,price
prod_001,Running Shoes,Footwear,79900
prod_002,Sports Socks,Accessories,12900`,
  orders: `externalId,customerExternalId,productExternalIds,amount,status,createdAt
order_001,cust_001,prod_001|prod_002,92800,completed,2026-08-01`,
}

function downloadExample(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function DataImportPanel({ onImport, isLoading = false, onSuccess }: DataImportPanelProps) {
  const [files, setFiles] = useState<FileSelectState>({
    customers: null,
    products: null,
    orders: null,
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ customersImported: number; productsImported: number; ordersImported: number } | null>(null)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const productInputRef = useRef<HTMLInputElement>(null)
  const orderInputRef = useRef<HTMLInputElement>(null)

  function validateFile(file: File): string | null {
    const sizeInKB = file.size / 1024
    if (sizeInKB < MIN_FILE_SIZE) {
      return `${file.name} is too small. Minimum size is ${MIN_FILE_SIZE} KB.`
    }
    if (sizeInKB > MAX_FILE_SIZE) {
      return `${file.name} is too large. Maximum size is ${MAX_FILE_SIZE / 1024} MB.`
    }
    if (!file.name.endsWith('.csv')) {
      return `${file.name} must be a CSV file.`
    }
    return null
  }

  function handleFileChange(field: keyof FileSelectState, file: File | null) {
    setError(null)
    setSuccess(null)
    if (file) {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    setFiles((current) => ({ ...current, [field]: file }))
  }

  async function handleImport() {
    setError(null)
    setSuccess(null)

    if (!files.customers || !files.products || !files.orders) {
      setError('All three CSV files (customers, products, orders) are required.')
      return
    }

    const formData = new FormData()
    formData.append('customers', files.customers)
    formData.append('products', files.products)
    formData.append('orders', files.orders)

    try {
      const result = await onImport(formData)
      if (result && typeof result === 'object' && 'customersImported' in result) {
        setSuccess(result as { customersImported: number; productsImported: number; ordersImported: number })
        setFiles({ customers: null, products: null, orders: null })
        if (customerInputRef.current) customerInputRef.current.value = ''
        if (productInputRef.current) productInputRef.current.value = ''
        if (orderInputRef.current) orderInputRef.current.value = ''
        if (onSuccess) onSuccess()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed. Please check your CSV files and try again.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <Upload size={17} className="text-emerald" />
          <div>
            <p className="text-sm font-medium text-white">Upload merchant data</p>
            <p className="mt-1 text-xs text-muted">Import customers, products, and orders from CSV files. Each file must be between 1 KB and 5 MB.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && (
          <div className="flex gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-300" />
            <div className="text-sm text-red-300 whitespace-pre-wrap">{error}</div>
          </div>
        )}

        {success && (
          <div className="flex gap-3 rounded-lg border border-emerald/20 bg-emerald/[0.05] p-4">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald" />
            <div className="text-sm text-emerald">
              Successfully imported {success.customersImported} customers, {success.productsImported} products, and {success.ordersImported} orders.
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          {(['customers', 'products', 'orders'] as const).map((field) => (
            <div key={field}>
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">{field}.csv</p>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line bg-white/[0.02] p-4 transition-colors hover:border-emerald/50 hover:bg-emerald/[0.02]">
                <Upload size={20} className="text-muted" />
                <span className="text-xs font-medium text-slate-200">
                  {files[field] ? files[field]!.name : 'Choose file'}
                </span>
                <span className="text-[10px] text-muted">CSV only</span>
                <input
                  ref={field === 'customers' ? customerInputRef : field === 'products' ? productInputRef : orderInputRef}
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleFileChange(field, e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <button
                type="button"
                onClick={() => downloadExample(`${field}.csv`, CSV_EXAMPLES[field])}
                className="mt-2 text-[11px] text-emerald hover:underline"
              >
                Download example
              </button>
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-white/[0.03] p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.12em] text-muted">CSV format reference</p>
          <div className="space-y-2 text-[11px] text-slate-300 font-mono">
            <div>
              <p className="font-medium text-slate-200">Customers: externalId, name, email, segment</p>
              <p className="text-muted">Email must be valid. Segment can be any string.</p>
            </div>
            <div className="mt-2">
              <p className="font-medium text-slate-200">Products: externalId, name, category, price</p>
              <p className="text-muted">Price must be a non-negative integer in paise (e.g., 79900 for ₹799).</p>
            </div>
            <div className="mt-2">
              <p className="font-medium text-slate-200">Orders: externalId, customerExternalId, productExternalIds, amount, status, createdAt</p>
              <p className="text-muted">
                productExternalIds use pipe separator (prod_001|prod_002). Status: completed, failed, pending, cancelled. Amount in paise. Date format: YYYY-MM-DD.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleImport}
          disabled={!files.customers || !files.products || !files.orders || isLoading}
          className="w-full"
        >
          {isLoading ? 'Importing...' : 'Import data'}
        </Button>
      </CardContent>
    </Card>
  )
}
