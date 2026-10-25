# 🗄️ Blueprint de Infraestructura (Bare Metal) - Supabase (AUDITADO)

## 1. Objetivo y Contexto
Este script refleja la infraestructura REAL auditada el 20/04/2026. Soporta el flujo de Architect.Sys con capacidades de multi-tenencia mediante `owner_id`.

## 2. DDL Actual (Fuente de Verdad)

```sql
-- TABLA PRINCIPAL: chats
CREATE TABLE IF NOT EXISTS public.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    intent TEXT DEFAULT 'lead' CHECK (intent = ANY (ARRAY['venta','lead','rechazo'])),
    sentiment TEXT DEFAULT 'neutro' CHECK (sentiment = ANY (ARRAY['positivo','negativo','neutro'])),
    owner_id UUID, -- Gestionado por set_chats_owner_id()
    topic TEXT DEFAULT 'Otro',
    closing_stage TEXT DEFAULT 'atencion',
    strategic_note TEXT,
    status TEXT DEFAULT 'active'
);

-- TABLA CONFIGURACIÓN: bot_settings
CREATE TABLE IF NOT EXISTS public.bot_settings (
    phone TEXT PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_chats_phone ON public.chats(phone);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON public.chats(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_owner_id ON public.chats(owner_id);
```

## 3. Seguridad RLS Auditada
- **chats**: Políticas activas para acceso autenticado y filtrado por `owner_id`.
- **bot_settings**: Acceso total para usuarios autenticados.

## 4. Próxima Evolución (Pendiente de Aprobación)
Añadir columnas de inteligencia estratégica:
- `topic`: Categoría de consulta (Precio, Reserva, ROI, etc).
- `closing_stage`: Fase del embudo (Atención, Interés, Deseo, Acción).
- `strategic_note`: Justificación conductual de la IA.

## 5. DDL Añadido: Web Analytics y Leads Analytics

El siguiente DDL crea las tablas `web_analytics` y `leads_analytics` optimizadas para el tracking de comportamiento de usuario y análisis de leads. No ejecutar sin revisión de Alex.

```sql
-- Requiere la extensión pgcrypto para gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabla: web_analytics
CREATE TABLE IF NOT EXISTS public.web_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    referrer TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    user_agent TEXT,
    ip INET,
    screen_width INT,
    screen_height INT,
    device_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Índices para consultas comunes y agregaciones
CREATE INDEX IF NOT EXISTS idx_web_analytics_session ON public.web_analytics(session_id);
CREATE INDEX IF NOT EXISTS idx_web_analytics_path_created ON public.web_analytics(path, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_analytics_created_at ON public.web_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_analytics_ip ON public.web_analytics(ip);
CREATE INDEX IF NOT EXISTS idx_web_analytics_utm ON public.web_analytics(utm_source, utm_campaign);
-- Índice GIN para búsquedas dentro de metadata
CREATE INDEX IF NOT EXISTS idx_web_analytics_metadata_gin ON public.web_analytics USING GIN (metadata);

-- Tabla: leads_analytics
CREATE TABLE IF NOT EXISTS public.leads_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID,
    phone TEXT,
    email TEXT,
    source TEXT,
    campaign TEXT,
    payload JSONB DEFAULT '{}', -- Datos brutos del lead (form fields, utm, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas por contacto y tiempo
CREATE INDEX IF NOT EXISTS idx_leads_analytics_phone ON public.leads_analytics(phone);
CREATE INDEX IF NOT EXISTS idx_leads_analytics_email ON public.leads_analytics(email);
CREATE INDEX IF NOT EXISTS idx_leads_analytics_created_at ON public.leads_analytics(created_at DESC);
-- Índice GIN para payload JSON
CREATE INDEX IF NOT EXISTS idx_leads_analytics_payload_gin ON public.leads_analytics USING GIN (payload);

-- Nota: Si existe una tabla `leads` con `id UUID`, se puede añadir una FK opcional:
-- ALTER TABLE public.leads_analytics ADD CONSTRAINT fk_leads FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE SET NULL;

``` 
