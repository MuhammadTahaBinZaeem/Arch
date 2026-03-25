import importlib.util
import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_module(name: str, relpath: str):
    path = ROOT / relpath
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


runcat = load_module("runcat_script", "runcat/scripts/runcat.py")
kurve = load_module("kurve_script", "kurve/kurve_hyprland.py")


class RunCatTests(unittest.TestCase):
    def test_calculate_cpu_usage_basic(self):
        prev = runcat.CpuSnapshot(total=100, idle=40)
        curr = runcat.CpuSnapshot(total=200, idle=80)
        self.assertAlmostEqual(runcat.calculate_cpu_usage(prev, curr), 60.0)

    def test_build_payload_shape(self):
        payload = json.loads(runcat.build_payload("🐈", 42.5))
        self.assertEqual(payload["text"], "🐈")
        self.assertEqual(payload["class"], "mid")
        self.assertEqual(payload["alt"], "42.5%")


class KurveTests(unittest.TestCase):
    def test_parse_frame_pads_and_clamps(self):
        self.assertEqual(kurve.parse_frame("1;2;oops;", 5), [1, 2, 0, 0, 0])

    def test_build_cava_config_contains_expected_sections(self):
        cfg = kurve.Config()
        text = kurve.build_cava_config(cfg)
        self.assertIn("[general]", text)
        self.assertIn("[input]", text)
        self.assertIn("[output]", text)

    def test_make_waybar_json_idle_class(self):
        cfg = kurve.Config()
        payload = json.loads(kurve.make_waybar_json("▁▂", cfg, active=False))
        self.assertIn("idle", payload["class"])


if __name__ == "__main__":
    unittest.main()
