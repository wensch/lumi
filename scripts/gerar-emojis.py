#!/usr/bin/env python3
"""Gera src/components/emojiArt.ts a partir do pacote @iconify-json/fluent-emoji-flat (Fluent Emoji Flat, MIT).

Uso (a partir da raiz do repositório):
  mkdir -p /tmp/fluent && cd /tmp/fluent && npm pack @iconify-json/fluent-emoji-flat && tar xzf *.tgz
  python3 scripts/gerar-emojis.py /tmp/fluent/package

Para incluir mais um emoji, acrescente-o em EMOJIS e rode de novo.
"""
import json
import sys

EMOJIS = "✍️ ✨ ⭐ 🌅 🌈 🌟 🌱 🌷 🌸 🌿 🎀 🎄 🎅 🎒 🎯 🏅 🏆 👑 👓 💛 📖 📚 🔒 🔔 🔥 🕊️ 🕯️ 🗓️ 😎 🙏 🛋️ 🤝 🦸 🧣 🧭 🧶 🪽".split()


def main(package_dir: str) -> None:
    icons = json.load(open(f"{package_dir}/icons.json"))
    chars = json.load(open(f"{package_dir}/chars.json"))
    out = [
        "// GERADO por scripts/gerar-emojis.py — não edite à mão.",
        "// Desenhos: Fluent Emoji Flat (Microsoft), licença MIT — ver docs/licencas-terceiros.md.",
        "export const EMOJI_ART: Record<string, string> = {",
    ]
    for emoji in EMOJIS:
        code = "-".join(f"{ord(c):x}" for c in emoji)
        name = chars.get(code) or chars.get(code.replace("-fe0f", ""))
        if name is None:
            for key, value in chars.items():
                if key.replace("-fe0f", "") == code.replace("-fe0f", ""):
                    name = value
        if name not in icons["icons"]:
            sys.exit(f"sem desenho para {emoji}")
        body = icons["icons"][name]["body"]
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">{body}</svg>'
        key = emoji.replace("️", "")
        out.append(f"  {json.dumps(key, ensure_ascii=False)}: {json.dumps(svg)},")
    out.append("};")
    open("src/components/emojiArt.ts", "w", encoding="utf8").write("\n".join(out) + "\n")


main(sys.argv[1])
