(async () => {
    function extractCaptions() {
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

        alert("No captions found.");
        return null;
    }

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
    const showModal = (markdownContent) => {
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
        
        const modalContent = document.createElement("div");
        modalContent.style = `
          position: relative;
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          width: 80%;
          max-width: 600px;
          max-height: 80%;
          overflow-y: auto;
          text-align: left;
          font-size: 16px; /* Adjust font size */
          line-height: 1.5; /* Improve readability */
        `;
        
        // Close button styled as "X"
        const closeButton = document.createElement("button");
        closeButton.textContent = "×";
        closeButton.style = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: none;
          border: none;
          font-size: 24px;
          font-weight: bold;
          color: #333;
          cursor: pointer;
          z-index: 10001; 
          border-radius: 50%; 
          padding: 14px 4px; 
        `;
        closeButton.onclick = () => modalOverlay.remove();
        
        // Render Markdown content
        const modalText = document.createElement("div");
        modalText.innerHTML = parseMarkdown(markdownContent);
        
        // Append elements to modal
        modalContent.appendChild(closeButton);
        modalContent.appendChild(modalText);
        modalOverlay.appendChild(modalContent);
        
        // Add modal to the document
        document.body.appendChild(modalOverlay);
    };

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

    // Function to add the "Summarize" button
    const addButton = () => {
        if (document.getElementById("summarizeButton")) return;

        // const container = document.querySelector(".watch-active-metadata");
        // if (!container) return;

        const button = document.createElement("button");
        button.id = "summarizeButton";
        button.textContent = "Summarize";
        button.style = `
        vertical-align: middle;
        background-color: rgba(158, 236, 255, 0.5);
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        float: right;
        height:22px;
        `;
        // Add click event to the button
        button.onclick = async () => {
            const videoId = new URLSearchParams(window.location.search).get("v");
            if (!videoId) {
                alert("Unable to extract video ID.");
                return;
            }

            // Change button to spinner
            button.disabled = true;
            button.innerHTML = `<div class="spinner"></div>`;
            button.style.backgroundColor = "rgba(0, 0, 0, 0)";
            button.style.cursor = "not-allowed";

            chrome.storage.sync.get(["apiKey", "language", "gptVersion", "sysPrompt"], async (settings) => {
                const { apiKey, language = "en", gptVersion = "gpt-4o-mini", sysPrompt = "" } = settings;
                if (!apiKey) {
                    alert("Please set your OpenAI API key in the extension settings.");
                    return;
                }

                const captions = extractCaptions();
                if (!captions) {
                    alert("No subtitles found for this video.");
                    return;
                }
                console.log("Available captions:", captions);

                const captionsWithLang = captions.find(track => track.languageCode === language);
                if (!captionsWithLang) {
                    alert("No captions found.");
                    return;
                }

                const subtitles = await fetchSubtitles(captionsWithLang.baseUrl);

                if (!subtitles) {
                    alert("No subtitles found for this video.");
                    return;
                }

                console.log(subtitles)

                // const subtitles = parseSubtitles(subtitlesText);
                // if (!subtitles) {
                //     alert("No subtitles found.");
                //     return;
                // }

                try {
                    const summaryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${apiKey}`
                        },
                        body: JSON.stringify({
                            model: gptVersion,
                            messages: [
                                { role: "system", content: `follow additional instuctions: ${sysPrompt}` },
                                { role: "user", content: `summarize following captured subtitles: ${subtitles}` },
                                { role: "system", content: `use markdawn to mark text if necessary` },
                                { role: "system", content: `original subtitles was formated as xml, so each time use 'text started' to get time in seconds but round numbers"` },
                                { role: "system", content: `always provide any numbers, comparision numbers, comparison names or benchmarks from subtitles` },
                                { role: "system", content: `ignore any information about sponsorship or ads` }
                            ]
                        })
                    });

                    const summaryData = await summaryResponse.json();
                    const summary = summaryData.choices[0].message.content;

                    showModal(summary);
                } catch (error) {
                    console.error("Failed to summarize subtitles:", error);
                    alert("Failed to fetch or summarize subtitles.");
                } finally {
                    // Revert button back to original state
                    button.innerHTML = "Summarize";
                    button.disabled = false;
                    button.style.cursor = "pointer";
                    button.style.backgroundColor = "rgba(158, 236, 255, 0.5)";
                }
            });
        };

        let belowElement = document.getElementById("below");
        belowElement.insertBefore(button, belowElement.children[0]);
        // Append the button to the container
        // container.appendChild(button);
    };

    // Use a MutationObserver to handle dynamic content loading
    const observer = new MutationObserver(() => {
        addButton();
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial call to addButton in case the page is already loaded
    addButton();
})();