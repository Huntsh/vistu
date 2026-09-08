export type Status = 'realizada' | 'nao_realizada' | 'desmarcada';

export interface Inspection {
  id: string;
  num_registro: string;
  num_contrato: string | null;
  imobiliaria: string;
  area_m2: number;
  mobiliado: boolean;
  data_vistoria: string; // YYYY-MM-DD
  hora_vistoria: string | null; // HH:MM
  status: Status;
  valor: number;
  created_at: string;
}

export interface Settings {
  valor_base_realizada: number;
  valor_adicional_mobiliado: number;
  valor_nao_realizada: number;
  area_limite: number;
  valor_por_m2: number;
}

export const STATUS_LABEL: Record<Status, string> = {
  realizada: 'Realizada',
  nao_realizada: 'Não realizada',
  desmarcada: 'Desmarcada com antecedência',
};

export const STATUS_LABEL_SHORT: Record<Status, string> = {
  realizada: 'Realizada',
  nao_realizada: 'Não realizada',
  desmarcada: 'Desmarcada',
};

export const STATUS_LIST: Status[] = ['realizada', 'nao_realizada', 'desmarcada'];
