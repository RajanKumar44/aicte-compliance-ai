import os
import sys

# Ensure backend package is discoverable by Vercel serverless runtime
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app  # noqa: E402

# Export FastAPI app for Vercel Python runtime
__all__ = ["app"]
