import type {
  ApiErrorResponse,
  AuthSession,
  ApiResponse,
  AuditLogResponseData,
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  Experiment,
  ImportResult,
  OpportunityResponseData,
  PaymentResponseData,
  ProposeExperimentParams,
  ProposeExperimentResponseData,
  VerifyPaymentRequest,
} from './types'

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(message: string, status: number, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function getApiBaseUrl(): string {
  const baseUrl = import.meta.env.VITE_API_BASE_URL

  if (!baseUrl) {
    throw new ApiError('VITE_API_BASE_URL is not configured', 0)
  }

  return baseUrl.replace(/\/$/, '')
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()

  if (!text) {
    return null
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function getErrorMessage(body: unknown, statusText: string): string {
  if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
    return body.error
  }

  return statusText || 'Request failed'
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('revora_session_token')
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  const body = await parseBody(response)

  if (!response.ok) {
    throw new ApiError(getErrorMessage(body, response.statusText), response.status, body)
  }

  if (!body || typeof body !== 'object' || !('success' in body)) {
    throw new ApiError('Backend returned an invalid response envelope', response.status, body)
  }

  if (!(body as { success: boolean }).success) {
    const errorBody = body as Partial<ApiErrorResponse>
    throw new ApiError(typeof errorBody.error === 'string' ? errorBody.error : 'Request failed', response.status, body)
  }

  return (body as ApiResponse<T>).data
}

export function createTestSession(): Promise<AuthSession> {
  return request<AuthSession>('/auth/test-session', { method: 'POST' })
}

export function signIn(email: string, password: string): Promise<AuthSession> {
  return request<AuthSession>('/auth/signin', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export function signUp(name: string, email: string, password: string): Promise<AuthSession> {
  return request<AuthSession>('/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) })
}

function queryString(params?: ProposeExperimentParams): string {
  if (!params) return ''

  const search = new URLSearchParams()
  if (params.minEligibleAudience !== undefined) search.set('minEligibleAudience', String(params.minEligibleAudience))
  if (params.maxExposurePercent !== undefined) search.set('maxExposurePercent', String(params.maxExposurePercent))
  if (params.treatmentPercent !== undefined) search.set('treatmentPercent', String(params.treatmentPercent))
  if (params.strategy !== undefined) search.set('strategy', params.strategy)
  const value = search.toString()
  return value ? `?${value}` : ''
}

export function getOpportunities(): Promise<OpportunityResponseData> {
  return request<OpportunityResponseData>('/opportunities')
}

export function proposeExperiment(params?: ProposeExperimentParams): Promise<ProposeExperimentResponseData> {
  return request<ProposeExperimentResponseData>(`/experiments/propose${queryString(params)}`, { method: 'POST' })
}

export function getExperiment(id: string): Promise<Experiment> {
  return request<Experiment>(`/experiments/${encodeURIComponent(id)}`)
}

export function startExperiment(id: string): Promise<Experiment> {
  return request<Experiment>(`/experiments/${encodeURIComponent(id)}/start`, { method: 'POST' })
}

export function completeExperiment(id: string): Promise<Experiment> {
  return request<Experiment>(`/experiments/${encodeURIComponent(id)}/complete`, { method: 'POST', body: JSON.stringify({}) })
}

export function createPaymentOrder(payload: CreatePaymentOrderRequest): Promise<CreatePaymentOrderResponseData> {
  return request<CreatePaymentOrderResponseData>('/payments/create-order', { method: 'POST', body: JSON.stringify(payload) })
}

export function verifyPayment(payload: VerifyPaymentRequest): Promise<PaymentResponseData> {
  return request<PaymentResponseData>('/payments/verify', { method: 'POST', body: JSON.stringify(payload) })
}

interface GetAuditLogParams {
  limit?: number
  skip?: number
  action?: string
  status?: string
}

function auditQueryString(params?: GetAuditLogParams): string {
  if (!params) return ''

  const search = new URLSearchParams()
  if (params.limit !== undefined) search.set('limit', String(params.limit))
  if (params.skip !== undefined) search.set('skip', String(params.skip))
  if (params.action !== undefined) search.set('action', params.action)
  if (params.status !== undefined) search.set('status', params.status)
  const value = search.toString()
  return value ? `?${value}` : ''
}

export function getAuditLog(params?: GetAuditLogParams): Promise<AuditLogResponseData> {
  return request<AuditLogResponseData>(`/audit${auditQueryString(params)}`)
}

export function importMerchantData(files: FormData): Promise<ImportResult> {
  return fetch(`${getApiBaseUrl()}/data/import`, {
    method: 'POST',
    headers: {
      ...(localStorage.getItem('revora_session_token')
        ? { Authorization: `Bearer ${localStorage.getItem('revora_session_token')}` }
        : {}),
    },
    body: files,
  })
    .then(async (response) => {
      const text = await response.text()
      let body: unknown
      try {
        body = text ? JSON.parse(text) : null
      } catch {
        body = text
      }

      if (!response.ok) {
        const errorMessage =
          body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
            ? body.error
            : response.statusText || 'Request failed'
        throw new ApiError(errorMessage, response.status, body)
      }

      if (!body || typeof body !== 'object' || !('success' in body)) {
        throw new ApiError('Backend returned an invalid response envelope', response.status, body)
      }

      if (!(body as { success: boolean }).success) {
        const errorBody = body as Partial<ApiErrorResponse>
        throw new ApiError(
          typeof errorBody.error === 'string' ? errorBody.error : 'Request failed',
          response.status,
          body
        )
      }

      return (body as ApiResponse<ImportResult>).data
    })
}
