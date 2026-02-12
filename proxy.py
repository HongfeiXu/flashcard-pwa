#!/usr/bin/env python3
"""简易 CORS 代理 - 转发请求到 MiniMax API"""

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.request
import json

API_BASE = 'https://api.minimaxi.com'

class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204)
        self._cors_headers()
        self.end_headers()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._proxy()
        else:
            self.send_error(404)

    def _proxy(self):
        target = API_BASE + self.path[4:]  # /api/xxx -> https://api.minimaxi.com/xxx
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length) if length else None

        headers = {
            'Content-Type': self.headers.get('Content-Type', 'application/json'),
            'x-api-key': self.headers.get('x-api-key', ''),
            'anthropic-version': self.headers.get('anthropic-version', '2023-06-01'),
        }

        req = urllib.request.Request(target, data=body, headers=headers, method='POST')
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = resp.read()
                self.send_response(resp.status)
                self._cors_headers()
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(data)
        except urllib.error.HTTPError as e:
            data = e.read()
            self.send_response(e.code)
            self._cors_headers()
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(data)

    def _cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, x-api-key, anthropic-version')

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''):
            super().log_message(fmt, *args)

if __name__ == '__main__':
    print('🚀 CORS proxy + static server on http://0.0.0.0:8080')
    print('   Static files: ./')
    print('   API proxy: /api/* -> https://api.minimaxi.com/*')
    HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()
