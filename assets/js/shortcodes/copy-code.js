/**
 * Copy code content from a code block to clipboard
 * @param {HTMLElement} button - The copy button that was clicked
 */
function copyCode(e) {
    const block = e.closest(".sc-codeblock");
    const codeEl = block?.querySelector("pre code");
    if (!codeEl) return;

    function showCopiedState(button) {
        const icon = button.querySelector("i");
        const textNode = Array.from(button.childNodes).find(
            node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        if (!icon || !textNode) return;

        const oldClass = icon.className;
        const oldText = textNode.textContent;

        icon.className = "icon-check";
        textNode.textContent = "COPIED";
        button.classList.add("copied");

        setTimeout(() => {
            icon.className = oldClass;
            textNode.textContent = oldText;
            button.classList.remove("copied");
        }, 2000);
    }

    function fallbackCopy(text, button) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();

        try {
            if (document.execCommand("copy")) {
                showCopiedState(button);
            }
        } catch (err) {
            console.error("Copy failed:", err);
        }

        document.body.removeChild(ta);
    }

    let text = "";

    const lines = codeEl.querySelectorAll(".hljs-ln-code");
    if (lines.length > 0) {
        text = Array.from(lines)
            .map(el => el.textContent || el.innerText || "")
            .join("\n");
    } else {
        text = codeEl.innerText || codeEl.textContent || "";
    }

    if (!text.trim()) {
        console.warn("No code text found to copy.");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard
            .writeText(text)
            .then(() => showCopiedState(e))
            .catch(() => fallbackCopy(text, e));
    } else {
        fallbackCopy(text, e);
    }
}