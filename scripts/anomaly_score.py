from pipeline.detect import detect_anomaly

if __name__ == "__main__":
    result = detect_anomaly(
        "data/derived/renders_v1/front_view_smoke_test_only.jpg"
    )
    print(result["score"], result["is_anomalous"])
