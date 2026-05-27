function normalizeTexForKatex(source) {
  return source
    .replace(/\\begin\s*\{flalign\*?\}/g, "\\begin{aligned}")
    .replace(/\\end\s*\{flalign\*?\}/g, "\\end{aligned}");
}

function stripMathDelimiters(source, defaultDisplayMode) {
  var text = source.trim();
  var displayMode = defaultDisplayMode;

  /* pymdownx.arithmatex emits bracket delimiters after Markdown authors use $ / $$. */
  if (text.slice(0, 2) === "\\[" && text.slice(-2) === "\\]") {
    return {
      tex: text.slice(2, -2).trim(),
      displayMode: true
    };
  }

  if (text.slice(0, 2) === "$$" && text.slice(-2) === "$$") {
    return {
      tex: text.slice(2, -2).trim(),
      displayMode: true
    };
  }

  if (text.slice(0, 2) === "\\(" && text.slice(-2) === "\\)") {
    return {
      tex: text.slice(2, -2).trim(),
      displayMode: false
    };
  }

  if (text.charAt(0) === "$" && text.slice(-1) === "$") {
    return {
      tex: text.slice(1, -1).trim(),
      displayMode: false
    };
  }

  return {
    tex: text,
    displayMode: displayMode
  };
}

function renderKatex(root) {
  if (!window.katex) {
    return;
  }

  var scope = root || document;
  var nodes = scope.querySelectorAll(".arithmatex");

  nodes.forEach(function (node) {
    if (node.dataset.katexRendered === "true") {
      return;
    }

    var parsed = stripMathDelimiters(
      node.textContent,
      node.tagName.toLowerCase() === "div"
    );

    parsed.tex = normalizeTexForKatex(parsed.tex);
    node.dataset.texSource = parsed.tex;

    katex.render(parsed.tex, node, {
      displayMode: parsed.displayMode,
      throwOnError: false,
      strict: "warn",
      trust: false
    });

    node.dataset.katexRendered = "true";
  });
}

function canRenderLooseMathNode(node) {
  if (!node || !node.nodeValue || node.nodeValue.indexOf("$") === -1) {
    return false;
  }

  var parent = node.parentElement;

  if (!parent) {
    return false;
  }

  return !parent.closest(
    ".arithmatex, .katex, pre, code, kbd, script, style, textarea"
  );
}

function findClosingDollar(text, start) {
  for (var i = start; i < text.length; i += 1) {
    if (text.charAt(i) === "$" && text.charAt(i - 1) !== "\\") {
      return i;
    }
  }

  return -1;
}

function appendRenderedMath(fragment, source, displayMode) {
  var span = document.createElement("span");
  var tex = normalizeTexForKatex(source);

  span.className = "arithmatex";
  span.dataset.texSource = tex;
  span.dataset.katexRendered = "true";

  katex.render(tex, span, {
    displayMode: displayMode,
    throwOnError: false,
    strict: "warn",
    trust: false
  });

  fragment.appendChild(span);
}

function replaceLooseMathNode(node) {
  var text = node.nodeValue;
  var fragment = document.createDocumentFragment();
  var index = 0;
  var changed = false;

  while (index < text.length) {
    var start = text.indexOf("$", index);

    if (start === -1) {
      fragment.appendChild(document.createTextNode(text.slice(index)));
      break;
    }

    if (start > index) {
      fragment.appendChild(document.createTextNode(text.slice(index, start)));
    }

    if (text.slice(start, start + 2) === "$$") {
      var displayEnd = text.indexOf("$$", start + 2);

      if (displayEnd !== -1) {
        var displaySource = text.slice(start + 2, displayEnd).trim();

        if (displaySource) {
          appendRenderedMath(fragment, displaySource, true);
          changed = true;
          index = displayEnd + 2;
          continue;
        }
      }
    } else {
      var inlineEnd = findClosingDollar(text, start + 1);

      if (inlineEnd !== -1) {
        var inlineSource = text.slice(start + 1, inlineEnd).trim();

        if (inlineSource) {
          appendRenderedMath(fragment, inlineSource, false);
          changed = true;
          index = inlineEnd + 1;
          continue;
        }
      }
    }

    fragment.appendChild(document.createTextNode("$"));
    index = start + 1;
  }

  if (changed) {
    node.parentNode.replaceChild(fragment, node);
  }
}

function renderLooseMath(root) {
  if (!window.katex) {
    return;
  }

  var scope = root || document;
  var walker = document.createTreeWalker(
    scope,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function (node) {
        return canRenderLooseMathNode(node)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_REJECT;
      }
    }
  );
  var nodes = [];
  var node;

  while ((node = walker.nextNode())) {
    nodes.push(node);
  }

  nodes.forEach(replaceLooseMathNode);
}

function renderMath(root) {
  renderKatex(root || document);
  renderLooseMath(root || document);
}

renderMath(document);

if (typeof document$ !== "undefined") {
  document$.subscribe(function () {
    renderMath(document);
  });
}
