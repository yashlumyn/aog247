from PIL import Image
import torch
from torchvision import transforms


# Standard image preprocessing for PatchCore-style pipelines
_preprocess = transforms.Compose([
    transforms.Resize(256),
    transforms.CenterCrop(224),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


def preprocess_image(image_path):
    """
    Load image from disk and return a normalized tensor.
    Output shape: [1, 3, 224, 224]
    """
    img = Image.open(image_path).convert("RGB")
    tensor = _preprocess(img)
    return tensor.unsqueeze(0)


