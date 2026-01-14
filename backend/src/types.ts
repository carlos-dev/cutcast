// Status possíveis de um VideoJob
export type JobStatus = 'UPLOADED' | 'PROCESSING' | 'DONE' | 'FAILED';

// Estrutura de um VideoJob em memória
export interface VideoJob {
  id: string;
  status: JobStatus;
  originalFilename: string;
  createdAt: Date;
}

// Estrutura de um resultado individual com metadados
export interface VideoResult {
  videoUrl: string;
  titulo_viral: string;
  legenda_post: string;
  hashtags: string[];
  titulo_tecnico: string;
}

// Estrutura de um callback recebido do n8n
export interface JobCallback {
  jobId: string;
  status: 'completed' | 'error';
  outputUrls?: string[]; // Mantido para retrocompatibilidade
  results?: VideoResult[]; // Novo formato com metadados ricos
  errorMessage?: string;
  receivedAt?: string;
}
