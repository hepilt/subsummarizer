document.addEventListener("DOMContentLoaded", () => {
    const apiKeyInput = document.getElementById("apiKey");
    const languageInput = document.getElementById("language");
    const gptVersionInput = document.getElementById("gptVersion");
    const sysPromptInput = document.getElementById("sysPrompt");
    const saveButton = document.getElementById("saveSettings");
  
    // Load saved settings
    chrome.storage.sync.get(["apiKey", "language", "gptVersion", "sysPrompt"], (settings) => {
      apiKeyInput.value = settings.apiKey || "";
      languageInput.value = settings.language || "en";
      gptVersionInput.value = settings.gptVersion || "gpt-4o-mini";
      sysPromptInput.value = settings.sysPrompt || "";
    });
  
    // Save settings
    saveButton.addEventListener("click", () => {
      const apiKey = apiKeyInput.value.trim();
      const language = languageInput.value.trim();
      const gptVersion = gptVersionInput.value.trim();
      const sysPrompt = sysPromptInput.value;
  
      chrome.storage.sync.set({ apiKey, language, gptVersion, sysPrompt }, () => {
        alert("Settings saved!");
      });
    });
  });