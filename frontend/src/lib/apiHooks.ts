import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  completeExperiment,
  createPaymentOrder,
  getAgentRun,
  getAuditLog,
  getExperiment,
  getLatestAgentRun,
  getOpportunities,
  getOpportunityRecommendation,
  importMerchantData,
  listOpportunities,
  proposeExperiment,
  startExperiment,
  verifyPayment,
} from './api'
import type {
  AgentRun,
  AuditLogResponseData,
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  Experiment,
  ImportResult,
  Opportunity,
  OpportunityResponseData,
  PaymentResponseData,
  ProposeExperimentParams,
  ProposeExperimentResponseData,
  Recommendation,
  VerifyPaymentRequest,
} from './types'

export function useOpportunity(): UseQueryResult<OpportunityResponseData> {
  return useQuery({ queryKey: ['opportunities'], queryFn: getOpportunities })
}

export function useOpportunityList(limit = 5): UseQueryResult<{ opportunities: Opportunity[] }> {
  return useQuery({ queryKey: ['opportunityList', limit], queryFn: () => listOpportunities(limit) })
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

export function useCompleteExperiment(): UseMutationResult<Experiment, Error, string> {
  return useMutation({ mutationFn: completeExperiment })
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

export function useImportMerchantData(): UseMutationResult<ImportResult, Error, FormData> {
  return useMutation({ mutationFn: importMerchantData })
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
