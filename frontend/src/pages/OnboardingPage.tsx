import { motion } from 'framer-motion'
import { RotateCcw, Upload } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader } from '../components/ui/card'
import { DataImportPanel } from '../components/DataImportPanel'
import { useImportMerchantData } from '../lib/apiHooks'

export function OnboardingPage() {
  const navigate = useNavigate()
  const importMutation = useImportMerchantData()
  const [showImportPanel, setShowImportPanel] = useState(true)

  async function handleImport(files: FormData) {
    return importMutation.mutateAsync(files)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="max-w-4xl space-y-5"
    >
      <div>
        <div className="mb-4 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.16em] text-emerald">
          <Upload size={15} />
          Onboarding
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.045em] text-white sm:text-4xl">
          Get started with your data
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          Import your customers, products, and historical orders to begin discovering revenue growth opportunities.
        </p>
      </div>

      {showImportPanel && (
        <DataImportPanel
          onImport={handleImport}
          isLoading={importMutation.isPending}
          onSuccess={() => {
            setShowImportPanel(false)
          }}
        />
      )}

      {!showImportPanel && importMutation.isSuccess && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="space-y-5"
        >
          <Card className="border-emerald/20 bg-emerald/[0.05]">
            <CardHeader>
              <p className="text-sm font-medium text-white">Import successful!</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted">Customers imported</p>
                <p className="mt-1 text-2xl font-semibold text-emerald">
                  {importMutation.data?.customersImported || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Products imported</p>
                <p className="mt-1 text-2xl font-semibold text-emerald">
                  {importMutation.data?.productsImported || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted">Orders imported</p>
                <p className="mt-1 text-2xl font-semibold text-emerald">
                  {importMutation.data?.ordersImported || 0}
                </p>
              </div>
              <Button onClick={() => navigate('/opportunity')} className="w-full mt-4">
                Start discovering opportunities
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {!showImportPanel && !importMutation.isSuccess && (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center p-6">
            <div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.04] text-muted">
              <RotateCcw size={21} />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-white">Import another dataset?</h2>
            <p className="mt-2 max-w-md text-sm text-muted">
              You can import additional data or replace your current dataset.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setShowImportPanel(true)
                importMutation.reset()
              }}
            >
              Import new data
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-dashed border-amber-500/25 bg-amber-500/[0.03]">
        <CardContent className="pt-6">
          <p className="text-sm font-medium text-amber-200">Or continue with demo data</p>
          <p className="mt-2 text-sm text-amber-100/70">
            If you'd like to explore Revora without importing your own data, you can use our seeded demo dataset.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/opportunity')}
          >
            Use demo data
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}
