// Minimal in-browser voice recorder. HTMX can't POST a recorded blob cleanly,
// so this one flow is plain fetch. Wires any [data-voice-recorder] block.
(function () {
  function wire(root) {
    var ideaId = root.getAttribute("data-idea-id");
    var recBtn = root.querySelector("[data-voice-record]");
    var stopBtn = root.querySelector("[data-voice-stop]");
    var status = root.querySelector("[data-voice-status]");
    var preview = root.querySelector("[data-voice-preview]");
    var recorder, chunks;

    recBtn.addEventListener("click", async function () {
      try {
        var stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
        chunks = [];
        recorder.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
        recorder.onstop = async function () {
          stream.getTracks().forEach(function (t) { t.stop(); });
          var blob = new Blob(chunks, { type: "audio/webm" });
          preview.src = URL.createObjectURL(blob);
          preview.classList.remove("hidden");
          status.textContent = "Uploading…";
          var fd = new FormData();
          fd.append("audio", blob, "voice-note.webm");
          var res = await fetch("/ideas/" + ideaId + "/voice", { method: "POST", body: fd });
          if (res.ok) {
            var html = await res.text();
            var list = document.getElementById("attachments");
            if (list) list.outerHTML = html;
            status.textContent = "Saved.";
          } else {
            status.textContent = "Upload failed.";
          }
        };
        recorder.start();
        status.textContent = "Recording…";
        recBtn.disabled = true;
        stopBtn.disabled = false;
      } catch (err) {
        status.textContent = "Mic access denied.";
      }
    });

    stopBtn.addEventListener("click", function () {
      if (recorder && recorder.state !== "inactive") recorder.stop();
      recBtn.disabled = false;
      stopBtn.disabled = true;
    });
  }

  function init() {
    document.querySelectorAll("[data-voice-recorder]").forEach(function (el) {
      if (!el._wired) { el._wired = true; wire(el); }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else { init(); }
})();
