#!/bin/zsh

echo "Stopping PartSense Demo..."

pkill -f "uvicorn app.main:app"
pkill -f "ngrok http 8000"

echo "Demo stopped."

