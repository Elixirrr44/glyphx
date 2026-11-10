r"""Rewrite invisible / combining characters in source files as JS code-point escapes.

Usage: python scripts/escape-invisibles.py <file> [<file> ...]
Only touches characters that are invisible or non-spacing (marks, format,
control, unusual spaces), so readable literal text is left as is.
"""
import sys, unicodedata

BS = chr(92)
SPECIAL = {0x3164, 0x115F, 0x1160, 0x2800, 0xFFFD, 0x180E}

def needs_escape(ch):
    cp = ord(ch)
    if ch in "\n\r\t ":
        return False
    if cp in SPECIAL:
        return True
    return unicodedata.category(ch) in ("Mn", "Mc", "Me", "Cf", "Cc", "Zs", "Zl", "Zp", "Co", "Cs")

for path in sys.argv[1:]:
    with open(path, encoding="utf-8") as f:
        src = f.read()
    out = "".join((BS + "u{%X}" % ord(c)) if needs_escape(c) else c for c in src)
    if out != src:
        with open(path, "w", encoding="utf-8", newline="") as f:
            f.write(out)
        print("escaped", path)
