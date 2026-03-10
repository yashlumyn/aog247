# Model Versions

---

## v3.1.1_baseline

Date: 2026-02-16  
Git Commit: 81096effb593e76c29bc594fc4f69f286d5d16a1  

Memory Bank File: artifacts/demo_memory_bank.pt  
Threshold: 0.5  

Backbone: FeatureExtractor (frozen)  
Layers Used: layer2, layer3  
Channel Projection: 512  

Training Data:
- Normal samples used to build memory bank: 1
- Source directory: data/derived/...

Purpose:
Locked baseline before Phase 3.1.1 validation.
No tuning applied.
