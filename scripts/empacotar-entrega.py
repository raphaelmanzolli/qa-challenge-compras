"""Cria ZIP local da entrega, sem dependências, imagem Docker ou .env privado."""
from pathlib import Path
from subprocess import check_output
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[1]
destination = root / "entrega-qa-compras.zip"
root_files = [
    "README.md", "package.json", "package-lock.json", "playwright.config.mjs",
    "compose.yaml", ".env.example", ".gitignore", ".gitattributes", ".prettierrc.json", ".prettierignore",
]
directories = ["docs", "tests", "scripts", "performance", "enunciado", ".github", ".agents"]
excluded_files = {"docs/05-guia-de-estudo.md", "docs/06-preparacao-do-ambiente.md"}
selected = [root / name for name in root_files if (root / name).is_file()]
for name in directories:
    for file in (root / name).rglob("*"):
        if not file.is_file():
            continue
        relative = file.relative_to(root).as_posix()
        if relative in excluded_files or "__pycache__" in file.parts:
            continue
        if file.name == ".env" or file.suffix == ".tar":
            continue
        selected.append(file)

# Inclui evidências selecionadas, mesmo antes do commit, respeitando o .gitignore.
result_files = check_output(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", "resultados"],
    cwd=root,
).decode().split("\0")
selected.extend(root / name for name in result_files if name and (root / name).is_file())

with ZipFile(destination, "w", ZIP_DEFLATED) as archive:
    for file in sorted(set(selected)):
        archive.write(file, file.relative_to(root))

with ZipFile(destination) as archive:
    error = archive.testzip()
    if error:
        raise RuntimeError(f"Arquivo corrompido no ZIP: {error}")
    names = archive.namelist()
    assert "README.md" in names
    assert ".github/workflows/ci.yml" in names
    assert ".agents/skills/qa-test-design/SKILL.md" in names
    assert "APRESENTACAO.md" not in names
    assert "docs/05-guia-de-estudo.md" not in names
    for name in ["01-plano-de-testes", "02-automacao", "03-performance", "04-relatorio"]:
        assert f"docs/{name}.md" in names
    assert "resultados/automacao-2026-10-26/resumo.md" in names
    assert "resultados/automacao-2026-10-26/API-10-busca-RASCUNHO.json" in names
    assert not any(name.startswith(("resultados/local/", "playwright-report/", "test-results/")) for name in names)
    assert not any(name == ".env" or name.startswith("node_modules/") or name.endswith(".tar") for name in names)

print(f"ZIP local criado e verificado: {destination}")
print(f"{len(selected)} arquivos; {destination.stat().st_size / (1024 ** 2):.2f} MiB")
