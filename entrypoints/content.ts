import { defineContentScript, storage } from "#imports";

export default defineContentScript({
	matches: ["https://portal.nap.gsic.titech.ac.jp/GetAccess/Login*"],
	main() {
		const STORAGE_KEY = "local:matrixCode";
		const COLUMNS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"] as const;
		const ROW_COUNT = 7;
		const LOG_PREFIX = "[TokyoTech Portal Autofill]";

		const extractCellKey = (text: string): string | null => {
			const bracketComma = text.match(/\[([A-J]),([1-7])\]/);
			if (bracketComma) {
				return `${bracketComma[1]}${bracketComma[2]}`;
			}

			return null;
		};

		const cellKeyToIndex = (key: string): number | null => {
			const column = key.charAt(0);
			const row = Number.parseInt(key.charAt(1), 10);
			const columnIndex = COLUMNS.indexOf(column as (typeof COLUMNS)[number]);

			if (columnIndex < 0 || row < 1 || row > ROW_COUNT) {
				return null;
			}

			return columnIndex * ROW_COUNT + (row - 1);
		};

		const readPromptCellKeyByInputName = (inputName: string): string | null => {
			const input = document.querySelector<HTMLInputElement>(
				`input[name="${inputName}"]`,
			);
			if (!input) {
				console.error(LOG_PREFIX, `Failed to find input[name="${inputName}"]`);
				return null;
			}

			const currentCell = input.closest("td");
			const row = currentCell?.closest("tr");
			const headerCell = row?.querySelector("th");

			if (!headerCell?.textContent) {
				console.error(
					LOG_PREFIX,
					`Failed to find header cell for input[name="${inputName}"]`,
				);
				return null;
			}

			return extractCellKey(headerCell.textContent);
		};

		const setInputValueByName = (name: string, value: string) => {
			const elements = document.getElementsByName(name);
			const input =
				elements.length > 0 ? (elements[0] as HTMLInputElement) : null;
			if (!input) {
				console.error(LOG_PREFIX, `Failed to find input[name="${name}"]`);
				return;
			}

			input.value = value;
		};

		const fillMessages = (matrixCode: string[]) => {
			const prompt3Key = readPromptCellKeyByInputName("message3");
			const prompt4Key = readPromptCellKeyByInputName("message4");
			const prompt5Key = readPromptCellKeyByInputName("message5");
			if (!prompt3Key || !prompt4Key || !prompt5Key) {
				console.error(LOG_PREFIX, "Failed to read prompt cell keys");
				return;
			}

			const targets: Array<{ inputName: string; key: string }> = [
				{ inputName: "message3", key: prompt3Key },
				{ inputName: "message4", key: prompt4Key },
				{ inputName: "message5", key: prompt5Key },
			];

			for (const target of targets) {
				const index = cellKeyToIndex(target.key);
				if (index === null) {
					console.error(
						LOG_PREFIX,
						`Invalid cell key "${target.key}" for input[name="${target.inputName}"]`,
					);
					continue;
				}

				setInputValueByName(target.inputName, matrixCode[index]);
			}
		};

		const hasTargetInputs = () => {
			return (
				document.querySelector('input[name="message3"]') !== null &&
				document.querySelector('input[name="message4"]') !== null &&
				document.querySelector('input[name="message5"]') !== null
			);
		};

		const runAutofill = async () => {
			try {
				const matrixCode = await storage.getItem<string[]>(STORAGE_KEY);
				if (!Array.isArray(matrixCode)) {
					return;
				}

				fillMessages(matrixCode);
			} catch (error) {
				console.error(LOG_PREFIX, "Failed to load matrix code:", error);
			}
		};

		const startWhenReady = () => {
			if (hasTargetInputs()) {
				runAutofill();
			}
		};

		if (document.readyState === "loading") {
			document.addEventListener("DOMContentLoaded", () => {
				startWhenReady();
			});
		} else {
			startWhenReady();
		}
	},
});
