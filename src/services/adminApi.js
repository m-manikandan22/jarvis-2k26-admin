import { ADMIN_API_URL } from '../config/adminGasConfig';

/**
 * Calls the same-origin Vercel API function, which proxies requests to GAS.
 * Keeping the GAS request server-side avoids browser CORS and redirect issues.
 */
async function request(payload) {
  const response = await fetch(ADMIN_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new Error('Invalid JSON response from admin backend.');
  }

  if (!response.ok) {
    throw new Error(result.message || `Admin API request failed with status ${response.status}.`);
  }

  return result;
}

export const adminApi = {
  login: async (username, password) => {
    return request({
      requestType: 'login',
      username,
      password,
    });
  },

  getDashboardStats: async (sessionToken) => {
    return request({
      requestType: 'getDashboardStats',
      sessionToken,
    });
  },

  getRegistrations: async (sessionToken) => {
    return request({
      requestType: 'getRegistrations',
      sessionToken,
    });
  },

  getRegistrationDetails: async (sessionToken, teamId) => {
    return request({
      requestType: 'getRegistrationDetails',
      sessionToken,
      teamId,
    });
  },

  getPayments: async (sessionToken) => {
    return request({
      requestType: 'getPayments',
      sessionToken,
    });
  },

  verifyPayment: async (sessionToken, paymentId) => {
    return request({
      requestType: 'verifyPayment',
      sessionToken,
      paymentId,
    });
  },
  verifyPaymentByEmail: async (sessionToken, email) => {
    return request({
      requestType: 'verifyPaymentByEmail',
      sessionToken,
      email,
    });
  },
  listParticipantPayments: async (sessionToken) => {
    return request({
      requestType: 'listParticipantPayments',
      sessionToken,
    });
  },
  // New: list event IDs to verify schedule vs registration
  listEventIds: async (sessionToken) => {
    return request({
      requestType: 'listEventIds',
      sessionToken,
    });
  },

  // New: send e‑ticket for a verified payment (admin triggers manually)
  sendTicket: async (sessionToken, paymentId) => {
    return request({
      requestType: 'sendTicket',
      sessionToken,
      paymentId,
    });
  },



  getEventParticipants: async (sessionToken, eventId) => {
    return request({
      requestType: 'getEventParticipants',
      sessionToken,
      eventId,
    });
  },
};
