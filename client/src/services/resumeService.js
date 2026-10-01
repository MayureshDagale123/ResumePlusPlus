import api from './api'

// ── Original resume ───────────────────────────────────────────────
export const getResume    = async ()     => { const { data } = await api.get('/resume');         return data.data }
export const createResume = async (body) => { const { data } = await api.post('/resume', body);  return data.data }
export const updateResume = async (body) => { const { data } = await api.put('/resume', body);   return data.data }
export const deleteResume = async ()     => { await api.delete('/resume') }

// ── Optimized resumes ─────────────────────────────────────────────
export const getOptimizedResumes     = async ()   => { const { data } = await api.get('/optimized-resumes');         return data }
export const getOptimizedResumeById  = async (id) => { const { data } = await api.get(`/optimized-resumes/${id}`);   return data.data }
export const deleteOptimizedResume   = async (id) => { await api.delete(`/optimized-resumes/${id}`) }
