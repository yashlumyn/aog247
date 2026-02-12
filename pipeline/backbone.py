import torch
import torch.nn as nn
from torchvision.models import wide_resnet50_2


class FeatureExtractor(nn.Module):
    """
    Frozen WideResNet backbone.
    Exposes intermediate feature maps for PatchCore.
    """

    def __init__(self, device="cpu"):
        super().__init__()

        model = wide_resnet50_2(weights="IMAGENET1K_V1")
        model.eval()

        for p in model.parameters():
            p.requires_grad = False

        self.device = device
        self.model = model.to(device)

        # Register layers we want features from
        self.layers = {
            "layer2": model.layer2,
            "layer3": model.layer3,
        }

    def forward(self, x):
        """
        Input:  [B, 3, 224, 224]
        Output: dict of feature maps
        """
        features = {}

        x = self.model.conv1(x)
        x = self.model.bn1(x)
        x = self.model.relu(x)
        x = self.model.maxpool(x)

        x = self.model.layer1(x)
        x = self.model.layer2(x)
        features["layer2"] = x

        x = self.model.layer3(x)
        features["layer3"] = x

        return features

