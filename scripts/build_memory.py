from pathlib import Path
import torch
import torch.nn.functional as F

from pipeline.preprocess import preprocess_image
from pipeline.backbone import FeatureExtractor


# ------------------------
# Config
# ------------------------
IMAGE_DIR = Path("data/derived/renders_v2_baseline")
OUT_DIR = Path("artifacts")
OUT_DIR.mkdir(exist_ok=True)
OUT_PATH = OUT_DIR / "memory_bank.pt"

MAX_PATCHES = 20000  # PoC cap


# ------------------------
# Patch extraction helpers
# ------------------------
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



def extract_and_concat_patches(features: dict):
    patches = []
    for layer in ["layer2", "layer3"]:
        p = extract_patches(features[layer])  # [H*W, C]
        patches.append(p)
    return torch.cat(patches, dim=0)



# ------------------------
# Main
# ------------------------
def main():
    device = "mps" if torch.backends.mps.is_available() else "cpu"
    print(f"Using device: {device}")

    images = list(IMAGE_DIR.glob("*.[pP][nN][gG]")) + list(IMAGE_DIR.glob("*.[jJ][pP][gG]"))
    if len(images) == 0:
        raise RuntimeError("No images found in data/derived/renders_v2_baseline")

    print(f"STAGE:MODEL_LOAD")
    model = FeatureExtractor().to(device)
    model.eval()

    all_patches = []
    total = len(images)

    for i, img_path in enumerate(images, 1):
        print(f"STAGE:IMAGE_LOOP {i}/{total}")
        img = preprocess_image(img_path).to(device)

        with torch.no_grad():
            feats = model(img)

        patches = extract_and_concat_patches(feats)
        all_patches.append(patches.cpu())

        print(f"Processed: {img_path.name} -> patches {patches.shape}")

    print(f"STAGE:CONCATENATE")
    memory = torch.cat(all_patches, dim=0)

    print(f"STAGE:SUBSAMPLE")
    # Subsample (required)
    if memory.size(0) > MAX_PATCHES:
        idx = torch.randperm(memory.size(0))[:MAX_PATCHES]
        memory = memory[idx]

    print(f"STAGE:SAVE")
    torch.save(
        {
            "memory": memory,
            "num_images": len(images),
            "layers": ["layer2", "layer3"],
        },
        OUT_PATH
    )

    print("DONE")
    print("Images used:", len(images))
    print("Memory shape:", memory.shape)


if __name__ == "__main__":
    main()
