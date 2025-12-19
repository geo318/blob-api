export function hasKey<V = unknown, K = string>(
	input: unknown,
	key: K,
): input is Record<string, unknown> & { [key in K as string]: V } {
	return Boolean(
		input && typeof input === "object" && (key as string) in input,
	);
}
