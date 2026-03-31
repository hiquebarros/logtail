export type IngestionScope = {
  organizationId: string;
  applicationId: string;
};

export type IngestionJobData = {
  scope: IngestionScope;
  body: unknown;
  receivedAt: string;
};
