const API_BASE_URL = "http://localhost:8000"

class ApiClient {
  private baseURL: string
  private token: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(url, {
      ...options,
      headers,
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Authentication
  async login(email: string, password: string) {
    return this.request("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    })
  }

  async register(userData: {
    email: string
    full_name?: string
    role?: string
    password: string
  }) {
    return this.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    })
  }

  // Candidates
  async getCandidates(skip = 0, limit = 100) {
    return this.request(`/api/v1/candidates/?skip=${skip}&limit=${limit}`)
  }

  async getCandidate(candidateId: string) {
    return this.request(`/api/v1/candidates/${candidateId}`)
  }

  async createCandidate(candidateData: {
    name: string
    email?: string
    phone?: string
    location?: string
  }) {
    return this.request("/api/v1/candidates/", {
      method: "POST",
      body: JSON.stringify(candidateData),
    })
  }

  // Interviews
  async getInterviews(skip = 0, limit = 100, statusFilter?: string) {
    const params = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    })

    if (statusFilter) {
      params.append("status_filter", statusFilter)
    }

    return this.request(`/api/v1/interviews/?${params}`)
  }

  async getInterview(interviewId: string) {
    return this.request(`/api/v1/interviews/${interviewId}`)
  }

  async createInterview(interviewData: {
    candidate_id: string
    position: string
    interview_type?: string
    scheduled_at?: string
    questions?: string[]
  }) {
    return this.request("/api/v1/interviews/?current_user_id=test'", {
      method: "POST",
      body: JSON.stringify(interviewData),
    })
  }

  async startInterview(interviewId: string) {
    return this.request(`/api/v1/interviews/${interviewId}/start`, {
      method: "POST",
    })
  }

  async endInterview(interviewId: string) {
    return this.request(`/api/v1/interviews/${interviewId}/end`, {
      method: "POST",
    })
  }

  async getInterviewDetails(interviewId: string) {
    return this.getInterview(interviewId);
  }

  async saveAnswer(interviewId: string, answer: { question: string, answer: string, index?: number }) {
    return this.request(`/api/v1/interviews/${interviewId}/answers`, {
      method: "POST",
      body: JSON.stringify(answer),
    })
  }

  // LangChain Interview Endpoints
  async getNextQuestion(payload: {
    interview_id: string,
    resume: any,
    history: { question: string, answer: string }[],
    position: string
  }) {
    return this.request("/api/v1/interviews/next-question", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async getFollowUpQuestion(payload: {
    interview_id: string,
    original_question: string,
    candidate_response: string
  }) {
    return this.request("/api/v1/interviews/follow-up", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async getFeedback(payload: {
    interview_id: string,
    question: string,
    response: string,
    expected_keywords: string[]
  }) {
    return this.request("/api/v1/interviews/feedback", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async getConversationSummary(interview_id: string) {
    return this.request(`/api/v1/interviews/${interview_id}/conversation-summary`)
  }

  async clearConversationMemory(interview_id: string) {
    return this.request(`/api/v1/interviews/${interview_id}/conversation-memory`, {
      method: "DELETE",
    })
  }

  // Coding Questions
  async generateCodingQuestion(payload: {
    interview_id: string,
    resume: any,
    position: string,
    difficulty_level?: string
  }) {
    return this.request("/api/v1/interviews/coding-question", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  async evaluateCodingSolution(payload: {
    interview_id: string,
    question: string,
    solution: string,
    expected_approach: string,
    position: string
  }) {
    return this.request("/api/v1/interviews/coding-evaluation", {
      method: "POST",
      body: JSON.stringify(payload),
    })
  }

  // Resume
  async uploadResume(file: File, candidateId?: string) {
    const formData = new FormData()
    formData.append("file", file)

    const params = candidateId ? `?candidate_id=${candidateId}` : ""

    return fetch(`${this.baseURL}/api/v1/resume/upload${params}`, {
      method: "POST",
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
      body: formData,
    }).then((res) => res.json())
  }

  async getResumeAnalysis(candidateId: string) {
    return this.request(`/api/v1/resume/analysis/${candidateId}`)
  }

  // Reports
  async getInterviewReport(interviewId: string) {
    return this.request(`/api/v1/reports/${interviewId}`)
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token")
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL)
