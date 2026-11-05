"""Avisa se os pacotes do venv ativo divergem do backend/requirements.txt.

Rode com o venv do backend ativado, antes de `docker compose up --build`:

    python backend/scripts/check_requirements.py

Só emite aviso (sai com código 1 se houver diferença); não altera nada.
"""

import re
import subprocess
import sys
from pathlib import Path

REQUIREMENTS = Path(__file__).resolve().parent.parent / "requirements.txt"


def normalize(name: str) -> str:
    # PEP 503: "Typing_Extensions" e "typing-extensions" são o mesmo pacote.
    return re.sub(r"[-_.]+", "-", name).lower()


def read_text(path: Path) -> str:
    # Aceita UTF-8 e o UTF-16 que o PowerShell gera com `pip freeze >`.
    data = path.read_bytes()
    if data.startswith((b"\xff\xfe", b"\xfe\xff")):
        return data.decode("utf-16")
    return data.decode("utf-8-sig")


def parse(text: str) -> dict[str, str]:
    packages = {}
    for line in text.splitlines():
        line = line.split("#", 1)[0].strip()
        if "==" in line:
            name, version = line.split("==", 1)
            packages[normalize(name)] = version.strip()
    return packages


def main() -> int:
    if sys.prefix == sys.base_prefix:
        print("Aviso: nenhum venv ativo; a comparação usará o Python do sistema.")

    freeze = subprocess.run(
        [sys.executable, "-m", "pip", "freeze", "--exclude-editable"],
        capture_output=True, text=True, check=True,
    ).stdout
    installed = parse(freeze)
    declared = parse(read_text(REQUIREMENTS))

    missing = sorted(set(installed) - set(declared))
    unused = sorted(set(declared) - set(installed))
    different = sorted(
        n for n in set(installed) & set(declared) if installed[n] != declared[n]
    )

    if not (missing or unused or different):
        print("OK: requirements.txt está igual aos pacotes instalados.")
        return 0

    print("Aviso: requirements.txt diverge dos pacotes instalados no venv.\n")
    for name in missing:
        print(f"  + {name}=={installed[name]}  (instalado, falta no requirements.txt)")
    for name in unused:
        print(f"  - {name}=={declared[name]}  (no requirements.txt, não instalado)")
    for name in different:
        print(f"  ~ {name}: requirements.txt={declared[name]}, instalado={installed[name]}")
    print("\nSe as diferenças forem intencionais, atualize com: pip freeze > backend/requirements.txt")
    return 1


if __name__ == "__main__":
    sys.exit(main())
