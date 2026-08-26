import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query'
import {
  completeExperiment,
  createPaymentOrder,
  getExperiment,
  getOpportunities,
  proposeExperiment,
  startExperiment,
  verifyPayment,
} from './api'
import type {
  CreatePaymentOrderRequest,
  CreatePaymentOrderResponseData,
  Experiment,
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
