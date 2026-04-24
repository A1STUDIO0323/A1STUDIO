/**
 * SMS/알림톡 발송 유틸리티
 * COOLSMS 또는 SOLAPI 지원
 */

import crypto from 'crypto';

interface SendMessageParams {
  to: string; // 수신자 전화번호 (01012345678 형식)
  text: string; // 메시지 내용
  from?: string; // 발신자 번호 (선택, 환경변수에서 기본값 사용)
}

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * COOLSMS를 사용한 SMS 발송
 */
async function sendSMSViaCoolsms(params: SendMessageParams): Promise<SendMessageResult> {
  try {
    const apiKey = process.env.COOLSMS_API_KEY;
    const apiSecret = process.env.COOLSMS_API_SECRET;
    const fromNumber = params.from || process.env.COOLSMS_FROM_NUMBER;

    if (!apiKey || !apiSecret || !fromNumber) {
      return { success: false, error: 'COOLSMS 설정이 완료되지 않았습니다' };
    }

    const normalizedTo = params.to.replace(/[^0-9]/g, '');
    if (normalizedTo.length < 10 || normalizedTo.length > 11) {
      return { success: false, error: '유효하지 않은 전화번호입니다' };
    }

    const url = 'https://api.coolsms.co.kr/messages/v4/send';
    const body = {
      message: {
        to: normalizedTo,
        from: fromNumber,
        text: params.text,
        type: 'LMS',
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[COOLSMS] 발송 실패:', error);
      return { success: false, error: `SMS 발송 실패: ${JSON.stringify(error)}` };
    }

    const result = await response.json();
    console.log('[COOLSMS] 발송 성공:', result);

    return {
      success: true,
      messageId: result.groupId || result.messageId,
    };
  } catch (error) {
    console.error('[COOLSMS] 발송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * SOLAPI를 사용한 SMS 발송
 */
async function sendSMSViaSolapi(params: SendMessageParams): Promise<SendMessageResult> {
  try {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const fromNumber = params.from || process.env.SOLAPI_FROM_NUMBER;

    if (!apiKey || !apiSecret || !fromNumber) {
      return { success: false, error: 'SOLAPI 설정이 완료되지 않았습니다' };
    }

    const normalizedTo = params.to.replace(/[^0-9]/g, '');
    if (normalizedTo.length < 10 || normalizedTo.length > 11) {
      return { success: false, error: '유효하지 않은 전화번호입니다' };
    }

    // SOLAPI HMAC 인증 생성
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString('hex');
    const data = date + salt;
    const signature = crypto.createHmac('sha256', apiSecret).update(data).digest('hex');

    const url = 'https://api.solapi.com/messages/v4/send';
    const body = {
      message: {
        to: normalizedTo,
        from: fromNumber,
        text: params.text,
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[SOLAPI] 발송 실패:', error);
      return { success: false, error: `SMS 발송 실패: ${JSON.stringify(error)}` };
    }

    const result = await response.json();
    console.log('[SOLAPI] 발송 성공:', result);

    return {
      success: true,
      messageId: result.groupId || result.messageId,
    };
  } catch (error) {
    console.error('[SOLAPI] 발송 오류:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '알 수 없는 오류',
    };
  }
}

/**
 * SMS 메시지 발송 (자동으로 사용 가능한 서비스 선택)
 */
export async function sendSMS(params: SendMessageParams): Promise<SendMessageResult> {
  // SMS_PROVIDER 환경변수로 명시적으로 지정 가능
  const provider = process.env.SMS_PROVIDER || 'auto';

  if (provider === 'test') {
    console.log('[SMS] TEST 모드 — 실제 발송 없음', {
      to: params.to,
      textPreview: params.text.slice(0, 120),
    });
    return { success: true, messageId: 'sms-test-mode' };
  }

  if (provider === 'solapi' || provider === 'auto') {
    if (process.env.SOLAPI_API_KEY) {
      console.log('[SMS] SOLAPI 사용');
      return sendSMSViaSolapi(params);
    }
  }

  if (provider === 'coolsms' || provider === 'auto') {
    if (process.env.COOLSMS_API_KEY) {
      console.log('[SMS] COOLSMS 사용');
      return sendSMSViaCoolsms(params);
    }
  }

  console.warn('[SMS] 설정된 SMS 서비스가 없습니다. 메시지 발송을 건너뜁니다.');
  return {
    success: false,
    error: 'SMS 서비스가 설정되지 않았습니다',
  };
}

/**
 * 카카오 알림톡 발송 (SOLAPI 사용)
 */
export async function sendKakaoAlimtalk(params: SendMessageParams & {
  templateId?: string;
  variables?: Record<string, string>;
}): Promise<SendMessageResult> {
  try {
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const fromNumber = params.from || process.env.SOLAPI_FROM_NUMBER;
    const pfId = process.env.SOLAPI_KAKAO_PF_ID;

    if (!apiKey || !apiSecret || !pfId) {
      console.warn('[AlimTalk] SOLAPI 알림톡 설정이 완료되지 않았습니다. SMS로 대체합니다.');
      return sendSMS(params);
    }

    const normalizedTo = params.to.replace(/[^0-9]/g, '');

    // SOLAPI HMAC 인증 생성
    const date = new Date().toISOString();
    const salt = crypto.randomBytes(32).toString('hex');
    const data = date + salt;
    const signature = crypto.createHmac('sha256', apiSecret).update(data).digest('hex');

    const url = 'https://api.solapi.com/messages/v4/send';
    
    const body = {
      message: {
        to: normalizedTo,
        from: fromNumber,
        kakaoOptions: {
          pfId: pfId,
          templateId: params.templateId,
          variables: params.variables,
        },
      },
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.warn('[AlimTalk] 발송 실패, SMS로 대체합니다.');
      return sendSMS(params);
    }

    const result = await response.json();
    console.log('[AlimTalk] 발송 성공:', result);

    return {
      success: true,
      messageId: result.groupId || result.messageId,
    };
  } catch (error) {
    console.error('[AlimTalk] 발송 오류, SMS로 대체:', error);
    return sendSMS(params);
  }
}

/**
 * 메시지 발송 (알림톡 우선, 실패 시 SMS)
 */
export async function sendMessage(params: SendMessageParams): Promise<SendMessageResult> {
  // 알림톡 시도 (설정되어 있으면)
  if (process.env.SOLAPI_KAKAO_ENABLED === 'true') {
    const result = await sendKakaoAlimtalk(params);
    if (result.success) {
      return result;
    }
    console.log('[Message] 알림톡 실패, SMS로 대체합니다.');
  }

  // SMS 발송
  return sendSMS(params);
}

/**
 * 메시지 발송 로그 저장
 */
export async function logMessage(params: {
  userId?: string;
  reservationId?: string;
  phoneNumber: string;
  messageType: 'reservation_confirm' | 'reservation_cancel' | 'reminder';
  content: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  messageId?: string;
}) {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    
    await supabase
      .from('message_logs')
      .insert({
        user_id: params.userId || null,
        reservation_id: params.reservationId || null,
        phone_number: params.phoneNumber,
        message_type: params.messageType,
        content: params.content,
        status: params.status,
        error_message: params.errorMessage || null,
        message_id: params.messageId || null,
      });
    
    console.log('[MessageLog] 로그 저장 성공');
  } catch (error) {
    console.error('[MessageLog] 로그 저장 실패:', error);
  }
}
