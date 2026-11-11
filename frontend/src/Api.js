
const API_URL = "http://localhost:5000/api";

// Common API request function
async function request(url, options = {}) {
  try {
    const response = await fetch(url, options);

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Request failed.");
    }

    return data;
  } catch (error) {
    console.error("API Error:", error);
    throw error;
  }
}

// ===============================
// USER REGISTRATION
// ===============================
export function registerUser(details) {
  return request(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: details.name,
      email: details.email,
      password: details.password
    })
  });
}

// ===============================
// USER LOGIN
// ===============================
export function loginUser(details) {
  return request(`${API_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: details.email,
      password: details.password
    })
  });
}

// ===============================
// GET COMPLAINTS
// ===============================
export function getAdminComplaints() {
  return request(`${API_URL}/admin/complaints`);
}

// ===============================
// SUBMIT COMPLAINT
// ===============================
export function submitComplaint(formData) {
  return request(`${API_URL}/complaints`, {
    method: "POST",
    body: formData
  });
}

// ===============================
// TRACK COMPLAINT
// ===============================
export function trackComplaint(value) {
  const isPhone = /^[0-9]{10}$/.test(value);

  const params = new URLSearchParams(
    isPhone
      ? { phone: value }
      : { trackingId: value }
  );

  return request(
    `${API_URL}/complaints/track?${params.toString()}`
  );
}

// ===============================
// GET WATER SUPPLY SCHEDULES
// ===============================
export function getSchedules() {
  return request(`${API_URL}/schedules`);
}

// ===============================
// UPDATE COMPLAINT
// ===============================
export function updateComplaint(id, details) {
  return request(
    `${API_URL}/admin/complaints/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(details)
    }
  );
}
