import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import {
  analyzeExperiment,
  endExperiment,
  createPaymentOrder,
  getAgentRun,
  getAuditLog,
  getExperiment,
  getLatestAgentRun,
  getOpportunities,
  getOpportunityRecommendation,
  getPaymentAudits,
  importMerchantData,
  listOpportunities,
  proposeExperiment,
  startExperiment,
  verifyPayment,
  scaleExperiment,
} from './api'
import type { OpportunityDataSource } from './api'
import { ApiError } from './api'
import type {
  AgentRun,
  AnalyzeExperimentResponseData,
  AuditLogResponseData,
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  Experiment,
  ImportResult,
  Opportunity,
  OpportunityResponseData,
  PaymentResponseData,
  PaymentAuditResponseData,
  ProposeExperimentParams,
  ProposeExperimentResponseData,
  Recommendation,
  ScaleExperimentOptions,
  VerifyPaymentRequest,
} from './types'

export function useOpportunity(dataSource: OpportunityDataSource): UseQueryResult<OpportunityResponseData> {
  const sessionToken = typeof window === 'undefined' ? '' : localStorage.getItem('revora_session_token') || ''
  return useQuery({ queryKey: ['opportunities', sessionToken, dataSource], queryFn: () => getOpportunities(dataSource) })
}

export function useOpportunityList(limit = 5, dataSource: OpportunityDataSource = 'demo'): UseQueryResult<{ opportunities: Opportunity[] }> {
  const sessionToken = typeof window === 'undefined' ? '' : localStorage.getItem('revora_session_token') || ''
  return useQuery({ queryKey: ['opportunityList', sessionToken, dataSource, limit], queryFn: () => listOpportunities(limit, dataSource) })
}

export function useOpportunityRecommendation(): UseMutationResult<{ recommendation: Recommendation | null; aiAvailable: boolean; aiError: string | null }, Error, Opportunity> {
  return useMutation({ mutationFn: getOpportunityRecommendation })
}

export function useProposeExperiment(): UseMutationResult<ProposeExperimentResponseData, Error, ProposeExperimentParams | Opportunity | undefined> {
  return useMutation({ mutationFn: proposeExperiment })
}

export function useExperiment(id: string | undefined): UseQueryResult<Experiment> {
  return useQuery({
    queryKey: ['experiments', id],
    queryFn: () => getExperiment(id as string),
    enabled: Boolean(id),
  })
}

export function useStartExperiment(): UseMutationResult<Experiment, Error, string> {
  return useMutation({ mutationFn: startExperiment })
}

export function useAnalyzeExperiment(): UseMutationResult<AnalyzeExperimentResponseData, ApiError, string> {
  return useMutation({ mutationFn: analyzeExperiment })
}

export function useScaleExperiment(): UseMutationResult<Experiment, ApiError, string | { id: string; options?: ScaleExperimentOptions }> {
  return useMutation({
    mutationFn: (input) => typeof input === 'string' ? scaleExperiment(input) : scaleExperiment(input.id, input.options),
  })
}

export function useEndExperiment(): UseMutationResult<Experiment, ApiError, string> {
  return useMutation({ mutationFn: endExperiment })
}

export function useCreatePaymentOrder(): UseMutationResult<CreatePaymentOrderResponseData, Error, CreatePaymentOrderRequest> {
  return useMutation({ mutationFn: createPaymentOrder })
}

export function useVerifyPayment(): UseMutationResult<PaymentResponseData, Error, VerifyPaymentRequest> {
  return useMutation({ mutationFn: verifyPayment })
}

interface GetAuditLogParams {
  limit?: number
  skip?: number
  action?: string
  status?: string
}

export function useAuditLog(params?: GetAuditLogParams): UseQueryResult<AuditLogResponseData> {
  return useQuery({ queryKey: ['audit', params], queryFn: () => getAuditLog(params) })
}

export function usePaymentAudits(limit = 50, skip = 0): UseQueryResult<PaymentAuditResponseData> {
  return useQuery({ queryKey: ['paymentAudits', limit, skip], queryFn: () => getPaymentAudits(limit, skip) })
}

export function useImportMerchantData(): UseMutationResult<ImportResult, Error, FormData> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: importMerchantData,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['opportunities'] })
      queryClient.removeQueries({ queryKey: ['opportunityList'] })
    },
  })
}

export function useAgentRun(id: string | undefined): UseQueryResult<AgentRun> {
  return useQuery({
    queryKey: ['agentRun', id],
    queryFn: () => getAgentRun(id as string),
    enabled: Boolean(id),
  })
}

export function useLatestAgentRun(runType: string): UseQueryResult<AgentRun> {
  return useQuery({
    queryKey: ['latestAgentRun', runType],
    queryFn: () => getLatestAgentRun(runType),
  })
}
