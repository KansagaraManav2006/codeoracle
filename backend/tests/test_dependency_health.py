import pytest
from app.analysis.dependency_health import (
    parse_package_json,
    parse_pyproject_toml,
    parse_requirements_txt,
)


def test_parse_requirements_txt():
    content = """
# Python requirements
fastapi==0.110.0
uvicorn>=0.20.0
requests==2.24.0
crypto==1.4.1
    """
    items = parse_requirements_txt(content)
    assert len(items) == 4
    names = [i.name for i in items]
    assert "fastapi" in names
    assert "crypto" in names
    
    crypto_item = next(i for i in items if i.name == "crypto")
    assert crypto_item.is_deprecated is True
    assert crypto_item.is_risk is True


def test_parse_package_json():
    content = """{
      "name": "demo",
      "dependencies": {
        "react": "^18.2.0",
        "moment": "2.29.1"
      },
      "devDependencies": {
        "typescript": "^5.0.0"
      }
    }"""
    items, tree = parse_package_json(content)
    assert len(items) == 3
    assert len(tree) == 3

    moment_item = next(i for i in items if i.name == "moment")
    assert moment_item.is_deprecated is True


def test_parse_pyproject_toml():
    content = """
[tool.poetry.dependencies]
python = "^3.10"
fastapi = "^0.100.0"
pydantic = "^2.0.0"
    """
    items = parse_pyproject_toml(content)
    assert len(items) == 2
    names = [i.name for i in items]
    assert "fastapi" in names
    assert "pydantic" in names
