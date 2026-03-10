import base64
import io
from PIL import Image
import numpy as np

from pathlib import Path
import cv2

import torch
import torch.nn.functional as F

from pipeline.preprocess import preprocess_image
from pipeline.backbone import FeatureExtractor

import os
MEMORY_PATH = Path(os.getenv("MEMORY_BANK", "artifacts/memory_bank.pt"))

THRESHOLD = 0.5  # TEMP, hard-coded

# --- load once at startup ---

extractor = FeatureExtractor()
extractor.eval()

memory = torch.load(MEMORY_PATH)["memory"]

def extract_patches(feat: torch.Tensor, out_dim=512):
    """
    feat: [1, C, H, W]
    returns: [H*W, out_dim]
    """
    # project channels to fixed dimension
    feat = F.adaptive_avg_pool2d(feat, (feat.shape[2], feat.shape[3]))
    feat = feat[:, :out_dim, :, :]  # channel projection (simple, deterministic)

    _, C, H, W = feat.shape
    return feat.reshape(C, H * W).T

def detect_anomaly(image_path: str):
    """
    Input:
        image_path: path to a single 2D image
    Output:
        dict with:
            - score (float)
            - heatmap (H x W numpy array or torch tensor)
            - is_anomalous (bool)
    """
    orig = cv2.imread(image_path)
    orig_h, orig_w = orig.shape[:2]

    img = preprocess_image(image_path)      # shape: [1, 3, H, W]

    with torch.no_grad():
        features = extractor(img)

    patches = []
    for layer in ["layer2", "layer3"]:
        feat = features[layer]       # [1, C, H, W]
        patches.append(extract_patches(feat))

    patches = torch.cat(patches, dim=0)

    dists = torch.cdist(patches, memory)
    patch_scores = dists.min(dim=1).values

    score = patch_scores.max().item()

    # use layer3 only for localisation
    feat_map = features["layer3"]
    layer3_patches = extract_patches(feat_map)
    layer3_scores = torch.cdist(layer3_patches, memory).min(dim=1).values

    _, _, h, w = feat_map.shape
    heatmap = layer3_scores.reshape(h, w)

    # upsample directly to original image resolution
    heatmap = heatmap.unsqueeze(0).unsqueeze(0)
    heatmap = torch.nn.functional.interpolate(
    heatmap,
    size=(orig_h, orig_w),
    mode="bilinear",
    align_corners=False
            )
    heatmap = heatmap.squeeze()

    # convert to numpy
    hm = heatmap.detach().cpu().numpy()



    is_anomalous = score > THRESHOLD

    # normalise heatmap to 0–255
    
                    

    hm = (hm - hm.min()) / (hm.max() - hm.min() + 1e-8)
    hm = (hm * 255).astype(np.uint8)

    # convert to PNG
    hm_color = cv2.applyColorMap(hm, cv2.COLORMAP_JET)
    img_hm = Image.fromarray(cv2.cvtColor(hm_color, cv2.COLOR_BGR2RGB))
    buf = io.BytesIO()
    img_hm.save(buf, format="PNG")
    buf.seek(0)

    heatmap_b64 = base64.b64encode(buf.read()).decode("utf-8")


    return {
    "score": score,
    "is_anomalous": is_anomalous,
    "heatmap": heatmap_b64  
            }


if __name__ == "__main__":
    out = detect_anomaly("data/derived/test/sample.png")
    print(out["score"], out["is_anomalous"])
