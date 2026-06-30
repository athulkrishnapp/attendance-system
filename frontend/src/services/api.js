import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:5001',
});

// This automatically attaches the JWT token to every request
API.interceptors.request.use((req) => {
  const token = localStorage.getItem('token');
  if (token) {
    req.headers.Authorization = `Bearer ${token}`;
  }
  return req;
});

export default API;

export const api = {
  settings: {
    get: () => API.get("/settings"),
    update: (data) => API.put("/settings", data),
  },
  shifts: {
    getAll: () => API.get("/settings/shifts"),
    create: (data) => API.post("/settings/shifts", data),
    update: (id, data) => API.put(`/settings/shifts/${id}`, data),
    delete: (id) => API.delete(`/settings/shifts/${id}`),
  },
  departments: {
    getAll: () => API.get("/settings/departments"),
    create: (data) => API.post("/settings/departments", data),
    update: (id, data) => API.put(`/settings/departments/${id}`, data),
    delete: (id) => API.delete(`/settings/departments/${id}`),
  },
  levels: {
    getAll: () => API.get("/settings/levels"),
    create: (data) => API.post("/settings/levels", data),
    update: (id, data) => API.put(`/settings/levels/${id}`, data),
    delete: (id) => API.delete(`/settings/levels/${id}`),
  },
  leaveTypes: {
    getAll: () => API.get("/leaves/types"),
    create: (data) => API.post("/leaves/types", data),
    update: (id, data) => API.put(`/leaves/types/${id}`, data),
    delete: (id) => API.delete(`/leaves/types/${id}`),
  },
  leaveEntitlements: {
    getAll: () => API.get("/leaves/entitlements"),
    create: (data) => API.post("/leaves/entitlements", data),
    update: (id, data) => API.put(`/leaves/entitlements/${id}`, data),
    delete: (id) => API.delete(`/leaves/entitlements/${id}`),
  },
  holidays: {
    upload: (formData) => API.post("/settings/holidays/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
  },
  attendance: {
    calendar: (month) => API.get(`/attendance/calendar/${month}`),
    upload: (formData) => API.post("/attendance/upload", formData, { headers: { "Content-Type": "multipart/form-data" } }),
    getByDate: (date) => API.get(`/attendance/date/${date}`),
    updateRecord: (id, data) => API.put(`/attendance/record/${id}`, data)
  },
  // Employees API
  employees: {
    getAll: () => API.get("/employees"),
  },
  // Leave Requests (Granular)
  leaveRequests: {
    request: (data) => API.post("/leaves/request", data),
    approve: (id) => API.put(`/leaves/${id}/approve`),
    reject: (id, data) => API.put(`/leaves/${id}/reject`, data),
    forward: (id, data) => API.put(`/leaves/${id}/forward`, data),
    getBalances: (employeeId) => API.get(`/leaves/balances/${employeeId}`),
    requestBalanceAction: (data) => API.post(`/leaves/balance-action`, data),
  },
  // Regularizations
  regularizations: {
    request: (data) => API.post("/attendance/regularize", data),
    getAllPending: (params) => API.get("/attendance/regularize/pending", { params }),
    process: (id, data) => API.put(`/attendance/regularize/${id}/process`, data),
    forward: (id, data) => API.put(`/attendance/regularize/${id}/forward`, data),
  },
  // Reports
  reports: {
    master: (year, month) => API.get(`/reports/master?year=${year}&month=${month}`)
  }
};