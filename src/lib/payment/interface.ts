export interface PaymentProvider {
  /**
   * 결제 위젯/팝업 초기화에 필요한 클라이언트 키 반환 (클라이언트사이드)
   */
  getClientKey(): string;

  /**
   * 서버사이드: 결제 승인 요청
   */
  confirmPayment(params: ConfirmParams): Promise<ConfirmResult>;

  /**
   * 서버사이드: 결제 취소/환불
   */
  cancelPayment(params: CancelParams): Promise<CancelResult>;

  /**
   * 서버사이드: 결제 단건 조회
   */
  getPayment(paymentKey: string): Promise<PaymentInfo>;
}

export interface ConfirmParams {
  paymentKey: string;
  orderId: string;
  amount: number;
}

export interface ConfirmResult {
  success: boolean;
  paymentKey: string;
  orderId: string;
  amount: number;
  approvedAt: string;
  raw: unknown;
}

export interface CancelParams {
  paymentKey: string;
  cancelReason: string;
  cancelAmount?: number;
}

export interface CancelResult {
  success: boolean;
  cancelledAmount: number;
  raw: unknown;
}

export interface PaymentInfo {
  paymentKey: string;
  orderId: string;
  amount: number;
  status: string;
  approvedAt?: string;
  raw: unknown;
}
