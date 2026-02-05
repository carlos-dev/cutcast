'use client';
import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Token armazenado para uso em fetch nativo (streaming)
let authToken: string | null = null;

/**
 * Configura o token de autenticação para todas as requisições
 * Deve ser chamado após o usuário fazer login
 */
export const setAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

/**
 * Retorna o token atual para uso em fetch nativo
 */
export const getAuthToken = () => authToken;

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

// === STREAMING PROGRESS TYPES ===

export type StreamingStatus =
  | 'downloading'
  | 'transcribing'
  | 'analyzing'
  | 'rendering'
  | 'uploading'
  | 'completed'
  | 'error';

export interface StreamingProgress {
  status: StreamingStatus;
  progress: number; // 0-100
  message?: string;
  clipIndex?: number; // Qual corte está sendo processado (1, 2, 3...)
  totalClips?: number;
  url?: string; // URL do vídeo quando completed
  success?: boolean;
  error?: string;
}

export interface StreamingCallbacks {
  onProgress: (data: StreamingProgress) => void;
  onComplete: (data: StreamingProgress) => void;
  onError: (error: string) => void;
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

// === STREAMING NDJSON CONSUMER ===

/**
 * Consome um stream NDJSON e chama os callbacks conforme os chunks chegam
 * Usa fetch nativo com response.body.getReader() para streaming real
 */
export async function consumeProgressStream(
  jobId: string,
  callbacks: StreamingCallbacks,
  abortController?: AbortController
): Promise<void> {
  const token = getAuthToken();

  const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/progress`, {
    method: 'GET',
    headers: {
      'Accept': 'application/x-ndjson',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    signal: abortController?.signal
  });

  if (!response.ok) {
    const errorText = await response.text();
    callbacks.onError(`Erro ao conectar ao stream: ${response.status} - ${errorText}`);
    return;
  }

  if (!response.body) {
    callbacks.onError('Stream não disponível');
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Processa qualquer dado restante no buffer
        if (buffer.trim()) {
          processBufferLine(buffer.trim(), callbacks);
        }
        break;
      }

      // Decodifica o chunk e adiciona ao buffer
      buffer += decoder.decode(value, { stream: true });

      // Processa linhas completas (separadas por \n)
      const lines = buffer.split('\n');

      // Mantém a última linha incompleta no buffer
      buffer = lines.pop() || '';

      // Processa cada linha completa
      for (const line of lines) {
        if (line.trim()) {
          processBufferLine(line.trim(), callbacks);
        }
      }
    }
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.log('Stream abortado pelo usuário');
      return;
    }

    // Se a conexão caiu, verifica o status real do job antes de mostrar erro
    try {
      const job = await getJobStatus(jobId);
      if (job.status === 'DONE') {
        // Job completou com sucesso, não mostra erro
        callbacks.onComplete({
          status: 'completed',
          progress: 100,
          success: true
        });
        return;
      } else if (job.status === 'FAILED') {
        callbacks.onError(job.errorMessage || 'Erro no processamento');
        return;
      }
      // Job ainda em processamento - conexão caiu, mostra erro de rede
      callbacks.onError(`Conexão perdida. Recarregue a página para acompanhar o progresso.`);
    } catch {
      // Não conseguiu verificar status, mostra erro original
      callbacks.onError(`Erro ao ler stream: ${(error as Error).message}`);
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Processa uma linha do buffer NDJSON
 */
function processBufferLine(line: string, callbacks: StreamingCallbacks): void {
  try {
    const data = JSON.parse(line) as StreamingProgress & { type?: string };

    // Ignora mensagens de keepalive
    if (data.type === 'keepalive') {
      return;
    }

    if (data.status === 'completed') {
      callbacks.onComplete(data);
    } else if (data.status === 'error') {
      callbacks.onError(data.error || 'Erro desconhecido');
    } else {
      callbacks.onProgress(data);
    }
  } catch {
    console.warn('Linha NDJSON inválida:', line);
  }
}

// === TIKTOK SHARING TYPES ===

export interface TikTokStatus {
  connected: boolean;
  isExpired?: boolean;
  openId?: string;
  connectedAt?: string;
  updatedAt?: string;
}

export interface ShareTikTokResponse {
  success: boolean;
  message: string;
  publishId?: string;
  error?: string;
}

// === TIKTOK SHARING FUNCTIONS ===

/**
 * Verifica se o usuário tem conta TikTok vinculada
 */
export const getTikTokStatus = async (userId: string): Promise<TikTokStatus> => {
  const response = await api.get<TikTokStatus>(`/auth/tiktok/status?userId=${userId}`);
  return response.data;
};

/**
 * Compartilha um vídeo no TikTok
 * Retorna 403 com error: 'tiktok_not_connected' se não vinculado
 */
export const shareToTikTok = async (
  userId: string,
  videoUrl: string,
  title?: string
): Promise<ShareTikTokResponse> => {
  const response = await api.post<ShareTikTokResponse>('/share/tiktok', {
    userId,
    videoUrl,
    title,
  });
  return response.data;
};

/**
 * Retorna a URL para conectar conta TikTok
 */
export const getTikTokConnectUrl = (userId: string): string => {
  return `${API_BASE_URL}/auth/tiktok/connect?userId=${userId}`;
};

/**
 * Desconecta a conta TikTok do usuário
 */
export const disconnectTikTok = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/auth/tiktok/disconnect?userId=${userId}`);
  return response.data;
};

// === PAYMENT / CREDITS FUNCTIONS ===

export interface CreditsResponse {
  credits: number;
}

export interface CheckoutResponse {
  url: string;
}

/**
 * Busca o saldo de créditos do usuário
 */
export const getCredits = async (userId: string): Promise<number> => {
  const response = await api.get<CreditsResponse>(`/payment/credits?userId=${userId}`);
  return response.data.credits;
};

/**
 * Cria sessão de checkout para compra de créditos
 * Redireciona o usuário para a página do Stripe
 */
export const buyCredits = async (userId: string, quantity: number): Promise<void> => {
  const response = await api.post<CheckoutResponse>('/payment/checkout', {
    userId,
    quantity
  });

  if (response.data.url) {
    window.location.href = response.data.url;
  }
};

// === USER PROFILE TYPES ===

export interface UserProfile {
  id: string;
  email: string;
  credits: number;
  stripeCustomerId: string | null;
  tiktokConnected: boolean;
  createdAt: string;
}

// === USER PROFILE FUNCTIONS ===

/**
 * Busca o perfil do usuário
 */
export const getUserProfile = async (userId: string): Promise<UserProfile> => {
  const response = await api.get<UserProfile>(`/users/${userId}/profile`);
  return response.data;
};

/**
 * Deleta a conta do usuário permanentemente
 */
export const deleteUserAccount = async (userId: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete<{ success: boolean; message: string }>(`/users/${userId}`);
  return response.data;
};

/**
 * Helper: Retorna mensagem amigável baseada no status
 */
export function getProgressMessage(data: StreamingProgress): string {
  switch (data.status) {
    case 'downloading':
      return 'Baixando vídeo...';
    case 'transcribing':
      return 'Transcrevendo áudio...';
    case 'analyzing':
      return 'IA analisando conteúdo...';
    case 'rendering':
      if (data.clipIndex && data.totalClips) {
        return `Renderizando corte ${data.clipIndex}/${data.totalClips}...`;
      }
      return 'Renderizando vídeo...';
    case 'uploading':
      return 'Enviando para a nuvem...';
    case 'completed':
      return 'Concluído!';
    case 'error':
      return data.error || 'Erro no processamento';
    default:
      return data.message || 'Processando...';
  }
}
