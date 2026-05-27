function renderMermaid(root) {
  if (!window.mermaid) {
    return;
  }

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict"
  });

  var scope = root || document;
  var diagrams = scope.querySelectorAll(".mermaid");

  diagrams.forEach(function (diagram) {
    diagram.removeAttribute("data-processed");
  });

  mermaid.run({
    nodes: diagrams
  });
}

renderMermaid(document);

if (typeof document$ !== "undefined") {
  document$.subscribe(function () {
    renderMermaid(document);
  });
}
