import pytest
from app.analysis.architecture import classify_module_layer


def test_classify_module_layer():
    assert classify_module_layer("backend/app/api/routes.py", False) == "api_presentation"
    assert classify_module_layer("frontend/src/App.tsx", False) == "api_presentation"
    assert classify_module_layer("backend/app/models/db.py", False) == "data_persistence"
    assert classify_module_layer("backend/app/config.py", False) == "utility_core"
    assert classify_module_layer("backend/app/refactor/service.py", False) == "service_business"
