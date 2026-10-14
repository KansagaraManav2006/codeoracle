from .node_c import func_c

def func_b() -> str:
    return f"b -> {func_c()}"
