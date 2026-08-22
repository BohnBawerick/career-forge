# Bring-your-own-key provider layer

Research for issue #5. Facts checked 2026-08-22 against provider docs and library repos. Prices
move; re-check before quoting any number to a user.

## Recommendation

Launch with four providers, in two tiers. Anthropic, OpenAI and Google Gemini are tier 1: all three
constrain output to a JSON schema at decode time, all three take a plain API key in a header, and
between them they cover almost every key a user already owns. Ollama is tier 2, supported and
documented but flagged in the UI as best-effort, because its schema conformance depends entirely on
which local model the user pulled and Ollama's own docs tell you to repeat the schema in the prompt
rather than trust the constraint. For the abstraction, use the Vercel AI SDK v7 (`ai` plus
`@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google`, `@ai-sdk/openai-compatible` for Ollama)
**if the backend is Node or TypeScript**. It is the only option that reaches each provider's native
constrained decoding rather than degrading everything to tool-calling, it emits no telemetry until
you register a collector, and it costs four dependencies instead of three hand-written adapters.
If the backend turns out to be .NET, as the mrb-platform reference stack suggests, the equivalent
answer is `Microsoft.Extensions.AI` and `IChatClient`, and this document's abstraction section needs
a second pass. Do not build on an OpenAI-compatible endpoint alone: Anthropic's compatibility layer
ignores `response_format` and tool `strict` outright, which would silently break the evidence-id
guarantee that is the whole point of the product.

One design note that outranks the provider choice. Constrained decoding can guarantee that a
generated resume line carries a field called `evidence_id` holding a string. It cannot guarantee the
string names a real record. Put the candidate ids in an `enum` in the schema for that request, which
all three hosted providers support, and then validate every returned id against the evidence store
anyway before the line reaches a document. The schema is the first gate, not the only one.

## Provider comparison

| | Anthropic | OpenAI | Google Gemini | Ollama (local) |
|---|---|---|---|---|
| Auth | `x-api-key: <key>` plus `anthropic-version` ([docs](https://platform.claude.com/docs/en/api/overview)) | `Authorization: Bearer <key>`; `OpenAI-Organization` / `OpenAI-Project` optional ([docs](https://developers.openai.com/api/docs/api-reference/authentication)) | `x-goog-api-key: <key>`, key bound to a Google Cloud project ([docs](https://ai.google.dev/gemini-api/docs/api-key)) | none; the local server has no documented auth ([docs](https://docs.ollama.com/api)) |
| Interview model | `claude-sonnet-5` | `gpt-5.6-terra` | `gemini-3.7-flash` | `gemma4:12b`, `qwen3.6`, `granite4.1` |
| Extraction model | `claude-haiku-4-5` or `claude-sonnet-5` | `gpt-5.6-luna` | `gemini-3.5-flash-lite` | `granite4.1:8b` |
| Input $/1M | Sonnet 5 $2.00, Haiku 4.5 $1.00, Opus 5 $5.00 | terra $2.00, luna $0.20, sol $4.00 | 3.7-flash $0.75\*, 3.5-flash-lite $0.30 | 0 |
| Output $/1M | Sonnet 5 $10.00, Haiku 4.5 $5.00, Opus 5 $25.00 | terra $12.00, luna $1.20, sol $20.00 | 3.7-flash $3.75\*, 3.5-flash-lite $2.50 | 0 |
| Cached input $/1M | 0.1x base (Sonnet 5 $0.20) | 0.1x base (terra $0.20) | 0.1x base (3.7-flash $0.075) | n/a |
| Schema-constrained output | `output_config.format`, GA, constrained decoding | `text.format` with `strict: true` | `responseMimeType` + `responseSchema` | `format` takes a JSON schema |
| Prompt caching | explicit or top-level auto `cache_control` | automatic at 1,024 tokens | implicit, on by default | n/a |

\* Gemini 3.7 Flash prices are promotional through 2026-12-31 and double to $1.50 / $7.50 after
([pricing](https://ai.google.dev/gemini-api/docs/pricing)). Anthropic prices from the
[pricing page](https://platform.claude.com/docs/en/about-claude/pricing); OpenAI from the
[pricing page](https://developers.openai.com/api/docs/pricing.md).

Things worth knowing that do not fit a table.

Anthropic's Sonnet 5 introductory price of $2 / $10 is now the standard price; the increase to
$3 / $15 scheduled for 2026-09-01 was cancelled ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)).
Claude 4.7 and later use a newer tokenizer that produces roughly 30% more tokens for the same text
than Sonnet 4.6 and earlier, so a cost comparison across Claude generations needs the
`count_tokens` endpoint rather than arithmetic on the headline rate.

Google tells you plainly not to put the key in a web or mobile client and to run a backend proxy
instead ([api-key doc](https://ai.google.dev/gemini-api/docs/api-key)), which is the shape this app
already has. Two gotchas: Google recommends origin and IP restrictions on the key, and since
May 2026 the API blocks unrestricted keys that have gone dormant. A user whose key stops working
after a quiet month will blame the app, so the error path needs to say what actually happened.
Vertex AI is a separate door with service-account OAuth, not an API key, and is out of scope for v1.

Ollama's maintainers rejected the pull request that would have added server-side API keys and point
at a reverse proxy instead ([ollama/ollama#9131](https://github.com/ollama/ollama/pull/9131)), so
treat a local Ollama endpoint as unauthenticated and let the user supply a base URL plus optional
bearer token for whatever proxy they put in front of it. Ollama also has a hosted cloud tier now
that does use `Authorization: Bearer` ([docs](https://docs.ollama.com/cloud)), and its docs state
that the cloud "currently does not support structured outputs". If the app ever offers a cloud
Ollama option, it is not interchangeable with the local one.

## Abstraction options, judged

| Option | Version | Licence | Field coverage | Structured output | Maintenance risk | Self-host fit |
|---|---|---|---|---|---|---|
| OpenAI-compatible endpoint only | `openai` 7.5.0 | Apache-2.0 | poor | broken on Anthropic | low | good |
| LiteLLM | 1.97.0 | MIT (with `enterprise/` carve-out) | very wide | via OpenAI shape | ~4,991 open issues | proxy sees the key |
| Vercel AI SDK v7 | `ai` 7.0.77 | Apache-2.0 | wide, first-party | native per provider | v6 to v7 was a breaking release | no phone-home |
| LangChain.js | 1.5.10 | MIT | very wide | `responseFormat` + fallback | v0.3 to v1 was a rewrite | tracing opt-in |
| Native SDKs behind own interface | see below | MIT / Apache-2.0 | exactly what you write | native per provider | none beyond the SDKs | best |

**OpenAI-compatible endpoint only.** Tempting, and wrong here. Anthropic's own documentation says
the compatibility layer "is primarily intended to test and compare model capabilities, and is not
considered a long-term or production-ready solution", and lists `response_format` as ignored, tool
`strict` as ignored, prompt caching as unsupported, and `reasoning_effort` as ignored
([docs](https://platform.claude.com/docs/en/api/openai-sdk)). Ignored, not rejected. The request
succeeds and the schema quietly does nothing, which is the worst possible failure mode for a feature
whose job is to force an evidence id into every generated line. Google's layer is better but still
beta and silently ignores unlisted parameters ([docs](https://ai.google.dev/gemini-api/docs/openai)).
Keep this route as the escape hatch for "some other OpenAI-compatible endpoint the user has", not as
the base of the layer.

**LiteLLM.** Widest provider coverage of anything here, and it does not phone home when self-hosted
([data security](https://docs.litellm.ai/docs/data_security)). Two problems. There is no first-party
general TypeScript client, so the documented JS path is the `openai` package pointed at the LiteLLM
proxy, which drags the whole OpenAI-compatible problem back in. And a proxy is one more process that
holds every user's key in cleartext. In a self-hosted app that is an extra box to run and secure for
no gain over calling the provider directly. 57k stars and nearly 5,000 open issues
([repo](https://github.com/BerriAI/litellm)) is a project moving fast in a direction that is not
this one.

**Vercel AI SDK v7.** First-party `@ai-sdk/anthropic` and `@ai-sdk/google`; Ollama is community-only
but `@ai-sdk/openai-compatible` covers it, which is exactly the case where the OpenAI shape does
work. Its Anthropic provider exposes `structuredOutputMode` with an `outputFormat` setting that
uses Anthropic's native constrained decoding rather than a JSON tool
([provider docs](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic)), and it passes through
`cacheControl` including the 1-hour TTL. That is the specific thing that makes it worth a dependency:
one `generateObject` call site, three native implementations underneath. Telemetry is OpenTelemetry
to a collector you register, and emits nothing until you do
([docs](https://ai-sdk.dev/docs/ai-sdk-core/telemetry)). Risk is churn. v7 requires Node 22 and ESM
and renamed `system` to `instructions` ([migration guide](https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0)),
so budget a day for the next major.

**LangChain.js.** Structured output in v1 is `responseFormat` with a provider-native strategy and an
automatic tool-calling fallback ([docs](https://docs.langchain.com/oss/javascript/langchain/structured-output)),
which is technically what we want. LangSmith tracing is opt-in via `LANGSMITH_TRACING`
([env vars](https://docs.langchain.com/langsmith/env-var)), so the phone-home objection is
answerable. The objection I cannot answer is churn: v0.3 to v1 was another rewrite, and this app
needs maybe two call shapes. LangChain is priced for a much larger surface than we are buying.

**Native SDKs behind a thin interface.** `@anthropic-ai/sdk` 0.120.0, `openai` 7.5.0,
`@google/genai` 2.18.0, plus HTTP for Ollama. Full feature access, no framework majors to chase,
and every byte that leaves the process is one you wrote. The cost is three adapters mapping the same
concepts three ways, and you will write the AI SDK's provider layer badly before you write it well.
Reasonable fallback if the AI SDK's release cadence becomes a problem; not the place to start.

### The config switch for server-supplied keys

Whatever the abstraction, the switch is ours, not the library's. Put a credential resolver in front
of the provider client with an ordered chain: the account's own stored key, then, only if
`SERVER_KEY_MODE` is on and the account is entitled to it, the server key from the deployment's
secret store. v1 ships with the second link disabled and no server key configured. The managed tier
later turns it on and adds an entitlement check and a usage meter at the same seam. Getting this
right now costs one interface; retrofitting it costs a rewrite of every call site, which is what
the ticket is asking to avoid.

## Structured output support

Ranked by how much of the evidence-id guarantee each provider can carry.

**Anthropic** is the strongest. `output_config.format` with `type: "json_schema"` is GA, no beta
header, and the docs claim constrained decoding at generation time rather than post-hoc validation:
always valid JSON, field types and required fields guaranteed, no retry loop
([docs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)). `strict: true`
on a tool definition gives the same guarantee for tool inputs. Supported: `enum` over strings,
numbers, bools and nulls, `const`, `anyOf`, `$ref` to local definitions, `required`, and
`additionalProperties: false` (required on objects). Not supported: recursive schemas, `minimum` /
`maximum`, `minLength` / `maxLength`, `maxItems`, external `$ref`. Two gotchas worth writing down.
Compiling a new schema adds latency to the first request using it, then the compiled grammar is
cached for 24 hours. And changing `output_config.format` invalidates the prompt cache for that
thread, so do not vary the schema mid-interview.

**OpenAI** is equally strong and slightly stricter about what it demands from you. Responses API,
`text: { format: { type: "json_schema", strict: true, schema } }`
([guide](https://developers.openai.com/api/docs/guides/structured-outputs.md)). Strict mode requires
every property listed in `required` and `additionalProperties: false` on every object, and the root
must be an object rather than an `anyOf`. In exchange it supports more of JSON Schema than Anthropic
does, including `pattern`, `multipleOf`, `minimum` / `maximum`, `minItems` / `maxItems`. Limits are
5,000 properties, 10 levels of nesting, 1,000 enum values, 120k characters across names and enum
values. The 1,000-enum ceiling matters directly: an account with more than a thousand evidence
records cannot have every id in one enum, so the schema has to carry only the ids relevant to the
job being applied for. Which is what you want anyway. Separately, the model can still refuse, and a
refusal arrives in a `refusal` field rather than as schema-valid output, so that branch needs
handling.

**Gemini** is good enough but do not lean on it. `responseMimeType: "application/json"` plus
`responseSchema` ([docs](https://ai.google.dev/gemini-api/docs/structured-output)). The supported
subset covers `enum`, `required`, `additionalProperties`, `minItems` / `maxItems`, `minimum` /
`maximum` and `format`. Not listed, so treat as unsupported: `minLength`, `patternProperties`,
`allOf`, `oneOf`. `$ref: "#"` works for self-recursion only. The docs themselves warn that very
large or deeply nested schemas may be rejected, and that valid JSON does not mean valid values.
That second sentence is Google telling you to validate anyway.

**Ollama** supports schema-constrained output through the `format` parameter
([docs](https://docs.ollama.com/capabilities/structured-outputs)), and the same via `response_format`
on the `/v1` endpoint. Tool calling works on models tagged with the `tools` capability. The caveat is
in Ollama's own advice: set temperature to 0 and "pass the JSON schema as a string in the prompt to
ground the model's response". A library that says to also put the schema in the prompt is telling
you the constraint alone is not reliable. Conformance varies by model and nobody in this research
benchmarked it, so v1 should validate-and-retry on the Ollama path and say so in the UI.

The rule that falls out of all four: every generated line goes through the same validator on the way
out, regardless of provider. The schema narrows the failure rate. The validator is what makes the
guarantee true.

## Key storage practice

The target shape, per credential row: `ciphertext`, `nonce`, `tag`, `dek_wrapped`, `kek_id`, `alg`,
`last4`, `verified_at`. AES-256-GCM with a fresh 96-bit random nonce and a per-record data
encryption key, wrapped by a key encryption key that lives outside the database.

**Envelope encryption.** OWASP describes the pattern directly: data encryption keys encrypt the
data, key encryption keys encrypt the DEKs, and the wrapped DEK can sit next to the ciphertext
because it is useless without the KEK
([Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)).
Google's KMS docs put it more bluntly: do not store a plaintext DEK
([envelope encryption](https://docs.cloud.google.com/kms/docs/envelope-encryption)). ASVS 5.0 11.3.2
requires an approved cipher and mode such as AES with GCM
([ASVS V11](https://github.com/OWASP/ASVS/blob/master/5.0/en/0x20-V11-Cryptography.md)).
XChaCha20-Poly1305 is a defensible alternative with a 192-bit nonce, but it is not NIST-approved and
that will matter if the managed tier ever faces a compliance question.

**Nonces.** NIST SP 800-38D caps the probability of reusing an (IV, key) pair at 2^-32 and the number
of invocations per key at 2^32. A fresh DEK per record means the counter never gets close, so a
96-bit random nonce from a proper RNG is fine. The failure mode to avoid is a single global key with
a fixed or reused IV.

**Bind the ciphertext to its row.** Use the AAD field. AWS documents encryption context as
cryptographically bound to the ciphertext, so the same context is required to decrypt
([docs](https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html)). Set
AAD = `account_id | credential_id | provider | kek_id`. Copying a row into another account's record
then fails to decrypt instead of silently working. This is the control most implementations skip.

**Where the KEK lives.** OWASP's order of preference is HSM, then a cloud key vault, then an external
secrets service, and it explicitly warns against hardcoding, version control, and environment
variables, which leak through `/proc/self/environ` and get included in logs
([Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)).
Self-hosted deployments will realistically use an env var or an age/SOPS file, so make the KEK
provider pluggable and document the env-var mode as the weaker one. The managed tier uses AWS KMS,
GCP KMS or Vault Transit, where the key never leaves the vault
([Vault transit](https://developer.hashicorp.com/vault/docs/secrets/transit)).

**What database encryption does not buy you.** OWASP is direct: transparent data encryption and
filesystem encryption defend against physical theft and give no protection when an attacker
compromises the server remotely. The PostgreSQL pgcrypto docs say the same about their own functions,
which run server-side with keys and data in the clear between the extension and the client, and
recommend doing the crypto in the client application if you cannot trust the DBA
([pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html)). So SQL injection, a leaked read
replica, a `pg_dump` backup and the database administrator all still see plaintext under TDE alone.

**Rotation.** Store `kek_id` next to the ciphertext. Rotating the KEK then re-wraps DEKs, one small
update per row, without ever touching a plaintext provider key. Vault's format does exactly this
(`vault:v1:<payload>`) and offers a `rewrap` endpoint that never exposes plaintext. NIST SP 800-57
Part 1 Rev 5 §5.3.6 puts the originator-usage period for a symmetric data-encryption key and for a
key-wrapping key at under two years, so set the KEK cryptoperiod at one year and write it down; ASVS
11.1.1 wants the lifecycle documented. For the user's own provider key, the app cannot revoke it. On
rotation, overwrite the row with a new DEK and nonce, bump the version, drop any cached copy, log the
event and not the value, and tell the user to revoke the old key at the provider console.

**Never logging it.** OWASP's Logging Cheat Sheet lists access tokens and encryption keys as
must-not-log ([link](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)). ASVS
16.2.5 forbids logging credentials at all; 16.5.1 forbids stack traces, queries, secret keys and
tokens in responses to the consumer; 14.2.1 keeps keys out of URLs and query strings; 14.3.3 keeps
sensitive data out of browser storage. Sentry is the specific trap. By default it captures request
headers, query strings, breadcrumbs and local variables in stack traces, so it needs `beforeSend`,
`sendDefaultPii: false`, and server-side scrubbing rules
([docs](https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/)). Three
implementation habits that work: an allowlist for structured log fields rather than a denylist, a
`toJSON` and `util.inspect.custom` scrubber on the credential model so it cannot serialize by
accident, and a branded secret type that only unwraps at the provider call site.

**Never sending it anywhere but the provider.** Deny outbound by default and allowlist
`api.anthropic.com`, `api.openai.com`, `generativelanguage.googleapis.com`, plus whatever base URL
the user configured for Ollama. The abstraction risk is concrete: any aggregator or gateway
(LiteLLM, OpenRouter, an MCP proxy) receives the key in cleartext by design. That is another reason
the AI SDK beats a gateway here, since it calls the provider from our process rather than routing
through a third party.

**On entry and on display.** Validate a key by using it once against a cheap endpoint, store the
boolean plus a timestamp, and never echo the key in the validation error. Make the field write-only
and return `last4`, provider, and timestamps to the client. Never return the ciphertext.

**How the field actually does it, for calibration.** LibreChat encrypts stored credentials with a
single `CREDS_KEY` from an env var; the source shows v1 using AES-CBC with a fixed env IV and the
current v3 using `aes-256-ctr` with a random IV, so no AEAD, no auth tag, no AAD, no per-account
binding ([docs](https://www.librechat.ai/docs/configuration/dotenv)). The `v3:` version prefix is
the one good idea to copy. Open WebUI's application-level encryption covers OAuth session tokens
only, and its documented answer for provider secrets at rest is whole-database encryption
([hardening](https://docs.openwebui.com/getting-started/advanced-topics/hardening/)), which is
exactly the control OWASP says fails against a remote compromise. Dify is closest to a real envelope
scheme, with a per-tenant RSA keypair wrapping a random AES key used in EAX mode
([rsa.py](https://github.com/langgenius/dify/blob/main/api/libs/rsa.py)), but it leaves the private
key as a plain file at `privkeys/{tenant_id}/private.pem`, so anyone who reads that path decrypts
every credential for the tenant. The bar in this corner of the field is low. Clearing it is not
expensive.

## Cost and latency estimates

Assumptions, stated so the numbers can be rechecked. One application runs a 12-turn interview with a
stable prefix of about 4,000 tokens (system prompt, job ad, relevant inventory records), about 300
tokens of user answer and 250 tokens of model question per turn. That is roughly 84,000 input tokens
and 3,000 output tokens across the interview if nothing is cached. Evidence extraction plus resume
and cover-letter generation adds roughly 14,000 input and 4,500 output tokens. Real numbers will move
with prompt design, and Claude 4.7-and-later token counts run about 30% above the older tokenizer for
the same text, so treat cross-family comparisons as indicative.

| Model | Interview, no cache | Interview, cached | Extraction + generation | Per application |
|---|---|---|---|---|
| `claude-sonnet-5` | $0.20 | $0.07 | $0.07 | ~$0.14 |
| `claude-haiku-4-5` | $0.10 | $0.10 | $0.04 | ~$0.14 |
| `claude-opus-5` | $0.50 | $0.16 | $0.18 | ~$0.34 |
| `gpt-5.6-terra` | $0.21 | $0.08 | $0.08 | ~$0.16 |
| `gpt-5.6-luna` | $0.02 | $0.01 | $0.01 | ~$0.02 |
| `gemini-3.7-flash` | $0.07 | $0.03 | $0.03 | ~$0.06 |
| Ollama, local | $0 | $0 | $0 | $0 |

Two cents to thirty-four cents per application is a wide range, and it is the range that makes
bring-your-own-key workable. Even the expensive corner is under a dollar. A user applying to fifty
jobs a month spends somewhere between one and seventeen dollars on their own key, which is a number
you can put in the README without flinching.

**Prompt caching applies, and it is the single largest lever on the interview.** A multi-turn
interview is the textbook case: a fixed prefix that grows monotonically, re-sent every turn. On
Anthropic, a top-level `cache_control` moves the breakpoint forward automatically as the conversation
grows, so each turn reads the prior history from cache and writes only the delta
([docs](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)). Cache reads cost 0.1x
base input, a 5-minute write costs 1.25x, so caching pays for itself after a single read. On the
numbers above that is roughly a 65% cut on the interview. OpenAI caches automatically above 1,024
tokens at 0.1x, with GPT-5.6 adding explicit breakpoints, a 30-minute TTL, and a 1.25x write charge
([docs](https://developers.openai.com/api/docs/guides/prompt-caching.md)). Gemini caches implicitly
by default.

Three threshold details decide whether caching engages at all. Minimum cacheable prefix on Claude is
512 tokens for Opus 5 but 4,096 for Haiku 4.5 and Opus 4.6, so the cheap Claude model gets no caching
benefit at a 4,000-token prefix, which is why Haiku and Sonnet 5 land at the same per-application
cost above. Gemini's implicit cache threshold is 4,096 tokens on the 3.x line, right at our assumed
prefix size, so the interview prefix should be designed to clear it comfortably. And on Anthropic,
changing `output_config.format` invalidates the thread's cache, so the interview and the extraction
step want separate threads rather than a schema swap mid-conversation.

Latency, briefly. The interview is the only latency-sensitive path, because a person is sitting there
waiting for the next question. Stream it, run the interview turn with low reasoning effort, and save
the higher effort for extraction and generation, which happen once and can show a progress state.
Anthropic's grammar compilation adds a one-off delay the first time a given schema is used, cached
for 24 hours after, so a rarely-used schema pays that cost on nearly every request. Ollama latency is
whatever the user's hardware does, and a 12-turn interview on a 12B model on a laptop is a different
product experience from the same interview on Sonnet. Set expectations in the UI.

## Open questions

1. **What is the backend language?** This is the one blocker. The AI SDK recommendation holds for
   Node/TypeScript. The mrb-platform reference stack is .NET 10 plus Nuxt 4, and if career-forge
   follows it, the answer is `Microsoft.Extensions.AI` with `IChatClient` and `GetResponseAsync<T>`
   ([docs](https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai)). Note its
   `useJsonSchemaResponseFormat` flag defaults to true and errors on models without native schema
   support, so the capability matrix below is needed either way. Ties to open question 5.
2. **Do we ship a provider capability matrix?** Structured output, tool use, caching and streaming
   all vary. The layer should expose capabilities so the UI can grey out "generate resume" on a
   provider or model that cannot constrain output, rather than failing at generation time.
3. **How many evidence records go into the enum?** OpenAI caps enums at 1,000 values and 120k
   characters. Selecting the relevant subset per job is required above that, and is probably the
   right design at any size, but the selection rule is unwritten.
4. **Does any provider's terms of service restrict an app accepting end-user keys?** Not found in
   this research and not confirmed absent. Worth a lawyer-grade read before the managed tier, since
   that is where a server key and a user key coexist.
5. **What is the local-model schema conformance floor?** Nobody benchmarked `granite4.1`, `gemma4` or
   `qwen3.6` against a real evidence schema. Until someone does, Ollama ships with retry-on-invalid
   and a UI warning, and the tier-2 label is a guess rather than a measurement.
6. **Should the managed tier meter by token or by application?** Affects where the usage hook goes in
   the credential resolver, and it is cheaper to put it in now than to add it later.

## Sources

Anthropic

- https://platform.claude.com/docs/en/about-claude/pricing
- https://platform.claude.com/docs/en/build-with-claude/structured-outputs
- https://platform.claude.com/docs/en/build-with-claude/prompt-caching
- https://platform.claude.com/docs/en/api/overview
- https://platform.claude.com/docs/en/api/openai-sdk

OpenAI

- https://developers.openai.com/api/docs/api-reference/authentication
- https://developers.openai.com/api/docs/pricing.md
- https://developers.openai.com/api/docs/guides/structured-outputs.md
- https://developers.openai.com/api/docs/guides/prompt-caching.md

Google

- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/models
- https://ai.google.dev/gemini-api/docs/pricing
- https://ai.google.dev/gemini-api/docs/structured-output
- https://ai.google.dev/gemini-api/docs/caching
- https://ai.google.dev/gemini-api/docs/openai
- https://docs.cloud.google.com/kms/docs/envelope-encryption

Ollama

- https://docs.ollama.com/api
- https://docs.ollama.com/api/openai-compatibility
- https://docs.ollama.com/capabilities/structured-outputs
- https://docs.ollama.com/cloud
- https://github.com/ollama/ollama/pull/9131

Abstractions

- https://ai-sdk.dev/providers/ai-sdk-providers/anthropic
- https://ai-sdk.dev/providers/ai-sdk-providers
- https://ai-sdk.dev/docs/ai-sdk-core/telemetry
- https://ai-sdk.dev/docs/migration-guides/migration-guide-7-0
- https://vercel.com/changelog/ai-sdk-7
- https://docs.langchain.com/oss/javascript/langchain/structured-output
- https://docs.langchain.com/langsmith/env-var
- https://docs.litellm.ai/docs/data_security
- https://github.com/BerriAI/litellm
- https://learn.microsoft.com/en-us/dotnet/ai/microsoft-extensions-ai

Key storage

- https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- https://github.com/OWASP/ASVS/blob/master/5.0/en/0x20-V11-Cryptography.md
- https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html
- https://developer.hashicorp.com/vault/docs/secrets/transit
- https://www.postgresql.org/docs/current/pgcrypto.html
- https://docs.sentry.io/platforms/javascript/data-management/sensitive-data/
- https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-38d.pdf
- https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-57pt1r5.pdf
- https://www.librechat.ai/docs/configuration/dotenv
- https://docs.openwebui.com/getting-started/advanced-topics/hardening/
- https://github.com/langgenius/dify/blob/main/api/libs/rsa.py
