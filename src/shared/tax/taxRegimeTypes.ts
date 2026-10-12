export type TaxRegimeComponent = {
  code: string;
  label?: string;
  amount?: string | number;
};

export type TaxRegimePayload = {
  jurisdiction?: string;
  supported?: boolean;
  labels?: Record<string, string>;
  features?: {
    has_withholding?: boolean;
    has_input_tax_credit?: boolean;
  };
  components?: TaxRegimeComponent[];
  tax_id_formats?: Record<string, { label?: string; example?: string; max_length?: number }>;
  base_currency?: string;
};
