import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
	browser: "firefox",
	manifestVersion: 3,
	manifest: {
		permissions: ["storage"],
		browser_specific_settings: {
			gecko: {
				id: "{4E91E413-4930-42F7-A585-7B762BE08833}",
				update_url:
					"https://github.com/muhi111/tokyotech-portal-autofill/releases/latest/download/tokyotech-portal-autofill-updates.json",
				// @ts-expect-error - WXT doesn't support this field yet(https://github.com/wxt-dev/wxt/pull/1976)
				data_collection_permissions: {
					required: ["none"],
				},
				strict_min_version: "140.0",
			},
			gecko_android: {
				strict_min_version: "142.0",
			},
		},
	},
});
