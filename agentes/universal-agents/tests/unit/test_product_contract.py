import json
import html.parser
import os
import socket
import subprocess
import sys
import tempfile
import time
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "fixtures" / "projects" / "web-fullstack-sqlite" / "app.py"


class WebFullStackContractTests(unittest.TestCase):
    def test_ui_fixture_has_semantic_labels_focus_and_contrast_tokens(self):
        page = (APP.parent / "index.html").read_text(encoding="utf-8")

        class Elements(html.parser.HTMLParser):
            def __init__(self):
                super().__init__(); self.ids = []; self.label_for = []; self.live_regions = []
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if attrs.get("id"): self.ids.append(attrs["id"])
                if tag == "label" and attrs.get("for"): self.label_for.append(attrs["for"])
                if attrs.get("role") == "status" or attrs.get("aria-live") == "polite": self.live_regions.append(attrs)

        parsed = Elements(); parsed.feed(page)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        self.assertIn("name", parsed.label_for)
        self.assertIn("quantity", parsed.label_for)
        self.assertTrue(any(region.get("aria-live") == "polite" for region in parsed.live_regions))
        self.assertIn('name="viewport"', page)
        self.assertIn(":focus-visible", page)

        def luminance(color):
            values = [int(color[index:index + 2], 16) / 255 for index in (1, 3, 5)]
            values = [value / 12.92 if value <= .04045 else ((value + .055) / 1.055) ** 2.4 for value in values]
            return .2126 * values[0] + .7152 * values[1] + .0722 * values[2]

        def ratio(color, background="#ffffff"):
            light, dark = sorted((luminance(color), luminance(background)), reverse=True)
            return (light + .05) / (dark + .05)

        for color in ("#172033", "#b42318", "#155eef"):
            self.assertGreaterEqual(ratio(color), 4.5, color)

    @classmethod
    def setUpClass(cls):
        sock = socket.socket()
        sock.bind(("127.0.0.1", 0))
        cls.port = sock.getsockname()[1]
        sock.close()
        cls.temp = tempfile.TemporaryDirectory(prefix="ua-v42-web-contract-")
        env = os.environ.copy()
        env["UA_FIXTURE_DB"] = str(Path(cls.temp.name) / "isolated.sqlite")
        env["UA_FIXTURE_PORT"] = str(cls.port)
        cls.proc = subprocess.Popen([sys.executable, str(APP)], cwd=APP.parent, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        cls.base = f"http://127.0.0.1:{cls.port}"
        for _ in range(60):
            if cls.proc.poll() is not None:
                raise RuntimeError("temporary fixture server exited before readiness")
            try:
                with urlopen(cls.base + "/", timeout=0.2) as response:
                    if response.status == 200:
                        break
            except OSError:
                time.sleep(0.05)
        else:
            cls.proc.terminate()
            raise RuntimeError("temporary fixture server did not become ready")

    @classmethod
    def tearDownClass(cls):
        if getattr(cls, "proc", None) and cls.proc.poll() is None:
            cls.proc.terminate()
            try:
                cls.proc.wait(timeout=3)
            except subprocess.TimeoutExpired:
                cls.proc.kill()
                cls.proc.wait(timeout=3)
        if getattr(cls, "temp", None):
            cls.temp.cleanup()

    def request_json(self, path, method="GET", payload=None):
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        request = Request(self.base + path, data=body, method=method, headers={"Content-Type": "application/json"} if body else {})
        try:
            response = urlopen(request, timeout=2)
        except HTTPError as error_response:
            response = error_response
        with response:
            raw = response.read()
            return response.status, json.loads(raw) if response.headers.get_content_type() == "application/json" else raw

    def test_html_empty_create_validation_update_and_persistence_contract(self):
        status, html = self.request_json("/")
        self.assertEqual(status, 200)
        self.assertIn(b'aria-live="polite"', html)
        status, listing = self.request_json("/api/items")
        self.assertEqual((status, listing), (200, {"items": []}))
        status, created = self.request_json("/api/items", "POST", {"name": "Blue mug", "quantity": 4})
        self.assertEqual(status, 201)
        item = created["item"]
        self.assertEqual((item["name"], item["quantity"]), ("Blue mug", 4))
        self.assertEqual(self.request_json(f"/api/items/{item['id']}", "PATCH", {"quantity": 7})[1]["item"]["quantity"], 7)
        self.assertEqual(self.request_json("/api/items")[1]["items"][0]["quantity"], 7)

    def test_negative_input_unknown_id_and_route_are_rejected(self):
        for payload in ({"name": " ", "quantity": 1}, {"name": "x" * 101, "quantity": 1}, {"name": "Mug", "quantity": -1}, {"name": "Mug", "quantity": True}, {"name": "Mug", "quantity": 1, "admin": True}):
            with self.subTest(payload=payload):
                self.assertEqual(self.request_json("/api/items", "POST", payload)[0], 422 if set(payload) == {"name", "quantity"} else 400)
        self.assertEqual(self.request_json("/api/items/999999", "PATCH", {"quantity": 1})[0], 404)
        self.assertEqual(self.request_json("/not-a-route")[0], 404)


if __name__ == "__main__":
    unittest.main()
