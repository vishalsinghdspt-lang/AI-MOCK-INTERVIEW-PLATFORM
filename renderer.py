import re

import bleach
from markdown_it import MarkdownIt
from markupsafe import Markup

# Raw HTML from the AI is switched OFF, then the output is sanitized again.
_md = MarkdownIt(
    "commonmark",
    {"html": False, "linkify": False, "breaks": False},
).enable("table")

ALLOWED_TAGS = [
    "p", "br", "hr", "strong", "em", "b", "i", "del", "code", "pre",
    "blockquote", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "a", "table", "thead", "tbody", "tr", "th", "td",
]
ALLOWED_ATTRS = {"a": ["href", "title"], "code": ["class"]}
ALLOWED_PROTOCOLS = ["http", "https", "mailto"]


def render_markdown(text):
    """Markdown -> sanitized HTML (safe to print in a template)."""
    if not text:
        return Markup("")
    html = _md.render(str(text).strip())
    clean = bleach.clean(
        html,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRS,
        protocols=ALLOWED_PROTOCOLS,
        strip=True,
    )
    return Markup(clean)


def clean_question(text):
    """'1. In your project...' -> 'In your project...' (display only)."""
    text = str(text or "").strip()
    text = re.sub(
        r"^\s*(?:Q(?:uestion)?\s*)?\d+\s*[.):\-]\s*", "", text, flags=re.I
    )
    return text.replace("**", "").strip()


# ---------- split the Gemini evaluation into sections ----------

_HEADER = re.compile(
    r"^\s*(?:#{1,6}\s*)?(?:\*\*|__)?\s*(?:\d+\s*[.)]\s*)?"
    r"(score|strengths?|weakness(?:es)?|areas?\s+for\s+improvement|"
    r"improvements?|better\s+answer)"
    r"[^:\n]{0,30}?:?\s*(?:\*\*|__)?\s*:?\s*(.*)$",
    re.IGNORECASE,
)
_BULLET = re.compile(r"^\s{0,3}(?:[*\-+•]|\d+[.)])\s+(.*)")


def _looks_like_header(line):
    s = line.strip()
    return bool(s) and (
        s.startswith(("#", "**", "__")) or re.match(r"\d+\s*[.)]", s)
    )


def _key(word):
    w = word.lower()
    if w.startswith("score"):
        return "score"
    if w.startswith("strength"):
        return "strengths"
    if w.startswith("better"):
        return "better"
    return "improvements"


def _split_sections(text):
    sections, preamble, current = {}, [], None
    for line in (text or "").splitlines():
        if re.fullmatch(r"\s*[-*_]{3,}\s*", line):
            continue
        if _looks_like_header(line):
            m = _HEADER.match(line)
            if m and _key(m.group(1)) not in sections:
                current = _key(m.group(1))
                sections[current] = []
                rest = m.group(2).strip()
                if rest:
                    sections[current].append(rest)
                continue
        (preamble if current is None else sections[current]).append(line)
    return (
        {k: "\n".join(v).strip() for k, v in sections.items()},
        "\n".join(preamble).strip(),
    )


def _split_items(text):
    items, cur = [], None
    for line in text.splitlines():
        if not line.strip():
            if cur is not None:
                cur += "\n"
            continue
        m = _BULLET.match(line)
        if m:
            if cur is not None:
                items.append(cur.strip())
            cur = m.group(1)
        elif cur is None:
            cur = line.strip()
        else:
            cur += "\n" + line.strip()
    if cur and cur.strip():
        items.append(cur.strip())
    return [i for i in items if i]


def build_report(text):
    """Turn the raw Gemini text into pieces the result page can lay out."""
    sections, preamble = _split_sections(text)

    strengths = _split_items(sections.get("strengths", ""))
    improvements = _split_items(sections.get("improvements", ""))

    better_raw = "\n".join(
        re.sub(r"^\s*>\s?", "", line)
        for line in sections.get("better", "").splitlines()
    ).strip()

    overall_raw = "\n".join(
        l for l in preamble.splitlines() if not l.strip().startswith("#")
    )
    overall_raw += "\n" + re.sub(
        r"\d+\s*/\s*10", "", sections.get("score", "")
    )
    overall_raw = overall_raw.strip(" \n.:-")

    return {
        "parsed": bool(strengths or improvements or better_raw),
        "overall": render_markdown(overall_raw) if len(overall_raw) > 25 else None,
        "strengths": [render_markdown(i) for i in strengths],
        "improvements": [render_markdown(i) for i in improvements],
        "better": render_markdown(better_raw) if better_raw else None,
        "full": render_markdown(text),
    }