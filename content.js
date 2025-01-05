(async () => {
    let promptList = [
        { role: "system", content: `user will provide captured subtitles for video in xml, you need to summarize it` },
        { role: "system", content: `because of xml use 'text started' to get time in seconds for phrases, round numbers, remember them` },
        { role: "system", content: `provide all technical details, always include all numbers, comparisons, benchmarks from subtitles` },
        { role: "system", content: `ignore any information about sponsorships or ads` },
        { role: "system", content: `use markdown to format text if necessary, always use title` },
    ]

    let userQuestion = null;

    // Extract video id from current page
    const getVideoId = () => {
        return new URLSearchParams(window.location.search).get("v");
    };

    // Extract captions for current page
    const extractCaptions = () => {
        const scripts = [...document.querySelectorAll('script')];
        const captionScript = scripts.find(script => script.textContent.includes('"captionTracks"'));

        if (captionScript) {
            const regex = /"captionTracks":(\[.*?\])/;
            const match = regex.exec(captionScript.textContent);

            if (match && match[1]) {
                const captionTracks = JSON.parse(match[1]);
                return captionTracks;
            }
        }

        console.warn("No captions found.");
        return null;
    }

    // Fetch subtitles by extracted url
    const fetchSubtitles = async (captionUrl) => {
        try {
            const response = await fetch(captionUrl);
            if (!response.ok) {
                console.error("Failed to fetch subtitles:", response.status, response.statusText);
                return null;
            }
            const text = await response.text();
            if (!text) {
                console.warn("Subtitles response is empty.");
                return null;
            }
            return text;
        } catch (error) {
            console.error("Error fetching subtitles:", error);
            return null;
        }
    }

    // Function to parse subtitles XML into plain text
    const parseSubtitles = (text) => {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        const subtitles = Array.from(xmlDoc.getElementsByTagName("text"))
            .map((node) => node.textContent)
            .join(" ");
        return subtitles;
    };

    // Function to create and display a modal with basic Markdown rendering
    const showResponseModal = (markdownContent) => {
        // Remove existing modal if present
        const existingModal = document.getElementById("summarizeModal");
        if (existingModal) existingModal.remove();

        // Function to convert basic Markdown to HTML
        const parseMarkdown = (markdown) => {
            return markdown
                .replace(/^(#{1,6})\s(.+)/gm, (match, hashes, text) => {
                    const level = hashes.length;
                    return `<h${level}>${text}</h${level}>`;
                })
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") // Bold
                .replace(/\*(.*?)\*/g, "<em>$1</em>") // Italic
                .replace(/`([^`]+)`/g, "<code>$1</code>") // Inline code
                .replace(/\n/g, "<br>"); // Line breaks
        };

        // Modal window
        const modalOverlay = document.createElement("div");
        modalOverlay.id = "summarizeModal";
        modalOverlay.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        `;

        // Content element
        const modalContent = document.createElement("div");
        modalContent.style = `
        position: relative;
        padding: 20px;
        background-color: white;
        border-radius: 8px;
        width: 80%;
        max-width: 600px;
        max-height: 80%;
        overflow-y: auto;
        text-align: left;
        font-size: 16px;
        line-height: 1.5;
        `;
        modalContent.innerHTML = parseMarkdown(markdownContent);

        // Instruction text
        const instructionText = document.createElement("div");
        instructionText.style = `
        position: fixed;
        top: 1%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        font-size: 18px;
        font-weight: bold;
        text-align: center;
        z-index: 10001; 
        `;
        instructionText.textContent = "- Click outside to close -";

        // Append elements to modal
        modalOverlay.appendChild(instructionText);
        modalOverlay.appendChild(modalContent);

        // Add modal to the document
        document.body.appendChild(modalOverlay);

        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        };
    };

    const showInputModal = () => {
        // Remove existing modal if present
        const existingModal = document.getElementById("inputModal");
        if (existingModal) existingModal.remove();
    
        // Modal overlay
        const modalOverlay = document.createElement("div");
        modalOverlay.id = "inputModal";
        modalOverlay.style = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        `;
    
        // Modal content container
        const modalContent = document.createElement("div");
        modalContent.style = `
        position: relative;
        padding: 20px;
        background-color: white;
        border-radius: 8px;
        width: 80%;
        max-width: 400px;
        text-align: center;
        font-size: 16px;
        line-height: 1.5;
        `;
    
        // Input field for the question
        const inputField = document.createElement("input");
        inputField.type = "text";
        inputField.value = userQuestion || '';
        inputField.placeholder = "Set your question here...";
        inputField.style = `
        width: 95%;
        max-width: 400px;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 16px;
        `;
    
        // Button container for better layout
        const buttonContainer = document.createElement("div");
        buttonContainer.style = `
        display: flex;
        justify-content: space-between;
        margin-top: 10px;
        `;
    
        // Set button
        const setButton = document.createElement("button");
        setButton.textContent = "Set";
        setButton.style = `
        padding: 10px 20px;
        background-color: rgb(0, 0, 0);
        width: 100%;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 16px;
        `;
    
        // Ask button behavior
        setButton.onclick = () => {
            userQuestion = inputField.value.trim() || "";
            modalOverlay.remove(); 
        };
    
        // Append buttons to button container
        buttonContainer.appendChild(setButton);
    
        // Append elements to the modal
        modalContent.appendChild(inputField);
        modalContent.appendChild(buttonContainer);
        modalOverlay.appendChild(modalContent);
    
        // Add modal to the document
        document.body.appendChild(modalOverlay);
    
        // Allow modal to be closed by clicking outside
        modalOverlay.onclick = (e) => {
            if (e.target === modalOverlay) {
                modalOverlay.remove();
            }
        };
    };

    // Style for spinner
    const style = document.createElement("style");
    style.textContent = `
      .spinner {
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-top: 4px solid #ffffff;
        border-radius: 50%;
        background: none;
        width: 16px;
        height: 16px;
        animation: spin 0.8s linear infinite;
        display: inline-block;
      }
    
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);

    const handleUserRequest = async () => {
        try {
            const settings = await new Promise((resolve) => {
                chrome.storage.sync.get(["apiKey", "language", "gptVersion", "sysPrompt"], resolve);
            });

            const { apiKey, language = "en", gptVersion = "gpt-4o-mini", sysPrompt } = settings;
            if (!apiKey) {
                console.error("Please set your OpenAI API key in the extension settings.");
                return null;
            }

            const captions = extractCaptions();
            if (!captions) {
                console.warn("No subtitles found for this video.");
                return null;
            }

            const captionsWithLang = captions.find(track => track.languageCode === language);
            if (!captionsWithLang) {
                console.warn("No captions found for configured language.");
                return null;
            }

            const subtitles = await fetchSubtitles(captionsWithLang.baseUrl);

            if (!subtitles) {
                console.warn("No subtitles found for this video.");
                return null;
            }

            if (userQuestion) {
                promptList.push(
                    {
                        role: "user", content: `most important, you need to answer my question: ${userQuestion};
                        provide information if subtitles from video has response on it`}
                )
            }

            promptList.push(
                { role: "system", content: `follow additional instructions: ${sysPrompt}` },
                { role: "user", content: `${subtitles}` }
            );

            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: gptVersion,
                    messages: promptList,
                }),
            });

            const summaryData = await response.json();
            return summaryData.choices[0]?.message?.content || null;
        } catch (error) {
            console.error("Error handling user request:", error);
            return null;
        }
    }

    // Function to add the "Summarize" button
    const addSummButton = () => {
        if (document.getElementById("summarizeButton")) return;

        console.log('Summarize button attached.');
        const button = document.createElement("button");
        button.id = "summarizeButton";
        button.textContent = "Summarize";
        button.style = `
        vertical-align: middle;
        background-color: rgba(95, 95, 95, 0.50);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        float: right;
        height:22px;
        `;

        // Add click event to the button
        button.onclick = async () => {
            button.disabled = true;
            button.innerHTML = `<div class="spinner"></div>`;
            button.style.cursor = "default";
            button.style.backgroundColor = "rgba(0, 0, 0, 0)";

            const summary = await handleUserRequest();

            if (summary) {
                showResponseModal(summary);

                button.innerHTML = "Summarize";
                button.disabled = false;
                button.style.backgroundColor = "rgba(95, 95, 95, 0.50)";
            } else {
                button.innerHTML = "Summary unavailable";
                button.style.backgroundColor = "rgba(255, 187, 187, 0.85)";
            }
        };

        try {
            let belowElement = document.getElementById("below");
            belowElement.insertBefore(button, belowElement.children[0]);
        } catch (e) { };
    };

    // Function to add the "Ask" button
    const addAskButton = () => {
        if (document.getElementById("askButton")) return;

        console.log('Ask button attached.');
        const button = document.createElement("button");
        button.id = "askButton";
        button.textContent = "Ask";
        button.style = `
        vertical-align: middle;
        background-color: rgba(53, 53, 53, 0.85);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        float: right;
        height:22px;
        margin-left: 20px;
        `;

        // Add click event to the button
        button.onclick = () => {
            showInputModal();
        };

        try {
            let belowElement = document.getElementById("below");
            belowElement.insertBefore(button, belowElement.children[1]);
        } catch (e) { };
    };

    // Use a MutationObserver to handle dynamic content loading
    const observer = new MutationObserver(() => {
        addSummButton();
        addAskButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial call to addButton in case the page is already loaded
    addSummButton();
    addAskButton();
})();