export interface Opportunity {
  baseProductId: string
  relatedProductId: string
  baseCustomerCount: number
  coPurchaseCustomerCount: number
  affinity: number
  estimatedEligibleCustomers: number
  opportunityScore: number
}

export interface RecommendationFacts {
  baseProductId: string
  relatedProductId: string
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
}

export interface ApiResponse<T> {
  success: boolean
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: string
}
