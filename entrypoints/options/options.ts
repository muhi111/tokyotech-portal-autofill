import { storage } from "#imports";

const STORAGE_KEY = "local:matrixCode";
const TOTAL_CODES = 70;

const isStringArray70 = (value: unknown): value is string[] => {
	return (
		Array.isArray(value) &&
		value.length === TOTAL_CODES &&
		value.every((item) => typeof item === "string")
	);
};

document.addEventListener("DOMContentLoaded", async () => {
	const matrixInput = document.getElementById("matrix") as HTMLTextAreaElement;
	const saveButton = document.getElementById(
		"save_button",
	) as HTMLButtonElement;

	if (!matrixInput || !saveButton) {
		console.error("Failed to find DOM elements");
		return;
	}

	try {
		const matrix = await storage.getItem<string[]>(STORAGE_KEY);
		if (isStringArray70(matrix)) {
			matrixInput.value = JSON.stringify(matrix);
		}
	} catch (error) {
		console.error("Failed to load matrix code:", error);
	}

	saveButton.addEventListener("click", async () => {
		const text = matrixInput.value;
		let parsed: unknown;

		try {
			parsed = JSON.parse(text);
		} catch {
			alert("JSON形式が不正です");
			return;
		}

		if (!isStringArray70(parsed)) {
			alert("70個の文字列配列を入力してください");
			return;
		}

		try {
			await storage.setItem(STORAGE_KEY, parsed);
			alert("保存しました");
		} catch (error) {
			alert(`保存に失敗しました: ${(error as Error).message}`);
		}
	});
});
