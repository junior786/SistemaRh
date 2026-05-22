export type FormErrors = Record<string, string>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type VagaValidationInput = {
  titulo: string;
  area: string;
  jobType: string;
  regime: string;
  modalidade: string;
  localizacao: string;
  descricao: string;
  cep?: string | null;
};

type CandidatoValidationInput = {
  nome: string;
  email: string;
  jobType: string;
};

export function validateVagaFields(fields: VagaValidationInput): FormErrors {
  const errors: FormErrors = {};

  if (!fields.titulo.trim()) errors.titulo = "Titulo e obrigatorio";
  if (!fields.area.trim()) errors.area = "Area e obrigatoria";
  if (!fields.jobType.trim()) errors.jobType = "Tipo de trabalho e obrigatorio";
  if (!fields.regime) errors.regime = "Regime e obrigatorio";
  if (!fields.modalidade) errors.modalidade = "Modalidade e obrigatoria";
  if (!fields.localizacao.trim()) errors.localizacao = "Localizacao e obrigatoria";
  if (!fields.descricao.trim()) errors.descricao = "Descricao e obrigatoria";

  if ((fields.modalidade === "PRESENCIAL" || fields.modalidade === "HIBRIDO") && !fields.cep?.trim()) {
    errors.cep = "CEP e obrigatorio para vagas presenciais ou hibridas";
  }

  return errors;
}

export function validateCandidatoFields(fields: CandidatoValidationInput): FormErrors {
  const errors: FormErrors = {};

  if (!fields.nome.trim()) errors.nome = "Nome e obrigatorio";
  if (!fields.email.trim()) errors.email = "Email e obrigatorio";
  else if (!EMAIL_REGEX.test(fields.email.trim())) errors.email = "Email invalido";
  if (!fields.jobType.trim()) errors.jobType = "Tipo de trabalho e obrigatorio";

  return errors;
}
