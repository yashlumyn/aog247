#!/bin/zsh

cd "/Users/yashlinn/Makayan Ltd/LUMYN Consulting/Clients/projects/aog247"

source .venv/bin/activate

git checkout demo

MEMORY_BANK=artifacts/demo_memory_bank.pt uvicorn app.main:app --host 0.0.0.0 --port 8000 &
sleep 3

ngrok http 8000 --url=https://psdemo.ngrok.app