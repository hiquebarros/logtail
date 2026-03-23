export type SourceLanguage = "JS" | "PHP" | "GO" | "PYTHON" | "OTHER";

export type Source = {
  id: string;
  organizationId: string;
  name: string;
  language: SourceLanguage;
  apiKey: string;
  createdAt: string;
  updatedAt: string;
};

export type SourcesListResponse = {
  data: Source[];
};

export type SourceDetailResponse = {
  data: Source;
};

export type CreateSourceInput = {
  name: string;
  language: SourceLanguage;
};

export type UpdateSourceInput = {
  name: string;
};
