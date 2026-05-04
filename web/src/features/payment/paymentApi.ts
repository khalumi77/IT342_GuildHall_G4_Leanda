// web/src/api/paymentApi.ts
import axios from 'axios';

const PAYMENT_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1')
  .replace('/api/v1', '/api/payments');

const paymentAxios = axios.create({ baseURL: PAYMENT_BASE });

paymentAxios.interceptors.request.use((config) => {
  const token = localStorage.getItem('guildhall_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface PaymentRecord {
  id: number;
  questId: number;
  questTitle: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  paymongoSessionId: string | null;
  paidAt: string | null;
  createdAt: string | null;
}

export const paymentApi = {
  createSession: (questId: number) =>
    paymentAxios.post<{ success: boolean; data: { sessionId: string; checkoutUrl: string } }>(
      `/create-session/${questId}`
    ),

  // Verify by quest ID (PayMongo doesn't append session_id to success URL)
  verifyByQuestId: (questId: number) =>
    paymentAxios.get<{ success: boolean; data: any }>(
      `/verify/${questId}`
    ),

  getHistory: () =>
    paymentAxios.get<{ success: boolean; data: PaymentRecord[] }>(`/history`),

  getByQuest: (questId: number) =>
    paymentAxios.get<{ success: boolean; data: PaymentRecord }>(`/quest/${questId}`),
};