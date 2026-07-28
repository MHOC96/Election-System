from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from config.database import apply_connection_pool_settings, resolve_pool_mode


class ResolvePoolModeTests(SimpleTestCase):
    def test_port_6543_defaults_to_transaction(self):
        self.assertEqual(resolve_pool_mode(port="6543", explicit=""), "transaction")

    def test_port_5432_defaults_to_session(self):
        self.assertEqual(resolve_pool_mode(port="5432", explicit=""), "session")

    def test_explicit_mode_overrides_port(self):
        self.assertEqual(resolve_pool_mode(port="6543", explicit="session"), "session")

    def test_invalid_mode_raises(self):
        with self.assertRaises(ImproperlyConfigured):
            resolve_pool_mode(port="5432", explicit="invalid")


class ApplyConnectionPoolSettingsTests(SimpleTestCase):
    def _env(self, **values):
        class FakeEnv:
            def __call__(self, key, default=""):
                return values.get(key, default)

            def int(self, key, default=0):
                if key in values:
                    return int(values[key])
                return default

            def bool(self, key, default=False):
                if key in values:
                    raw = values[key]
                else:
                    raw = default
                if isinstance(raw, bool):
                    return raw
                return str(raw).lower() in {"1", "true", "yes", "on"}

        return FakeEnv()

    def test_session_mode_enables_persistent_connections(self):
        db_config = {"PORT": "5432"}
        apply_connection_pool_settings(
            db_config,
            self._env(),
            is_test=False,
            debug=True,
        )
        self.assertEqual(db_config["CONN_MAX_AGE"], 60)
        self.assertTrue(db_config["CONN_HEALTH_CHECKS"])
        self.assertNotIn("DISABLE_SERVER_SIDE_CURSORS", db_config)

    def test_transaction_mode_disables_persistent_connections(self):
        db_config = {"PORT": "6543"}
        apply_connection_pool_settings(
            db_config,
            self._env(),
            is_test=False,
            debug=True,
        )
        self.assertEqual(db_config["CONN_MAX_AGE"], 0)
        self.assertTrue(db_config["DISABLE_SERVER_SIDE_CURSORS"])
        self.assertNotIn("CONN_HEALTH_CHECKS", db_config)

    def test_custom_conn_max_age_for_session_mode(self):
        db_config = {"PORT": "5432"}
        apply_connection_pool_settings(
            db_config,
            self._env(DB_CONN_MAX_AGE="120"),
            is_test=False,
            debug=True,
        )
        self.assertEqual(db_config["CONN_MAX_AGE"], 120)
