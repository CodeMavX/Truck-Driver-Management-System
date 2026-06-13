import axios from "axios";

// Backend base URL. In production set VITE_API_URL to the deployed Django host.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const client = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 60000,
});

export async function planTrip(payload) {
  try {
    const { data } = await client.post("/api/plan-trip/", payload);
    return data;
  } catch (err) {
    const detail =
      err.response?.data?.detail ||
      Object.values(err.response?.data || {})[0] ||
      err.message ||
      "Something went wrong planning the trip.";
    throw new Error(Array.isArray(detail) ? detail[0] : detail);
  }
}
