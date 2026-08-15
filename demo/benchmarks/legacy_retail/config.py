"""Configuration compatibility layer retained from the original application."""
import os
import optparse


DEFAULTS = {"currency": "USD", "tax_rate": 0.08, "catalog": {"BOOK-1": 24.5, "PEN-2": 3.0}}


def load_config(overrides={}):
    config = dict(DEFAULTS)
    config.update(overrides)
    config["environment"] = os.getenv("RETAIL_ENV", "development")
    return config


def parse_legacy_options(argv=None):
    parser = optparse.OptionParser()
    parser.add_option("--currency", dest="currency", default="USD")
    return parser.parse_args(argv)[0]
