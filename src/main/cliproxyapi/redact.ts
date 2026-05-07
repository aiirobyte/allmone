const REDACTED = '[REDACTED]'
const MIN_PARTIAL_REDACTION_LENGTH = 13

export function redactApiKey(value: string | null | undefined): string {
  return redactSecret(value)
}

export function redactManagementKey(value: string | null | undefined): string {
  return redactSecret(value)
}

export function redactSecret(value: string | null | undefined): string {
  if (!value) {
    return REDACTED
  }

  const trimmed = value.trim()

  if (trimmed.length < MIN_PARTIAL_REDACTION_LENGTH) {
    return REDACTED
  }

  return `${trimmed.slice(0, 4)}...${REDACTED}...${trimmed.slice(-4)}`
}

export function redactBearerToken(value: string): string {
  return value.replace(/\bBearer\s+[^\s,;]+/gi, `Bearer ${REDACTED}`)
}

export function redactUrlCredentials(value: string): string {
  return value.replace(
    /\b([a-z][a-z0-9+.-]*:\/\/)([^/\s@]+@)([^\s]+)/gi,
    (_match, scheme: string, _userinfo: string, rest: string) =>
      `${scheme}${REDACTED}@${rest}`
  )
}

export function redactCliProxyApiText(value: string): string {
  return redactInlineSecretTokens(redactBearerToken(redactUrlCredentials(value)))
}

function redactInlineSecretTokens(value: string): string {
  return value
    .replace(
      /(["']?(?:api-key|management-key)["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi,
      `$1${REDACTED}`
    )
    .replace(/\b(?:sk|pk|mgmt|provider)-[A-Za-z0-9._:-]+/g, REDACTED)
}
