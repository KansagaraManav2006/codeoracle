from .node_b import func_b

def func_a() -> str:
    return f"a -> {func_b()}"
