'use client';
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Configura o token de autenticação para todas as requisições
 * Deve ser chamado após o usuário fazer login
 */
export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

// Estrutura de um resultado individual com metadados
// Mapeia para a estrutura que o backend envia (titulo_viral, legenda_post, etc)
export interface ResultItem {
  videoUrl: string;
  title: string;        // Mapeado de titulo_viral
  caption: string;      // Mapeado de legenda_post
  hashtags: string[];
  titulo_tecnico?: string; // Campo técnico opcional do backend
}

export interface Job {
  id?: string;
  job_id?: string;
  status: "PENDING" | "PROCESSING" | "DONE" | "FAILED";
  videoUrl?: string;
  inputUrl?: string;
  outputUrl?: string | null;
  outputUrls?: string[];
  results?: ResultItem[];
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateJobResponse {
  job_id: string;
  status: string;
  videoUrl: string;
}

// Cria um job de processamento de vídeo via URL
export const createJobWithUrl = async (videoUrl: string, withSubtitles: boolean = true): Promise<CreateJobResponse> => {
  const response = await api.post<CreateJobResponse>("/videos", { videoUrl, withSubtitles });
  return response.data;
};

// Cria um job de processamento de vídeo via upload de arquivo
export const createJobWithFile = async (file: File, withSubtitles: boolean = true): Promise<CreateJobResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("withSubtitles", String(withSubtitles));

  const response = await api.post<CreateJobResponse>("/videos", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// Consulta o status de um job
export const getJobStatus = async (jobId: string): Promise<Job> => {
  const response = await api.get<Job>(`/videos/${jobId}`);
  return response.data;
};

// Busca todos os jobs do usuário autenticado
export const getJobs = async (): Promise<Job[]> => {
  const response = await api.get<{ jobs: Job[] }>("/jobs");
  return response.data.jobs;
};

// Deleta um job e seu vídeo do storage
export const deleteJob = async (jobId: string): Promise<{ message: string; jobId: string }> => {
  const response = await api.delete<{ message: string; jobId: string }>(`/videos/${jobId}`);
  return response.data;
};

/**
 * Helper: Normaliza os dados do backend para o formato do frontend
 * Backend envia: { titulo_viral, legenda_post, ... }
 * Frontend espera: { title, caption, ... }
 */
export const normalizeResults = (backendResults: any[]): ResultItem[] => {
  if (!backendResults || !Array.isArray(backendResults)) {
    return [];
  }

  return backendResults.map(result => ({
    videoUrl: result.videoUrl,
    title: result.titulo_viral || result.title || "Título não disponível",
    caption: result.legenda_post || result.caption || "",
    hashtags: result.hashtags || [],
    titulo_tecnico: result.titulo_tecnico
  }));
};
