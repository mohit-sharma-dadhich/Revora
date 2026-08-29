import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  completeExperiment,
  createPaymentOrder,
  getAuditLog,
  getExperiment,
  getOpportunities,
  importMerchantData,
  proposeExperiment,
  startExperiment,
  verifyPayment,
} from './api'
import type {
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

export function useOpportunity(): UseQueryResult<OpportunityResponseData> {
  return useQuery({ queryKey: ['opportunities'], queryFn: getOpportunities })
}

export function useProposeExperiment(): UseMutationResult<ProposeExperimentResponseData, Error, ProposeExperimentParams | undefined> {
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
