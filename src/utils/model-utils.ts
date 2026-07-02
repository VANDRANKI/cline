import { ApiHandlerModel, ApiProviderInfo } from "@core/api"
import { AnthropicModelId, anthropicModels } from "@/shared/api"

const CLAUDE_VERSION_MATCH_REGEX = /[-_ ]([\d](?:\.[05])?)[-_ ]?/

/**
 * Determines whether the given provider is one of the providers that offers next-gen models
 * (as opposed to checking the specific model, see isNextGenModelFamily for that).
 * @param providerInfo The provider and model information
 * @returns true if the provider is a known next-gen model provider
 */
export function isNextGenModelProvider(providerInfo: ApiProviderInfo): boolean {
	const providerId = normalize(providerInfo.providerId)
	return [
		"cline",
		"anthropic",
		"gemini",
		"vertex",
		"openrouter",
		"openai",
		"minimax",
		"openai-native",
		"baseten",
		"vercel-ai-gateway",
		"oca",
	].some((id) => providerId === id)
}

/**
 * Determines if a model is known to not support Webp images.
 * @param apiHandlerModel The model to check
 * @returns true if the model's id indicates it doesn't support Webp images
 */
export function modelDoesntSupportWebp(apiHandlerModel: ApiHandlerModel): boolean {
	const modelId = apiHandlerModel.id.toLowerCase()
	return modelId.includes("grok")
}

/**
 * Determines if reasoning content should be skipped for a given model
 * Currently skips reasoning for:
 * - Grok-4 models since they only display "thinking" without useful information
 * - Devstral models since they don't support reasoning_details field
 */
export function shouldSkipReasoningForModel(modelId?: string): boolean {
	if (!modelId) {
		return false
	}
	return modelId.includes("grok-4") || modelId.includes("devstral") || modelId.includes("glm")
}

/**
 * Type guard that checks if a model id refers to a known Anthropic model.
 * @param modelId The model id to check
 * @returns true if the model id is a known Anthropic model id or references a Claude model family
 */
export function isAnthropicModelId(modelId: string): modelId is AnthropicModelId {
	const CLAUDE_MODELS = ["sonnet", "opus", "haiku"]
	return modelId in anthropicModels || CLAUDE_MODELS.some((substring) => modelId.includes(substring))
}

/**
 * Determines if a model id refers to Claude 4.0 or higher.
 * @param id The model id to check
 * @returns true if the model is an Anthropic model with a version of 4.0 or higher
 */
export function isClaude4PlusModelFamily(id: string): boolean {
	const modelId = normalize(id)
	// Claude Code short aliases are always Claude 4+
	// These are used by ClaudeCodeHandler.getModel() when user selects "sonnet" or "opus"
	// Check before isAnthropicModelId to avoid type guard narrowing issues
	if (modelId === "sonnet" || modelId === "opus") {
		return true
	}
	if (!isAnthropicModelId(modelId)) {
		return false
	}
	// Get model version number
	const versionMatch = modelId.match(CLAUDE_VERSION_MATCH_REGEX)
	if (!versionMatch) {
		return false
	}
	const version = parseFloat(versionMatch[1])
	// Check if version is 4.0 or higher
	return version >= 4
}

/**
 * Determines if a model id belongs to the Gemini 2.5 family.
 * @param id The model id to check
 * @returns true if the model id includes "gemini-2.5"
 */
export function isGemini2dot5ModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("gemini-2.5")
}

/**
 * Determines if a model id belongs to the Grok 4 family.
 * @param id The model id to check
 * @returns true if the model id includes "grok-4"
 */
export function isGrok4ModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("grok-4")
}

/**
 * Determines if a model id belongs to the GPT-5 family (any minor version).
 * @param id The model id to check
 * @returns true if the model id includes "gpt-5" or "gpt5"
 */
export function isGPT5ModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("gpt-5") || modelId.includes("gpt5")
}

/**
 * Determines if a model id refers specifically to GPT-5.1.
 * @param id The model id to check
 * @returns true if the model id includes "gpt-5.1" or "gpt-5-1"
 */
export function isGPT51Model(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("gpt-5.1") || modelId.includes("gpt-5-1")
}

/**
 * Determines if a model id refers specifically to GPT-5.2.
 * @param id The model id to check
 * @returns true if the model id includes "gpt-5.2" or "gpt-5-2"
 */
export function isGPT52Model(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("gpt-5.2") || modelId.includes("gpt-5-2")
}

/**
 * Determines if a model id belongs to the GLM 4.5/4.6 family.
 * @param id The model id to check
 * @returns true if the model id references a supported GLM model
 */
export function isGLMModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return (
		modelId.includes("glm-4.6") ||
		modelId.includes("glm-4.5") ||
		modelId.includes("z-ai/glm") ||
		modelId.includes("zai-org/glm")
	)
}

/**
 * Determines if a model id belongs to the Minimax family.
 * @param id The model id to check
 * @returns true if the model id includes "minimax"
 */
export function isMinimaxModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("minimax")
}

/**
 * Determines if a model id belongs to the Hermes 4 family, across common naming variants
 * used by different providers (e.g. "nous/hermes-4", "nousresearch/hermes4").
 * @param id The model id to check
 * @returns true if the model id references a supported Hermes 4 model
 */
export function isHermesModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return (
		modelId.includes("hermes-4") ||
		modelId.includes("hermes4") ||
		modelId.includes("nous/hermes-4") ||
		modelId.includes("nous/hermes4") ||
		modelId.includes("nous-hermes-4") ||
		modelId.includes("nous/hermes4") ||
		modelId.includes("nousresearch/hermes-4") ||
		modelId.includes("nousresearch/hermes4")
	)
}

/**
 * Determines if a model id belongs to a next-gen open source model family (e.g. Kimi K2).
 * @param id The model id to check
 * @returns true if the model id references a supported next-gen open source model
 */
export function isNextGenOpenSourceModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return ["kimi-k2"].some((substring) => modelId.includes(substring))
}

/**
 * Determines if a model id belongs to the Devstral family.
 * @param id The model id to check
 * @returns true if the model id includes "devstral"
 */
export function isDevstralModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("devstral")
}

/**
 * Determines if a model id belongs to the Gemini 3 family.
 * @param id The model id to check
 * @returns true if the model id includes "gemini3" or "gemini-3"
 */
export function isGemini3ModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("gemini3") || modelId.includes("gemini-3")
}

/**
 * Determines if a model id belongs to the DeepSeek 3.2 family, excluding the "Speciale" variant.
 * @param id The model id to check
 * @returns true if the model id references DeepSeek 3.2 (non-Speciale)
 */
function isDeepSeek32ModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return modelId.includes("deepseek") && modelId.includes("3.2") && !modelId.includes("speciale")
}

/**
 * Determines if a model id belongs to any known next-gen model family, aggregating all of the
 * individual family checks in this module (Claude 4+, Gemini 2.5/3, Grok 4, GPT-5, Minimax, etc.).
 * @param id The model id to check
 * @returns true if the model id belongs to a next-gen model family
 */
export function isNextGenModelFamily(id: string): boolean {
	const modelId = normalize(id)
	return (
		isClaude4PlusModelFamily(modelId) ||
		isGemini2dot5ModelFamily(modelId) ||
		isGrok4ModelFamily(modelId) ||
		isGPT5ModelFamily(modelId) ||
		isMinimaxModelFamily(modelId) ||
		isGemini3ModelFamily(modelId) ||
		isNextGenOpenSourceModelFamily(modelId) ||
		isDeepSeek32ModelFamily(modelId)
	)
}

/**
 * Determines if the given provider runs models locally (e.g. LM Studio, Ollama).
 * @param providerInfo The provider and model information
 * @returns true if the provider is a known local model provider
 */
export function isLocalModel(providerInfo: ApiProviderInfo): boolean {
	const localProviders = ["lmstudio", "ollama"]
	return localProviders.includes(normalize(providerInfo.providerId))
}

/**
 * Parses a price string and converts it from per-token to per-million-tokens
 * @param priceString The price string to parse (e.g. from API responses)
 * @returns The price multiplied by 1,000,000 for per-million-token pricing, or 0 if invalid
 */
export function parsePrice(priceString: string | undefined): number {
	if (!priceString || priceString === "" || priceString === "0") {
		return 0
	}
	const parsed = parseFloat(priceString)
	if (Number.isNaN(parsed)) {
		return 0
	}
	// Convert from per-token to per-million-tokens (multiply by 1,000,000)
	return parsed * 1_000_000
}

/**
 * Determines if the given provider and model combination will use native tool calling.
 * Helpful if we need to quickly check this for prompts or other logic.
 * @param providerInfo The provider and model information
 * @param enableNativeToolCalls Whether the native tool calls setting is enabled
 * @returns true if the model will use native tool calling, false otherwise
 */
export function isNativeToolCallingConfig(providerInfo: ApiProviderInfo, enableNativeToolCalls: boolean): boolean {
	if (!enableNativeToolCalls) {
		return false
	}
	if (!isNextGenModelProvider(providerInfo)) {
		return false
	}
	const modelId = providerInfo.model.id.toLowerCase()
	return isNextGenModelFamily(modelId)
}

function normalize(text: string): string {
	return text.trim().toLowerCase()
}
