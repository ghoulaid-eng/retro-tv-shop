BEGIN;

ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductVariant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProductMedia" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CustomOrderRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminResource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminAuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderTimelineEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OrderSupportNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TransactionalEmail" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public."Product",
  public."ProductVariant",
  public."ProductMedia",
  public."Inventory",
  public."Order",
  public."OrderItem",
  public."Payment",
  public."WebhookEvent",
  public."CustomOrderRequest",
  public."AdminResource",
  public."AdminAuditLog",
  public."OrderTimelineEvent",
  public."OrderSupportNote",
  public."TransactionalEmail",
  public."_prisma_migrations"
FROM PUBLIC;

DO $$
DECLARE
  api_role text;
  tables text := '
    public."Product",
    public."ProductVariant",
    public."ProductMedia",
    public."Inventory",
    public."Order",
    public."OrderItem",
    public."Payment",
    public."WebhookEvent",
    public."CustomOrderRequest",
    public."AdminResource",
    public."AdminAuditLog",
    public."OrderTimelineEvent",
    public."OrderSupportNote",
    public."TransactionalEmail",
    public."_prisma_migrations"';
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated']
  LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format(
        'REVOKE ALL PRIVILEGES ON TABLE %s FROM %I',
        tables,
        api_role
      );
    END IF;
  END LOOP;
END
$$;

COMMIT;
