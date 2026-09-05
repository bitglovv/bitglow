CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identities_user_id ON identities(user_id);
CREATE INDEX IF NOT EXISTS idx_identities_status ON identities(status);

CREATE TABLE IF NOT EXISTS identity_attributes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identity_id UUID NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
    attribute_type TEXT NOT NULL,
    attribute_value TEXT NOT NULL DEFAULT 'not_set',
    verification_status TEXT NOT NULL DEFAULT 'not_verified' CHECK (verification_status IN ('not_verified', 'verified', 'pending', 'revoked')),
    source TEXT NOT NULL DEFAULT 'internal',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (identity_id, attribute_type)
);

CREATE INDEX IF NOT EXISTS idx_identity_attributes_identity_id ON identity_attributes(identity_id);
CREATE INDEX IF NOT EXISTS idx_identity_attributes_type ON identity_attributes(attribute_type);
