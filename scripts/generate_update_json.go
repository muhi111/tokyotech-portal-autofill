package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
)

type Update struct {
	Version    string `json:"version"`
	UpdateLink string `json:"update_link"`
}

type Addon struct {
	Updates []Update `json:"updates"`
}

type UpdateJSON struct {
	Addons map[string]Addon `json:"addons"`
}

const defaultSourceURL = "https://github.com/muhi111/tokyotech-portal-autofill/releases/latest/download/tokyotech-portal-autofill-updates.json"
const defaultWXTConfigPath = "wxt.config.ts"

func readAddonIDFromWXTConfig(path string) (string, error) {
	file, err := os.ReadFile(path)
	if err != nil {
		return "", fmt.Errorf("error reading wxt config: %w", err)
	}

	re := regexp.MustCompile(`(?m)^\s*id\s*:\s*"([^"]+)"`)
	matches := re.FindSubmatch(file)
	if len(matches) < 2 {
		return "", fmt.Errorf("could not find gecko id in %s", path)
	}

	return string(matches[1]), nil
}

func readUpdateJSONFromURL(sourceURL string) (UpdateJSON, error) {
	var data UpdateJSON

	resp, err := http.Get(sourceURL)
	if err != nil {
		return data, fmt.Errorf("error fetching existing JSON: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return data, nil
	}

	if resp.StatusCode != http.StatusOK {
		return data, fmt.Errorf("unexpected HTTP status %d while fetching %s", resp.StatusCode, sourceURL)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return data, fmt.Errorf("error reading response body: %w", err)
	}

	if len(body) == 0 {
		return data, nil
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return data, fmt.Errorf("error parsing fetched JSON: %w", err)
	}

	return data, nil
}

func main() {
	version := flag.String("version", "", "Extension version")
	url := flag.String("url", "", "URL to the XPI file")
	output := flag.String("output", "updates.json", "Path to updates.json")
	source := flag.String("source", defaultSourceURL, "URL to the existing updates JSON")
	wxtConfig := flag.String("wxt-config", defaultWXTConfigPath, "Path to wxt.config.ts")

	flag.Parse()

	if *version == "" || *url == "" {
		log.Fatal("Version and URL must be provided")
	}

	addonID, err := readAddonIDFromWXTConfig(*wxtConfig)
	if err != nil {
		log.Fatal(err)
	}

	data, err := readUpdateJSONFromURL(*source)
	if err != nil {
		log.Fatal(err)
	}

	if data.Addons == nil {
		data.Addons = make(map[string]Addon)
	}

	addon, exists := data.Addons[addonID]
	if !exists {
		addon = Addon{Updates: []Update{}}
	}

	// Check if version already exists
	for _, u := range addon.Updates {
		if u.Version == *version {
			fmt.Printf("Version %s already exists in %s\n", *version, *output)
			return
		}
	}

	// Append new update
	addon.Updates = append(addon.Updates, Update{
		Version:    *version,
		UpdateLink: *url,
	})
	data.Addons[addonID] = addon

	// Write back to file
	outBytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		log.Fatalf("Error marshalling JSON: %v", err)
	}

	if err := os.WriteFile(*output, outBytes, 0644); err != nil {
		log.Fatalf("Error writing output file: %v", err)
	}

	fmt.Printf("Successfully appended version %s to %s\n", *version, *output)
}
