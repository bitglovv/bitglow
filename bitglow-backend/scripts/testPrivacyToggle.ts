const apiUrl = process.env.PRIVACY_TEST_API_URL?.replace(/\/$/, "");
const token = process.env.PRIVACY_TEST_TOKEN;

if (!apiUrl || !token) {
    throw new Error("Set PRIVACY_TEST_API_URL and PRIVACY_TEST_TOKEN before running this test.");
}

type PrivacyResponse = { ok: true; isPrivate: boolean };
type MeResponse = { isPrivate: boolean };

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, {
        ...options,
        headers: {
            Authorization: `Bearer ${token}`,
            ...(options.body ? { "Content-Type": "application/json" } : {}),
            ...options.headers,
        },
    });

    if (!response.ok) {
        throw new Error(`${options.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
    }

    return response.json() as Promise<T>;
}

async function setPrivacy(isPrivate: boolean) {
    const result = await request<PrivacyResponse>("/api/settings/privacy", {
        method: "PUT",
        body: JSON.stringify({ isPrivate }),
    });

    if (result.ok !== true || result.isPrivate !== isPrivate) {
        throw new Error(`Expected privacy response ${isPrivate}, received ${JSON.stringify(result)}`);
    }

    const currentUser = await request<MeResponse>("/api/me");
    if (currentUser.isPrivate !== isPrivate) {
        throw new Error(`Expected GET /api/me isPrivate=${isPrivate}, received ${JSON.stringify(currentUser)}`);
    }
}

async function run() {
    // Covers false -> true, true -> false, both idempotent writes, and repeated transitions.
    for (const value of [false, true, true, false, true, false, true, false]) {
        await setPrivacy(value);
    }

    console.log("Privacy toggle verification passed: final isPrivate=false.");
}

void run();
