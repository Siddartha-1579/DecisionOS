"""
DecisionOS — Entry point
Run with: python run.py
"""
from server.app import app

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
