"""MySQL connection helper using pymysql."""

import pymysql

from .config import MYSQL_CFG


def get_connection():
    """Return a new pymysql connection using centralized config."""
    return pymysql.connect(**MYSQL_CFG)
