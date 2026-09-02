export interface Opportunity {
  baseProductId: string
  relatedProductId: string
  baseProductName?: string | null
  relatedProductName?: string | null
  baseCustomerCount: number
  coPurchaseCustomerCount: number
  affinity: number
  estimatedEligibleCustomers: number
  opportunityScore: number
}

export interface RecommendationFacts {
  baseProductId: string
  relatedProductId: string
  baseProductName?: string | null
  relatedProductName?: string | null
  baseCustomerCount: number
  coPurchaseCustomerCount: number
  affinity: number
  estimatedEligibleCustomers: number
  opportunityScore: number
}

export interface RecommendationEvidence {
  baseProductId: string
  relatedProductId: string
  affinity: number
  eligibleCustomers: number
  opportunityScore: number
}

export interface Recommendation {
  facts: RecommendationFacts
  reasoning: string
  recommendation: string
  confidence: number
  evidence: RecommendationEvidence
}

export interface OpportunityResponseData {
  opportunity: Opportunity | null
  recommendation: Recommendation | null
  aiAvailable: boolean
  aiError: string | null
  usedPrivateDataOnly: boolean
  diagnostic: {
    audienceBlocked: boolean
    bestUnqualifiedAffinity: number | null
    bestUnqualifiedBaseCustomers: number | null
  }
}

export interface GuardrailCheck {
  name: string
  passed: boolean
  reason: string
}

export interface Guardrails {
  passed: boolean
  checks: GuardrailCheck[]
}

export interface ExperimentProposal {
  strategy: string
  baseProductId: string
  targetProductId: string
  eligibleCustomerCount: number
  proposedAudienceSize: number
  maximumAudienceSize: number
  treatmentPercentage: number
  controlCustomerIds: string[]
  treatmentCustomerIds: string[]
  status: string
  decision: string
}

export interface ExperimentSummary {
  id: string
  strategy: string
  targetProductId: string
  status: string
  decision: string
}

export interface ProposeExperimentResponseData {
  opportunity: Opportunity | null
  proposal: ExperimentProposal | null
  guardrails: Guardrails
  experiment: ExperimentSummary | null
}

export interface MeasurementGroup {
  audienceSize: number
  convertedCustomerCount: number
  conversionRate: number
  totalRevenue: number
  averageOrderValue: number
}

export interface MeasurementIncremental {
  revenuePerCustomerControl: number
  revenuePerCustomerTreatment: number
  incrementalRevenuePerEligibleCustomer: number
  revenueUpliftPercent: number | null
}

export interface ExperimentMeasurement {
  control: MeasurementGroup
  treatment: MeasurementGroup
  incremental: MeasurementIncremental
}

export interface DecisionCheck {
  name: string
  passed: boolean
  reason: string
}

export interface ExperimentResults {
  measurement?: ExperimentMeasurement
  decisionChecks?: DecisionCheck[]
  guardrails?: Guardrails
  [key: string]: unknown
}

export interface Experiment {
  id: string
  strategy: string
  targetProductId: string | null
  status: string
  controlCustomerIds: string[]
  treatmentCustomerIds: string[]
  startAt: string | null
  endAt: string | null
  results: ExperimentResults
  decision: string
  createdAt: string | null
  updatedAt: string | null
}

export interface CreatePaymentOrderRequest {
  experimentId: string
  customerId: string
}

export interface CreatePaymentOrderResponseData {
  orderId: string
  amount: number
  currency: string
  keyId: string
  experimentId: string
  group: string
}

export interface VerifyPaymentRequest {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

export interface PaymentResponseData {
  orderId: string
  paymentId: string
  status: string
  experimentId: string
  customerId: string
  group: string
}

export interface ProposeExperimentParams {
  minEligibleAudience?: number
  maxExposurePercent?: number
  treatmentPercent?: number
  strategy?: string
  opportunity?: Opportunity
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
}

export interface AuthSession {
  token: string
  sessionId: string
  mode: 'test' | 'live'
  expiresAt: string
  user: AuthUser | null
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  actor: string
  action: string
  status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'PENDING'
  reason: string | null
  metadata: Record<string, unknown>
}

export interface AuditLogResponseData {
  entries: AuditLogEntry[]
  total: number
  limit: number
  skip: number
}

export interface PaymentAuditStep {
  stepType: string
  status: 'SUCCESS' | 'FAILED'
  reason: string | null
  metadata: Record<string, unknown>
  timestamp: string
}

export interface PaymentAudit {
  id: string
  razorpayOrderId: string | null
  razorpayPaymentId: string | null
  status: 'paid' | 'failed' | 'pending' | string
  amount: number
  experimentId: string | null
  experimentGroup: string | null
  customerId: string | null
  createdAt: string
  steps: PaymentAuditStep[]
}

export interface PaymentAuditResponseData {
  payments: PaymentAudit[]
  total: number
  limit: number
  skip: number
}

export interface ImportResult {
  customersImported: number
  productsImported: number
  ordersImported: number
  errors: string[]
}

export interface AgentStep {
  stepType: 'analytics_selection' | 'data_inspection' | 'opportunity_identification' | 'ai_reasoning' | 'recommendation_generation' | 'guardrail_check'
  toolName?: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  summary?: string
  inputSummary?: Record<string, unknown>
  outputSummary?: Record<string, unknown>
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface AgentRun {
  _id: string
  runType: 'opportunity_discovery' | 'experiment_proposal' | 'result_analysis'
  status: 'running' | 'completed' | 'failed'
  goal: string
  summary?: string
  finalRecommendation?: string
  error?: string
  steps: AgentStep[]
  startedAt: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
