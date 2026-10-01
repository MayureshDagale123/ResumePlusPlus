import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach Authorization header if token is present in localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

export default api
